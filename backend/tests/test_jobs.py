import asyncio
import copy
from uuid import uuid4

import pandas as pd
import pytest

from etl.jobs import JobDefinition, execute_job


def definition():
    schema = {"grain": "one student", "columns": [{"name": "id", "type": "integer", "nullable": False}], "primary_key": ["id"]}
    return {"version": 1, "title": "Education", "nodes": [
        {"id": "first", "source_ref": "students", "recipe": [{"type": "drop_duplicates", "params": {"subset": ["id"]}}], "output": {"target_ref": "warehouse", "table_name": "students", "schema_spec": schema}},
        {"id": "second", "input_node": "first", "preserve_rows": True, "output": {"target_ref": "warehouse", "table_name": "enrollments", "schema_spec": schema}},
    ]}


def test_dag_validates_all_nodes_before_any_write_and_records_partial():
    events, snapshots = [], []
    async def load(alias):
        events.append("extract")
        return pd.DataFrame({"id": [1, 1, 2]})
    async def persist(node, frame):
        events.append(node.id)
        assert snapshots[-1]["nodes"]["second"]["output_rows"] == 2
        if node.id == "second":
            raise TimeoutError()
        return {"status": "success", "total_rows": len(frame)}
    result = asyncio.run(execute_job(definition(), load, persist, lambda m: snapshots.append(copy.deepcopy(m)), {"warehouse": "identity"}))
    assert events == ["extract", "first", "second"]
    assert result["status"] == "partial"
    assert result["nodes"]["first"]["status"] == "success"
    assert result["nodes"]["second"]["status"] == "unknown"
    assert "id" not in result["nodes"]["first"]  # No source rows in the manifest.


def test_preview_has_no_writes_and_cannot_claim_completed_warehouse():
    async def load(alias): return pd.DataFrame({"id": [1, 2]})
    async def forbidden(*args): pytest.fail("Preview must never write")
    result = asyncio.run(execute_job(definition(), load, forbidden, lambda _: None, {}, preview=True))
    assert result["status"] == "validated" and result["preview_only"]


def test_failed_conservation_blocks_all_outputs():
    d = definition()
    d["nodes"][0]["preserve_rows"] = True
    async def load(alias): return pd.DataFrame({"id": [1, 1]})
    async def forbidden(*args): pytest.fail("Checks precede writes")
    result = asyncio.run(execute_job(d, load, forbidden, lambda _: None, {}))
    assert result["status"] == "failed" and result["nodes"]["second"]["status"] == "blocked"


def test_resume_requires_unchanged_inputs_and_reconciles_writes():
    written = []
    async def load(alias): return pd.DataFrame({"id": [1, 2]})
    async def persist(node, frame):
        written.append(node.id)
        return {"status": "success", "total_rows": len(frame)}
    first = asyncio.run(execute_job(definition(), load, persist, lambda _: None, {"warehouse": "same"}))
    async def verify(node, frame, prior): return True
    second = asyncio.run(execute_job(definition(), load, persist, lambda _: None, {"warehouse": "same"}, previous=first, verify_output=verify))
    assert written == ["first", "second"] and second["status"] == "success"
    assert second["nodes"]["second"]["reused"]
    async def refuse(*args): return False
    uncertain = asyncio.run(execute_job(definition(), load, persist, lambda _: None, {"warehouse": "same"}, previous=first, verify_output=refuse))
    assert uncertain["status"] == "partial" and written == ["first", "second"]
    async def changed(alias): return pd.DataFrame({"id": [3]})
    changed_result = asyncio.run(execute_job(definition(), changed, persist, lambda _: None, {"warehouse": "same"}, previous=first, verify_output=verify))
    assert changed_result["status"] == "failed" and written == ["first", "second"]


