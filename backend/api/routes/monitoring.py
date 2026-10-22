from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from services.auth_service import Identity, require_user
from services.monitoring_service import EXECUTION_FIELDS, filter_params, decode_cursor, encode_cursor
from services.supabase_service import gateway, require_feature

def enabled():
    require_feature("ETL_MONITORING_ENABLED")


router = APIRouter(dependencies=[Depends(enabled)])
Status = Literal["running", "success", "error", "unknown"]


@router.get("/executions")
async def executions(identity: Identity = Depends(require_user), status: Status | None = None,
                     from_date: datetime | None = Query(None, alias="from"),
                     to_date: datetime | None = Query(None, alias="to"),
                     limit: int = Query(25, ge=1, le=100), cursor: str | None = None):
    filters = filter_params(from_date, to_date, status)
    await gateway().rpc("etl_reconcile_executions", {"p_user_id": identity.user_id, "p_max_seconds": 3600})
    params = {"select": EXECUTION_FIELDS, "user_id": "eq." + identity.user_id,
              "order": "started_at.desc,id.desc", "limit": str(limit+1), **filters}
    if cursor:
        timestamp, identifier = decode_cursor(cursor)
        params["or"] = f"(started_at.lt.{timestamp},and(started_at.eq.{timestamp},id.lt.{identifier}))"
    rows = await gateway(identity.token).read("pipeline_executions", params)
    more = len(rows) > limit
    items = rows[:limit]
    return {"items": items, "next_cursor": encode_cursor(items[-1]) if more else None, "retention_days": 90}


@router.get("/executions/{execution_id}")
async def execution(execution_id: UUID, identity: Identity = Depends(require_user)):
    rows = await gateway(identity.token).read("pipeline_executions", {
        "select": EXECUTION_FIELDS, "id": "eq." + str(execution_id), "user_id": "eq." + identity.user_id, "limit": "1"})
    if not rows:
        raise HTTPException(404, "Ejecución no disponible.")
    return rows[0]


@router.get("/metrics")
async def metrics(identity: Identity = Depends(require_user), status: Status | None = None,
                  from_date: datetime | None = Query(None, alias="from"),
                  to_date: datetime | None = Query(None, alias="to")):
    filter_params(from_date, to_date, status)
    await gateway().rpc("etl_reconcile_executions", {"p_user_id": identity.user_id, "p_max_seconds": 3600})
    return await gateway(identity.token).call("POST", "/rest/v1/rpc/etl_monitoring_metrics", body={
        "p_from": from_date.isoformat() if from_date else None, "p_to": to_date.isoformat() if to_date else None,
        "p_status": status})
