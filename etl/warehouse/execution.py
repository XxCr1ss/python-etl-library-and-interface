"""Read-only transaction lifecycle and bounded execution on the selected machine."""
import datetime as dt
import threading
import time
from contextlib import contextmanager
from sqlalchemy import create_engine, event
from sqlalchemy.engine import URL
from sqlalchemy.exc import DBAPIError
from sqlalchemy.pool import NullPool
from pydantic import TypeAdapter, ValidationError
from .catalog import Catalog
from .compiler import Compiler
from .models import CatalogRequest, QueryRequest, DetailRequest, ExportRequest
from .analysis_models import AnalysisRequest, ReportRequest
from .serialization import bounded, count_value, encode_rows, json_bytes
from .settings import LIMITS, WarehouseError, effective_limits

REQUESTS = {"catalog": TypeAdapter(CatalogRequest), "query": TypeAdapter(QueryRequest),
            "detail": TypeAdapter(DetailRequest), "export": TypeAdapter(ExportRequest),
            "analyze": TypeAdapter(AnalysisRequest), "report": TypeAdapter(ReportRequest)}
_slots = threading.BoundedSemaphore(4)


def engine_for(connection, limits):
    drivers = {"postgresql": "postgresql+psycopg2", "mysql": "mysql+pymysql", "oracle": "oracle+oracledb"}
    ports = {"postgresql": 5432, "mysql": 3306, "oracle": 1521}
    args = {"connect_timeout": limits["connect_seconds"]}
    query = {}
    database = connection.database
    if connection.db_type == "mysql":
        args.update(read_timeout=limits["statement_seconds"], write_timeout=limits["connect_seconds"])
    elif connection.db_type == "oracle":
        args = {"tcp_connect_timeout": limits["connect_seconds"]}
        database, query = None, {"service_name": connection.service_name}
    url = URL.create(drivers[connection.db_type], username=connection.user, password=connection.password,
                     host=connection.host, port=connection.port or ports[connection.db_type], database=database, query=query)
    return create_engine(url, connect_args=args, poolclass=NullPool, hide_parameters=True)


class Budget:
    def __init__(self, limits, exporting=False):
        self.deadline = time.monotonic() + limits["operation_seconds"]
        self.statement_ms = 1000 * limits["export_seconds" if exporting else "statement_seconds"]

    def remaining_ms(self):
        remaining = int((self.deadline - time.monotonic()) * 1000)
        if remaining <= 0:
            raise WarehouseError("query_timeout", "La consulta agotó su tiempo; aplica filtros y vuelve a consultar.", 504)
        return max(1, min(remaining, self.statement_ms))


