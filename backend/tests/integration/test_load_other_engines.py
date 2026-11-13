"""Opt-in disposable MySQL/Oracle fixtures; never infer coverage from PostgreSQL."""
import os
import subprocess
import sys
import uuid

import httpx
import pandas as pd
import pytest
from sqlalchemy import MetaData, Table, inspect

import etl_agent
from etl import DB_Extractor
from etl.load_execution import persist_and_verify
from etl.load_transport import LoadReconciliationRequired, encode_dataset
from etl.schema_dialects import publication_names
from .test_agent_integration import ROOT, _wait_for_agent_status, live_backend_server

pytestmark = pytest.mark.integration


@pytest.fixture(params=["mysql", "oracle"])
def disposable_engine(request):
    engine = request.param
    prefix = f"ETL_TEST_{engine.upper()}_"
    required = ["HOST", "PORT", "NAME", "USER", "PASSWORD"] + (["SERVICE_NAME"] if engine == "oracle" else [])
    if not any(key.startswith(prefix) for key in os.environ):
        if engine in os.environ.get("ETL_REQUIRED_TEST_ENGINES", "").split(","):
            pytest.fail(f"Falta la instancia obligatoria {engine} ({prefix}*).")
        pytest.skip(f"No se configuró una base descartable {engine} ({prefix}*).")
    if any(prefix + key not in os.environ for key in required):
        pytest.fail(f"Configuración de prueba {engine} incompleta.")
    values = {key: os.environ[prefix + key] for key in required}
    if not values["NAME"].lower().startswith("etl_test") or (engine == "oracle" and not values["USER"].lower().startswith("etl_test")):
        pytest.fail("Las pruebas requieren base etl_test y, en Oracle, usuario/esquema etl_test.")
    config = {"db_type": engine, "host": values["HOST"], "port": int(values["PORT"]), "database": values["NAME"],
              "user": values["USER"], "password": values["PASSWORD"], "service_name": values.get("SERVICE_NAME")}
    tables = [f"etl_e2e_{uuid.uuid4().hex[:8]}_{suffix}" for suffix in ("dim", "fact")]
    with DB_Extractor(**config, connect_timeout=10) as extractor:
        try:
            yield config, tables
        finally:
            with extractor.engine.begin() as conn:
                owned = [name for table in tables for name in (table, *publication_names(table))]
                for name in reversed(owned):
                    table = Table(name, MetaData())
                    table.drop(conn, checkfirst=True)


def test_typed_agent_dimensions_and_foreign_keys(disposable_engine):
    config, (dimension, fact) = disposable_engine
    def load(frame, table, kind, mode, keys=None):
        return etl_agent._execute_load({"load_protocol_version": 1, "target_connection": config,
            "load_config": {"table_name": table, "table_type": kind, "if_exists": mode, "foreign_keys": keys},
            "dataset": encode_dataset(frame)}, True)
    frame = pd.DataFrame({"id": [1, 2]})
    assert load(frame, dimension, "dimension", "replace")["total_rows"] == 2
    assert load(frame, fact, "fact", "append", {"id": [dimension, "id"]})["total_rows"] == 2
    assert load(frame, fact, "fact", "append", {"id": [dimension, "id"]})["total_rows"] == 4
    with pytest.raises(ValueError):
        load(pd.DataFrame({"id": [999]}), fact, "fact", "append", {"id": [dimension, "id"]})
    with pytest.raises(ValueError):
        load(frame, fact, "fact", "fail")


