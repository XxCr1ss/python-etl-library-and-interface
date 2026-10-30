"""Exercise the real dispatcher with a bounded, in-memory WebSocket peer."""
import asyncio
import json
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import AsyncMock

import pandas as pd
import pytest

import etl_agent as agent
from etl.agent_protocol import backend_url, websocket_url
from etl.load_transport import LoadValidationError
from etl.warehouse.settings import WarehouseError


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
    failure = OSError("synthetic opening failure")
    assert connected[0][1]["process_exception"](failure) is failure
    assert "runtime-secret" not in json.dumps(sent)


@pytest.mark.parametrize("action,payload", [
    ("get_typed_table", {}),
    ("execute_load", {"load_config": {"schema_spec": {"columns": []}}}),
    ("warehouse_catalog", {"request": {}, "limits": {}}),
])
def test_privileged_commands_keep_their_transport_checks(action, payload):
    response = asyncio.run(agent.command_response(json.dumps({
        "action": action, "request_id": "one", "payload": payload}), True, False))
    assert json.loads(response)["status"] == "error"
    assert "HTTPS/WSS" in json.loads(response)["message"]


def test_insecure_remote_transport_is_rejected_before_any_socket(monkeypatch):
    connect = AsyncMock()
    monkeypatch.setattr(agent.websockets, "connect", connect)
    with pytest.raises(ValueError, match="HTTPS/WSS"):
        asyncio.run(agent.agent_loop("http://remote.example", "agent"))
    connect.assert_not_called()


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


@pytest.mark.parametrize("url", [
    "https://host:invalid", "https://host:65536", "https://host:0", "http://[broken",
    "https://host/path", "https://host/?query=1", "https://host/#fragment", "https://@host",
    "https://user:password@host", "https://host\\@other", "https://host\n", "https://", None,
])
def test_invalid_urls_are_rejected_without_echoing_their_contents(url):
    with pytest.raises(ValueError, match="URL de backend válida"):
        backend_url(url)


@pytest.mark.parametrize("url,expected", [
    ("https://remote.example/", "wss://remote.example"),
    ("http://localhost:8000/", "ws://localhost:8000"),
    ("http://127.0.0.1:8000", "ws://127.0.0.1:8000"),
    ("http://[::1]:8000/", "ws://[::1]:8000"),
])
def test_websocket_url_preserves_authority_and_encodes_one_agent_segment(url, expected):
    assert websocket_url(url, "agent/id?x#y") == expected + "/api/v1/ws/agent/agent%2Fid%3Fx%23y"


@pytest.mark.parametrize("message", ['not json', '[]', 'null', 'true', '{}', '{"request_id": 5}'])
def test_uncorrelated_frames_are_rejected_and_next_request_still_succeeds(message):
    async def run():
        assert await agent.command_response(message, False, True) is None
        response = await agent.command_response(json.dumps({"request_id": "next", "action": "get_capabilities"}), False, True)
        assert json.loads(response)["request_id"] == "next"
        assert json.loads(response)["status"] == "success"
    asyncio.run(run())


@pytest.mark.parametrize("action,payload", [
    (None, {}), ([], {}), ("get_table", []), ("get_table", None),
    ("preview_load", {"load_config": []}), ("warehouse_catalog", {"request": {}}),
])
def test_correlated_malformed_commands_return_an_error_without_running_drivers(monkeypatch, action, payload):
    execute = AsyncMock()
    monkeypatch.setattr(agent, "handle_execute_load", execute)
    monkeypatch.setattr(agent, "handle_get_table", execute)
    result = asyncio.run(agent.command_response(json.dumps({"request_id": "bad", "action": action, "payload": payload}), True, True))
    assert json.loads(result)["request_id"] == "bad"
    assert json.loads(result)["status"] == "error"
    execute.assert_not_called()


def test_preview_copies_configuration_without_mutating_the_command(monkeypatch):
    command = {"action": "preview_load", "payload": {"load_config": {"if_exists": "append"}}}
    execute = AsyncMock(return_value={})
    monkeypatch.setattr(agent, "handle_execute_load", execute)
    asyncio.run(agent.dispatch_command(command, True))
    assert execute.await_args.args[0]["load_config"]["preview_only"] is True
    assert command["payload"]["load_config"] == {"if_exists": "append"}


@pytest.mark.parametrize("controlled", [True, False])
def test_warehouse_final_response_and_log_redact_secrets(monkeypatch, capsys, controlled):
    from urllib.parse import quote
    secret, token = "synthetic p@ss/word", "synthetic-pair-token"
    raw = f"failed {secret} {quote(secret, safe='')} {token} postgresql://u:p@host/db"
    error = WarehouseError("invalid_query", raw) if controlled else RuntimeError(raw)
    def broken(*args):
        raise error
    monkeypatch.setattr(agent, "execute_warehouse", broken)
    payload = {"request": {"connection": {"password": secret}}, "limits": {}}
    response = asyncio.run(agent.command_response(json.dumps({"request_id": "one", "action": "warehouse_query", "payload": payload}), False, True, token))
    parsed = json.loads(response)
    assert parsed["code"] == ("invalid_query" if controlled else "connection_failed")
    assert parsed["status"] == "error"
    output = response + capsys.readouterr().out
    for value in (secret, quote(secret, safe=""), token, "postgresql://u:p@host/db"):
        assert value not in output


@pytest.mark.parametrize("failure", [RuntimeError("transport failed"), agent.websockets.ConnectionClosed(None, None)])
def test_paired_session_never_reconnects_after_a_transport_error(monkeypatch, failure):
    async def serve(*args):
        raise failure
    async def connect(*args, **kwargs):
        yield object()
        pytest.fail("One-use pair token was reused after a transport failure")
    monkeypatch.setattr(agent, "_serve_session", serve)
    monkeypatch.setattr(agent.websockets, "connect", connect)
    asyncio.run(agent.agent_loop("https://backend.example", "agent", pair_token="synthetic-token"))


def test_cancellation_propagates_without_reconnecting(monkeypatch):
    async def serve(*args):
        raise asyncio.CancelledError
    async def connect(*args, **kwargs):
        yield object()
        pytest.fail("Cancelled sessions must not reconnect")
    monkeypatch.setattr(agent, "_serve_session", serve)
    monkeypatch.setattr(agent.websockets, "connect", connect)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(agent.agent_loop("https://backend.example", "agent"))


def test_concurrent_write_is_rejected_and_failed_write_releases_the_lock(monkeypatch):
    entered, release = threading.Event(), threading.Event()
    def persist(*args):
        entered.set()
        assert release.wait(5)
        raise RuntimeError("synthetic driver failure")
    monkeypatch.setattr(agent, "decode_dataset", lambda value: object())
    monkeypatch.setattr(agent, "persist_and_verify", persist)
    payload = {"load_protocol_version": 1}
    with ThreadPoolExecutor(max_workers=1) as pool:
        first = pool.submit(agent._execute_load, payload, True)
        try:
            assert entered.wait(5)
            with pytest.raises(LoadValidationError, match="ya está ejecutando"):
                agent._execute_load(payload, True)
        finally:
            release.set()
        with pytest.raises(RuntimeError, match="synthetic driver failure"):
            first.result(timeout=5)
    monkeypatch.setattr(agent, "persist_and_verify", lambda *args: {"status": "success"})
    assert agent._execute_load(payload, True) == {"status": "success"}
    with pytest.raises(LoadValidationError, match="incompatible"):
        agent._execute_load({"load_protocol_version": True}, True)
