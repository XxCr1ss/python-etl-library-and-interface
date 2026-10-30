import asyncio
import json

import pandas as pd
import pytest

from services import extract_service, transform_service
from services.agent_manager import agent_manager
from test_sources import CONNECTION
from test_errors import SECRET, URL


def test_database_preview_is_sample_count_and_empty_source_preserves_columns(client, monkeypatch):
    calls = []

    class Extractor:
        def __init__(self, **kwargs):
            assert kwargs["password"] == ""  # explicit empty password remains valid

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def sample_data(self, table, limit):
            calls.append((table, limit))
            return pd.DataFrame({"id": [1, 2]})

        def get_table(self, table):
            return pd.DataFrame(columns=["id", "amount"])

    monkeypatch.setattr(extract_service, "DB_Extractor", Extractor)
    monkeypatch.setattr(transform_service, "DB_Extractor", Extractor)
    response = client.post("/api/v1/extract/database/preview", json={**CONNECTION, "table_name": "t"})
    assert response.status_code == 200
    assert response.json() == {"status": "success", "table_name": "t", "preview_data": [{"id": 1}, {"id": 2}], "total_rows": 2,
                               "columns": ["id"], "dtypes": {"id": "int64"}, "limit": 5, "sample_rows": 2}
    assert calls == [("t", 5)]
    response = client.post("/api/v1/transform/preview", json={
        "source": {"type": "database", **CONNECTION, "table_name": "t"}, "steps": []})
    assert response.status_code == 200
    assert response.json()["total_rows"] == 0
    assert response.json()["columns"] == ["id", "amount"]


def test_agent_request_and_recursive_records(client, monkeypatch):
    calls = []

    async def send(**kwargs):
        calls.append(kwargs)
        return {"status": "success", "data": {"records": [{"id": 0, "values": [False, None, ""]}]}}

    monkeypatch.setattr(agent_manager, "send_command_and_wait", send)
    source = {"type": "database", **CONNECTION, "table_name": "t", "use_agent": True, "agent_id": "synthetic"}
    response = client.post("/api/v1/transform/preview", json={"source": source, "steps": []})
    assert response.status_code == 200, response.text
    assert response.json()["preview_data"] == [{"id": 0, "values": [False, None, ""]}]
    assert calls[0]["action"] == "get_table"
    assert calls[0]["payload"]["password"] == ""
    assert "use_agent" not in calls[0]["payload"] and "agent_id" not in calls[0]["payload"]


def test_core_adapter_log_redacts_connection_without_real_network(monkeypatch, capsys):
    import etl.extractors.db_extractor as module

    def broken(*args, **kwargs):
        raise ValueError(f"connection {URL} password {SECRET}")

    monkeypatch.setattr(module, "create_engine", broken)
    extractor = module.DB_Extractor(**{**CONNECTION, "password": SECRET})
    with pytest.raises(ValueError):
        extractor.connect()
    output = capsys.readouterr().out
    assert SECRET not in output and URL not in output
    assert "Error al conectar" in output


def test_agent_wire_error_is_sanitized(monkeypatch, capsys):
    import etl_agent

    sent = []

    class Socket:
        def __aiter__(self):
            async def messages():
                yield json.dumps({"request_id": "synthetic", "action": "get_table", "payload": {"password": SECRET}})
            return messages()

        async def send(self, message):
            sent.append(json.loads(message))

    def connect(*args, **kwargs):
        async def connections():
            yield Socket()
        return connections()

    async def broken(payload):
        raise ValueError(f"connection {URL} password {SECRET}")

    monkeypatch.setattr(etl_agent.websockets, "connect", connect)
    monkeypatch.setattr(etl_agent, "handle_get_table", broken)
    asyncio.run(etl_agent.agent_loop("https://synthetic", "synthetic"))
    assert sent[0]["status"] == "error" and sent[0]["request_id"] == "synthetic"
    output = json.dumps(sent) + capsys.readouterr().out
    assert SECRET not in output and URL not in output


def test_loader_log_redacts_driver_exception(monkeypatch, capsys):
    from types import SimpleNamespace
    from etl.loaders.db_loader import DB_Loader

    def broken(*args, **kwargs):
        raise ValueError(f"connection {URL} password {SECRET}")

    monkeypatch.setattr(pd.DataFrame, "to_sql", broken)
    engine = SimpleNamespace(url=SimpleNamespace(password=SECRET, get_backend_name=lambda: "postgresql"))
    with pytest.raises(ValueError):
        DB_Loader(engine).load_dimension(pd.DataFrame({"id": [1]}), "synthetic")
    output = capsys.readouterr().out
    assert SECRET not in output and URL not in output


def test_metadata_schema_warning_redacts_driver_exception(client, monkeypatch, capsys):
    class Extractor:
        def __init__(self, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get_table_names(self):
            return ["t"]

        def get_table_schema(self, table):
            raise ValueError(f"connection {URL} password {SECRET}")

    monkeypatch.setattr(extract_service, "DB_Extractor", Extractor)
    response = client.post("/api/v1/extract/database", json={**CONNECTION, "password": SECRET})
    assert response.status_code == 200
    assert response.json()["schema_preview"] == {"t": []}
    output = response.text + capsys.readouterr().out
    assert SECRET not in output and URL not in output
