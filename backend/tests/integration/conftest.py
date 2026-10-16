"""Fixtures for real database and agent integration tests."""
from __future__ import annotations

import uuid
import pytest

from etl.extractors.db_extractor import DB_Extractor
from etl.loaders.db_loader import DB_Loader
from services import extract_service, load_service, transform_service
from tests.integration.sql_harness import PostgresTestHarness, load_test_db_config


@pytest.fixture(autouse=True)
def enable_real_adapters_for_integration(monkeypatch, isolated_adapters):
    """Restore real DB_Extractor and DB_Loader after parent conftest's isolated_adapters."""
    for module in (extract_service, transform_service, load_service):
        monkeypatch.setattr(module, "DB_Extractor", DB_Extractor)
    monkeypatch.setattr(load_service, "DB_Loader", DB_Loader)


@pytest.fixture
def pg_harness() -> PostgresTestHarness:
    """Provide an isolated PostgresTestHarness that fails loudly if ETL_TEST_DB_* is missing
    and drops all registered etl_e2e_* tables in teardown."""
    try:
        config = load_test_db_config()
    except Exception as exc:
        pytest.fail(str(exc))

    harness = PostgresTestHarness(config=config)
    try:
        harness.check_connectivity()
        yield harness
    finally:
        try:
            harness.drop_tables()
        finally:
            harness.close()


@pytest.fixture
def run_prefix() -> str:
    return f"etl_e2e_{uuid.uuid4().hex[:8]}"
