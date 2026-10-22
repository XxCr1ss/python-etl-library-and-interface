import asyncio
import json
from contextlib import nullcontext

import pandas as pd
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

import etl_agent
from etl import DB_Loader
from etl.load_execution import persist_and_verify
from etl.load_transport import encode_dataset
from services.agent_manager import AgentManager, agent_manager
from services import load_service
from test_sources import CONNECTION


@pytest.fixture
def local_agent(monkeypatch):
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    target = lambda **_: nullcontext(type("Target", (), {"engine": engine})())
    monkeypatch.setattr(etl_agent, "persist_and_verify", lambda frame, connection, config:
                        persist_and_verify(frame, connection, config, target, DB_Loader))
    pd.DataFrame({"id": [99]}).to_sql("synthetic", engine, index=False)
    class Agent:
        enabled = True
        actions = []
        async def send_json(self, message):
            self.actions.append(message["action"])
            data = etl_agent.load_capabilities(self.enabled) if message["action"] == "get_capabilities" else {"status": "success", "message": "OK"}
            agent_manager.resolve_request(message["request_id"], {"request_id": message["request_id"], "status": "success", "data": data}, "local", self)
        async def send_text(self, encoded):
            message = json.loads(encoded)
            self.actions.append(message["action"])
            data = await etl_agent.handle_execute_load(message["payload"], True)
            agent_manager.resolve_request(message["request_id"], {"request_id": message["request_id"], "status": "success", "data": data}, "local", self)
    agent = Agent()
    agent_manager.register_agent("local", agent)
    yield engine, agent
    engine.dispose()


def body(source, **config):
    return {"source": source, "target_connection": {**CONNECTION, "use_agent": True, "agent_id": "local"},
            "load_config": {"table_name": "synthetic", "table_type": "fact", "if_exists": "append", **config}, "recipe": []}


@pytest.mark.parametrize("mode,total", [("replace", 2), ("append", 3)])
def test_agent_load_persists_once_and_reports_destination_total(client, csv_source, local_agent, mode, total):
    engine, agent = local_agent
    request = body(csv_source, if_exists=mode)
    request["recipe"] = [{"type": "select_columns", "params": {"columns": ["id"]}}]
    response = client.post("/api/v1/load/execute", json=request)
    assert response.status_code == 200, response.text
    assert response.json()["total_rows"] == total
    assert agent.actions == ["get_capabilities", "execute_load"]
    with engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM synthetic")).scalar() == total


def test_test_connection_and_disabled_load_never_send_dataset(client, csv_source, local_agent):
    _, agent = local_agent
    response = client.post("/api/v1/load/test-connection", json=body(csv_source)["target_connection"])
    assert response.status_code == 200
    assert agent.actions == ["get_capabilities", "test_target_connection"]
    agent.actions.clear()
    agent.enabled = False
    response = client.post("/api/v1/load/execute", json=body(csv_source))
    assert response.status_code == 400 and "--allow-load" in response.json()["detail"]
    assert agent.actions == ["get_capabilities"]


@pytest.mark.parametrize("patch", [{"agent_id": None}, {"agent_id": "  "}, {"use_agent": None}])
def test_agent_target_contract_rejected_before_network(client, csv_source, patch):
    request = body(csv_source)
    request["target_connection"].update(patch)
    assert client.post("/api/v1/load/execute", json=request).status_code == 422


def test_agent_requires_explicit_local_permission_and_protocol():
    payload = {"load_protocol_version": 1, "dataset": encode_dataset(pd.DataFrame({"id": [1]}))}
    with pytest.raises(ValueError, match="deshabilitada"):
        etl_agent._execute_load(payload)
    with pytest.raises(ValueError, match="incompatible"):
        etl_agent._execute_load({**payload, "load_protocol_version": 99}, True)


def test_manager_binds_response_and_keeps_timed_out_write_exclusive(monkeypatch):
    # This test targets a timeout AFTER emission, not OS thread-pool startup.
    # A 1ms deadline could previously expire during serialization on Windows.
    async def serialize_inline(operation, *args):
        return operation(*args)
    monkeypatch.setattr("services.agent_manager.asyncio.to_thread", serialize_inline)
    async def run():
        manager = AgentManager()
        class Socket:
            sent = None
            async def send_text(self, encoded):
                self.sent = json.loads(encoded)
        socket = Socket()
        manager.register_agent("a", socket)
        with pytest.raises(TimeoutError):
            await manager.send_command_and_wait("a", "execute_load", {}, timeout=.001)
        assert manager.is_busy("a")
        request_id = socket.sent["request_id"]
        response = {"request_id": request_id, "status": "success", "data": {}}
        manager.resolve_request(request_id, response, "other", socket)
        manager.resolve_request(request_id, response, "a", object())
        assert manager.is_busy("a")
        with pytest.raises(ValueError, match="ocupado"):
            await manager.send_command_and_wait("a", "execute_load", {})
        manager.resolve_request(request_id, response, "a", socket)
        assert not manager.is_busy("a")
    asyncio.run(run())


def test_manager_disconnect_quarantines_write_and_rejects_duplicate_connections():
    async def run():
        manager = AgentManager()
        ready = asyncio.Event()
        class Socket:
            async def send_text(self, encoded):
                ready.set()
        socket, replacement = Socket(), Socket()
        assert manager.register_agent("a", socket)
        generation = manager.connection_id("a")
        assert not manager.register_agent("a", replacement)
        task = asyncio.create_task(manager.send_command_and_wait("a", "execute_load", {}))
        await ready.wait()
        manager.unregister_agent("a", socket)
        with pytest.raises(ConnectionError):
            await task
        assert manager.register_agent("a", replacement)
        manager.unregister_agent("a", socket)
        assert manager.active_agents["a"] is replacement
        with pytest.raises(ValueError, match="cambió"):
            await manager.send_command_and_wait("a", "execute_load", {}, expected_connection=generation)
        assert manager.is_busy("a")
    asyncio.run(run())


def test_timeout_covers_send_not_only_response():
    async def run():
        manager = AgentManager()
        class Socket:
            async def send_json(self, message):
                await asyncio.Event().wait()
        manager.register_agent("a", Socket())
        with pytest.raises(TimeoutError):
            await manager.send_command_and_wait("a", "get_capabilities", {}, timeout=.001)
    asyncio.run(run())
