"""Owner-checked references. Only this module decrypts stored connections."""
import os
from uuid import UUID

from fastapi import HTTPException, Request
from starlette.concurrency import run_in_threadpool

from connection_models import SavedConnectionCreate
from services.auth_service import Identity, active_user
from services.crypto_service import CredentialCipher
from services.supabase_service import gateway, require_feature
from services.connection_security import pin_connection, limits

FIELDS = "id,user_id,name,connection_type,db_type,host,port,database,user,service_name,transport,version,last_tested_at,last_test_status,created_at,updated_at"
CONFIG_FIELDS = ("db_type", "host", "port", "database", "user", "service_name")


async def metadata(identity: Identity, connection_id: str):
    rows = await gateway(identity.token).read("saved_connections", {
        "select": FIELDS, "id": "eq." + str(connection_id), "user_id": "eq." + identity.user_id, "limit": "1"})
    if not rows:
        raise HTTPException(404, "Conexión no disponible.")
    return rows[0]


def safe_metadata(row: dict):
    return {**{key: row.get(key) for key in FIELDS.split(",") if key != "user_id"}, "has_password": True}


async def prepare_config(values: dict, identity: Identity):
    config = {key: values.get(key) for key in CONFIG_FIELDS}
    if values.get("transport") == "agent":
        from services.agent_pairing import authorize
        agent_id = values.get("runtime_agent_id")
        if not agent_id:
            raise HTTPException(409, "Selecciona y empareja un agente para esta sesión.")
        authorize(agent_id, identity)
        return {**config, "use_agent": True, "agent_id": agent_id}
    return await pin_connection({**config, "use_agent": False})


async def resolve_saved(identity: Identity, connection_id: str, version: int, purpose: str, runtime_agent_id=None):
    require_feature("ETL_SAVED_CONNECTIONS_ENABLED")
    row = await metadata(identity, connection_id)
    if row["connection_type"] != purpose:
        raise HTTPException(404, "Conexión no disponible para esta operación.")
    if row["version"] != version:
        raise HTTPException(409, "La conexión cambió; vuelve a seleccionarla y probarla.")
    config = await prepare_config({**row, "runtime_agent_id": runtime_agent_id}, identity)
    secret = await gateway().rpc("etl_connection_secret", {"p_user_id": identity.user_id,
        "p_connection_id": str(connection_id), "p_version": version})
    if not isinstance(secret, dict):
        raise HTTPException(404, "Conexión no disponible.")
    return {**config, "password": CredentialCipher().decrypt(secret)}


async def resolve_connection(payload: dict, request: Request, purpose="source"):
    if payload.get("connection_id"):
        identity = await active_user(request)
        config = await resolve_saved(identity, str(payload["connection_id"]), payload["connection_version"], purpose, payload.get("runtime_agent_id"))
        return {**{k: v for k, v in payload.items() if k not in (*CONFIG_FIELDS, "password", "use_agent", "agent_id", "connection_id", "connection_version", "runtime_agent_id")}, **config}
    result = {k: v for k, v in payload.items() if k not in ("connection_id", "connection_version", "runtime_agent_id")}
    if result.get("use_agent"):
        from services.agent_manager import agent_manager
        if result.get("agent_id") in agent_manager.paired_owners:
            from services.agent_pairing import authorize
            authorize(result["agent_id"], await active_user(request))
    public_only = os.getenv("ETL_PUBLIC_EGRESS_ONLY", os.getenv("RENDER", "false")).lower() == "true"
    if public_only and result.get("db_type") and not result.get("use_agent"):
        result = await pin_connection(result)
    return result


async def resolve_pipeline(source: dict, steps: list[dict], request: Request):
    async def resolve_source(value):
        if value.get("type") == "database":
            return await resolve_connection(value, request)
        if value.get("type") == "file" and os.getenv("ETL_PUBLIC_EGRESS_ONLY", os.getenv("RENDER", "false")).lower() == "true":
            from pathlib import Path
            from services.extract_service import UPLOAD_DIR
            try:
                if not Path(value["filepath"]).resolve().is_relative_to(Path(UPLOAD_DIR).resolve()):
                    raise ValueError("outside upload directory")
            except (OSError, ValueError, KeyError):
                raise HTTPException(400, "Usa un archivo cargado mediante esta aplicación.") from None
        return value
    source = await resolve_source(source)
    clean_steps = []
    for step in steps:
        params = dict(step["params"])
        for field in ("secondary_source", "right_source"):
            if isinstance(params.get(field), dict):
                params[field] = await resolve_source(params[field])
        clean_steps.append({**step, "params": params})
    return source, clean_steps


async def test_config(config, purpose="target"):
    from services import load_service
    limits.acquire("test:" + config["host"])
    try:
        if config.get("use_agent"):
            if purpose == "source":
                from services.agent_manager import agent_manager
                response = await agent_manager.send_command_and_wait(config["agent_id"], "get_metadata",
                    {key: config.get(key) for key in (*CONFIG_FIELDS, "password")})
                result = {"status": response.get("status")}
            else:
                result = await load_service.test_target_connection_agent(config)
        else:
            result = await run_in_threadpool(load_service.test_target_connection, config)
        if result.get("status") != "success":
            raise ValueError("connection")
        return {"status": "success", "message": "Conexión comprobada correctamente."}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "No se pudo conectar; revisa los datos y los permisos del destino.") from None
    finally:
        limits.release("test:" + config["host"])


async def create_connection(identity: Identity, body: SavedConnectionCreate):
    limits.check("connection:" + identity.user_id)
    values = body.model_dump()
    config = await prepare_config(values, identity)
    config["password"] = body.password
    await test_config(config, body.connection_type)  # Never trust UI's previous test.
    encrypted = CredentialCipher().encrypt(body.password)
    result = await gateway().rpc("etl_connection_save", {"p_user_id": identity.user_id,
        "p_connection_id": None, "p_version": None,
        "p_metadata": {k: v for k, v in values.items() if k not in {"password", "runtime_agent_id"}}, "p_secret": encrypted})
    return safe_metadata(result)


async def update_connection(identity: Identity, connection_id: UUID, body):
    limits.check("connection:" + identity.user_id)
    row = await metadata(identity, str(connection_id))
    if row["version"] != body.version:
        raise HTTPException(409, "La conexión cambió; actualiza la lista.")
    patch = body.model_dump(exclude_unset=True, exclude={"version"})
    values = {**{k: row.get(k) for k in SavedConnectionCreate.model_fields if k not in {"password", "runtime_agent_id"}}, **patch}
    material = bool(set(patch) - {"name", "runtime_agent_id"})
    encrypted = None
    if material:
        config = await prepare_config(values, identity)
        if "password" not in patch:
            secret = await gateway().rpc("etl_connection_secret", {"p_user_id": identity.user_id,
                "p_connection_id": str(connection_id), "p_version": body.version})
            values["password"] = CredentialCipher().decrypt(secret)
        validated = SavedConnectionCreate.model_validate(values)
        await test_config({**config, "password": validated.password}, row["connection_type"])
        encrypted = CredentialCipher().encrypt(validated.password)
    result = await gateway().rpc("etl_connection_save", {"p_user_id": identity.user_id,
        "p_connection_id": str(connection_id), "p_version": body.version,
        "p_metadata": {k: v for k, v in values.items() if k not in {"password", "runtime_agent_id"}}, "p_secret": encrypted})
    return safe_metadata(result)
