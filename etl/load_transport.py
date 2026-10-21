"""Version 1 bounded JSON codec for writes (never the lossy preview codec)."""
import datetime as dt
import json
import math
import os
import re
from decimal import Decimal

import numpy as np
import pandas as pd

LOAD_PROTOCOL_VERSION = 1


def positive_setting(name, default):
    value = int(os.environ.get(name, default))
    if value <= 0:
        raise ValueError(f"{name} debe ser positivo.")
    return value


MAX_LOAD_MESSAGE_BYTES = positive_setting("ETL_LOAD_MAX_MESSAGE_BYTES", 50 * 1024 * 1024)
MAX_LOAD_ROWS = positive_setting("ETL_LOAD_MAX_ROWS", 250_000)
INTEGER = re.compile(r"(?:[uU]?[iI]nt)(8|16|32|64)\Z")
FLOATS = {"float32", "float64", "Float32", "Float64"}
DATETIME = re.compile(r"datetime64\[(s|ms|us|ns)(?:, ([^\[\]]+))?\]\Z")


class LoadValidationError(ValueError):
    """Controlled public text, without source values or driver diagnostics."""


def strict_json(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))


def serialize_command(message, max_bytes=MAX_LOAD_MESSAGE_BYTES):
    encoded = strict_json(message)
    if len(encoded.encode("utf-8")) > max_bytes:
        raise LoadValidationError("El lote supera el límite de bytes del agente; reduce el resultado en Transformación.")
    return encoded


def _column_schema(series):
    dtype = str(series.dtype)
    logical = None
    if INTEGER.fullmatch(dtype):
        logical = "integer"
    elif dtype in FLOATS:
        logical = "float"
    elif dtype in {"bool", "boolean"}:
        logical = "boolean"
    elif isinstance(series.dtype, pd.StringDtype):
        # Storage backends can differ locally; preserve the scalar/missing policy.
        logical = "string"
    elif DATETIME.fullmatch(dtype):
        logical = "datetime"
    elif dtype == "object":
        kinds = {type(v) for v in series if v is not None}
        mapping = {str: "string", int: "integer", bool: "boolean", float: "float",
                   Decimal: "decimal", dt.date: "date", dt.time: "time", dt.datetime: "datetime_object"}
        if not kinds:
            logical = "null"
        elif len(kinds) == 1:
            logical = mapping.get(next(iter(kinds)))
        if logical in {"time", "datetime_object"} and any(v is not None and (v.tzinfo is not None or v.fold) for v in series):
            raise LoadValidationError("Convierte fechas con zona a datetime64 antes de cargar; no se admiten objetos temporales ambiguos.")
    if logical is None:
        raise LoadValidationError("El lote contiene un dtype u objetos no admitidos; convierte esa columna antes de cargar.")
    return {"name": series.name, "logical_type": logical, "pandas_dtype": dtype,
            "nullable": dtype == "object" or dtype not in {"bool", "int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64"}}


def _encode(value, schema):
    if value is None or value is pd.NA or value is pd.NaT:
        return None
    kind = schema["logical_type"]
    if kind == "string" and schema["pandas_dtype"] == "str" and pd.isna(value):
        return None
    if kind == "datetime":
        return None if pd.isna(value) else value.isoformat()
    if isinstance(value, np.generic):
        value = value.item()
    if kind == "float":
        if math.isnan(value) and schema["pandas_dtype"] != "object":
            return None
        if not math.isfinite(value):
            raise LoadValidationError("El lote contiene números no finitos; corrígelos antes de cargar.")
        return value
    if kind == "integer":
        return str(value)
    if kind in {"date", "time", "datetime_object"}:
        return value.isoformat()
    if kind == "decimal":
        if not value.is_finite():
            raise LoadValidationError("El lote contiene decimales no finitos.")
        return str(value)
    return value


def encode_dataset(frame, max_bytes=MAX_LOAD_MESSAGE_BYTES, max_rows=MAX_LOAD_ROWS):
    if len(frame) > max_rows:
        raise LoadValidationError("El lote supera el límite de filas del agente; reduce el resultado en Transformación.")
    if not len(frame.columns) or not frame.columns.is_unique or any(not isinstance(c, str) or not c for c in frame.columns):
        raise LoadValidationError("El lote requiere columnas textuales únicas y no vacías.")
    columns = [_column_schema(frame[c]) for c in frame.columns]
    result = {"row_count": len(frame), "columns": columns, "rows": []}
    size = len(strict_json(result).encode("utf-8"))
    for row in frame.itertuples(index=False, name=None):
        encoded = [_encode(v, c) for v, c in zip(row, columns)]
        size += len(strict_json(encoded).encode("utf-8")) + bool(result["rows"])
        if size > max_bytes:
            raise LoadValidationError("El lote supera el límite de bytes del agente; reduce el resultado en Transformación.")
        result["rows"].append(encoded)
    return result