def test_structured_modes_and_physical_keys(disposable_engine):
    config, (dimension, fact) = disposable_engine
    schema = {"grain": "una fila por código", "columns": [{"name": "id", "type": "integer", "nullable": False},
        {"name": "code", "type": "string", "nullable": False}, {"name": "active", "type": "boolean"}],
        "primary_key": ["id"], "unique_keys": [["code"]], "indexes": [["active"]]}
    frame = pd.DataFrame({"id": [1, 2], "code": ["001", "002"], "active": [True, None]})

    def load(data, table=dimension, mode="append", *, spec=schema, preview=False, agent=False):
        load_config = {"table_name": table, "table_type": "dimension", "if_exists": mode,
                       "schema_spec": spec, "preview_only": preview}
        if agent:
            return etl_agent._execute_load({"load_protocol_version": 1, "target_connection": config,
                "load_config": load_config, "dataset": encode_dataset(data)}, True)
        return persist_and_verify(data, config, load_config)

    assert load(frame, mode="fail", preview=True)["previous_rows"] == 0
    assert load(frame, mode="fail")["total_rows"] == 2
    assert load(pd.DataFrame({"id": [3], "code": ["003"], "active": [False]}), agent=True)["total_rows"] == 3
    assert load(frame, mode="reload")["total_rows"] == 2
    assert load(frame.iloc[:1], mode="replace")["total_rows"] == 1
    child = {**schema, "foreign_keys": [{"columns": ["id"], "target_table": dimension, "target_columns": ["id"]}]}
    assert load(frame.iloc[:1], fact, mode="schema_only", spec=child)["total_rows"] == 0
    assert load(frame.iloc[:1], fact, spec=child, agent=True)["total_rows"] == 1
    with DB_Extractor(**config) as extractor:
        metadata = inspect(extractor.engine)
        assert metadata.get_pk_constraint(dimension)["constrained_columns"] == ["id"]
        assert metadata.get_foreign_keys(fact)[0]["referred_table"] == dimension
    with pytest.raises(ValueError, match="referencias"):
        load(frame.iloc[1:], fact, spec=child)
    with pytest.raises(ValueError, match="dependencias"):
        load(frame, mode="replace")


def test_unpublished_stage_blocks_retry_without_modifying_existing_rows(disposable_engine):
    config, (dimension, _) = disposable_engine
    frame = pd.DataFrame({"id": [1]})
    request = {"table_name": dimension, "table_type": "dimension", "if_exists": "fail", "schema_spec": {
        "grain": "una fila por ID", "columns": [{"name": "id", "type": "integer"}], "primary_key": ["id"]}}
    assert persist_and_verify(frame, config, request)["total_rows"] == 1
    stage, _ = publication_names(dimension)
    with DB_Extractor(**config) as extractor:
        frame.to_sql(stage, extractor.engine, index=False)
        with pytest.raises(LoadReconciliationRequired, match=stage):
            persist_and_verify(frame, config, {**request, "if_exists": "replace"})
        assert extractor.get_table(dimension)["id"].tolist() == [1]


def test_structured_http_and_live_agent(disposable_engine, live_backend_server, tmp_path):
    config, (dimension, fact) = disposable_engine
    schema = {"grain": "una fila por código", "columns": [{"name": "id", "type": "integer"},
        {"name": "amount", "type": "decimal", "precision": 24, "scale": 4}], "primary_key": ["id"]}
    source = tmp_path / "typed.csv"
    source.write_text("id,amount\n1,1.1250\n2,3.6250\n", encoding="utf-8")
    agent_id = f"{dimension}_live"
    process = subprocess.Popen([sys.executable, "etl_agent.py", "--allow-load", "--server-url", live_backend_server,
                                "--agent-id", agent_id], cwd=ROOT, env={**os.environ, "PYTHONUTF8": "1"},
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        _wait_for_agent_status(live_backend_server, agent_id, True)
        with httpx.Client(base_url=live_backend_server, timeout=30) as client:
            for name, transport in [(dimension, {}), (fact, {"use_agent": True, "agent_id": agent_id})]:
                target = {**config, **transport}
                request = {"source": {"type": "file", "filepath": str(source), "read_mode": "exact"},
                           "target_connection": target, "recipe": [], "load_config": {
                               "table_name": name, "table_type": "dimension", "if_exists": "fail", "schema_spec": schema}}
                preview = client.post("/api/v1/load/schema-preview", json=request)
                assert preview.status_code == 200, preview.text
                assert preview.json()["schema_actions"] == ["create_table", "insert_rows", "publish_table"]
                result = client.post("/api/v1/load/execute", json=request)
                assert result.status_code == 200, result.text
                assert result.json()["total_rows"] == 2
                catalog = client.post("/api/v1/warehouse/catalog", json={"connection": target})
                assert catalog.status_code == 200, catalog.text
                base_id = next(t["table_id"] for t in catalog.json()["tables"] if t["table_name"].lower() == name)
                analysis = {"title": "Ventas", "grain": "una venta", "selection": {"base_table_id": base_id},
                            "measures": [{"id": "n", "aggregation": "COUNT_ROWS"}]}
                result = client.post("/api/v1/warehouse/analyze", json={"connection": target, "analysis": analysis})
                assert result.status_code == 200, result.text
                assert result.json()["data"] == [{"n": 2}]
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
