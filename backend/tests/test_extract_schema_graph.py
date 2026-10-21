import asyncio
from contextlib import contextmanager
from unittest.mock import Mock

import httpx
import pandas as pd
import pytest
from sqlalchemy import (Column, ForeignKeyConstraint, Integer, MetaData, String, Table,
                        create_engine, inspect)

from etl.extractors.db_extractor import DB_Extractor
from etl.extractors.schema_graph import identity, schema_graph
from services import extract_service
from services.agent_manager import agent_manager
from test_sources import CONNECTION


@pytest.fixture
def relational_engine(tmp_path):
    # Concurrent requests need independent physical connections, as in production.
    engine = create_engine("sqlite:///" + str(tmp_path / "relational.sqlite"), connect_args={"check_same_thread": False})
    metadata = MetaData()
    parent = Table("parent", metadata, Column("id", Integer, primary_key=True),
                   Column("version", Integer, primary_key=True), Column("code", String, unique=True))
    child = Table("Child with space", metadata, Column("id", Integer, primary_key=True),
                  Column("parent_id", Integer), Column("version", Integer), Column("other_code", String),
                  ForeignKeyConstraint(["parent_id", "version"], ["parent.id", "parent.version"], name="composite"),
                  ForeignKeyConstraint(["other_code"], ["parent.code"], name="unique_ref"),
                  ForeignKeyConstraint(["id"], ["Child with space.id"], name="self_ref"))
    Table("empty", metadata, Column("id", Integer, primary_key=True))
    metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(parent.insert(), [{"id": i, "version": 1, "code": str(i)} for i in range(12)])
        connection.execute(child.insert(), [{"id": i, "parent_id": i, "version": 1, "other_code": str(i)} for i in range(12)])
    yield engine
    engine.dispose()


@pytest.fixture
def adapter(monkeypatch, relational_engine):
    calls = []
    class Adapter(DB_Extractor):
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.engine = relational_engine
        def connect(self):
            calls.append("open")
        def close_connection(self):
            calls.append("close")
    monkeypatch.setattr(extract_service, "DB_Extractor", Adapter)
    return calls


def test_http_graph_preserves_composite_unique_and_self_keys(client, adapter):
    response = client.post("/api/v1/extract/database/schema-graph", json=CONNECTION)
    assert response.status_code == 200, response.text
    graph = response.json()
    assert graph["schema"] == "main"
    assert {n["table_name"] for n in graph["nodes"]} == {"parent", "Child with space", "empty"}
    edges = {e["constraint_name"]: e for e in graph["edges"]}
    assert edges["composite"]["column_pairs"] == [{"source_column": "parent_id", "target_column": "id"}, {"source_column": "version", "target_column": "version"}]
    assert edges["unique_ref"]["column_pairs"] == [{"source_column": "other_code", "target_column": "code"}]
    assert edges["self_ref"]["source_table_id"] == edges["self_ref"]["target_table_id"]
    child = next(n for n in graph["nodes"] if n["table_name"] == "Child with space")
    assert child["columns"][0]["is_pk"] and child["columns"][0]["is_fk"]
    assert all(isinstance(c["data_type"], str) for n in graph["nodes"] for c in n["columns"])
    assert adapter == ["open", "close"]
    assert client.post("/api/v1/extract/database/schema-graph", json=CONNECTION).json() == graph


@pytest.mark.parametrize("limit,expected", [(None, 5), (1, 1), (10, 10)])
def test_preview_limit_and_quoted_names(client, adapter, limit, expected):
    body = {**CONNECTION, "table_name": "Child with space"}
    if limit is not None:
        body["limit"] = limit
    response = client.post("/api/v1/extract/database/preview", json=body)
    assert response.status_code == 200, response.text
    sample = response.json()
    assert len(sample["preview_data"]) == sample["sample_rows"] == sample["total_rows"] == expected
    assert sample["limit"] == expected
    assert sample["columns"] == ["id", "parent_id", "version", "other_code"]
    assert adapter == ["open", "close"]


@pytest.mark.parametrize("limit", [0, -1, 11, 1.5, "10", True])
def test_invalid_limits_rejected_before_adapter(client, limit):
    response = client.post("/api/v1/extract/database/preview", json={**CONNECTION, "table_name": "parent", "limit": limit})
    assert response.status_code == 422


def test_empty_preview_keeps_columns_and_sql_input_cannot_drop_table(client, adapter, relational_engine):
    response = client.post("/api/v1/extract/database/preview", json={**CONNECTION, "table_name": "empty", "limit": 10})
    assert response.json()["columns"] == ["id"]
    assert response.json()["preview_data"] == []
    response = client.post("/api/v1/extract/database/preview", json={**CONNECTION, "table_name": "parent; DROP TABLE parent", "limit": 10})
    assert response.status_code == 400
    assert "parent" in inspect(relational_engine).get_table_names()
    assert adapter == ["open", "close", "open", "close"]


