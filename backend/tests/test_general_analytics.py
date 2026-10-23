"""Independent synthetic sales/education oracles; no workshop data or credentials."""
import datetime as dt
from decimal import Decimal

import pandas as pd
import pytest
import sqlalchemy as sa

from etl.schema import LoadSchemaSpec, coerce_frame, persist_schema
from etl.load_transport import LoadValidationError, encode_dataset, decode_dataset
from etl.warehouse.execution import execute
from etl.warehouse.settings import WarehouseError


CONNECTION = {"db_type": "postgresql", "host": "localhost", "database": "synthetic", "user": "reader", "password": ""}


@pytest.fixture
def database(tmp_path):
    url = "sqlite:///" + str(tmp_path / "synthetic.db")
    engine = sa.create_engine(url)
    meta = sa.MetaData()
    sales = sa.Table("sales", meta, sa.Column("id", sa.Integer, primary_key=True), sa.Column("entity", sa.Integer),
                     sa.Column("amount", sa.Numeric(20, 4)), sa.Column("category", sa.String), sa.Column("day", sa.Date))
    people = sa.Table("people", meta, sa.Column("id", sa.Integer, primary_key=True), sa.Column("category", sa.String))
    items = sa.Table("items", meta, sa.Column("basket", sa.Integer), sa.Column("item", sa.String))
    meta.create_all(engine)
    with engine.begin() as conn:
        conn.execute(sales.insert(), [{"id": 1, "entity": 1, "amount": Decimal(10), "category": "A", "day": dt.date(2026, 1, 1)},
                                     {"id": 2, "entity": 1, "amount": Decimal(30), "category": "B", "day": dt.date(2026, 1, 1)},
                                     {"id": 3, "entity": 2, "amount": Decimal(60), "category": "B", "day": dt.date(2026, 1, 3)}])
        conn.execute(people.insert(), [{"id": 1, "category": "A"}, {"id": 2, "category": "B"}, {"id": 3, "category": "C"}])
        conn.execute(items.insert(), [{"basket": 1, "item": "A"}, {"basket": 1, "item": "A"}, {"basket": 1, "item": "B"}, {"basket": 2, "item": "A"}, {"basket": 3, "item": "B"}, {"basket": 3, "item": "C"}])
    engine.dispose()
    return url


def base(**patch):
    return {"version": 1, "title": "Sales", "grain": "one sale", "selection": {"base_table_id": '["main","sales"]'},
            "measures": [{"id": "amount", "aggregation": "SUM", "value": {"field": {"column": "amount"}}, "unit": "money"}], **patch}


def run(database, spec):
    return execute("analyze", {"connection": CONNECTION, "analysis": spec}, engine_factory=lambda *_: sa.create_engine(database))


def test_global_derived_metrics_are_independent_of_top_n(database):
    spec = base(dimensions=[{"id": "category", "field": {"column": "category"}}], limit=1,
                order_by=[{"field_id": "amount", "direction": "DESC"}], formulas=[{"id": "mean", "label": "Mean per buyer", "expression": "amount / buyers"}])
    spec["measures"].append({"id": "buyers", "aggregation": "COUNT_DISTINCT", "value": {"field": {"column": "entity"}}})
    result = run(database, spec)
    assert result["data"][0]["category"] == "B"
    assert Decimal(result["data"][0]["mean"]) == 45
    global_values = {k["metric_id"]: k["value"] for k in result["summary_kpis"]}
    assert global_values["buyers"] == 2  # Not A=1 + B=2.
    assert Decimal(global_values["mean"]) == 50
    assert result["meta"]["truncated"]


def test_entity_totals_and_registered_zero_entities(database):
    spec = base(measures=[{"id": "mean", "aggregation": "ENTITY_AVG", "entity": {"column": "entity"}, "value": {"field": {"column": "amount"}}}])
    assert Decimal(run(database, spec)["data"][0]["mean"]) == 50
    spec["population"] = {"selection": {"base_table_id": '["main","people"]'}, "entity": {"column": "id"}, "event_entity": {"column": "entity"}}
    assert float(run(database, spec)["data"][0]["mean"]) == pytest.approx(100 / 3)


def test_cohort_measures_all_events_not_only_qualifying_rows(database):
    spec = base(cohorts=[{"selection": {"base_table_id": '["main","sales"]', "filters": [{"field": {"column": "category"}, "op": "EQ", "value": "A"}]},
                         "entity": {"column": "entity"}, "event_entity": {"column": "entity"}}])
    assert Decimal(run(database, spec)["data"][0]["amount"]) == 40