@contextmanager
def read_session(engine, budget):
    with engine.connect() as connection:
        dialect = engine.dialect.name
        if dialect == "postgresql":
            connection.exec_driver_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
            connection.exec_driver_sql("SET LOCAL statement_timeout = " + str(budget.remaining_ms()))
            zone = connection.exec_driver_sql("SHOW TIME ZONE").scalar_one()
            consistency = "snapshot"
        elif dialect == "mysql":
            connection.exec_driver_sql("SET SESSION MAX_EXECUTION_TIME = " + str(budget.remaining_ms()))
            connection.exec_driver_sql("SET SESSION lock_wait_timeout = 30")
            connection.exec_driver_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
            connection.exec_driver_sql("START TRANSACTION READ ONLY")
            zone = connection.exec_driver_sql("SELECT @@session.time_zone").scalar_one()
            consistency = "statement"  # Nontransactional tables may be present.
        elif dialect == "oracle":
            connection.connection.driver_connection.call_timeout = budget.remaining_ms()
            connection.exec_driver_sql("SET TRANSACTION READ ONLY")
            zone = connection.exec_driver_sql("SELECT SESSIONTIMEZONE FROM DUAL").scalar_one()
            consistency = "snapshot"
        elif dialect == "sqlite":  # Isolated SQL tests; not accepted by Connection.
            connection.exec_driver_sql("PRAGMA query_only = ON")
            connection.exec_driver_sql("BEGIN")
            zone, consistency = "UTC", "snapshot"
        else:
            raise WarehouseError("connection_failed", "El motor no permite el modo de lectura requerido.", 503)

        def before_cursor(conn, cursor, statement, parameters, context, executemany):
            ms = budget.remaining_ms()
            if dialect == "postgresql":
                # Use a regular cursor: a server-side SELECT cursor cannot execute SET.
                with conn.connection.driver_connection.cursor() as control:
                    control.execute("SET LOCAL statement_timeout = " + str(ms))
                    control.execute("SET LOCAL lock_timeout = " + str(min(ms, 5000)))
            elif dialect == "mysql":
                # A separate cursor also supports unbuffered result cursors.
                with conn.connection.driver_connection.cursor() as control:
                    control.execute("SET SESSION MAX_EXECUTION_TIME = " + str(ms))
            elif dialect == "oracle":
                conn.connection.driver_connection.call_timeout = ms

        event.listen(connection, "before_cursor_execute", before_cursor)
        try:
            yield connection, {"consistency": consistency, "temporal_context": {"timezone": str(zone), "calendar": "session", "naive_timestamp": "local"}}
        finally:
            event.remove(connection, "before_cursor_execute", before_cursor)
            connection.rollback()


def rows(connection, statement, columns, budget, limits):
    result, size = [], 0
    with connection.execution_options(stream_results=True, max_row_buffer=100).execute(statement) as cursor:
        for row in cursor:
            budget.remaining_ms()
            item = dict(zip([c["id"] for c in columns], row))
            # Bound while fetching, including long strings; never build an entire unbounded result.
            from .serialization import scalar
            size += len(json_bytes({c["id"]: scalar(item[c["id"]], c["logical_type"]) for c in columns}))
            if size > min(limits["message_bytes"], limits["export_bytes"]):
                raise WarehouseError("result_limit_exceeded", "El resultado supera el límite de bytes; reduce columnas o aplica filtros.", 413)
            result.append(item)
    return result


def analytics(connection, catalog, req, budget, limits, meta):
    compiler = Compiler(catalog, req.query, connection.dialect.name)
    statement, summary, columns = compiler.query(req.query)
    raw = rows(connection, statement, columns, budget, limits)
    warnings = list(catalog.warnings)
    data = encode_rows(raw[:req.query.limit], columns, warnings)
    summary_columns = [dict(c) for c in columns if c["role"] == "metric"]
    summary_columns.append({"id": "__filtered_rows", "logical_type": "integer", "encoding": "native"})
    global_rows = rows(connection, summary, summary_columns, budget, limits)
    global_data = encode_rows(global_rows, summary_columns, warnings)[0]
    return {"status": "success", "columns": columns, "data": data,
            "summary_kpis": [{"metric_id": m.id, "aggregation": m.aggregation, "value": global_data[m.id],
                              "logical_type": c["logical_type"], "encoding": c["encoding"]} for m, c in zip(req.query.metrics, summary_columns)],
            "filtered_rows": count_value(global_rows[0]["__filtered_rows"]), "warnings": warnings,
            "meta": {**meta, "returned_rows": len(data), "applied_limit": req.query.limit,
                     "truncated": bool(req.query.dimensions and len(raw) > req.query.limit)}}


