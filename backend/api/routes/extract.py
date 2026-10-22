from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel, Field, model_validator
from starlette.concurrency import run_in_threadpool
from etl.error_utils import public_error
from schema_graph_models import SchemaGraphResponse
from typing import Optional
from services import extract_service
from services.agent_manager import agent_manager
from source_models import DateDimensionReq
from connection_models import ConnectionInput
from services.connection_service import resolve_connection

router = APIRouter()

class DatabaseConnectionReq(ConnectionInput):
    @model_validator(mode="after")
    def complete(self):
        if not self.connection_id and (not all((self.db_type, self.host, self.database, self.user)) or self.password is None):
            raise ValueError("Completa los datos de conexión.")
        return self


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Endpoint para subir archivos CSV o Excel.
    Guarda temporalmente el archivo y extrae datos usando la lógica core de ETL.
    """
    if not (file.filename or '').lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Usa .csv, .xlsx o .xls")
    
    try:
        result = await extract_service.process_uploaded_file(file)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")

@router.get("/agent/status/{agent_id}")
async def get_agent_status(agent_id: str):
    """
    Verifica si un agente local específico está conectado vía WebSocket.
    """
    connected = agent_manager.is_agent_connected(agent_id)
    return {"agent_id": agent_id, "connected": connected,
            "connection_id": agent_manager.connection_id(agent_id)}

@router.post("/database")
async def connect_database(conn_data: DatabaseConnectionReq, request: Request):
    """
    Endpoint para probar conexión y extraer metadata de una base de datos relacional.
    Usa el DB_Extractor de la librería core o delega la consulta al agente local.
    """
    conn_data = type(conn_data).model_validate(await resolve_connection(conn_data.model_dump(exclude_none=True), request))
    if conn_data.db_type.lower() not in ["postgresql", "mysql", "oracle"]:
        raise HTTPException(status_code=400, detail="Motor de base de datos no soportado. Debe ser 'postgresql', 'mysql' o 'oracle'.")
        
    if conn_data.use_agent:
        if not conn_data.agent_id:
            raise HTTPException(status_code=400, detail="Falta el 'agent_id' para utilizar el agente local.")
        try:
            result = await agent_manager.send_command_and_wait(
                agent_id=conn_data.agent_id,
                action="get_metadata",
                payload=conn_data.model_dump(exclude={"use_agent", "agent_id", "connection_id", "connection_version", "runtime_agent_id"})
            )
            if result.get("status") == "error":
                err_msg = result.get("message") or "Error desconocido en el agente local"
                if not err_msg.startswith("Error a través del agente local:"):
                    err_msg = f"Error a través del agente local: {err_msg}"
                raise HTTPException(status_code=500, detail=public_error(err_msg, conn_data.model_dump()))
            return result.get("data")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=public_error(e, conn_data.model_dump()))

    try:
        result = await run_in_threadpool(extract_service.get_database_metadata,
            db_type=conn_data.db_type,
            host=conn_data.host,
            port=conn_data.port,
            database=conn_data.database,
            user=conn_data.user,
            password=conn_data.password,
            service_name=conn_data.service_name
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=public_error(e, conn_data.model_dump()))
    except Exception as e:
        # Si hay un error de conexión u otro problema, lo reportamos con código 500
        raise HTTPException(status_code=500, detail=public_error(e, conn_data.model_dump()))

class DatabasePreviewReq(DatabaseConnectionReq):
    table_name: str
    limit: int = Field(default=5, ge=1, le=10, strict=True)


@router.post("/database/schema-graph", response_model=SchemaGraphResponse)
async def database_schema_graph(conn_data: DatabaseConnectionReq, request: Request):
    return await database_read(conn_data, "get_schema_graph", extract_service.get_database_schema_graph, request)


async def database_read(conn_data, action, operation, request):
    conn_data = type(conn_data).model_validate(await resolve_connection(conn_data.model_dump(exclude_none=True), request))
    if conn_data.db_type.lower() not in ["postgresql", "mysql", "oracle"]:
        raise HTTPException(status_code=400, detail="Motor de base de datos no soportado.")
    payload = conn_data.model_dump(exclude={"use_agent", "agent_id", "connection_id", "connection_version", "runtime_agent_id"})
    try:
        if conn_data.use_agent:
            if not conn_data.agent_id:
                raise HTTPException(status_code=400, detail="Falta el 'agent_id' para utilizar el agente local.")
            result = await agent_manager.send_command_and_wait(
                agent_id=conn_data.agent_id, action=action, payload=payload)
            if result.get("status") == "error":
                raise ValueError(result.get("message") or "Error del agente. Comprueba que esté actualizado.")
            return result.get("data")
        return await run_in_threadpool(operation, **payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400 if isinstance(exc, ValueError) else 500,
                            detail=public_error(exc, payload)) from exc

@router.post("/database/preview")
async def preview_database_table(conn_data: DatabasePreviewReq, request: Request):
    return await database_read(conn_data, "get_preview", extract_service.get_table_preview, request)


@router.post("/date-dimension/preview")
async def preview_date_dimension(req: DateDimensionReq):
    """
    Endpoint para generar y previsualizar la dimensión de fechas (DateTime del core).
    """
    try:
        from etl import DateTime
        date_dim = DateTime(req.start_year, req.end_year)
        preview_data = extract_service.clean_records(date_dim.df, limit=5)
        
        return {
            "status": "success",
            "message": "Dimensión de fechas generada correctamente para vista previa.",
            "preview_data": preview_data,
            "total_rows": len(date_dim.df)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar la dimensión fecha: {str(e)}")



