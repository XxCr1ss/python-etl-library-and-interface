import json
import os
import time
from uuid import uuid4

import pytest
from fastapi import HTTPException

from services.job_service import ManifestStore


@pytest.mark.parametrize("status,expected,node_expected", [
    ("accepted", "failed", "failed"), ("validating", "failed", "failed"), ("running", "partial", "unknown"),
])
def test_restart_reconciles_inflight_records_without_claiming_success(monkeypatch, tmp_path, status, expected, node_expected):
    monkeypatch.setenv("ETL_JOB_MANIFEST_DIR", str(tmp_path))
    store = ManifestStore("owner")
    run = str(uuid4())
    value = {"run_id": run, "status": status, "nodes": {"load": {"status": "running"}}}
    assert store.claim(run, value)
    assert not store.claim(run, value)
    record = store.read(run)
    assert record["status"] == expected
    assert record["nodes"]["load"]["status"] == node_expected
    with pytest.raises(HTTPException) as error:
        ManifestStore("another-owner").read(run)
    assert error.value.status_code == 404


def test_retention_removes_only_completed_expired_records_and_enforces_capacity(monkeypatch, tmp_path):
    monkeypatch.setenv("ETL_JOB_MANIFEST_DIR", str(tmp_path))
    monkeypatch.setenv("ETL_JOB_MAX_MANIFESTS", "2")
    monkeypatch.setenv("ETL_JOB_MANIFEST_RETENTION_DAYS", "1")
    store = ManifestStore("owner")
    finished, unknown, new = [str(uuid4()) for _ in range(3)]
    for run, status in [(finished, "success"), (unknown, "partial")]:
        store.write({"run_id": run, "status": status})
        os.utime(store.path(run), (time.time() - 172800,) * 2)
    assert store.claim(new, {"run_id": new, "status": "accepted"})
    assert not store.path(finished).exists()
    assert store.path(unknown).exists()
    with pytest.raises(HTTPException) as error:
        store.claim(str(uuid4()), {})
    assert error.value.status_code == 429


def test_history_ignores_corrupt_or_unrelated_json_files(monkeypatch, tmp_path):
    monkeypatch.setenv("ETL_JOB_MANIFEST_DIR", str(tmp_path))
    store = ManifestStore("owner")
    run = str(uuid4())
    store.write({"run_id": run, "status": "success", "title": "Job"})
    (store.folder / "notes.json").write_text(json.dumps({"note": "not a manifest"}))
    store.path(uuid4()).write_text("incomplete")
    assert [r["run_id"] for r in store.records()] == [run]
    assert store.summaries()[0]["title"] == "Job"
