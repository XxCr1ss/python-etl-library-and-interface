"""Single-process broker. A timed-out write is never automatically resent."""
import asyncio
import uuid
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket
from etl.load_transport import MAX_LOAD_MESSAGE_BYTES, serialize_command


@dataclass
class PendingRequest:
    future: asyncio.Future
    agent_id: str
    websocket: Any
    action: str
    abandoned: bool = False


class AgentManager:
    def __init__(self):
        self.active_agents: dict[str, WebSocket] = {}
        self.pending_requests: dict[str, PendingRequest] = {}
        self.generations: dict[str, str] = {}
        # Kept across disconnects: reconnecting cannot prove an old write stopped.
        self.uncertain_writes: set[str] = set()

    def register_agent(self, agent_id, websocket):
        if agent_id in self.active_agents:
            return False
        self.active_agents[agent_id] = websocket
        self.generations[agent_id] = uuid.uuid4().hex
        return True

    def unregister_agent(self, agent_id, websocket=None):
        active = self.active_agents.get(agent_id)
        if active is None or (websocket is not None and active is not websocket):
            return
        del self.active_agents[agent_id]
        self.generations.pop(agent_id, None)
        for key, pending in list(self.pending_requests.items()):
            if pending.agent_id == agent_id and pending.websocket is active:
                if pending.action == "execute_load":
                    self.uncertain_writes.add(agent_id)
                if not pending.future.done():
                    pending.future.set_exception(ConnectionError("El agente se desconectó; no se pudo confirmar el resultado."))
                del self.pending_requests[key]

    def is_agent_connected(self, agent_id):
        return agent_id in self.active_agents

    def connection_id(self, agent_id):
        return self.generations.get(agent_id)

    def is_busy(self, agent_id):
        return agent_id in self.uncertain_writes or any(p.agent_id == agent_id for p in self.pending_requests.values())

    async def send_command_and_wait(self, agent_id: str, action: str, payload: dict,
                                    timeout: float = 15.0, expected_connection=None,
                                    max_message_bytes=MAX_LOAD_MESSAGE_BYTES) -> dict:
        if not self.is_agent_connected(agent_id):
            raise ValueError("El agente no está conectado.")
        if expected_connection is not None and self.connection_id(agent_id) != expected_connection:
            raise ValueError("La conexión del agente cambió; prueba de nuevo el destino.")
        if self.is_busy(agent_id):
            raise ValueError("El agente está ocupado o tiene una carga sin confirmar; revisa el destino antes de repetir.")
        websocket = self.active_agents[agent_id]
        request_id = uuid.uuid4().hex
        message = {"request_id": request_id, "action": action, "payload": payload}
        future = asyncio.get_running_loop().create_future()
        pending = PendingRequest(future, agent_id, websocket, action)
        self.pending_requests[request_id] = pending
        attempted = False
        try:
            async with asyncio.timeout(timeout):
                # Reserve before yielding; serialization must not block pings or
                # allow a second caller to slip a write onto the same socket.
                encoded = await asyncio.to_thread(serialize_command, message, max_message_bytes) if action == "execute_load" else None
                if future.done():
                    return future.result()
                if self.active_agents.get(agent_id) is not websocket:
                    raise ConnectionError("La conexión del agente cambió antes del envío.")
                attempted = True
                if encoded is not None:
                    await websocket.send_text(encoded)
                else:
                    await websocket.send_json(message)
                return await asyncio.shield(future)
        except (Exception, asyncio.CancelledError) as exc:
            if attempted and request_id in self.pending_requests:
                # Retain a tombstone until a late reply/disconnect. No hidden queue.
                pending.abandoned = True
                if action == "execute_load":
                    self.uncertain_writes.add(agent_id)
            if not future.done():
                future.cancel()
            if isinstance(exc, TimeoutError):
                raise TimeoutError("Se agotó el tiempo de espera del agente; no se pudo confirmar el resultado.") from None
            raise
        finally:
            if not pending.abandoned:
                self.pending_requests.pop(request_id, None)

    def resolve_request(self, request_id, response_data, agent_id=None, websocket=None):
        pending = self.pending_requests.get(request_id)
        if pending is None or pending.agent_id != agent_id or pending.websocket is not websocket:
            return
        if not isinstance(response_data, dict) or response_data.get("request_id") != request_id or response_data.get("status") not in {"success", "error"}:
            return
        self.pending_requests.pop(request_id, None)
        if pending.action == "execute_load":
            self.uncertain_writes.discard(agent_id)
        if not pending.future.done():
            pending.future.set_result(response_data)


agent_manager = AgentManager()