def test_pairs_count_once_and_include_singletons_in_denominator(database):
    result = run(database, base(selection={"base_table_id": '["main","items"]'}, measures=[], pairs={"basket": {"column": "basket"}, "item": {"column": "item"}}, limit=1))
    row = result["data"][0]
    assert (row["item_a"], row["item_b"], row["frequency"], row["baskets"]) == ("A", "B", 1, 3)
    assert float(row["support"]) == pytest.approx(1 / 3)


def test_calendar_and_histogram_compute_on_server(database):
    spec = base(measures=[{"id": "events", "aggregation": "COUNT_ROWS"}], dimensions=[{"id": "day", "field": {"column": "day"}, "bucket": "day"}],
                calendar={"dimension_id": "day", "start": "2026-01-01", "end": "2026-01-03", "observed": True})
    assert [r["events"] for r in run(database, spec)["data"]] == [2, 0, 1]
    spec["calendar"]["observed"] = False
    assert run(database, spec)["data"][1]["events"] is None
    result = run(database, base(measures=[], histogram={"value": {"field": {"column": "amount"}}, "boundaries": [0, 20, 60]}))
    assert [r["frequency"] for r in result["data"]] == [1, 2]


def test_calendar_dates_cross_http_request_and_response_as_iso_strings(client, monkeypatch, database):
    from services import warehouse_service
    monkeypatch.setattr(warehouse_service, "execute", lambda operation, payload: execute(operation, payload, engine_factory=lambda *_: sa.create_engine(database)))
    spec = base(measures=[{"id": "events", "aggregation": "COUNT_ROWS"}], dimensions=[{"id": "day", "field": {"column": "day"}, "bucket": "day"}],
                calendar={"dimension_id": "day", "start": "2026-01-01", "end": "2026-01-03", "observed": True})
    response = client.post("http://localhost/api/v1/warehouse/analyze", json={"connection": CONNECTION, "analysis": spec})
    assert response.status_code == 200, response.text
    assert response.json()["definition"]["calendar"]["start"] == "2026-01-01"
    assert [r["events"] for r in response.json()["data"]] == [2, 0, 1]


def test_exact_file_reads_keep_codes_and_stop_at_the_row_budget(tmp_path, monkeypatch):
    import asyncio
    from etl import load_transport
    from services.transform_service import load_source_df
    path = tmp_path / "codes.csv"
    path.write_text("id,flag\n001,false\n002,\n003,true\n", encoding="utf-8")
    source = {"type": "file", "filepath": str(path), "read_mode": "exact"}
    frame = asyncio.run(load_source_df(source))
    assert frame["id"].tolist() == ["001", "002", "003"]
    assert frame["flag"].tolist() == ["false", None, "true"]
    monkeypatch.setattr(load_transport, "MAX_LOAD_ROWS", 2)
    with pytest.raises(LoadValidationError): asyncio.run(load_source_df(source))


@pytest.mark.parametrize("expression", ["__import__('os')", "amount.__class__", "[x for x in amount]", "cycle+1", "amount ** 100"])
def test_formula_language_rejects_code_and_cycles(database, expression):
    with pytest.raises(WarehouseError):
        run(database, base(formulas=[{"id": "cycle", "label": "Rejected", "expression": expression}]))


def test_zero_denominator_is_null_and_units_are_validated(database):
    spec = base(formulas=[{"id": "ratio", "label": "Ratio", "expression": "amount / 0"}])
    assert run(database, spec)["data"][0]["ratio"] is None
    spec["measures"].append({"id": "events", "aggregation": "COUNT_ROWS"})
    spec["formulas"][0]["expression"] = "amount + events"
    with pytest.raises(WarehouseError):
        run(database, spec)


def test_empty_calendar_period_recalculates_formula_with_total_denominator(database):
    spec = base(measures=[{"id": "events", "aggregation": "COUNT_ROWS"}, {"id": "total", "aggregation": "COUNT_ROWS", "scope": "filtered_total"}],
                formulas=[{"id": "share", "label": "Share", "expression": "events / total"}],
                dimensions=[{"id": "day", "field": {"column": "day"}, "bucket": "day"}],
                calendar={"dimension_id": "day", "start": "2026-01-01", "end": "2026-01-03", "observed": True})
    result = run(database, spec)
    assert Decimal(result["data"][1]["share"]) == 0
    assert result["data"][1]["total"] == 3
    spec["calendar"]["observed"] = False
    assert run(database, spec)["data"][1]["share"] is None


def test_population_scope_restricts_events_and_supplies_global_denominator(database):
    spec = base(measures=[{"id": "amount", "aggregation": "SUM", "value": {"field": {"column": "amount"}}},
                          {"id": "registered", "aggregation": "COUNT_DISTINCT", "scope": "population_total", "value": {"field": {"column": "id"}}}],
                population={"selection": {"base_table_id": '["main","people"]', "filters": [{"field": {"column": "id"}, "op": "EQ", "value": 2}]}, "entity": {"column": "id"}, "event_entity": {"column": "entity"}})
    row = run(database, spec)["data"][0]
    assert Decimal(row["amount"]) == 60 and row["registered"] == 1


