import base64
import datetime as dt
import json
from decimal import Decimal
import pytest
from sqlalchemy import Column, DateTime, ForeignKey, Integer, MetaData, Numeric, String, Table, create_engine
from etl.extractors.schema_graph import identity
from etl.warehouse import execution
from etl.warehouse.execution import execute
from etl.warehouse.settings import WarehouseError
from etl.warehouse.responses import RESPONSES

CONNECTION = {"db_type": "postgresql", "host": "localhost", "database": "synthetic", "user": "synthetic", "password": "synthetic-secret"}


@pytest.fixture
def warehouse(tmp_path, monkeypatch):
    path = tmp_path / "warehouse.sqlite"
    url = "sqlite:///" + str(path)
    engine = create_engine(url)
    metadata = MetaData()
    dimensions = Table("Dimension Labels", metadata, Column("id", Integer, primary_key=True), Column("category", String(80)))
    facts = Table("Fact Values", metadata, Column("id", Integer, primary_key=True),
                  Column("dim_id", Integer, ForeignKey("Dimension Labels.id")), Column("other_dim_id", Integer, ForeignKey("Dimension Labels.id")),
                  Column("amount", Numeric(24, 4)), Column("occurred", DateTime), Column("note", String(100)))
    loose = Table("loose", metadata, Column("label", String(100)), Column("amount", Integer))
    metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(dimensions.insert(), [{"id": 1, "category": "A"}, {"id": 2, "category": "B"}])
        connection.execute(facts.insert(), [{"id": i, "dim_id": dim, "other_dim_id": 2, "amount": amount,
                                             "occurred": dt.datetime(2026, month, 15), "note": note} for i, dim, amount, month, note in
                                            [(1, 1, Decimal("10"), 1, "=evil"), (2, 1, Decimal("20"), 1, ""), (3, 2, Decimal("90"), 2, None)]])
        connection.execute(loose.insert(), [{"label": "x", "amount": 1}, {"label": "x", "amount": 2}])
    engine.dispose()
    monkeypatch.setattr(execution, "engine_for", lambda *_: create_engine(url))
    return {"base": identity("main", "Fact Values"), "dimension": identity("main", "Dimension Labels"), "loose": identity("main", "loose"), "_url": url}


def query(warehouse, **changes):
    return {"base_table_id": warehouse["base"], "joins": [{"id": "d", "target_table_id": warehouse["dimension"], "type": "LEFT",
            "via": {"kind": "manual", "pairs": [{"base_column": "dim_id", "target_column": "id"}]}}], "filters": [],
            "metrics": [{"id": "total", "aggregation": "SUM", "column": "amount"}, {"id": "average", "aggregation": "AVG", "column": "amount"}],
            "dimensions": [{"id": "category", "field": {"relation": "d", "column": "category"}}],
            "order_by": [{"field_id": "total", "direction": "DESC"}], "limit": 1, **changes}


def test_top_n_global_kpis_and_contract(warehouse):
    result = execute("query", {"connection": CONNECTION, "query": query(warehouse)})
    assert result["data"] == [{"category": "B", "total": "90.0000", "average": "90.0"}]
    assert [k["value"] for k in result["summary_kpis"]] == ["120.0000", "40.0"]
    assert result["filtered_rows"]["value"] == 3
    assert result["meta"]["truncated"] and result["meta"]["consistency"] == "snapshot"
    RESPONSES["query"].validate_python(result)


def test_catalog_reuses_graph_ids_and_reports_no_key(warehouse):
    catalog = execute("catalog", {"connection": CONNECTION})
    tables = {t["table_id"]: t for t in catalog["tables"]}
    assert tables[warehouse["base"]]["primary_key"] == ["id"]
    assert tables[warehouse["loose"]]["unique_keys"] == []
    assert len(catalog["relationships"]) == 2
    assert all(r["selectable"] for r in catalog["relationships"])
    RESPONSES["catalog"].validate_python(catalog)


def test_temporal_buckets_detail_and_export(warehouse):
    q = query(warehouse, dimensions=[{"id": "month", "field": {"column": "occurred"}, "bucket": "month"}], limit=10)
    result = execute("query", {"connection": CONNECTION, "query": q})
    assert [r["month"] for r in result["data"]] == ["2026-02", "2026-01"]
    selection = {k: q[k] for k in ("base_table_id", "joins", "filters")}
    detail = {"connection": CONNECTION, "selection": selection, "columns": [{"id": "id", "field": {"column": "id"}}, {"id": "note", "field": {"column": "note"}}],
              "drilldown": [{"field": {"column": "occurred"}, "bucket": "month", "value": "2026-01"}]}
    first = execute("detail", {**detail, "page_size": 1, "include_total": True})
    assert first["data"] == [{"id": 1, "note": "=evil"}]
    assert first["pagination"]["has_more"] and first["pagination"]["total_records"]["value"] == 2
    second = execute("detail", {**detail, "page_size": 1, "page": 2})
    assert second["data"] == [{"id": 2, "note": ""}]
    report = execute("export", {**detail, "mode": "detail", "format": "csv"})
    assert "'=evil" in base64.b64decode(report["content_base64"]).decode("utf-8-sig")
    with pytest.raises(WarehouseError, match="supera el límite") as error:
        execute("export", {**detail, "mode": "detail", "format": "json", "max_rows": 1})
    assert error.value.code == "export_limit_exceeded"
    report = execute("export", {"connection": CONNECTION, "mode": "aggregate", "format": "json", "query": q})
    data = json.loads(base64.b64decode(report["content_base64"]))
    assert data["report"]["mode"] == "aggregate" and "connection" not in data
    assert "synthetic-secret" not in base64.b64decode(report["content_base64"]).decode()


