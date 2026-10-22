import asyncio
import base64
from decimal import Decimal
from unittest.mock import AsyncMock
import httpx
import pytest
from sqlalchemy.dialects import postgresql, mysql, oracle
from sqlalchemy import Column, DateTime, MetaData, Table
from backend.main import app
from etl.warehouse.models import CatalogRequest, QueryRequest
from etl.warehouse.compiler import parse_value, temporal_expression
from etl.warehouse.execution import Budget, execute
from etl.warehouse.serialization import count_value, descriptor, encode_rows
from etl.warehouse.settings import LIMITS, WarehouseError, capabilities, effective_limits
from services import warehouse_service
from services.agent_manager import agent_manager
from test_warehouse_semantics import CONNECTION, warehouse, query


def post(path, payload, base="http://localhost"):
    async def call():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url=base) as client:
            return await client.post("/api/v1/warehouse/" + path, json=payload)
    return asyncio.run(call())


def test_api_contracts_and_safe_errors(warehouse):
    catalog = post("catalog", {"connection": CONNECTION})
    assert catalog.status_code == 200 and catalog.json()["schema"] == "main"
    assert catalog.headers["cache-control"] == "no-store"
    result = post("query", {"connection": CONNECTION, "query": query(warehouse)})
    assert result.status_code == 200 and result.json()["filtered_rows"]["value"] == 3
    exported = post("export", {"connection": CONNECTION, "query": query(warehouse), "mode": "aggregate", "format": "csv"})
    assert exported.status_code == 200 and b"category" in exported.content
    invalid = post("query", {"connection": CONNECTION, "query": query(warehouse), "sql": "synthetic-secret"})
    assert invalid.status_code == 422 and invalid.json()["code"] == "invalid_query"
    assert invalid.headers["cache-control"] == "no-store" and "synthetic-secret" not in invalid.text
    assert post("catalog", {"connection": CONNECTION}, base="http://remote.invalid").status_code == 400


@pytest.mark.parametrize("caps", [None, {}, {"warehouse": {}}, {"warehouse": {"protocol_version": True, "actions": [], "limits": {}}}, {"warehouse": None, "warehouse_unavailable": "insecure_transport"}])
def test_old_or_malformed_agent_receives_no_credentials(monkeypatch, caps):
    monkeypatch.setattr(agent_manager, "is_agent_connected", lambda _: True)
    monkeypatch.setattr(agent_manager, "connection_id", lambda _: "generation")
    calls = AsyncMock(return_value={"status": "success", "data": caps})
    monkeypatch.setattr(agent_manager, "send_command_and_wait", calls)
    with pytest.raises(WarehouseError) as error:
        asyncio.run(warehouse_service.perform("catalog", CatalogRequest(connection={**CONNECTION, "use_agent": True, "agent_id": "a"})))
    assert error.value.code == "agent_incompatible"
    assert calls.await_count == 1 and calls.call_args.args[1:] == ("get_capabilities", {})


def test_agent_negotiation_generation_and_result_validation(monkeypatch, warehouse):
    result = execute("query", {"connection": CONNECTION, "query": query(warehouse)})
    monkeypatch.setattr(agent_manager, "is_agent_connected", lambda _: True)
    monkeypatch.setattr(agent_manager, "connection_id", lambda _: "generation")
    calls = AsyncMock(side_effect=[{"status": "success", "data": {"warehouse": capabilities()}}, {"status": "success", "data": result}])
    monkeypatch.setattr(agent_manager, "send_command_and_wait", calls)
    req = QueryRequest(connection={**CONNECTION, "use_agent": True, "agent_id": "a"}, query=query(warehouse))
    returned = asyncio.run(warehouse_service.perform("query", req))
    assert returned["data"] == result["data"]
    assert calls.call_args_list[1].kwargs["expected_connection"] == "generation"
    assert calls.call_args_list[1].args[1] == "warehouse_query"
    assert calls.call_args_list[1].args[2]["request"]["connection"]["password"] == CONNECTION["password"]
    result["columns"][0]["id"] = "different"
    calls.side_effect = [{"status": "success", "data": {"warehouse": capabilities()}}, {"status": "success", "data": result}]
    with pytest.raises(WarehouseError, match="contrato"):
        asyncio.run(warehouse_service.perform("query", req))


