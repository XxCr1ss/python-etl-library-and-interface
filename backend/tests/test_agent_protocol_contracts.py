"""Exercise the real dispatcher with a bounded, in-memory WebSocket peer."""
import asyncio
import json
import sys
from unittest.mock import AsyncMock

import pandas as pd
import pytest

import etl_agent as agent


def test_dispatches_commands_and_pairing_does_not_reconnect(monkeypatch):
    actions = ["get_capabilities", "get_metadata", "get_schema_graph", "get_preview", "get_table",
               "test_target_connection", "execute_load", "preview_load", "get_typed_table", "unsupported"]
    sent, connected = [], []
    class Peer:
        def __aiter__(self):
            async def messages():
                for action in actions:
                    yield json.dumps({"request_id": action, "action": action, "payload": {"load_config": {}, "password": "runtime-secret"}})
            return messages()
        async def send(self, message):
            sent.append(json.loads(message))
    def connect(url, **kwargs):
        connected.append((url, kwargs))
        async def peers():
            yield Peer()
            pytest.fail("A paired session must not reconnect after the peer finishes")
        return peers()
    monkeypatch.setattr(agent.websockets, "connect", connect)
    handlers = {}
    for name in ["handle_get_metadata", "handle_get_schema_graph", "handle_get_preview", "handle_get_table", "handle_test_target_connection", "handle_execute_load"]:
        handlers[name] = AsyncMock(return_value={"status": "success"})
        monkeypatch.setattr(agent, name, handlers[name])
    monkeypatch.setattr(agent, "read_typed_table", lambda *args: pd.DataFrame({"id": [1]}))
    asyncio.run(agent.agent_loop("https://backend.example", "agent/id", True, "one-time-pair"))
    assert [r["request_id"] for r in sent] == actions
    assert all(r["status"] == "success" for r in sent[:-1])
    assert sent[-1]["status"] == "error" and "no soportada" in sent[-1]["message"]
    assert handlers["handle_execute_load"].await_args_list[1].args[0]["load_config"]["preview_only"] is True
    assert connected[0][0] == "wss://backend.example/api/v1/ws/agent/agent%2Fid"
    assert connected[0][1]["additional_headers"] == {"X-ETL-Pair-Token": "one-time-pair"}
    assert "runtime-secret" not in json.dumps(sent)


@pytest.mark.parametrize("action,payload", [
    ("get_typed_table", {}),
    ("execute_load", {"load_config": {"schema_spec": {"columns": []}}}),
    ("warehouse_catalog", {"request": {}, "limits": {}}),
])
def test_insecure_remote_transport_rejects_privileged_commands(monkeypatch, action, payload):
    replies = []
    class Peer:
        def __aiter__(self):
            async def messages():
                yield json.dumps({"action": action, "request_id": "one", "payload": payload})
            return messages()
        async def send(self, message): replies.append(json.loads(message))
    async def connect(*args, **kwargs): yield Peer()
    monkeypatch.setattr(agent.websockets, "connect", connect)
    asyncio.run(agent.agent_loop("http://remote.example", "agent"))
    assert replies[0]["status"] == "error"
    assert "HTTPS/WSS" in replies[0]["message"]


def test_metadata_tolerates_partial_schema_and_table_requires_a_name(monkeypatch):
    class Extractor:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def get_table_names(self): return ["good", "restricted"]
        def get_table_schema(self, table):
            if table == "restricted": raise PermissionError("restricted")
            return {"columns": ["id"]}
        def get_table(self, table): return pd.DataFrame({"id": [0], "empty": [None]})
    monkeypatch.setattr(agent, "DB_Extractor", Extractor)
    payload = {"db_type": "postgresql", "host": "localhost", "database": "test"}
    metadata = asyncio.run(agent.handle_get_metadata(payload))
    assert metadata["schema_preview"] == {"good": ["id"], "restricted": []}
    with pytest.raises(ValueError, match="table_name"):
        asyncio.run(agent.handle_get_table(payload))
    result = asyncio.run(agent.handle_get_table({**payload, "table_name": "good"}))
    assert result["total_rows"] == 1 and result["records"] == [{"id": 0, "empty": None}]


@pytest.mark.parametrize("url", ["ftp://host", "https://u:p@host", "https://host/path", "https://host?q=x", "http://remote.example"])
def test_cli_rejects_invalid_or_insecure_pairing_urls(monkeypatch, url):
    monkeypatch.setattr(sys, "argv", ["etl_agent.py", "--pair", "--server-url", url, "--agent-id", "test"])
    with pytest.raises(SystemExit) as exc:
        agent.main()
    assert exc.value.code == 2


def test_cli_uses_hidden_pairing_input_and_normalizes_server_url(monkeypatch, capsys):
    loop = AsyncMock()
    monkeypatch.setattr(agent, "agent_loop", loop)
    monkeypatch.setattr(agent.getpass, "getpass", lambda prompt: " ephemeral-pair ")
    monkeypatch.setattr(sys, "argv", ["etl_agent.py", "--pair", "--allow-load", "--server-url", "https://backend.example/", "--agent-id", "test"])
    agent.main()
    loop.assert_awaited_once_with("https://backend.example", "test", True, "ephemeral-pair")
    assert "ephemeral-pair" not in capsys.readouterr().out


def test_legacy_tunnel_reconnects_after_a_peer_failure(monkeypatch):
    sent = []
    class Peer:
        def __init__(self, broken): self.broken = broken
        def __aiter__(self):
            async def messages():
                if self.broken: raise RuntimeError("broken transport")
                yield json.dumps({"action": "get_capabilities", "request_id": "recovered"})
            return messages()
        async def send(self, message): sent.append(json.loads(message))
    async def connect(*args, **kwargs):
        yield Peer(True)
        yield Peer(False)
    sleep = AsyncMock()
    monkeypatch.setattr(agent.websockets, "connect", connect)
    monkeypatch.setattr(agent.asyncio, "sleep", sleep)
    asyncio.run(agent.agent_loop("http://127.0.0.1:8000", "local"))
    sleep.assert_awaited_once_with(5)
    assert sent[0]["request_id"] == "recovered" and sent[0]["status"] == "success"
