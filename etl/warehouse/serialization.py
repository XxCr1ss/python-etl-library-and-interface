"""Exact public values. Never use Pandas or float to encode database decimals."""
import datetime as dt
import json
import math
from decimal import Decimal
from .settings import LIMITS, WarehouseError


def json_bytes(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8")


def bounded(value, limit=None, code="result_limit_exceeded"):
    if len(json_bytes(value)) > (limit or LIMITS["message_bytes"]):
        raise WarehouseError(code, "El resultado supera el límite de bytes; reduce columnas o aplica filtros.", 413)
    return value


def descriptor(id, label, logical_type, role="dimension"):
    encoding = "decimal_string" if logical_type == "decimal" else "iso8601" if logical_type in {"date", "datetime"} else "native"
    return {"id": id, "label": label, "logical_type": logical_type, "encoding": encoding, "role": role}


def scalar(value, kind):
    if value is None:
        return None
    if isinstance(value, Decimal):
        return str(value) if value.is_finite() else None
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if kind == "decimal":
        return str(value)
    if isinstance(value, int) and not isinstance(value, bool) and abs(value) > 2**53 - 1:
        return str(value)
    return value


def encode_rows(raw, columns, warnings):
    data = []
    for row in raw:
        item = {}
        for col in columns:
            value = row[col["id"]]
            encoded = scalar(value, col["logical_type"])
            if value is not None and encoded is None and not any(w["code"] == "non_finite" for w in warnings):
                warnings.append({"code": "non_finite", "message": "Valores no finitos se muestran como nulos."})
            if col["logical_type"] == "integer" and isinstance(encoded, str):
                col["encoding"] = "integer_string"
            item[col["id"]] = encoded
        data.append(item)
    for col in columns:
        if col["encoding"] == "integer_string":
            for row in data:
                if row[col["id"]] is not None:
                    row[col["id"]] = str(row[col["id"]])
    return data


def count_value(value):
    return {"value": scalar(value, "integer"), "logical_type": "integer",
            "encoding": "integer_string" if abs(value) > 2**53 - 1 else "native"}