def test_empty_database_and_table_without_relations():
    engine = create_engine("sqlite://")
    try:
        assert schema_graph(engine)["nodes"] == []
        Table("isolated", MetaData(), Column("id", Integer)).create(engine)
        graph = schema_graph(engine)
        assert len(graph["nodes"]) == 1 and graph["edges"] == []
    finally:
        engine.dispose()


def test_core_sampler_preserves_custom_sample_sizes(relational_engine):
    # The HTTP preview caps at ten; the reusable library keeps its original API.
    extractor = DB_Extractor(**CONNECTION)
    extractor.engine = relational_engine
    assert len(extractor.sample_data("parent", 20)) == 12


def test_partial_reflection_and_external_reference(monkeypatch):
    import etl.extractors.schema_graph as module
    connection = Mock()
    @contextmanager
    def connect():
        yield connection
    inspector = Mock(default_schema_name="public")
    inspector.get_table_names.return_value = ["a", "b"]
    inspector.get_columns.side_effect = lambda name, **kwargs: [{"name": "id", "type": Integer(), "nullable": False}]
    inspector.get_pk_constraint.side_effect = RuntimeError("private driver details")
    inspector.get_foreign_keys.side_effect = lambda name, **kwargs: ([{"name": None, "constrained_columns": ["id"], "referred_schema": "external", "referred_table": "a", "referred_columns": ["code"]}] if name == "a" else [])
    monkeypatch.setattr(module, "inspect", lambda conn: inspector)
    graph = module.schema_graph(Mock(connect=connect))
    inspector.get_table_names.assert_called_once_with(schema="public")
    inspector.get_columns.assert_any_call("a", schema="public")
    assert len(graph["warnings"]) == 2
    assert graph["edges"][0]["external"] is True
    external = next(n for n in graph["nodes"] if n["schema"] == "external")
    assert external["selectable"] is False
    assert external["columns"] == [{"name": "code", "data_type": None, "nullable": None, "is_pk": None, "is_fk": None}]
    assert "private" not in str(graph)
    assert identity("a.b", "c") != identity("a", "b.c")


@pytest.mark.parametrize("route", ["schema-graph", "preview"])
def test_new_read_errors_hide_password_and_close(client, monkeypatch, route):
    secret = "private-test-password"
    class Broken:
        def __init__(self, **kwargs):
            raise RuntimeError("postgresql://user:" + secret + "@host/db")
    monkeypatch.setattr(extract_service, "DB_Extractor", Broken)
    response = client.post("/api/v1/extract/database/" + route, json={**CONNECTION, "password": secret, "table_name": "parent"})
    assert response.status_code == 500
    assert secret not in response.text and "postgresql://" not in response.text


def test_agent_graph_and_preview_share_real_core(client, monkeypatch, relational_engine):
    import etl_agent
    class Adapter:
        def __init__(self, **kwargs):
            self.engine = relational_engine
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def sample_data(self, table, limit):
            return pd.DataFrame({"id": list(range(limit))})
    monkeypatch.setattr(etl_agent, "DB_Extractor", Adapter)
    async def send(agent_id, action, payload):
        assert agent_id == "synthetic"
        assert "agent_id" not in payload and "use_agent" not in payload
        handler = {"get_schema_graph": etl_agent.handle_get_schema_graph, "get_preview": etl_agent.handle_get_preview}[action]
        return {"status": "success", "data": await handler(payload)}
    monkeypatch.setattr(agent_manager, "send_command_and_wait", send)
    body = {**CONNECTION, "use_agent": True, "agent_id": "synthetic"}
    assert client.post("/api/v1/extract/database/schema-graph", json=body).json() == schema_graph(relational_engine)
    response = client.post("/api/v1/extract/database/preview", json={**body, "table_name": "parent", "limit": 10})
    assert response.json()["sample_rows"] == 10
    assert client.post("/api/v1/extract/database/schema-graph", json={**body, "agent_id": None}).status_code == 400


def test_concurrent_graph_and_preview_are_not_mixed(adapter):
    from backend.main import app
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            graph, sample = await asyncio.gather(
                client.post("/api/v1/extract/database/schema-graph", json=CONNECTION),
                client.post("/api/v1/extract/database/preview", json={**CONNECTION, "table_name": "parent", "limit": 10}))
            assert graph.status_code == sample.status_code == 200
            assert "nodes" in graph.json() and sample.json()["sample_rows"] == 10
    asyncio.run(run())
    assert adapter.count("open") == adapter.count("close") == 2
