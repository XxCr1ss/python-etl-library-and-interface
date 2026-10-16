"""Real PostgreSQL integration tests for Extract -> Transform -> Load (Phase 07)."""
from __future__ import annotations

import importlib
from pathlib import Path
import pytest

from services import extract_service
from tests.integration.sql_harness import (
    PostgresTestHarness,
    assert_e2e_table_name,
    load_test_db_config,
)

pytestmark = pytest.mark.integration

ROOT = Path(__file__).resolve().parents[3]
SAMPLE_SALES_CSV = ROOT / "frontend" / "src" / "tests" / "fixtures" / "sample_sales.csv"


def test_missing_or_unsafe_db_config_fails_loudly():
    with pytest.raises(RuntimeError, match="Explicit test database configuration is required"):
        load_test_db_config(env={}, allow_dotenv=False)

    with pytest.raises(RuntimeError, match="Database name must start with 'etl_test'"):
        load_test_db_config(
            env={
                "ETL_TEST_DB_TYPE": "postgresql",
                "ETL_TEST_DB_HOST": "localhost",
                "ETL_TEST_DB_PORT": "5432",
                "ETL_TEST_DB_NAME": "production_db",
                "ETL_TEST_DB_USER": "postgres",
                "ETL_TEST_DB_PASSWORD": "",
            },
            allow_dotenv=False,
        )

    with pytest.raises(ValueError, match="Must match"):
        assert_e2e_table_name("public_users")


def test_etl_upload_dir_env_isolation(monkeypatch, tmp_path, client):
    custom_dir = tmp_path / "custom_etl_uploads"
    monkeypatch.setenv("ETL_UPLOAD_DIR", str(custom_dir))
    importlib.reload(extract_service)
    try:
        assert Path(extract_service.UPLOAD_DIR).resolve() == custom_dir.resolve()
        response = client.post(
            "/api/v1/extract/upload",
            files={"file": ("sample_sales.csv", SAMPLE_SALES_CSV.read_bytes(), "text/csv")},
        )
        assert response.status_code == 200, response.text
        uploaded_path = Path(response.json()["filepath"]).resolve()
        assert uploaded_path.parent == custom_dir.resolve()
        assert uploaded_path.is_file()
    finally:
        monkeypatch.delenv("ETL_UPLOAD_DIR", raising=False)
        importlib.reload(extract_service)


def test_csv_rename_dimension_replace_and_append(
    client, pg_harness: PostgresTestHarness, run_prefix: str
):
    table_name = pg_harness.register_table(f"{run_prefix}_dim_ventas")
    target = pg_harness.config.to_connection_dto()

    upload_res = client.post(
        "/api/v1/extract/upload",
        files={"file": ("sample_sales.csv", SAMPLE_SALES_CSV.read_bytes(), "text/csv")},
    )
    assert upload_res.status_code == 200, upload_res.text
    filepath = upload_res.json()["filepath"]
    source = {"type": "file", "filepath": filepath}
    recipe = [{"type": "rename_columns", "params": {"columns": {"col_monto": "ingreso_total"}}}]

    conn_res = client.post("/api/v1/load/test-connection", json=target)
    assert conn_res.status_code == 200, conn_res.text

    # 1. First load: dimension replace (12 rows)
    load_replace = client.post(
        "/api/v1/load/execute",
        json={
            "source": source,
            "target_connection": target,
            "load_config": {
                "table_name": table_name,
                "table_type": "dimension",
                "if_exists": "replace",
            },
            "recipe": recipe,
        },
    )
    assert load_replace.status_code == 200, load_replace.text
    body_replace = load_replace.json()
    assert body_replace["total_rows"] == 12
    assert len(body_replace["preview_data"]) == 5

    inspected_1 = pg_harness.inspect_table(table_name)
    assert inspected_1["exists"] is True
    assert inspected_1["count"] == 12
    assert inspected_1["columns"] == [
        "id",
        "cliente_id",
        "ingreso_total",
        "fecha",
        "activo",
        "etiquetas",
    ]
    assert [r["ingreso_total"] for r in inspected_1["rows"]] == [
        0,
        10,
        20,
        30,
        40,
        50,
        60,
        70,
        80,
        90,
        100,
        110,
    ]

    # 2. Second load: dimension append (12 -> 24 total rows in destination)
    load_append = client.post(
        "/api/v1/load/execute",
        json={
            "source": source,
            "target_connection": target,
            "load_config": {
                "table_name": table_name,
                "table_type": "dimension",
                "if_exists": "append",
            },
            "recipe": recipe,
        },
    )
    assert load_append.status_code == 200, load_append.text
    body_append = load_append.json()
    assert body_append["total_rows"] == 24

    inspected_2 = pg_harness.inspect_table(table_name)
    assert inspected_2["count"] == 24


