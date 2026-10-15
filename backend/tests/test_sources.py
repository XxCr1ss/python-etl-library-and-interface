import copy
from contextlib import nullcontext

import pandas as pd
import pytest

from services import load_service

DATE = {"type": "date_dimension", "start_year": 2024, "end_year": 2024}
CONNECTION = {"db_type": "postgresql", "host": "synthetic", "database": "test",
              "user": "test", "password": ""}


def test_date_http_to_loader(client, monkeypatch):
    extracted = client.post("/api/v1/extract/date-dimension/preview", json={
        "start_year": 2024, "end_year": 2024}).json()
    transformed = client.post("/api/v1/transform/preview", json={
        "source": DATE, "steps": [], "limit": 366}).json()
    assert extracted["total_rows"] == transformed["total_rows"] == 366
    assert transformed["preview_data"][0]["fecha"] == "2024-01-01"
    assert transformed["preview_data"][-1]["fecha"] == "2024-12-31"
    assert extracted["preview_data"] == transformed["preview_data"][:5]

    received = []

    class Engine:
        def connect(self):
            return nullcontext(object())

        class url:
            @staticmethod
            def get_backend_name():
                return "postgresql"

    class Extractor:
        engine = Engine()

        def __init__(self, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

    class Loader:
        def __init__(self, **kwargs):
            pass

        def load_dimension(self, dfs, **kwargs):
            received.append(dfs.copy())

    def read_sql(query, conn):
        if "EXISTS" in query:
            return pd.DataFrame({"exists": [True]})
        if "COUNT" in query:
            return pd.DataFrame({"total": [999]})
        return received[0].head(5)

    monkeypatch.setattr(load_service, "DB_Extractor", Extractor)
    monkeypatch.setattr(load_service, "DB_Loader", Loader)
    monkeypatch.setattr(load_service.pd, "read_sql", read_sql)
    response = client.post("/api/v1/load/execute", json={
        "source": DATE, "target_connection": CONNECTION,
        "load_config": {"table_name": "dim_fecha", "table_type": "dimension"}, "recipe": []})
    assert response.status_code == 200, response.text
    assert len(received) == 1 and len(received[0]) == 366
    assert received[0]["fecha"].iloc[[0, -1]].tolist() == ["2024-01-01", "2024-12-31"]
    assert response.json()["total_rows"] == 999  # destination total, never inserted rows
    assert set(response.json()) == {"status", "message", "table_name", "table_type", "total_rows", "preview_data"}


@pytest.mark.parametrize("years", [ {}, {"start_year": 2024}, {"end_year": 2024},
    {"start_year": 2025, "end_year": 2024}, {"start_year": 0, "end_year": 2024},
    {"start_year": 99, "end_year": 99}, {"start_year": 10000, "end_year": 10000},
    {"start_year": "invalid", "end_year": 2024}, {"start_year": 2024.5, "end_year": 2024},
    {"start_year": True, "end_year": 2024}])
def test_invalid_years_through_both_models(client, years):
    for path, body in [("/extract/date-dimension/preview", years),
                       ("/transform/preview", {"source": {"type": "date_dimension", **years}, "steps": []}),
                       ("/load/execute", {"source": {"type": "date_dimension", **years},
                        "target_connection": CONNECTION, "load_config": {"table_name": "t", "table_type": "dimension"}, "recipe": []})]:
        response = client.post("/api/v1" + path, json=body)
        assert response.status_code == 422, response.text


@pytest.mark.parametrize("source", [ {}, {"type": "unknown"}, {"type": "file"},
    {"type": "database"}, {"type": "database", **CONNECTION},
    {"type": "database", **CONNECTION, "table_name": "t", "password": None},
    {"type": "database", **CONNECTION, "table_name": "t", "use_agent": True},
    {"type": "database", **CONNECTION, "table_name": "t", "db_type": "sqlserver"},
    {"type": "date_dimension", "start_year": 2024},
    {"type": "date_dimension", "start_year": 2025, "end_year": 2024}])
def test_invalid_main_and_nested_sources_before_loading(client, csv_source, source):
    for kind, key in [("left_join", "right_source"), ("union", "secondary_source")]:
        response = client.post("/api/v1/transform/preview", json={"source": csv_source,
            "steps": [{"type": kind, "params": {key: copy.deepcopy(source), "on": "id"}}]})
        assert response.status_code == 422, response.text
    response = client.post("/api/v1/transform/preview", json={"source": source, "steps": []})
    assert response.status_code == 422, response.text


def test_nested_date_source(client, csv_source):
    response = client.post("/api/v1/transform/preview", json={"source": csv_source,
        "steps": [{"type": "union", "params": {"secondary_source": DATE}}]})
    assert response.status_code == 200, response.text
    assert response.json()["total_rows"] == 368


@pytest.mark.parametrize("year,days", [(100, 365), (1600, 366), (2263, 365), (9999, 365)])
def test_actual_generator_year_boundaries_preserve_valid_ranges(client, year, days):
    response = client.post("/api/v1/transform/preview", json={
        "source": {"type": "date_dimension", "start_year": year, "end_year": year}, "steps": [], "limit": days})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["total_rows"] == days
    assert data["preview_data"][0]["fecha"] == f"{year}-01-01"
    assert data["preview_data"][-1]["fecha"] == f"{year}-12-31"
    assert all(row["año"] == year for row in data["preview_data"])
