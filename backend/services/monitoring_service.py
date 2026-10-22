"""Persist observations, never browser-reported success or datasets."""
import asyncio
import base64
import hashlib
import json
import time
from datetime import datetime

from fastapi import HTTPException
from fastapi.responses import JSONResponse

from services.auth_service import Identity
from services.connection_security import limits
from services.supabase_service import gateway, require_feature

EXECUTION_FIELDS = ("id,request_id,status,source_label,target_label,source_type,target_type,table_name,table_type,if_exists,"
                    "destination_total_rows,rows_extracted,rows_written,started_at,finished_at,duration_ms,error_code,error_message")


def fingerprint(payload):
    def clean(value):
        if isinstance(value, dict):
            return {k: clean(v) for k, v in value.items() if k not in {"password", "agent_token", "request_id"}}
        if isinstance(value, list):
            return [clean(item) for item in value]
        return value
    return hashlib.sha256(json.dumps(clean(payload), sort_keys=True, default=str, separators=(",", ":")).encode()).hexdigest()


_accepted_tasks: set[asyncio.Task] = set()


async def run_monitored(identity: Identity, req, operation):
    # The accepted write owns its slot even if its HTTP caller disconnects.
    # Keep a strong reference until result/metadata finalization completes.
    task = asyncio.create_task(_run_monitored(identity, req, operation))
    _accepted_tasks.add(task)
    def finished(completed):
        _accepted_tasks.discard(completed)
        if not completed.cancelled():
            completed.exception()  # Consume unobserved errors without logging payloads.
    task.add_done_callback(finished)
    return await asyncio.shield(task)


async def _run_monitored(identity: Identity, req, operation):
    require_feature("ETL_MONITORING_ENABLED")
    if req.request_id is None:
        raise HTTPException(422, "Una carga autenticada requiere request_id.")
    body = req.model_dump(mode="json", exclude_none=True)
    source, target, config = body["source"], body["target_connection"], body["load_config"]
    # Labels are not derived from credentials, file paths or arbitrary driver text.
    meta = {"source_connection_id": source.get("connection_id"), "target_connection_id": target.get("connection_id"),
            "source_label": "Origen guardado" if source.get("connection_id") else {"database": "Base de datos", "file": "Archivo", "date_dimension": "Dimensión fecha"}[source["type"]],
            "target_label": "Destino guardado" if target.get("connection_id") else "Destino manual",
            "source_type": source["type"], "target_type": target.get("db_type", "saved"),
            **{key: config.get(key) for key in ("table_name", "table_type", "if_exists")}}
    # A durable unique constraint claims the attempt, including across restarts.
    key = "load:" + identity.user_id
    limits.check(key, 10)
    attempt = await gateway().rpc("etl_claim_execution", {"p_user_id": identity.user_id,
        "p_request_id": str(req.request_id), "p_fingerprint": fingerprint(body), "p_metadata": meta})
    if not attempt["claimed"]:
        return JSONResponse(status_code=202, content={"status": attempt["status"], "execution_id": attempt["id"],
            "duplicate": True, "message": "El intento ya fue aceptado; consulta su estado en el historial."})
    started = time.monotonic()
    acquired = False
    try:
        limits.acquire(key)
        acquired = True
        result = await operation()
        if result.get("status") != "success" or type(result.get("total_rows")) is not int or result["total_rows"] < 0:
            raise ValueError("Unconfirmed result")
    except BaseException as exc:
        rejected = isinstance(exc, HTTPException) and exc.status_code in {422, 429}
        try:
            await asyncio.shield(gateway().rpc("etl_finish_execution", {"p_user_id": identity.user_id,
                "p_id": attempt["id"], "p_status": "error" if rejected else "unknown",
                "p_total": None, "p_duration": round((time.monotonic()-started)*1000)}))
        except (Exception, asyncio.CancelledError):
            pass  # A later reconciliation marks this running record unknown.
        raise
    else:
        pending = False
        for _ in range(2):  # Retry metadata only, never the external write.
            try:
                await gateway().rpc("etl_finish_execution", {"p_user_id": identity.user_id,
                    "p_id": attempt["id"], "p_status": "success", "p_total": result["total_rows"],
                    "p_duration": round((time.monotonic()-started)*1000)})
                pending = False
                break
            except Exception:
                pending = True
        return {**result, "execution_id": attempt["id"], "monitoring_pending": pending}
    finally:
        if acquired:
            limits.release(key)


def filter_params(from_date, to_date, status):
    if from_date and from_date.utcoffset() is None or to_date and to_date.utcoffset() is None:
        raise HTTPException(422, "Las fechas requieren zona horaria.")
    if from_date and to_date and from_date >= to_date:
        raise HTTPException(422, "El inicio debe ser anterior al fin.")
    filters = {}
    if status:
        filters["status"] = "eq." + status
    if from_date and to_date:
        filters["and"] = f"(started_at.gte.{from_date.isoformat()},started_at.lt.{to_date.isoformat()})"
    elif from_date:
        filters["started_at"] = "gte." + from_date.isoformat()
    elif to_date:
        filters["started_at"] = "lt." + to_date.isoformat()
    return filters


def decode_cursor(value):
    try:
        if len(value) > 300:
            raise ValueError()
        timestamp, identifier = json.loads(base64.urlsafe_b64decode(value.encode()))
        parsed = datetime.fromisoformat(timestamp)
        from uuid import UUID
        if parsed.utcoffset() is None:
            raise ValueError()
        return parsed.isoformat(), str(UUID(identifier))
    except (ValueError, TypeError, UnicodeError, json.JSONDecodeError):
        raise HTTPException(422, "Cursor de historial inválido.") from None


def encode_cursor(row):
    return base64.urlsafe_b64encode(json.dumps([row["started_at"], row["id"]]).encode()).decode()
