"""Resume reconciles real destination contents before reusing an output."""
from uuid import uuid4

import pandas as pd
import pytest

pytestmark = pytest.mark.integration


def test_resume_reuses_matching_output_and_blocks_changed_destination(client, pg_harness, run_prefix, tmp_path, monkeypatch):
    monkeypatch.setenv("ETL_JOB_MANIFEST_DIR", str(tmp_path / "manifests"))
    table = pg_harness.register_table(run_prefix + "_resume")
    source = tmp_path / "source.csv"
    source.write_text("id\n1\n2\n", encoding="utf-8")
    schema = {"grain": "one row", "columns": [{"name": "id", "type": "integer", "nullable": False}], "primary_key": ["id"]}
    body = {"run_id": str(uuid4()), "preview_only": False,
            "definition": {"version": 1, "title": "Recovery", "nodes": [
                {"id": "load", "source_ref": "input", "output": {"target_ref": "output", "table_name": table, "schema_spec": schema}}]},
            "sources": {"input": {"type": "file", "filepath": str(source)}},
            "targets": {"output": pg_harness.config.to_connection_dto()}}
    endpoint = "http://localhost/api/v1/jobs/execute"
    first = client.post(endpoint, json=body)
    assert first.status_code == 200, first.text
    assert first.json()["status"] == "success", first.text
    replay = client.post(endpoint, json=body)
    assert replay.json()["run_id"] == body["run_id"]
    resumed = client.post(endpoint, json={**body, "run_id": str(uuid4()), "resume_run_id": body["run_id"]})
    assert resumed.json()["status"] == "success", resumed.text
    assert resumed.json()["nodes"]["load"]["reused"] is True
    pd.DataFrame({"id": [999]}).to_sql(table, pg_harness.engine, if_exists="append", index=False)
    refused = client.post(endpoint, json={**body, "run_id": str(uuid4()), "resume_run_id": body["run_id"]})
    assert refused.json()["status"] == "partial", refused.text
    assert pg_harness.inspect_table(table)["count"] == 3
    assert pd.read_sql_table(table, pg_harness.engine).id.tolist() == [1, 2, 999]
    source.write_text("id\n4\n", encoding="utf-8")
    changed = client.post(endpoint, json={**body, "run_id": str(uuid4()), "resume_run_id": body["run_id"]})
    assert changed.json()["status"] == "failed", changed.text
    assert pg_harness.inspect_table(table)["count"] == 3
