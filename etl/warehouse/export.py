import base64
import csv
import io
from .serialization import json_bytes
from .settings import WarehouseError


def safe_text(value):
    if isinstance(value, str) and (value.lstrip().startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n"))):
        return "'" + value
    return value


def export_file(result, req, limits):
    public = {**result, "report": {"mode": req.mode, "scope": req.query.model_dump() if req.mode == "aggregate" else req.selection.model_dump(),
                                   "drilldown": [d.model_dump() for d in getattr(req, "drilldown", [])]}}
    if req.format == "json":
        content = json_bytes(public)
        mime = "application/json"
    else:
        stream = io.StringIO(newline="")
        writer = csv.writer(stream)
        writer.writerow([safe_text(c["label"]) for c in result["columns"]])
        for row in result["data"]:
            cells = []
            for column in result["columns"]:
                value = row[column["id"]]
                if column["logical_type"] == "string":
                    value = safe_text(value)
                cells.append(value)
            writer.writerow(cells)
            if stream.tell() > limits["export_bytes"]:
                raise WarehouseError("export_limit_exceeded", "El archivo supera el límite de bytes; aplica más filtros.", 413)
        content, mime = stream.getvalue().encode("utf-8-sig"), "text/csv; charset=utf-8"
    if len(content) > limits["export_bytes"]:
        raise WarehouseError("export_limit_exceeded", "El archivo supera el límite de bytes; aplica más filtros.", 413)
    encoded = base64.b64encode(content).decode("ascii")
    if len(encoded) + 2048 > limits["message_bytes"]:
        raise WarehouseError("export_limit_exceeded", "El archivo supera el límite del transporte; reduce su alcance.", 413)
    return {"filename": "reporte_bodega." + req.format, "mime_type": mime, "size": len(content), "content_base64": encoded}
