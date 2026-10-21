"""Opt-in disposable MySQL/Oracle fixtures; never infer coverage from PostgreSQL."""
import os
import uuid

import pandas as pd
import pytest
from sqlalchemy import MetaData, Table

import etl_agent
from etl import DB_Extractor
from etl.load_transport import encode_dataset

pytestmark = pytest.mark.integration


@pytest.fixture(params=["mysql", "oracle"])
def disposable_engine(request):
    engine = request.param
    prefix = f"ETL_TEST_{engine.upper()}_"
    required = ["HOST", "PORT", "NAME", "USER", "PASSWORD"] + (["SERVICE_NAME"] if engine == "oracle" else [])
    if not any(key.startswith(prefix) for key in os.environ):
        pytest.skip(f"No se configuró una base descartable {engine} ({prefix}*).")
    if any(prefix + key not in os.environ for key in required):
        pytest.fail(f"Configuración de prueba {engine} incompleta.")
    values = {key: os.environ[prefix + key] for key in required}
    if not values["NAME"].lower().startswith("etl_test") or (engine == "oracle" and not values["USER"].lower().startswith("etl_test")):
        pytest.fail("Las pruebas requieren base etl_test y, en Oracle, usuario/esquema etl_test.")
    config = {"db_type": engine, "host": values["HOST"], "port": int(values["PORT"]), "database": values["NAME"],
              "user": values["USER"], "password": values["PASSWORD"], "service_name": values.get("SERVICE_NAME")}
    tables = [f"etl_e2e_{uuid.uuid4().hex[:8]}_{suffix}" for suffix in ("dim", "fact")]
    with DB_Extractor(**config, connect_timeout=10) as extractor:
        try:
            yield config, tables
        finally:
            with extractor.engine.begin() as conn:
                for name in reversed(tables):
                    table = Table(name, MetaData())
                    table.drop(conn, checkfirst=True)


def test_typed_agent_dimensions_and_foreign_keys(disposable_engine):
    config, (dimension, fact) = disposable_engine
    def load(frame, table, kind, mode, keys=None):
        return etl_agent._execute_load({"load_protocol_version": 1, "target_connection": config,
            "load_config": {"table_name": table, "table_type": kind, "if_exists": mode, "foreign_keys": keys},
            "dataset": encode_dataset(frame)}, True)
    frame = pd.DataFrame({"id": [1, 2]})
    assert load(frame, dimension, "dimension", "replace")["total_rows"] == 2
    assert load(frame, fact, "fact", "append", {"id": [dimension, "id"]})["total_rows"] == 2
    assert load(frame, fact, "fact", "append", {"id": [dimension, "id"]})["total_rows"] == 4
    with pytest.raises(ValueError):
        load(pd.DataFrame({"id": [999]}), fact, "fact", "append", {"id": [dimension, "id"]})
    with pytest.raises(ValueError):
        load(frame, fact, "fact", "fail")
