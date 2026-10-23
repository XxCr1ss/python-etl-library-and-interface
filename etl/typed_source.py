"""Bounded exact extraction: SQLAlchemy scalars never pass through float inference."""
import pandas as pd
from sqlalchemy import Table, MetaData, select, DateTime
from .load_transport import MAX_LOAD_ROWS, MAX_LOAD_MESSAGE_BYTES, LoadValidationError, encode_dataset
from .warehouse.models import Connection
from .warehouse.execution import engine_for, read_session, Budget
from .warehouse.settings import effective_limits


def read_typed_table(config, table_name):
    fields = {k: config[k] for k in ("db_type", "host", "port", "database", "user", "password", "service_name") if k in config and config[k] is not None}
    connection = Connection.model_validate(fields)
    limits = effective_limits()
    engine = engine_for(connection, limits)
    try:
        with read_session(engine, Budget(limits)) as (conn, _):
            table = Table(table_name, MetaData(), autoload_with=conn)
            values, size = [], 0
            with conn.execution_options(stream_results=True, max_row_buffer=100).execute(select(table).limit(MAX_LOAD_ROWS + 1)) as cursor:
                for row in cursor:
                    size += sum(len(str(v).encode("utf-8")) for v in row if v is not None)
                    if len(values) >= MAX_LOAD_ROWS or size > MAX_LOAD_MESSAGE_BYTES - 4096:
                        raise LoadValidationError("La extracción tipada supera el presupuesto; reduce la tabla de origen.")
                    values.append(tuple(row))
            frame = pd.DataFrame(values, columns=table.c.keys(), dtype="object")
            for column in table.columns:
                if isinstance(column.type, DateTime):
                    dtype = pd.DatetimeTZDtype(unit="us", tz="UTC") if column.type.timezone else "datetime64[us]"
                    frame[column.name] = pd.Series(frame[column.name].tolist(), dtype=dtype)
            encode_dataset(frame)
            return frame
    finally:
        engine.dispose()
