"""Real PostgreSQL + HTTP + CLI agent. Only harness-registered disposable tables."""
import os
import datetime as dt
import subprocess
import sys
from decimal import Decimal
from uuid import uuid4

import httpx
import pandas as pd
import pytest

from etl.schema import LoadSchemaSpec, persist_schema
from etl.extractors.schema_graph import identity
from .test_agent_integration import ROOT, live_backend_server, _wait_for_agent_status

pytestmark = pytest.mark.integration


def test_general_schema_analytics_and_multi_output_job(pg_harness, run_prefix, live_backend_server):
    source_name = pg_harness.register_table(run_prefix + "_source")
    direct_name = pg_harness.register_table(run_prefix + "_direct")
    agent_name = pg_harness.register_table(run_prefix + "_agent")
    job_first = pg_harness.register_table(run_prefix + "_job1")
    job_second = pg_harness.register_table(run_prefix + "_job2")
    schema = {"version": 1, "grain": "one sale or tuition payment", "columns": [
        {"name": "id", "type": "integer", "nullable": False}, {"name": "entity", "type": "integer", "nullable": False},
        {"name": "amount", "type": "decimal", "precision": 30, "scale": 8}, {"name": "active", "type": "boolean"}, {"name": "occurred", "type": "datetime", "timezone": True}], "primary_key": ["id"], "indexes": [["entity"]]}
    frame = pd.DataFrame({"id": pd.Series([9007199254740993, 2, 3], dtype="object"), "entity": [1, 1, 2],
                          "amount": [Decimal("10.12345678"), Decimal("30.12345678"), Decimal("60.12345678")], "active": pd.Series([True, None, False], dtype="object"), "occurred": [dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc), None, dt.datetime(2026, 1, 3, tzinfo=dt.timezone.utc)]})
    persist_schema(frame, pg_harness.engine, source_name, "fail", LoadSchemaSpec.model_validate(schema))
    config = pg_harness.config.to_connection_dto()
    agent_id = run_prefix + "_general"
    process = subprocess.Popen([sys.executable, "etl_agent.py", "--server-url", live_backend_server, "--agent-id", agent_id, "--allow-load"],
                               cwd=ROOT, env={**os.environ, "PYTHONUTF8": "1"}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    try:
        _wait_for_agent_status(live_backend_server, agent_id, True)
        with httpx.Client(base_url=live_backend_server, timeout=180) as client:
            for name, transport in [(direct_name, {}), (agent_name, {"use_agent": True, "agent_id": agent_id})]:
                selected = {**config, **transport}
                source = {**selected, "type": "database", "table_name": source_name, "read_mode": "exact"}
                payload = {"source": source, "recipe": [], "target_connection": selected, "load_config": {"table_name": name, "table_type": "fact", "if_exists": "fail", "schema_spec": schema}}
                preview = client.post("/api/v1/load/schema-preview", json=payload)
                assert preview.status_code == 200, "Structured preview failed"
                assert preview.json()["total_rows"] == 0
                loaded = client.post("/api/v1/load/execute", json=payload)
                assert loaded.status_code == 200, "Structured load failed"
                assert loaded.json()["total_rows"] == 3 and loaded.json()["submitted_rows"] == 3
                from sqlalchemy import inspect
                assert inspect(pg_harness.engine).get_pk_constraint(name)["constrained_columns"] == ["id"]
                spec = {"version": 1, "title": "Sales or education", "grain": "one payment", "selection": {"base_table_id": identity("public", name)},
                        "measures": [{"id": "total", "aggregation": "SUM", "value": {"field": {"column": "amount"}}, "unit": "money"},
                                     {"id": "entities", "aggregation": "COUNT_DISTINCT", "value": {"field": {"column": "entity"}}},
                                     {"id": "median", "aggregation": "PERCENTILE", "value": {"field": {"column": "amount"}}, "percentile": 0.5, "unit": "money"}],
                        "formulas": [{"id": "mean", "label": "Per entity", "expression": "total / entities"}]}
                response = client.post("/api/v1/warehouse/analyze", json={"connection": selected, "analysis": spec})
                assert response.status_code == 200, "Advanced analysis failed"
                row = response.json()["data"][0]
                assert Decimal(row["total"]) == Decimal("100.37037034")
                assert Decimal(row["median"]) == Decimal("30.12345678")
                assert Decimal(row["mean"]) == Decimal("50.18518517")
                assert response.json()["units"]["mean"] == "money/count"
                calendar = {"version": 1, "title": "Zoned events", "grain": "one payment", "timezone": "America/Bogota", "selection": spec["selection"],
                            "measures": [{"id": "events", "aggregation": "COUNT_ROWS"}], "dimensions": [{"id": "day", "field": {"column": "occurred"}, "bucket": "day"}],
                            "calendar": {"dimension_id": "day", "start": "2025-12-31", "end": "2026-01-02", "observed": True}}
                calendar_response = client.post("/api/v1/warehouse/analyze", json={"connection": selected, "analysis": calendar})
                assert calendar_response.status_code == 200, "Zoned calendar failed"
                assert [r["events"] for r in calendar_response.json()["data"]] == [1, 0, 1]
                assert calendar_response.json()["meta"]["temporal_context"]["timezone"] == "America/Bogota"
                report = client.post("/api/v1/warehouse/report", json={"connection": selected, "analyses": [spec, spec]})
                assert report.status_code == 200, "Report failed"
                assert len({r["meta"]["generated_at"] for r in report.json()["results"]}) == 1
                pair_spec = {"version": 1, "title": "Cooccurrence", "grain": "one item per buyer", "selection": spec["selection"], "pairs": {"basket": {"column": "entity"}, "item": {"column": "id"}}}
                paired = client.post("/api/v1/warehouse/analyze", json={"connection": selected, "analysis": pair_spec})
                assert paired.status_code == 200, "Pairs failed"
                assert Decimal(paired.json()["data"][0]["support"]) == Decimal("0.5")
                assert paired.json()["data"][0]["item_b"] == "9007199254740993"
            definition = {"version": 1, "title": "Two reusable outputs", "nodes": [
                {"id": "first", "source_ref": "payments", "output": {"target_ref": "direct", "table_name": job_first, "table_type": "fact", "schema_spec": schema}},
                {"id": "second", "input_node": "first", "preserve_rows": True, "preserve_sums": ["amount"], "output": {"target_ref": "agent", "table_name": job_second, "table_type": "fact", "schema_spec": schema}}]}
            request = {"definition": definition, "sources": {"payments": {**config, "type": "database", "table_name": source_name, "read_mode": "exact"}},
                       "targets": {"direct": config, "agent": {**config, "use_agent": True, "agent_id": agent_id}}, "run_id": str(uuid4()), "preview_only": False}
            response = client.post("/api/v1/jobs/execute", json=request)
            assert response.status_code == 200, "Job request failed"
            assert response.json()["status"] == "success", "Job did not confirm every output"
            assert response.json()["nodes"]["second"]["total_rows"] == 3
            resumed = client.post("/api/v1/jobs/execute", json={**request, "run_id": str(uuid4()), "resume_run_id": request["run_id"]})
            assert resumed.status_code == 200 and resumed.json()["status"] == "success", "Job reconciliation failed"
            assert resumed.json()["nodes"]["second"]["reused"]
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill(); process.wait(timeout=5)


def test_add_keys_to_existing_warehouse_without_reloading_rows(pg_harness, run_prefix):
    import sqlalchemy as sa
    parent_name = pg_harness.register_table(run_prefix + "_parent")
    child_name = pg_harness.register_table(run_prefix + "_child")
    meta = sa.MetaData()
    parent = sa.Table(parent_name, meta, sa.Column("id", sa.BigInteger), sa.Column("code", sa.Text))
    child = sa.Table(child_name, meta, sa.Column("id", sa.BigInteger), sa.Column("parent_id", sa.BigInteger))
    meta.create_all(pg_harness.engine)
    with pg_harness.engine.begin() as conn:
        conn.execute(parent.insert(), [{"id": 1, "code": "A"}, {"id": 2, "code": "B"}])
        conn.execute(child.insert(), [{"id": 10, "parent_id": 1}, {"id": 11, "parent_id": None}])
    parent_frame = pd.DataFrame({"id": [1, 2], "code": ["A", "B"]})
    parent_schema = LoadSchemaSpec.model_validate({"grain": "one entity", "allow_add_constraints": True,
        "columns": [{"name": "id", "type": "integer", "nullable": False}, {"name": "code", "type": "string", "nullable": False}], "primary_key": ["id"], "unique_keys": [["code"]]})
    preview = persist_schema(parent_frame, pg_harness.engine, parent_name, "schema_only", parent_schema, True)
    assert "add_primary_key" in preview["schema_actions"] and preview["submitted_rows"] == 0
    assert not sa.inspect(pg_harness.engine).get_pk_constraint(parent_name)["constrained_columns"]
    prepared = persist_schema(parent_frame, pg_harness.engine, parent_name, "schema_only", parent_schema)
    assert prepared["total_rows"] == 2 and prepared["submitted_rows"] == 0
    assert sa.inspect(pg_harness.engine).get_pk_constraint(parent_name)["constrained_columns"] == ["id"]
    child_schema = LoadSchemaSpec.model_validate({"grain": "one event", "allow_add_constraints": True,
        "columns": [{"name": "id", "type": "integer", "nullable": False}, {"name": "parent_id", "type": "integer"}], "primary_key": ["id"],
        "foreign_keys": [{"columns": ["parent_id"], "target_table": parent_name, "target_columns": ["id"]}]})
    child_frame = pd.DataFrame({"id": pd.Series([10, 11], dtype="object"), "parent_id": pd.Series([1, None], dtype="object")})
    assert persist_schema(child_frame, pg_harness.engine, child_name, "schema_only", child_schema)["total_rows"] == 2
    assert sa.inspect(pg_harness.engine).get_foreign_keys(child_name)[0]["referred_table"] == parent_name
    with pg_harness.engine.connect() as conn:
        assert conn.execute(sa.select(child.c.parent_id).where(child.c.id == 11)).scalar_one() is None
    assert not persist_schema(child_frame, pg_harness.engine, child_name, "schema_only", child_schema)["schema_actions"][1:]