def test_no_key_sample_and_invalid_relationship(warehouse):
    selection = {"base_table_id": warehouse["loose"]}
    payload = {"connection": CONNECTION, "selection": selection, "columns": [{"id": "label", "field": {"column": "label"}}]}
    sample = execute("detail", payload)
    assert sample["pagination"]["mode"] == "sample" and not sample["pagination"]["has_more"]
    with pytest.raises(WarehouseError):
        execute("detail", {**payload, "page": 2})
    bad = query(warehouse)
    bad["joins"][0]["via"]["pairs"][0]["target_column"] = "category"
    with pytest.raises(WarehouseError) as error:
        execute("query", {"connection": CONNECTION, "query": bad})
    assert error.value.code == "unsupported_relationship"


def test_null_counts_empty_result_and_literal_contains(warehouse):
    metrics = [{"id": "rows", "aggregation": "COUNT_ROWS"}, {"id": "nonnull", "aggregation": "COUNT", "column": "note"}, {"id": "distinct", "aggregation": "COUNT_DISTINCT", "column": "note"}]
    q = query(warehouse, metrics=metrics, dimensions=[], order_by=[])
    assert execute("query", {"connection": CONNECTION, "query": q})["data"] == [{"rows": 3, "nonnull": 2, "distinct": 2}]
    q["filters"] = [{"field": {"column": "note"}, "op": "CONTAINS", "value": "%"}]
    result = execute("query", {"connection": CONNECTION, "query": q})
    assert result["data"] == [{"rows": 0, "nonnull": 0, "distinct": 0}]
    q = query(warehouse, filters=[{"field": {"column": "amount"}, "op": "GT", "value": "999"}])
    result = execute("query", {"connection": CONNECTION, "query": q})
    assert result["data"] == [] and all(k["value"] is None for k in result["summary_kpis"])


@pytest.mark.parametrize("change", [{"limit": True}, {"sql": "DROP TABLE x"}, {"metrics": []}, {"order_by": [{"field_id": "evil", "direction": "ASC"}]}])
def test_strict_requests_before_database(warehouse, change):
    with pytest.raises(WarehouseError) as error:
        execute("query", {"connection": CONNECTION, "query": query(warehouse, **change)})
    assert error.value.code == "invalid_query"


def test_left_join_nulls_and_role_selection_do_not_multiply_facts(warehouse):
    engine = create_engine(warehouse["_url"])
    with engine.begin() as connection:
        table = Table("Fact Values", MetaData(), autoload_with=connection)
        connection.execute(table.insert(), {"id": 4, "dim_id": None, "amount": Decimal("5")})
    engine.dispose()
    q = query(warehouse, limit=20)
    result = execute("query", {"connection": CONNECTION, "query": q})
    assert result["filtered_rows"]["value"] == 4
    assert {r["category"] for r in result["data"]} == {"A", "B", None}
    q["filters"] = [{"field": {"relation": "d", "column": "category"}, "op": "EQ", "value": "A"}]
    result = execute("query", {"connection": CONNECTION, "query": q})
    assert result["filtered_rows"]["value"] == 2 and result["summary_kpis"][0]["value"] == "30.0000"
    q = query(warehouse, limit=20)
    q["joins"][0]["via"]["pairs"][0]["base_column"] = "other_dim_id"
    result = execute("query", {"connection": CONNECTION, "query": q})
    assert next(r for r in result["data"] if r["category"] == "B")["total"] == "120.0000"


def test_composite_join_requires_all_key_columns(warehouse):
    from sqlalchemy import UniqueConstraint
    engine = create_engine(warehouse["_url"])
    metadata = MetaData()
    target = Table("compound", metadata, Column("id", Integer), Column("version", Integer), Column("label", String(30)), UniqueConstraint("id", "version"))
    with engine.begin() as connection:
        target.create(connection)
        connection.execute(target.insert(), [{"id": 1, "version": 1, "label": "first"}, {"id": 1, "version": 2, "label": "second"}])
    engine.dispose()
    q = query(warehouse)
    q["joins"][0]["target_table_id"] = identity("main", "compound")
    with pytest.raises(WarehouseError) as error:
        execute("query", {"connection": CONNECTION, "query": q})
    assert error.value.code == "unsupported_relationship"
