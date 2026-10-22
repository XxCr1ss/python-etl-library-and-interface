"""Optional real engine checks; explicitly skipped without disposable infrastructure."""
from decimal import Decimal
import pytest
from sqlalchemy import Column, Integer, MetaData, Numeric, String, Table
from etl.warehouse.execution import engine_for, execute
from etl.warehouse.models import Connection
from etl.warehouse.settings import LIMITS
from .test_load_other_engines import disposable_engine

pytestmark = pytest.mark.integration


def test_real_warehouse_engine(disposable_engine):
    config, (dimension, fact) = disposable_engine
    engine = engine_for(Connection.model_validate(config), LIMITS)
    try:
        metadata = MetaData()
        table = Table(fact, metadata, Column("id", Integer, primary_key=True), Column("category", String(20)), Column("amount", Numeric(24, 4)))
        with engine.begin() as conn:
            table.create(conn)
            conn.execute(table.insert(), [{"id": i, "category": c, "amount": Decimal(a)} for i, c, a in [(1, "A", "10"), (2, "A", "20"), (3, "B", "90")]])
        catalog = execute("catalog", {"connection": config})
        info = next(t for t in catalog["tables"] if t["table_name"].lower() == fact)
        query = {"base_table_id": info["table_id"], "metrics": [{"id": "total", "aggregation": "SUM", "column": "amount"}], "dimensions": [{"id": "category", "field": {"column": "category"}}], "order_by": [{"field_id": "total", "direction": "DESC"}], "limit": 1}
        result = execute("query", {"connection": config, "query": query})
        assert result["data"][0]["category"] == "B" and Decimal(result["data"][0]["total"]) == 90
        assert Decimal(result["summary_kpis"][0]["value"]) == 120
    finally:
        engine.dispose()
