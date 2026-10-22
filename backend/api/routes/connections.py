from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from connection_models import SavedConnectionCreate, SavedConnectionPatch
from services.auth_service import Identity, require_user, active_user
from services.connection_service import (FIELDS, CONFIG_FIELDS, safe_metadata, create_connection,
    update_connection, resolve_saved, test_config, prepare_config)
from services.connection_security import pin_connection, limits
from services.supabase_service import gateway, require_feature

def enabled():
    require_feature("ETL_SAVED_CONNECTIONS_ENABLED")


router = APIRouter(dependencies=[Depends(enabled)])


@router.get("")
async def list_connections(type: Literal["source", "target"] | None = None,
                           limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0, le=100000),
                           identity: Identity = Depends(require_user)):
    params = {"select": FIELDS, "user_id": "eq." + identity.user_id,
              "order": "created_at.desc,id.desc", "limit": str(limit), "offset": str(offset)}
    if type:
        params["connection_type"] = "eq." + type
    rows = await gateway(identity.token).read("saved_connections", params)
    return {"items": [safe_metadata(row) for row in rows]}


@router.post("", status_code=201)
async def create(body: SavedConnectionCreate, identity: Identity = Depends(active_user)):
    return await create_connection(identity, body)


@router.post("/test-draft")
async def test_draft(body: SavedConnectionCreate, identity: Identity = Depends(active_user)):
    limits.check("connection:" + identity.user_id)
    config = await prepare_config(body.model_dump(), identity)
    return await test_config({**config, "password": body.password}, body.connection_type)


@router.patch("/{connection_id}")
async def patch(connection_id: UUID, body: SavedConnectionPatch, identity: Identity = Depends(active_user)):
    return await update_connection(identity, connection_id, body)


@router.delete("/{connection_id}")
async def delete(connection_id: UUID, version: int = Query(ge=1), identity: Identity = Depends(active_user)):
    await gateway().rpc("etl_connection_delete", {"p_user_id": identity.user_id,
        "p_connection_id": str(connection_id), "p_version": version})
    return {"status": "success", "message": "Conexión eliminada."}


@router.post("/{connection_id}/test")
async def test_saved(connection_id: UUID, version: int = Query(ge=1), runtime_agent_id: str | None = Query(None, max_length=120), identity: Identity = Depends(active_user)):
    limits.check("connection:" + identity.user_id)
    from services.connection_service import metadata
    row = await metadata(identity, str(connection_id))
    config = await resolve_saved(identity, str(connection_id), version, row["connection_type"], runtime_agent_id)
    try:
        result = await test_config(config, row["connection_type"])
    except Exception:
        await gateway().rpc("etl_connection_tested", {"p_user_id": identity.user_id,
            "p_connection_id": str(connection_id), "p_version": version, "p_status": "error"})
        raise
    await gateway().rpc("etl_connection_tested", {"p_user_id": identity.user_id,
        "p_connection_id": str(connection_id), "p_version": version, "p_status": "success"})
    return result
