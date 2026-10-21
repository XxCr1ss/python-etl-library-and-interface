"""Real PostgreSQL constraints, direct HTTP and real CLI agent parity."""
import os
import subprocess
import sys

import httpx
import pytest

from .test_agent_integration import (ROOT, live_backend_server, _wait_for_agent_status)

pytestmark = pytest.mark.integration


def check_relations(graph, names):
    nodes = {n["table_name"]: n for n in graph["nodes"]}
    child = nodes[names["child"]]
    assert child["selectable"] and child["schema"] == "public"
    edges = [e for e in graph["edges"] if e["source_table_id"] == child["id"]]
    assert len(edges) == 3
    assert any(e["column_pairs"] == [{"source_column": "parent_id", "target_column": "id"},
                                      {"source_column": "version", "target_column": "version"}] for e in edges)
    assert any(e["source_table_id"] == e["target_table_id"] for e in edges)
    assert any(e["column_pairs"] == [{"source_column": "code", "target_column": "code"}] for e in edges)


def test_real_schema_graph_direct_and_cli_agent(pg_harness, run_prefix, live_backend_server):
    names = pg_harness.seed_diagram(run_prefix)
    body = pg_harness.config.to_connection_dto()
    # Do not capture process output or credentials in artifacts.
    agent_id = run_prefix + "_diagram_agent"
    proc = subprocess.Popen([sys.executable, "etl_agent.py"], cwd=ROOT,
                            env={**os.environ, "PYTHONUTF8": "1"}, stdin=subprocess.PIPE,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            text=True, encoding="utf-8")
    try:
        proc.stdin.write(live_backend_server + "\n" + agent_id + "\n")
        proc.stdin.flush()
        _wait_for_agent_status(live_backend_server, agent_id, True)
        with httpx.Client(base_url=live_backend_server, timeout=20) as client:
            direct = client.post("/api/v1/extract/database/schema-graph", json=body)
            assert direct.status_code == 200
            check_relations(direct.json(), names)
            hybrid = {**body, "use_agent": True, "agent_id": agent_id}
            remote = client.post("/api/v1/extract/database/schema-graph", json=hybrid)
            assert remote.status_code == 200
            assert remote.json() == direct.json()
            for connection in (body, hybrid):
                sample = client.post("/api/v1/extract/database/preview", json={**connection, "table_name": names["child"], "limit": 10})
                assert sample.status_code == 200
                assert sample.json()["preview_data"] == [{"id": 1, "parent_id": 1, "version": 1, "code": "sample"}]
                assert sample.json()["sample_rows"] == 1
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)
