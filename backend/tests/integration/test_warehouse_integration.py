"""PostgreSQL read-only SQL, HTTP and CLI/WebSocket parity; disposable fixtures only."""
import os
import subprocess
import sys
from decimal import Decimal
import httpx
import pytest
from sqlalchemy import BigInteger, Column, MetaData, Numeric, Table, select
from etl.extractors.schema_graph import identity
from etl.warehouse.execution import execute
from sqlalchemy.exc import DBAPIError
from etl.warehouse.execution import Budget, read_session
from etl.warehouse.settings import LIMITS
from .test_agent_integration import ROOT, live_backend_server, _wait_for_agent_status

pytestmark = pytest.mark.integration


def test_postgres_http_and_real_agent(pg_harness, run_prefix, live_backend_server):
    names = pg_harness.seed_warehouse(run_prefix)
    connection = pg_harness.config.to_connection_dto()
    agent_id = run_prefix + "_warehouse"
    process = subprocess.Popen([sys.executable, "etl_agent.py", "--server-url", live_backend_server, "--agent-id", agent_id], cwd=ROOT,
                               env={**os.environ, "PYTHONUTF8": "1"}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        _wait_for_agent_status(live_backend_server, agent_id, True)
        with httpx.Client(base_url=live_backend_server, timeout=120) as client:
            results = []
            for transport in ({}, {"use_agent": True, "agent_id": agent_id}):
                selected = {**connection, **transport}
                response = client.post("/api/v1/warehouse/catalog", json={"connection": selected})
                assert response.status_code == 200, "Warehouse catalog failed"
                catalog = response.json()
                tables = {t["table_name"]: t for t in catalog["tables"]}
                base, target = tables[names["fact"]], tables[names["dimension"]]
                rel = next(r for r in catalog["relationships"] if r["source_table_id"] == base["table_id"] and r["column_pairs"][0]["source_column"] == "dim_id")
                assert len(rel["column_pairs"]) == 2 and rel["selectable"]
                query = {"base_table_id": base["table_id"], "joins": [{"id": "d", "target_table_id": target["table_id"], "type": "LEFT", "via": {"kind": "foreign_key", "relationship_id": rel["id"]}}],
                         "metrics": [{"id": "total", "column": "amount", "aggregation": "SUM"}, {"id": "avg", "column": "amount", "aggregation": "AVG"}],
                         "dimensions": [{"id": "category", "field": {"relation": "d", "column": "category"}}], "order_by": [{"field_id": "total", "direction": "DESC"}], "limit": 1}
                response = client.post("/api/v1/warehouse/query", json={"connection": selected, "query": query})
                assert response.status_code == 200, "Warehouse aggregate failed"
                result = response.json()
                assert result["data"][0]["category"] == "B" and Decimal(result["data"][0]["total"]) == 90
                assert [Decimal(k["value"]) for k in result["summary_kpis"]] == [120, 40]
                assert result["filtered_rows"]["value"] == 3 and result["meta"]["consistency"] == "snapshot"
                assert response.headers["cache-control"] == "no-store"
                results.append(result["data"])
                selection = {key: query.get(key, []) for key in ("base_table_id", "joins", "filters")}
                spec = {"connection": selected, "selection": selection, "columns": [{"id": "id", "field": {"column": "id"}}, {"id": "amount", "field": {"column": "amount"}}],
                        "drilldown": [{"field": {"column": "occurred"}, "bucket": "month", "value": "2026-01"}]}
                response = client.post("/api/v1/warehouse/detail", json={**spec, "page_size": 1, "include_total": True})
                assert response.status_code == 200, "Warehouse detail failed"
                assert response.json()["pagination"]["total_records"]["value"] == 2
                response = client.post("/api/v1/warehouse/export", json={**spec, "mode": "detail", "format": "csv"})
                assert response.status_code == 200 and "30" not in response.text
                assert 'filename="reporte_bodega.csv"' in response.headers["content-disposition"]
                response = client.post("/api/v1/warehouse/export", json={**spec, "mode": "detail", "format": "json", "max_rows": 1})
                assert response.status_code == 413 and response.json()["code"] == "export_limit_exceeded"
            assert results[0] == results[1]
        with pytest.raises(DBAPIError):
            with read_session(pg_harness.engine, Budget(LIMITS)) as (conn, _):
                from sqlalchemy import MetaData, Table
                table = Table(names["fact"], MetaData(), autoload_with=conn)
                conn.execute(table.delete().where(table.c.id == -999))
        assert pg_harness.inspect_table(names["fact"])["count"] == 3
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill(); process.wait(timeout=5)


def test_real_postgres_precision_and_statement_timeout(pg_harness, run_prefix):
    name = pg_harness.register_table(run_prefix + "_precision")
    table = Table(name, MetaData(), Column("id", BigInteger, primary_key=True), Column("amount", Numeric(30, 8)))
    with pg_harness.engine.begin() as conn:
        table.create(conn)
        conn.execute(table.insert(), {"id": 9007199254740993, "amount": Decimal("9007199254740993.12345678")})
    q = {"base_table_id": identity("public", name), "metrics": [{"id": "total", "column": "amount", "aggregation": "SUM"}], "dimensions": [{"id": "key", "field": {"column": "id"}}]}
    result = execute("query", {"connection": pg_harness.config.to_connection_dto(), "query": q})
    assert result["data"] == [{"key": "9007199254740993", "total": "9007199254740993.12345678"}]
    assert result["columns"][0]["encoding"] == "integer_string"
    budget = Budget(LIMITS); budget.statement_ms = 20
    with pytest.raises(DBAPIError) as failure:
        with read_session(pg_harness.engine, budget) as (conn, _):
            conn.exec_driver_sql("SELECT pg_sleep(0.2)")
    assert failure.value.orig.pgcode == "57014"
    with pg_harness.engine.connect() as conn:
        assert conn.execute(select(table.c.id)).scalar_one() == 9007199254740993
