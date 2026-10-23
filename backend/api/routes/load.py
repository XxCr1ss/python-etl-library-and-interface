from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from starlette.concurrency import run_in_threadpool
from typing import List, Dict, Any, Optional, Literal, Tuple
from services import load_service
from uuid import UUID
from connection_models import DatabaseConnectionInput
from services.connection_service import resolve_connection, resolve_pipeline
from services.auth_service import optional_user, active_user
from services.monitoring_service import run_monitored
from etl.error_utils import public_error
from api.routes.transform import SourceModel, StepModel
from etl.schema import LoadSchemaSpec

router = APIRouter()

class TargetConnectionModel(DatabaseConnectionInput):
    pass

class LoadConfigModel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    table_name: str = Field(min_length=1)
    table_type: Literal["dimension", "fact"]
    foreign_keys: Optional[Dict[str, Tuple[str, str]]] = None
    if_exists: Optional[Literal["replace", "append", "fail", "reload", "schema_only"]] = None
    schema_spec: LoadSchemaSpec | None = None

    @field_validator("foreign_keys")
    @classmethod
    def valid_foreign_keys(cls, value):
        if value and any(not key.strip() or not all(item.strip() for item in pair) for key, pair in value.items()):
            raise ValueError("foreign_keys requiere columna y par [tabla_dimension, columna_pk] no vacíos.")
        return value

class LoadExecutionReq(BaseModel):
    source: SourceModel
    target_connection: TargetConnectionModel
    load_config: LoadConfigModel
    recipe: List[StepModel]
    request_id: UUID | None = None


@router.post("/schema-preview")
async def preview_load_schema(req: LoadExecutionReq, request: Request):
    require_schema_transport(request)
    source, recipe = await resolve_pipeline(req.source.model_dump(exclude_none=True), [step.model_dump() for step in req.recipe], request)
    target = await resolve_connection(req.target_connection.model_dump(exclude_none=True), request, "target")
    try:
        if req.load_config.schema_spec is None:
            raise ValueError("Configura un esquema explícito antes de revisar su impacto.")
        return await load_service.execute_load(source, target, {**req.load_config.model_dump(exclude_none=True), "preview_only": True}, recipe)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=public_error(exc, {"source": source, "target": target})) from None

@router.post("/test-connection")
async def test_warehouse_connection(req: TargetConnectionModel, request: Request):
    """
    Verifica que la conexión a la Bodega de Datos de destino sea exitosa.
    """
    try:
        config_dict = await resolve_connection(req.model_dump(exclude_none=True), request, "target")
        if config_dict.get("use_agent"):
            result = await load_service.test_target_connection_agent(config_dict)
        else:
            result = await run_in_threadpool(load_service.test_target_connection, config_dict)
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=public_error(e, locals().get("config_dict", {})))
    except Exception as e:
        raise HTTPException(status_code=500, detail=public_error(e, locals().get("config_dict", {})))

@router.post("/execute")
async def execute_load_pipeline(req: LoadExecutionReq, request: Request):
    if req.load_config.schema_spec:
        require_schema_transport(request)
    identity = await optional_user(request)
    if identity:
        identity = await active_user(request)
    source_dict, recipe_dict = await resolve_pipeline(req.source.model_dump(exclude_none=True),
        [step.model_dump() for step in req.recipe], request)
    target_dict = await resolve_connection(req.target_connection.model_dump(exclude_none=True), request, "target")

    async def operation():
        try:
            return await load_service.execute_load(source=source_dict, target_config=target_dict,
                load_config=req.load_config.model_dump(exclude_none=True), recipe=recipe_dict)
        except HTTPException:
            raise
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=public_error(exc, {"source": source_dict, "target": target_dict})) from None
        except Exception as exc:
            raise HTTPException(status_code=500, detail=public_error(exc, {"source": source_dict, "target": target_dict})) from None

    return await run_monitored(identity, req, operation) if identity else await operation()


def require_schema_transport(request):
    if request.url.scheme != "https" and request.url.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise HTTPException(400, "El esquema explícito requiere HTTPS o una conexión loopback.")