def test_dimension_and_fact_valid_foreign_key(
    client, pg_harness: PostgresTestHarness, run_prefix: str
):
    dim_table = pg_harness.register_table(f"{run_prefix}_dim_cliente")
    fact_table = pg_harness.register_table(f"{run_prefix}_fact_ventas")
    target = pg_harness.config.to_connection_dto()

    pg_harness.seed_table(
        dim_table,
        [
            {"id": 1, "nombre": "Cliente Uno"},
            {"id": 2, "nombre": "Cliente Dos"},
            {"id": 3, "nombre": "Cliente Tres"},
        ],
    )

    upload_res = client.post(
        "/api/v1/extract/upload",
        files={"file": ("sample_sales.csv", SAMPLE_SALES_CSV.read_bytes(), "text/csv")},
    )
    assert upload_res.status_code == 200
    source = {"type": "file", "filepath": upload_res.json()["filepath"]}

    fact_res = client.post(
        "/api/v1/load/execute",
        json={
            "source": source,
            "target_connection": target,
            "load_config": {
                "table_name": fact_table,
                "table_type": "fact",
                "if_exists": "replace",
                "foreign_keys": {"cliente_id": [dim_table, "id"]},
            },
            "recipe": [],
        },
    )
    assert fact_res.status_code == 200, fact_res.text
    assert fact_res.json()["total_rows"] == 12

    inspected = pg_harness.inspect_table(fact_table)
    assert inspected["exists"] is True
    assert inspected["count"] == 12
    assert {str(r["cliente_id"]) for r in inspected["rows"]} == {"1", "2", "3"}


def test_fact_invalid_foreign_key_preserves_target_table(
    client, pg_harness: PostgresTestHarness, run_prefix: str
):
    dim_table = pg_harness.register_table(f"{run_prefix}_dim_parcial")
    fact_table = pg_harness.register_table(f"{run_prefix}_fact_protegida")
    target = pg_harness.config.to_connection_dto()

    # Dimension only has IDs 1 and 2 (missing 3, which is present in sample_sales.csv)
    pg_harness.seed_table(
        dim_table,
        [
            {"id": 1, "nombre": "Cliente Uno"},
            {"id": 2, "nombre": "Cliente Dos"},
        ],
    )
    baseline_rows = [
        {"id": 100, "cliente_id": "1", "col_monto": 500, "fecha": "2024-01-01", "activo": True, "etiquetas": None},
        {"id": 101, "cliente_id": "2", "col_monto": 600, "fecha": "2024-01-01", "activo": False, "etiquetas": None},
    ]
    pg_harness.seed_table(fact_table, baseline_rows)
    assert pg_harness.inspect_table(fact_table)["count"] == 2

    upload_res = client.post(
        "/api/v1/extract/upload",
        files={"file": ("sample_sales.csv", SAMPLE_SALES_CSV.read_bytes(), "text/csv")},
    )
    assert upload_res.status_code == 200
    source = {"type": "file", "filepath": upload_res.json()["filepath"]}

    bad_fact_res = client.post(
        "/api/v1/load/execute",
        json={
            "source": source,
            "target_connection": target,
            "load_config": {
                "table_name": fact_table,
                "table_type": "fact",
                "if_exists": "append",
                "foreign_keys": {"cliente_id": [dim_table, "id"]},
            },
            "recipe": [],
        },
    )
    assert bad_fact_res.status_code == 400
    assert "Valores no encontrados en dimensión" in bad_fact_res.json()["detail"]

    after = pg_harness.inspect_table(fact_table)
    assert after["count"] == 2
    assert [r["id"] for r in after["rows"]] == [100, 101]


def test_date_dimension_2024_empty_recipe_load(
    client, pg_harness: PostgresTestHarness, run_prefix: str
):
    table_name = pg_harness.register_table(f"{run_prefix}_dim_fecha")
    target = pg_harness.config.to_connection_dto()

    res = client.post(
        "/api/v1/load/execute",
        json={
            "source": {"type": "date_dimension", "start_year": 2024, "end_year": 2024},
            "target_connection": target,
            "load_config": {
                "table_name": table_name,
                "table_type": "dimension",
                "if_exists": "replace",
            },
            "recipe": [],
        },
    )
    assert res.status_code == 200, res.text
    assert res.json()["total_rows"] == 366

    inspected = pg_harness.inspect_table(table_name)
    assert inspected["exists"] is True
    assert inspected["count"] == 366
    assert inspected["min_fecha"] == "2024-01-01"
    assert inspected["max_fecha"] == "2024-12-31"


