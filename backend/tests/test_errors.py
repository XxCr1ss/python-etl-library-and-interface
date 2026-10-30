import asyncio
from types import SimpleNamespace
from urllib.parse import quote

import pytest

from services import extract_service, load_service, transform_service
from services.agent_manager import AgentManager, agent_manager
from test_sources import CONNECTION

SECRET = "synthetic-p@ss/word"
URL = f"postgresql://test:{quote(SECRET, safe='')}@synthetic/test"


@pytest.mark.parametrize("error", [ValueError, RuntimeError])
@pytest.mark.parametrize("route", ["/extract/database", "/extract/database/preview", "/transform/preview",
    "/load/test-connection", "/load/execute"])
def test_public_errors_do_not_echo_credentials(client, monkeypatch, csv_source, error, route, capsys):
    def broken(*args, **kwargs):
        raise error(f"driver rejected password {SECRET}; connection {URL}")

    connection = {**CONNECTION, "password": SECRET}
    if route == "/extract/database":
        monkeypatch.setattr(extract_service, "DB_Extractor", broken)
        body = connection
    elif route == "/extract/database/preview":
        monkeypatch.setattr(extract_service, "DB_Extractor", broken)
        body = {**connection, "table_name": "test"}
    elif route == "/transform/preview":
        monkeypatch.setattr(transform_service, "DB_Extractor", broken)
        body = {"source": {"type": "database", **connection, "table_name": "test"}, "steps": []}
    else:
        monkeypatch.setattr(load_service, "DB_Extractor", broken)
        body = connection if route.endswith("test-connection") else {
            "source": csv_source, "target_connection": connection,
            "load_config": {"table_name": "test", "table_type": "dimension"}, "recipe": []}
    response = client.post("/api/v1" + route, json=body)
    assert response.status_code in (400, 500)
    captured = capsys.readouterr()
    output = response.text + captured.out + captured.err
    assert SECRET not in output and quote(SECRET, safe="") not in output and URL not in output
    assert response.json()["detail"]


def test_validation_error_omits_request_with_nested_password(client, csv_source):
    response = client.post("/api/v1/transform/preview", json={"source": csv_source, "steps": [
        {"type": "left_join", "params": {"right_source": {"type": "database", "password": SECRET}, "on": "id"}}]})
    assert response.status_code == 422
    assert SECRET not in response.text
    assert isinstance(response.json()["detail"], list)
    assert response.json()["detail"][0]["loc"]


@pytest.mark.parametrize("foreign_keys", [{"id": ["dim"]}, {"id": ["dim", "id", "extra"]},
    {"id": ["", "id"]}, {"id": "dim.id"}])
def test_malformed_fk_rejected_before_connection(client, csv_source, foreign_keys):
    response = client.post("/api/v1/load/execute", json={"source": csv_source,
        "target_connection": CONNECTION, "load_config": {"table_name": "t", "table_type": "fact", "foreign_keys": foreign_keys},
        "recipe": []})
    assert response.status_code == 422, response.text


@pytest.mark.parametrize("route", ["/load/test-connection", "/extract/database"])
def test_unsupported_engine(client, route):
    response = client.post("/api/v1" + route, json={**CONNECTION, "db_type": "sqlserver"})
    assert response.status_code in (400, 422), response.text


@pytest.mark.parametrize("failure", ["disconnected", "timeout", "agent_error"])
@pytest.mark.parametrize("route", ["/extract/database", "/extract/database/preview", "/transform/preview"])
def test_agent_failures(client, monkeypatch, failure, route):
    async def send(**kwargs):
        if failure == "timeout":
            raise TimeoutError("Se agotó el tiempo de espera del agente.")
        return {"status": "error", "message": f"driver {URL} password {SECRET}"}

    if failure != "disconnected":
        monkeypatch.setattr(agent_manager, "send_command_and_wait", send)
    config = {**CONNECTION, "password": SECRET, "use_agent": True, "agent_id": "synthetic", "table_name": "test"}
    body = {"source": {"type": "database", **config}, "steps": []} if route == "/transform/preview" else config
    response = client.post("/api/v1" + route, json=body)
    assert response.status_code in (400, 500), response.text
    assert SECRET not in response.text and URL not in response.text
    assert response.json()["detail"]


def test_manager_timeout_cleans_pending_requests():
    async def scenario():
        manager = AgentManager()
        sent = []

        async def send_json(message):
            sent.append(message)

        manager.register_agent("synthetic", SimpleNamespace(send_json=send_json))
        with pytest.raises(TimeoutError, match="tiempo de espera"):
            await manager.send_command_and_wait("synthetic", "get_table", {}, timeout=0.001)
        assert len(sent) == 1 and sent[0]["action"] == "get_table"
    asyncio.run(scenario())


def test_public_error_decodes_latin1_unicodedecodeerror():
    from etl.error_utils import public_error
    raw_bytes = b"FATAL:  la autenticaci\xf3n password fall\xf3 para el usuario \xabpostgres\xbb"
    try:
        raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        err = exc
    result = public_error(err)
    assert "la autenticación password falló" in result
    assert "codec can't decode" not in result


def test_public_error_preserves_diagnostics_with_an_undefined_windows_byte():
    from etl.error_utils import public_error
    raw = b"driver detail: \x81"
    with pytest.raises(UnicodeDecodeError) as caught:
        raw.decode("utf-8")
    assert public_error(caught.value) == raw.decode("latin-1")

