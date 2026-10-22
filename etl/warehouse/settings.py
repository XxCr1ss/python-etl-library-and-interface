import os
from etl.load_transport import MAX_LOAD_MESSAGE_BYTES


def positive(name, default):
    value = int(os.getenv("ETL_WAREHOUSE_" + name.upper(), default))
    if value <= 0:
        raise ValueError("Los límites de analítica deben ser positivos.")
    return value


LIMITS = {key: positive(key, value) for key, value in {
    "tables": 200, "catalog_columns": 5000, "metrics": 6, "dimensions": 3,
    "joins": 4, "filters": 20, "in_values": 100, "text_length": 1000,
    "groups": 1000, "page_size": 100, "columns": 50, "offset": 10000,
    "export_rows": 20000, "export_bytes": 10 * 1024 * 1024,
    "message_bytes": 16 * 1024 * 1024, "connect_seconds": 10,
    "statement_seconds": 30, "export_seconds": 60, "operation_seconds": 90,
}.items()}
LIMITS["message_bytes"] = min(LIMITS["message_bytes"], MAX_LOAD_MESSAGE_BYTES)


def effective_limits(advertised=None):
    result = {k: min(v, (advertised or LIMITS).get(k, v)) for k, v in LIMITS.items()}
    result["export_bytes"] = min(result["export_bytes"], max(1, (result["message_bytes"] - 4096) * 3 // 4))
    return result
ACTIONS = ["warehouse_" + operation for operation in ("catalog", "query", "detail", "export")]


class WarehouseError(ValueError):
    def __init__(self, code, message, status=422):
        self.code, self.status = code, status
        super().__init__(message)


def capabilities(limits=None):
    return {"protocol_version": 1, "actions": ACTIONS, "limits": effective_limits(limits)}