def detail(connection, catalog, req, budget, limits, meta, exporting=False):
    maximum = req.max_rows if exporting and req.mode == "detail" else req.limit if exporting else req.page_size
    offset = 0 if exporting else (req.page - 1) * req.page_size
    compiler = Compiler(catalog, req.selection, connection.dialect.name)
    statement, total, columns, stable = compiler.detail(req, maximum, offset, require_key=exporting and req.mode == "detail")
    raw = rows(connection, statement, columns, budget, limits)
    if exporting and req.mode == "detail" and len(raw) > maximum:
        raise WarehouseError("export_limit_exceeded", "El detalle supera el límite de exportación; aplica más filtros.", 413)
    warnings = list(catalog.warnings)
    if not stable:
        warnings.append({"code": "sample_only", "message": "Sin clave estable: muestra inicial, sin orden garantizado ni páginas adicionales."})
    data = encode_rows(raw[:maximum], columns, warnings)
    count = None
    if not exporting and req.include_total:
        total_rows = rows(connection, total, [{"id": "total", "logical_type": "integer"}], budget, limits)
        count = count_value(total_rows[0]["total"])
    return {"status": "success", "columns": columns, "data": data, "warnings": warnings,
            "pagination": {"mode": "page" if stable else "sample", "page": 1 if exporting else req.page,
                           "page_size": maximum, "has_more": stable and len(raw) > maximum, "total_records": count},
            "meta": {**meta, "returned_rows": len(data), "applied_limit": maximum, "truncated": len(raw) > maximum}}


def validate_limits(req, operation, limits):
    analyses = [req.analysis] if operation == "analyze" else req.analyses if operation == "report" else []
    for analysis in analyses:
        dimensions = analysis.dimensions + (analysis.population.dimensions if analysis.population else [])
        filter_groups = [m.filters for m in analysis.measures] + [r.filters for d in dimensions for r in d.categories]
        if any(len(group) > limits["filters"] for group in filter_groups):
            raise WarehouseError("invalid_query", "Una condición de indicador supera los límites efectivos.")
        for group in filter_groups:
            for f in group:
                values = getattr(f, "values", [getattr(f, "value", None)])
                if f.op == "IN" and len(values) > limits["in_values"] or any(isinstance(v, str) and len(v) > limits["text_length"] for v in values):
                    raise WarehouseError("invalid_query", "Una condición de indicador supera los límites efectivos.")
        selections = [analysis.selection, *[c.selection for c in analysis.cohorts]]
        if analysis.population:
            selections.append(analysis.population.selection)
        if len(analysis.dimensions) > limits["dimensions"] or len(analysis.measures) > limits["metrics"] or len(analysis.formulas) > limits["metrics"] or analysis.limit > limits["groups"]:
            raise WarehouseError("invalid_query", "El análisis supera los límites efectivos del ejecutor.")
        for selection in selections:
            if len(selection.joins) > limits["joins"] or len(selection.filters) > limits["filters"]:
                raise WarehouseError("invalid_query", "La selección supera los límites efectivos del ejecutor.")
            filters = [*selection.filters]
            if selection is analysis.selection:
                filters += [f for m in analysis.measures for f in m.filters]
                filters += [f for d in analysis.dimensions for r in d.categories for f in r.filters]
            for f in filters:
                values = getattr(f, "values", [getattr(f, "value", None)])
                if f.op == "IN" and len(values) > limits["in_values"] or any(isinstance(v, str) and len(v) > limits["text_length"] for v in values):
                    raise WarehouseError("invalid_query", "Los filtros superan los límites efectivos del ejecutor.")
    query = getattr(req, "query", None)
    selection = query or getattr(req, "selection", None)
    if selection:
        for name in ("joins", "filters"):
            if len(getattr(selection, name)) > limits[name]:
                raise WarehouseError("invalid_query", "La consulta supera los límites efectivos del ejecutor.")
        for f in selection.filters:
            values = getattr(f, "values", [getattr(f, "value", None)])
            if f.op == "IN" and len(values) > limits["in_values"] or any(isinstance(v, str) and len(v) > limits["text_length"] for v in values):
                raise WarehouseError("invalid_query", "Los filtros superan los límites efectivos del ejecutor.")
    if query and (len(query.metrics) > limits["metrics"] or len(query.dimensions) > limits["dimensions"] or query.limit > limits["groups"]):
        raise WarehouseError("invalid_query", "La consulta supera los límites efectivos del ejecutor.")
    if hasattr(req, "columns") and len(req.columns) > limits["columns"]:
        raise WarehouseError("invalid_query", "Se seleccionaron demasiadas columnas para el ejecutor.")
    if hasattr(req, "drilldown") and len(req.drilldown) > limits["dimensions"]:
        raise WarehouseError("invalid_query", "La selección de detalle supera los límites efectivos del ejecutor.")
    if operation == "detail" and (req.page_size > limits["page_size"] or (req.page - 1) * req.page_size > limits["offset"]):
        raise WarehouseError("invalid_query", "La página supera los límites efectivos del ejecutor.")
    if operation == "export" and ((req.mode == "detail" and req.max_rows > limits["export_rows"]) or (req.mode == "sample" and req.limit > limits["page_size"])):
        raise WarehouseError("invalid_query", "La exportación supera los límites efectivos del ejecutor.")