def test_multiple_roles_of_same_dimension_preserve_legacy_joins(database):
    spec = base()
    spec["selection"]["joins"] = [{"id": role, "target_table_id": '["main","people"]', "type": "LEFT", "via": {"kind": "manual", "pairs": [{"base_column": "entity", "target_column": "id"}]}} for role in ("buyer", "payer")]
    assert Decimal(run(database, spec)["data"][0]["amount"]) == 100


def test_education_waits_capacity_and_age_profiles(tmp_path):
    url = "sqlite:///" + str(tmp_path / "education.db")
    engine, meta = sa.create_engine(url), sa.MetaData()
    students = sa.Table("students", meta, sa.Column("id", sa.Integer, primary_key=True), sa.Column("birth", sa.Date), sa.Column("gender", sa.String))
    events = sa.Table("events", meta, sa.Column("id", sa.Integer, primary_key=True), sa.Column("student", sa.Integer), sa.Column("resource", sa.Integer), sa.Column("requested", sa.DateTime), sa.Column("served", sa.DateTime))
    capacity = sa.Table("capacity", meta, sa.Column("id", sa.Integer, primary_key=True), sa.Column("minutes", sa.Integer))
    meta.create_all(engine)
    with engine.begin() as conn:
        conn.execute(students.insert(), [{"id": 1, "birth": dt.date(2008, 2, 29), "gender": "F"}, {"id": 2, "birth": dt.date(2000, 12, 31), "gender": "M"}])
        conn.execute(capacity.insert(), {"id": 1, "minutes": 100})
        conn.execute(events.insert(), [{"id": i + 1, "student": 1 if i < 2 else 2, "resource": 1, "requested": dt.datetime(2026, 2, 28, 10), "served": dt.datetime(2026, 2, 28, 10) + dt.timedelta(minutes=wait)} for i, wait in enumerate([10, 20, -5])])
    duration = {"field": {"column": "requested"}, "duration_end": {"column": "served"}, "duration_unit": "minutes"}
    spec = base(selection={"base_table_id": '["main","events"]'}, measures=[
        {"id": "wait", "aggregation": "AVG", "value": duration, "unit": "resource_minutes"},
        {"id": "used", "aggregation": "SUM", "value": duration, "unit": "resource_minutes"},
        {"id": "available", "aggregation": "SUM", "scope": "population_total", "value": {"field": {"column": "minutes"}}, "unit": "resource_minutes"}],
        population={"selection": {"base_table_id": '["main","capacity"]'}, "entity": {"column": "id"}, "event_entity": {"column": "resource"}},
        formulas=[{"id": "occupancy", "label": "Occupancy percent", "expression": "100 * used / available", "require_dimensionless": True}])
    result = run(url, spec)
    assert float(result["data"][0]["wait"]) == pytest.approx(15, abs=1e-5)
    assert float(result["data"][0]["occupancy"]) == pytest.approx(30, abs=1e-5)
    assert result["measure_counts"][0]["excluded"]["value"] == 1
    spec["measures"][2]["unit"] = "seats"
    with pytest.raises(WarehouseError): run(url, spec)
    profiles = base(selection={"base_table_id": '["main","events"]', "joins": [{"id": "student", "target_table_id": '["main","students"]', "type": "LEFT", "via": {"kind": "manual", "pairs": [{"base_column": "student", "target_column": "id"}]}}]},
                    measures=[{"id": "people", "aggregation": "COUNT_DISTINCT", "value": {"field": {"column": "student"}}}],
                    dimensions=[{"id": "age", "field": {"relation": "student", "column": "birth"}, "age_at": {"column": "served"}, "ranges": [{"label": "Minor", "minimum": 0, "maximum": 18}, {"label": "Adult", "minimum": 18, "maximum": 100}]}])
    assert {r["age"]: r["people"] for r in run(url, profiles)["data"]} == {"Minor": 1, "Adult": 1}
    profiles["dimensions"][0].update(age_at=None, age_at_date="2026-02-28")
    assert {r["age"]: r["people"] for r in run(url, profiles)["data"]} == {"Minor": 1, "Adult": 1}
    engine.dispose()