def _validate_schema(schema):
    if not isinstance(schema, dict) or set(schema) != {"name", "logical_type", "pandas_dtype", "nullable"}:
        raise LoadValidationError("Esquema de lote inválido.")
    name, kind, dtype = (schema[k] for k in ("name", "logical_type", "pandas_dtype"))
    if not isinstance(name, str) or not name or not isinstance(kind, str) or not isinstance(dtype, str) or type(schema["nullable"]) is not bool:
        raise LoadValidationError("Esquema de lote inválido.")
    valid = ((kind == "integer" and bool(INTEGER.fullmatch(dtype))) or
             (kind == "float" and dtype in FLOATS) or
             (kind == "boolean" and dtype in {"bool", "boolean"}) or
             (kind == "string" and dtype in {"str", "string"}) or
             (kind == "datetime" and bool(DATETIME.fullmatch(dtype))) or
             (dtype == "object" and kind in {"integer", "float", "boolean", "string", "decimal", "date", "time", "datetime_object", "null"}))
    if not valid:
        raise LoadValidationError("Tipo de columna no admitido por el protocolo de carga.")
    non_nullable = dtype in {"bool", "int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64"}
    if schema["nullable"] == non_nullable:
        raise LoadValidationError("Política de nulos inválida.")


def _decode(value, schema):
    if value is None:
        if not schema["nullable"]:
            raise LoadValidationError("Nulo incompatible con dtype de columna.")
        return None
    kind = schema["logical_type"]
    try:
        if kind == "integer" and isinstance(value, str) and re.fullmatch(r"-?(0|[1-9][0-9]*)", value):
            result = int(value)
            if schema["pandas_dtype"] != "object":
                info = np.iinfo(schema["pandas_dtype"].lower())
                if not info.min <= result <= info.max:
                    raise ValueError()
            return result
        if kind == "float" and type(value) in {float, int} and math.isfinite(value):
            if schema["pandas_dtype"].lower() == "float32" and abs(value) > np.finfo("float32").max:
                raise ValueError()
            return float(value)
        if kind == "boolean" and type(value) is bool:
            return value
        if kind == "string" and isinstance(value, str):
            return value
        if kind == "decimal" and isinstance(value, str):
            result = Decimal(value)
            if result.is_finite():
                return result
        if kind in {"date", "time", "datetime_object", "datetime"} and isinstance(value, str):
            return {"date": dt.date.fromisoformat, "time": dt.time.fromisoformat,
                    "datetime_object": dt.datetime.fromisoformat, "datetime": pd.Timestamp}[kind](value)
    except (ValueError, TypeError, OverflowError, ArithmeticError):
        pass
    raise LoadValidationError("Celda incompatible con el esquema del lote.")


def decode_dataset(dataset, max_bytes=MAX_LOAD_MESSAGE_BYTES, max_rows=MAX_LOAD_ROWS):
    if not isinstance(dataset, dict) or set(dataset) != {"row_count", "columns", "rows"}:
        raise LoadValidationError("Dataset de carga inválido.")
    count, columns, rows = (dataset[k] for k in ("row_count", "columns", "rows"))
    if type(count) is not int or not 0 <= count <= max_rows or not isinstance(rows, list) or len(rows) != count:
        raise LoadValidationError("Conteo de filas inválido o superior al límite.")
    if not isinstance(columns, list) or not columns:
        raise LoadValidationError("Falta el esquema del lote.")
    for column in columns:
        _validate_schema(column)
    if len({c["name"] for c in columns}) != len(columns):
        raise LoadValidationError("Columnas duplicadas en el lote.")
    serialize_command(dataset, max_bytes)
    values = [[] for _ in columns]
    for row in rows:
        if not isinstance(row, list) or len(row) != len(columns):
            raise LoadValidationError("Cantidad de celdas inválida en el lote.")
        for target, cell, schema in zip(values, row, columns):
            target.append(_decode(cell, schema))
    try:
        result = {}
        for schema, cells in zip(columns, values):
            dtype = schema["pandas_dtype"]
            if dtype in {"float32", "float64"}:
                cells = [np.nan if v is None else v for v in cells]
            result[schema["name"]] = pd.Series(cells, dtype=dtype)
        return pd.DataFrame(result)
    except (ValueError, TypeError, OverflowError):
        raise LoadValidationError("No se pudo reconstruir el dtype declarado.") from None