def execute(operation, payload, limits=None, engine_factory=None):
    """Validate again on the actual executor, including requests forwarded by backend."""
    limits = effective_limits(limits)
    try:
        bounded(payload, limits["message_bytes"] - 2048)
        req = REQUESTS[operation].validate_python(payload)
        validate_limits(req, operation, limits)
    except (ValidationError, KeyError, ValueError) as exc:
        if isinstance(exc, WarehouseError):
            raise
        raise WarehouseError("invalid_query", "Solicitud analítica inválida; revisa sus campos y límites.") from None
    if not _slots.acquire(blocking=False):
        raise WarehouseError("agent_busy", "El ejecutor está ocupado; espera y vuelve a intentar.", 409)
    started = time.monotonic()
    budget, engine = Budget(limits, operation == "export"), None
    try:
        engine = (engine_factory or engine_for)(req.connection, limits)
        with read_session(engine, budget) as (connection, context):
            catalog = Catalog(connection, limits)
            meta = {**context, "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(), "execution_time_ms": 0}
            if operation == "catalog":
                result = catalog.public()
            elif operation in {"analyze", "report"}:
                from .analysis import run_analysis
                if operation == "analyze":
                    result = run_analysis(connection, catalog, req.analysis, budget, limits, meta)
                else:
                    from uuid import uuid4
                    result = {"status": "success", "version": 1, "execution_id": str(uuid4()), "results": []}
                    for analysis in req.analyses:
                        result["results"].append(run_analysis(connection, catalog, analysis, budget, limits, meta))
                        bounded(result, limits["message_bytes"] - 2048)
            elif operation == "query" or (operation == "export" and req.mode == "aggregate"):
                result = analytics(connection, catalog, req, budget, limits, meta)
            else:
                result = detail(connection, catalog, req, budget, limits, meta, operation == "export")
            budget.remaining_ms()
            if "meta" in result:
                result["meta"]["execution_time_ms"] = round((time.monotonic() - started) * 1000, 2)
        if operation == "export":
            from .export import export_file
            result = export_file(result, req, limits)
        return bounded(result, limits["message_bytes"] - 2048)
    except WarehouseError:
        raise
    except DBAPIError as exc:
        error = getattr(exc, "orig", None)
        code = str(getattr(error, "pgcode", ""))
        args = getattr(error, "args", ())
        if code in {"57014", "55P03"} or (args and args[0] in {3024, 1205, 2013}) or "DPI-1067" in str(error) or "DPY-4024" in str(error):
            raise WarehouseError("query_timeout", "La consulta agotó su tiempo; reduce su alcance.", 504) from None
        raise WarehouseError("connection_failed", "No se pudo leer la bodega; revisa conexión, permisos y catálogo.", 503) from None
    except Exception:
        raise WarehouseError("connection_failed", "No se pudo leer la bodega; revisa conexión, permisos y catálogo.", 503) from None
    finally:
        try:
            if engine is not None:
                engine.dispose()
        finally:
            _slots.release()