def test_invalid_graphs_and_embedded_connections_are_rejected():
    d = definition()
    d["nodes"][0]["depends_on"] = ["second"]
    with pytest.raises(ValueError): JobDefinition.model_validate(d)
    d = definition()
    d["nodes"][0]["recipe"] = [{"type": "left_join", "params": {"right_source": {"password": "never"}, "on": "id"}}]
    with pytest.raises(ValueError): JobDefinition.model_validate(d)
    d["nodes"][0]["recipe"] = [{"type": "add_new_column", "params": {"expression": "anything"}}]
    with pytest.raises(ValueError): JobDefinition.model_validate(d)


def test_join_and_union_budgets_reject_before_materialization():
    from etl.recipe import apply_transformation_steps
    from etl.load_transport import LoadValidationError
    frame = pd.DataFrame({"id": [1] * 40})
    async def source(_): return frame
    with pytest.raises(LoadValidationError):
        asyncio.run(apply_transformation_steps(frame, [{"type": "left_join", "params": {"right_source": {"source_ref": "source"}, "on": "id"}}], source, max_rows=100))
    with pytest.raises(LoadValidationError):
        asyncio.run(apply_transformation_steps(frame, [{"type": "union", "params": {"secondary_source": {"source_ref": "source"}}}], source, max_rows=50))


def test_definition_api_and_uuid_job_request(client, monkeypatch, tmp_path):
    from services import job_service, transform_service
    monkeypatch.setenv("ETL_JOB_MANIFEST_DIR", str(tmp_path / "manifests"))
    async def source(*args, **kwargs): return pd.DataFrame({"id": [1, 2]})
    monkeypatch.setattr(transform_service, "load_source_df", source)
    body = {"definition": definition(), "sources": {"students": {"type": "date_dimension", "start_year": 2026, "end_year": 2026}},
            "targets": {"warehouse": {"db_type": "postgresql", "host": "localhost", "database": "synthetic", "user": "etl", "password": "not-persisted"}},
            "run_id": str(uuid4()), "preview_only": True}
    validated = client.post("http://localhost/api/v1/jobs/definition", json=body["definition"])
    assert validated.status_code == 200
    response = client.post("http://localhost/api/v1/jobs/execute", json=body)
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "validated"
    duplicate = client.post("http://localhost/api/v1/jobs/execute", json=body)
    assert duplicate.json()["run_id"] == response.json()["run_id"]
    assert "not-persisted" not in next((tmp_path / "manifests").rglob("*.json")).read_text()
    history = client.get("http://localhost/api/v1/jobs")
    assert history.status_code == 200
    assert history.json()["runs"][0]["run_id"] == body["run_id"]
    assert history.json()["runs"][0]["title"] == "Education"
    assert "not-persisted" not in history.text


def test_uncertain_destination_blocks_a_new_write_before_any_adapter(monkeypatch, tmp_path):
    from api.routes.jobs import JobRequest
    from services import job_service
    from fastapi import HTTPException
    monkeypatch.setenv("ETL_JOB_MANIFEST_DIR", str(tmp_path))
    target = {"db_type": "postgresql", "host": "localhost", "database": "synthetic", "user": "etl"}
    prior_id = str(uuid4())
    store = job_service.ManifestStore("test-owner")
    store.write({"version": 1, "run_id": prior_id, "status": "partial", "preview_only": False,
                 "target_identities": {"warehouse": job_service.digest(target)},
                 "nodes": {"first": {"status": "unknown", "target_ref": "warehouse", "table_name": "students"}}})
    body = {"definition": definition(), "sources": {"students": {"type": "date_dimension", "start_year": 2026, "end_year": 2026}},
            "targets": {"warehouse": {**target, "password": "runtime-only"}}, "run_id": str(uuid4()), "preview_only": False}
    req = JobRequest.model_validate(body)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(job_service.perform(req, "test-owner", {}, {"warehouse": target}))
    assert exc.value.status_code == 409
    assert not store.path(body["run_id"]).exists()
    assert job_service.ManifestStore("another-owner").summaries() == []