def test_new_analysis_is_not_sent_to_old_agent(client, monkeypatch):
    from services.agent_manager import agent_manager
    from etl.warehouse.settings import capabilities
    commands = []
    monkeypatch.setattr(agent_manager, "is_agent_connected", lambda _: True)
    monkeypatch.setattr(agent_manager, "is_busy", lambda _: False)
    monkeypatch.setattr(agent_manager, "connection_id", lambda _: "generation")
    async def send(agent_id, action, payload, **kwargs):
        commands.append((action, payload))
        caps = capabilities()
        caps["actions"] = ["warehouse_catalog", "warehouse_query", "warehouse_detail", "warehouse_export"]
        return {"status": "success", "data": {"warehouse": caps}}
    monkeypatch.setattr(agent_manager, "send_command_and_wait", send)
    response = client.post("http://localhost/api/v1/warehouse/analyze", json={"connection": {**CONNECTION, "password": "runtime-only", "use_agent": True, "agent_id": "old"}, "analysis": base()})
    assert response.status_code == 503
    assert commands == [("get_capabilities", {})]
    assert "runtime-only" not in response.text


def test_report_uses_shared_read_snapshot_and_allowlisted_contract(database):
    from etl.warehouse.responses import RESPONSES
    result = execute("report", {"connection": CONNECTION, "analyses": [base(), base(title="Education tuition")]}, engine_factory=lambda *_: sa.create_engine(database))
    RESPONSES["report"].validate_python(result)
    assert len(result["results"]) == 2
    assert len({r["meta"]["generated_at"] for r in result["results"]}) == 1
    assert "password" not in str(result)


def schema():
    return LoadSchemaSpec.model_validate({"grain": "one student", "columns": [{"name": "id", "type": "integer", "nullable": False}, {"name": "active", "type": "boolean"}, {"name": "tuition", "type": "decimal", "precision": 30, "scale": 8}], "primary_key": ["id"]})


def test_typed_load_roundtrip_preview_and_reload(tmp_path):
    engine = sa.create_engine("sqlite:///" + str(tmp_path / "load.db"))
    frame = pd.DataFrame({"id": [9007199254740993], "active": [None], "tuition": [Decimal("12345.12345678")]})
    typed = coerce_frame(frame, schema())
    assert decode_dataset(encode_dataset(typed)).iloc[0]["active"] is None
    preview = persist_schema(frame, engine, "students", "fail", schema(), True)
    assert not sa.inspect(engine).has_table("students") and preview["schema_actions"] == ["create_table", "insert_rows"]
    first = persist_schema(frame, engine, "students", "fail", schema())
    assert first["submitted_rows"] == first["total_rows"] == 1
    assert sa.inspect(engine).get_pk_constraint("students")["constrained_columns"] == ["id"]
    with pytest.raises(LoadValidationError):
        persist_schema(frame, engine, "students", "fail", schema())
    assert persist_schema(frame, engine, "students", "reload", schema())["total_rows"] == 1
    with engine.connect() as conn:
        assert conn.execute(sa.text("select active from students")).scalar_one() is None


def test_type_contract_rejects_loss_and_duplicate_keys():
    with pytest.raises(LoadValidationError):
        coerce_frame(pd.DataFrame({"id": [1, 1], "active": [False, None], "tuition": [Decimal(1), Decimal(2)]}), schema())
    with pytest.raises(LoadValidationError):
        coerce_frame(pd.DataFrame({"id": [1], "active": [True], "tuition": [Decimal("1.123456789")]}), schema())


def test_nullable_core_conversions_do_not_round_ids_or_invent_false():
    from etl import ConvertOperations
    frame = pd.DataFrame({"id": ["9007199254740993", None], "active": ["false", None], "code": ["001", None], "amount": ["1.123456789012345678", None]})
    converted = ConvertOperations.convert_column_type(frame, list(frame), {"id": "integer", "active": "boolean", "code": "text", "amount": "numeric"})
    assert converted["id"].iloc[0] == 9007199254740993 and pd.isna(converted["id"].iloc[1])
    assert not converted["active"].iloc[0] and pd.isna(converted["active"].iloc[1])
    assert converted["code"].iloc[0] == "001" and pd.isna(converted["code"].iloc[1])
    assert converted["amount"].iloc[0] == Decimal("1.123456789012345678")
    with pytest.raises(ValueError):
        ConvertOperations.convert_column_type(pd.DataFrame({"id": ["1.5"]}), "id", "integer")


def test_zoned_timestamps_survive_the_typed_wire():
    spec = LoadSchemaSpec.model_validate({"grain": "one event", "columns": [{"name": "at", "type": "datetime", "timezone": True}]})
    frame = coerce_frame(pd.DataFrame({"at": ["2026-03-08T01:30:00-05:00", None]}), spec)
    restored = decode_dataset(encode_dataset(frame))
    assert restored["at"].iloc[0].isoformat() == "2026-03-08T06:30:00+00:00"
    assert pd.isna(restored["at"].iloc[1])