def test_busy_agent_does_not_negotiate(monkeypatch):
    monkeypatch.setattr(agent_manager, "is_agent_connected", lambda _: True)
    monkeypatch.setattr(agent_manager, "is_busy", lambda _: True)
    calls = AsyncMock(); monkeypatch.setattr(agent_manager, "send_command_and_wait", calls)
    with pytest.raises(WarehouseError) as error:
        asyncio.run(warehouse_service.perform("catalog", CatalogRequest(connection={**CONNECTION, "use_agent": True, "agent_id": "a"})))
    assert error.value.status == 409 and calls.await_count == 0


@pytest.mark.parametrize("kind,value", [("integer", True), ("integer", 2**53), ("float", "1e10000"), ("decimal", "NaN"), ("date", "not a date"), ("boolean", "true")])
def test_strict_filter_values(kind, value):
    with pytest.raises(WarehouseError):
        parse_value(value, kind)


def test_precise_serialization_and_nonfinite_values():
    columns = [descriptor("large", "large", "integer"), descriptor("money", "money", "decimal"), descriptor("float", "float", "float")]
    warnings = []
    result = encode_rows([{"large": 2**53 + 1, "money": Decimal("9007199254740993.1234"), "float": float("inf")}, {"large": 1, "money": None, "float": 1.5}], columns, warnings)
    assert result[0] == {"large": "9007199254740993", "money": "9007199254740993.1234", "float": None}
    assert result[1]["large"] == "1" and columns[0]["encoding"] == "integer_string"
    assert len(warnings) == 1 and count_value(2**53 + 1)["encoding"] == "integer_string"


def test_deadline_and_negotiated_limits_reject_before_connect(warehouse):
    budget = Budget(LIMITS); budget.deadline = 0
    with pytest.raises(WarehouseError) as error:
        budget.remaining_ms()
    assert error.value.status == 504
    with pytest.raises(WarehouseError) as error:
        execute("query", {"connection": CONNECTION, "query": query(warehouse, limit=2)}, limits={**LIMITS, "groups": 1})
    assert error.value.code == "invalid_query"
    with pytest.raises(WarehouseError) as error:
        execute("catalog", {"connection": CONNECTION}, limits={**LIMITS, "tables": 1})
    assert error.value.status == 413
    limited = effective_limits({**LIMITS, "message_bytes": 1024 * 1024})
    assert limited["export_bytes"] < 3 * 1024 * 1024 // 4


@pytest.mark.parametrize("dialect,fragment", [(postgresql.dialect(), "date_trunc"), (mysql.dialect(), "date_format"), (oracle.dialect(), "trunc")])
def test_temporal_dialects_compile_without_user_sql(dialect, fragment):
    table = Table("Special table", MetaData(), Column("When", DateTime))
    expression = temporal_expression(table.c.When, "month", dialect.name)
    assert fragment in str(expression.compile(dialect=dialect))


def test_download_validates_size_and_encoding():
    with pytest.raises(WarehouseError):
        warehouse_service.download({"content_base64": "bad!", "size": 1, "filename": "reporte_bodega.csv", "mime_type": "text/csv; charset=utf-8"})
    assert warehouse_service.download({"content_base64": base64.b64encode(b"x").decode(), "size": 1, "filename": "reporte_bodega.csv", "mime_type": "text/csv; charset=utf-8"}) == b"x"


def test_insecure_remote_agent_does_not_advertise_analytics():
    from etl_agent import load_capabilities, warehouse_transport_allowed
    assert warehouse_transport_allowed("http://127.0.0.1:8000")
    assert warehouse_transport_allowed("https://remote.invalid")
    assert not warehouse_transport_allowed("http://remote.invalid")
    assert load_capabilities(False, False)["warehouse"] is None
    assert load_capabilities(False, True)["warehouse"]["protocol_version"] == 1
