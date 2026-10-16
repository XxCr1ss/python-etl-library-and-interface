"""Phase 06 characterization: isolated in-memory SQLite, never an external target.

The public request still uses a supported target descriptor; its adapter alone is
replaced. This checks loader policy/HTTP semantics, not PostgreSQL/MySQL/Oracle.
"""
from contextlib import nullcontext

import pandas as pd
import pytest
from sqlalchemy import create_engine, text

from etl import DB_Loader
from services import load_service


@pytest.fixture
def memory_target(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    pd.DataFrame({"id": [77], "amount": [15]}).to_sql("synthetic", engine, index=False)

    class Extractor:
        def __new__(cls, **kwargs):
            return nullcontext(type("Connection", (), {"engine": engine})())

    monkeypatch.setattr(load_service, "DB_Extractor", Extractor)
    monkeypatch.setattr(load_service, "DB_Loader", DB_Loader)
    yield engine
    engine.dispose()


def request_body(source, table_type, mode, recipe):
    return {"source": source, "recipe": recipe,
            "target_connection": {"db_type": "postgresql", "host": "synthetic",
                                  "database": "synthetic", "user": "test", "password": ""},
            "load_config": {"table_name": "synthetic", "table_type": table_type, "if_exists": mode}}


@pytest.mark.parametrize("table_type", ["dimension", "fact"])
@pytest.mark.parametrize("mode,expected", [("replace", 0), ("append", 1)])
def test_zero_rows_loader_policy_and_destination_total(client, csv_source, memory_target, table_type, mode, expected):
    recipe = [{"type": "filter_value", "params": {"column": "id", "value": -1}}]
    response = client.post("/api/v1/load/execute", json=request_body(csv_source, table_type, mode, recipe))
    assert response.status_code == 200, response.text
    assert response.json()["total_rows"] == expected
    with memory_target.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM synthetic")).scalar() == expected
    assert len(response.json()["preview_data"]) == expected


def test_post_write_verification_can_return_400_after_data_was_written(client, csv_source, memory_target, monkeypatch):
    def failed_verification(*args, **kwargs):
        raise ValueError("Synthetic post-write verification failure")

    monkeypatch.setattr(load_service.pd, "read_sql", failed_verification)
    response = client.post("/api/v1/load/execute", json=request_body(csv_source, "fact", "append", []))
    assert response.status_code == 400
    with memory_target.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM synthetic")).scalar() == 3
