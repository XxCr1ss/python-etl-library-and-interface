"""Actual CLI, actual WebSocket and disposable PostgreSQL, not an RPC mock."""
import os
import subprocess
import sys

import httpx
import pytest
import pandas as pd

from .test_agent_integration import ROOT, live_backend_server, _wait_for_agent_status

pytestmark = pytest.mark.integration


def test_real_agent_target_and_same_agent_source(live_backend_server, pg_harness, run_prefix, tmp_path):
    src = pg_harness.register_table(f"{run_prefix}_src")
    dim = pg_harness.register_table(f"{run_prefix}_dim")
    fact = pg_harness.register_table(f"{run_prefix}_fact")
    pg_harness.seed_table(src, [{"id": 10, "amount": 150}, {"id": 20, "amount": 250}])
    agent_id = f"{run_prefix}_load"
    process = subprocess.Popen([sys.executable, "etl_agent.py", "--allow-load", "--server-url", live_backend_server,
                                "--agent-id", agent_id], cwd=ROOT, env={**os.environ, "PYTHONUTF8": "1"},
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        _wait_for_agent_status(live_backend_server, agent_id, True)
        target = {**pg_harness.config.to_connection_dto(), "use_agent": True, "agent_id": agent_id}
        with httpx.Client(base_url=live_backend_server, timeout=30) as client:
            assert client.post("/api/v1/load/test-connection", json=target).status_code == 200
            request = {"source": {"type": "database", **target, "table_name": src}, "target_connection": target,
                       "recipe": [], "load_config": {"table_name": dim, "table_type": "dimension", "if_exists": "replace"}}
            result = client.post("/api/v1/load/execute", json=request)
            assert result.status_code == 200, result.text
            assert pg_harness.inspect_table(dim)["count"] == 2
            request["recipe"] = [{"type": "rename_columns", "params": {"columns": {"id": "Cliente ID"}}}]
            request["load_config"] = {"table_name": fact, "table_type": "fact", "if_exists": "append", "foreign_keys": {"Cliente ID": [dim, "id"]}}
            for total in (2, 4):
                result = client.post("/api/v1/load/execute", json=request)
                assert result.status_code == 200, result.text
                assert result.json()["total_rows"] == total
            assert pg_harness.inspect_table(fact)["count"] == 4
            request["load_config"]["if_exists"] = "fail"
            assert client.post("/api/v1/load/execute", json=request).status_code == 400
            assert pg_harness.inspect_table(fact)["count"] == 4
            # Invalid FK must not append, and public diagnostics must omit source rows.
            pg_harness.seed_table(src, [{"id": 999, "amount": 123456789}])
            request["load_config"]["if_exists"] = "append"
            result = client.post("/api/v1/load/execute", json=request)
            assert result.status_code == 400 and "123456789" not in result.text
            assert pg_harness.inspect_table(fact)["count"] == 4
            # Zero-row replace retains schema and empties destination.
            request["load_config"] = {"table_name": dim, "table_type": "dimension", "if_exists": "replace"}
            request["recipe"] = [{"type": "filter_value", "params": {"column": "id", "value": -1}}]
            result = client.post("/api/v1/load/execute", json=request)
            assert result.status_code == 200, result.text
            assert pg_harness.inspect_table(dim)["count"] == 0
            # A real UTF-8 write above websockets' former 1 MiB receive default.
            large_source = tmp_path / "large_load.csv"
            pd.DataFrame({"id": range(6000), "label": ["á" * 200] * 6000}).to_csv(large_source, index=False)
            request["source"] = {"type": "file", "filepath": str(large_source)}
            request["recipe"] = []
            result = client.post("/api/v1/load/execute", json=request)
            assert result.status_code == 200, result.text
            assert pg_harness.inspect_table(dim)["count"] == result.json()["total_rows"] == 6000
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