def test_fail_mode_on_existing_table_preserves_content(
    client, pg_harness: PostgresTestHarness, run_prefix: str
):
    table_name = pg_harness.register_table(f"{run_prefix}_dim_fail")
    target = pg_harness.config.to_connection_dto()
    pg_harness.seed_table(table_name, [{"id": 1, "amount": 10}, {"id": 2, "amount": 20}])

    upload_res = client.post(
        "/api/v1/extract/upload",
        files={"file": ("sample_sales.csv", SAMPLE_SALES_CSV.read_bytes(), "text/csv")},
    )
    source = {"type": "file", "filepath": upload_res.json()["filepath"]}

    fail_res = client.post(
        "/api/v1/load/execute",
        json={
            "source": source,
            "target_connection": target,
            "load_config": {
                "table_name": table_name,
                "table_type": "dimension",
                "if_exists": "fail",
            },
            "recipe": [],
        },
    )
    assert fail_res.status_code == 400
    inspected = pg_harness.inspect_table(table_name)
    assert inspected["count"] == 2
    assert inspected["rows"] == [{"id": 1, "amount": 10}, {"id": 2, "amount": 20}]


def test_missing_file_expired_source_does_not_alter_destination(
    client, pg_harness: PostgresTestHarness, run_prefix: str, tmp_path: Path
):
    table_name = pg_harness.register_table(f"{run_prefix}_dim_expired")
    target = pg_harness.config.to_connection_dto()
    pg_harness.seed_table(table_name, [{"id": 7, "amount": 70}])

    missing_path = str(tmp_path / "expired_upload.csv")
    preview_res = client.post(
        "/api/v1/transform/preview",
        json={"source": {"type": "file", "filepath": missing_path}, "steps": [], "limit": 10},
    )
    assert preview_res.status_code == 404

    load_res = client.post(
        "/api/v1/load/execute",
        json={
            "source": {"type": "file", "filepath": missing_path},
            "target_connection": target,
            "load_config": {
                "table_name": table_name,
                "table_type": "dimension",
                "if_exists": "replace",
            },
            "recipe": [],
        },
    )
    assert load_res.status_code == 400
    inspected = pg_harness.inspect_table(table_name)
    assert inspected["count"] == 1
    assert inspected["rows"] == [{"id": 7, "amount": 70}]


def test_database_source_extract_and_join_with_postgres(
    client, pg_harness: PostgresTestHarness, run_prefix: str
):
    src_table = pg_harness.register_table(f"{run_prefix}_clientes_db")
    conn_dto = pg_harness.config.to_connection_dto()
    pg_harness.seed_table(
        src_table,
        [
            {"cliente_id": 1, "segmento": "Corporativo"},
            {"cliente_id": 2, "segmento": "Pyme"},
        ],
    )

    meta_res = client.post("/api/v1/extract/database", json=conn_dto)
    assert meta_res.status_code == 200, meta_res.text
    assert src_table in meta_res.json()["tables"]
    assert meta_res.json()["schema_preview"][src_table] == ["cliente_id", "segmento"]

    sample_res = client.post(
        "/api/v1/extract/database/preview",
        json={**conn_dto, "table_name": src_table},
    )
    assert sample_res.status_code == 200, sample_res.text
    assert sample_res.json()["total_rows"] == 2

    upload_res = client.post(
        "/api/v1/extract/upload",
        files={"file": ("sample_sales.csv", SAMPLE_SALES_CSV.read_bytes(), "text/csv")},
    )
    primary_source = {"type": "file", "filepath": upload_res.json()["filepath"]}
    secondary_db_source = {"type": "database", **conn_dto, "table_name": src_table}

    join_res = client.post(
        "/api/v1/transform/preview",
        json={
            "source": primary_source,
            "steps": [
                {
                    "type": "inner_join",
                    "params": {"right_source": secondary_db_source, "on": "cliente_id"},
                }
            ],
            "limit": 10,
        },
    )
    assert join_res.status_code == 200, join_res.text
    assert join_res.json()["total_rows"] == 8
    assert "segmento" in join_res.json()["columns"]
