"""Optional real engine checks; explicitly skipped without disposable infrastructure."""
from decimal import Decimal
import datetime as dt
import pytest
from sqlalchemy import Column, Date, Integer, MetaData, Numeric, String, Table, event
from etl.warehouse.execution import engine_for, execute
from etl.warehouse.models import Connection
from etl.warehouse.settings import LIMITS
from .test_load_other_engines import disposable_engine

pytestmark = pytest.mark.integration


def run_warehouse(engine, operation, payload):
    errors = []

    @event.listens_for(engine, "handle_error")
    def capture_driver_code(context):
        error = context.original_exception
        # Fixtures only use synthetic SQL and values. Emit the driver code for diagnosis.
        if error.args:
            errors.append(str(getattr(error.args[0], "full_code", error.args[0])).split("\n", 1)[0])

    try:
        return execute(operation, payload, engine_factory=lambda *_: engine)
    except ValueError as exc:
        pytest.fail(f"{exc} Driver: {', '.join(errors)}", pytrace=False)
    finally:
        event.remove(engine, "handle_error", capture_driver_code)


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
        result = run_warehouse(engine, "query", {"connection": config, "query": query})
        assert result["data"][0]["category"] == "B" and Decimal(result["data"][0]["total"]) == 90
        assert Decimal(result["summary_kpis"][0]["value"]) == 120
    finally:
        engine.dispose()


def test_real_advanced_report(disposable_engine):
    config, (_, fact) = disposable_engine
    engine = engine_for(Connection.model_validate(config), LIMITS)
    try:
        table = Table(fact, MetaData(), Column("id", Integer, primary_key=True), Column("occurred", Date),
                      Column("started", Date), Column("amount", Numeric(24, 4)))
        with engine.begin() as conn:
            table.create(conn)
            conn.execute(table.insert(), [{"id": i, "occurred": dt.date(2021, 1, day), "started": dt.date(2021, 1, 1),
                                           "amount": amount} for i, day, amount in [(1, 1, Decimal("1.1250")), (2, 2, Decimal("3.6250")), (3, 9, None)]])
        catalog = execute("catalog", {"connection": config})
        assert "warehouse_analyze" in catalog["capabilities"]["supported_operations"]
        table_id = next(t["table_id"] for t in catalog["tables"] if t["table_name"].lower() == fact)
        definition = {"title": "Ventas", "grain": "una venta", "timezone": "UTC", "selection": {"base_table_id": table_id},
                      "dimensions": [{"id": "week", "field": {"column": "occurred"}, "bucket": "week"}],
                      "measures": [{"id": "median", "aggregation": "PERCENTILE", "percentile": 0.5, "value": {"field": {"column": "amount"}}},
                                   {"id": "days", "aggregation": "SUM", "value": {"field": {"column": "started"},
                                                                                    "duration_end": {"column": "occurred"}, "duration_unit": "days"}}]}
        report = run_warehouse(engine, "report", {"connection": config, "analyses": [definition, {**definition, "title": "Calendario",
            "calendar": {"dimension_id": "week", "start": "2021-01-01", "end": "2021-01-17", "bucket": "week", "observed": True}}]})
        first, calendar = report["results"]
        assert first["data"][0]["week"] == "2020-12-28"
        assert Decimal(first["data"][0]["median"]) == Decimal("2.375")
        assert Decimal(first["data"][0]["days"]) == 1
        assert first["data"][1]["median"] is None
        assert [row["week"] for row in calendar["data"]] == ["2020-12-28", "2021-01-04", "2021-01-11"]
    finally:
        engine.dispose()
