import asyncio
import uuid
from fastapi import WebSocket
from typing import Dict, Any, Optional

class AgentManager:
    def __init__(self):
        # Mapear agent_id -> objeto WebSocket activo
        self.active_agents: Dict[str, WebSocket] = {}
        # Mapear request_id -> Future que espera la respuesta del socket
        self.pending_requests: Dict[str, asyncio.Future] = {}

    def register_agent(self, agent_id: str, websocket: WebSocket) -> None:
        """Registra un agente conectado por WebSocket."""
        self.active_agents[agent_id] = websocket
        print(f"🔌 Agente registrado: {agent_id}")

    def unregister_agent(self, agent_id: str) -> None:
        """Elimina el agente del registro cuando se desconecta."""
        if agent_id in self.active_agents:
            del self.active_agents[agent_id]
            print(f"🔌 Agente desconectado: {agent_id}")

    def is_agent_connected(self, agent_id: str) -> bool:
        """Verifica si un agente está en línea."""
        return agent_id in self.active_agents

    async def send_command_and_wait(self, agent_id: str, action: str, payload: Dict[str, Any], timeout: float = 15.0) -> Dict[str, Any]:
        """
        Envía un comando al agente local vía WebSocket y espera su respuesta asíncronamente.
        """
        if not self.is_agent_connected(agent_id):
            raise ValueError(f"El agente '{agent_id}' no está conectado.")

        websocket = self.active_agents[agent_id]
        request_id = uuid.uuid4().hex

        # Crear un Future para esperar la respuesta del WebSocket
        future = asyncio.get_running_loop().create_future()
        self.pending_requests[request_id] = future

        # Estructurar el mensaje para el agente
        message = {
            "request_id": request_id,
            "action": action,
            "payload": payload
        }

        try:
            # Enviar mensaje por el WebSocket
            await websocket.send_json(message)
            
            # Esperar a que se resuelva el future (o se agote el tiempo)
            response = await asyncio.wait_for(future, timeout=timeout)
            return response
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"Se agotó el tiempo de espera ({timeout}s) para la respuesta del agente local.")
        finally:
            # Limpiar el future de la lista de pendientes
            if request_id in self.pending_requests:
                del self.pending_requests[request_id]

    def resolve_request(self, request_id: str, response_data: Dict[str, Any]) -> None:
        """
        Resuelve el Future pendiente cuando llega la respuesta correspondiente del socket.
        """
        if request_id in self.pending_requests:
            future = self.pending_requests[request_id]
            if not future.done():
                future.set_result(response_data)

# Instancia global del administrador de agentes
agent_manager = AgentManager()
