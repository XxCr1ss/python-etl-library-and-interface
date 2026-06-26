from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
from services import extract_service
from services.agent_manager import agent_manager

router = APIRouter()

class DatabaseConnectionReq(BaseModel):
    db_type: str
    host: str
    port: Optional[int] = None
    database: str
    user: str
    password: str
    service_name: Optional[str] = None
    use_agent: Optional[bool] = False
    agent_id: Optional[str] = None


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Endpoint para subir archivos CSV o Excel.
    Guarda temporalmente el archivo y extrae datos usando la lógica core de ETL.
    """
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
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
    return {"agent_id": agent_id, "connected": connected}

@router.post("/database")
async def connect_database(conn_data: DatabaseConnectionReq):
    """
    Endpoint para probar conexión y extraer metadata de una base de datos relacional.
    Usa el DB_Extractor de la librería core o delega la consulta al agente local.
    """
    if conn_data.db_type.lower() not in ["postgresql", "mysql", "oracle"]:
        raise HTTPException(status_code=400, detail="Motor de base de datos no soportado. Debe ser 'postgresql', 'mysql' o 'oracle'.")
        
    if conn_data.use_agent:
        if not conn_data.agent_id:
            raise HTTPException(status_code=400, detail="Falta el 'agent_id' para utilizar el agente local.")
        try:
            result = await agent_manager.send_command_and_wait(
                agent_id=conn_data.agent_id,
                action="get_metadata",
                payload=conn_data.model_dump(exclude={"use_agent", "agent_id"})
            )
            if result.get("status") == "error":
                raise HTTPException(status_code=500, detail=result.get("message"))
            return result.get("data")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error a través del agente local: {str(e)}")

    try:
        result = extract_service.get_database_metadata(
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
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Si hay un error de conexión u otro problema, lo reportamos con código 500
        raise HTTPException(status_code=500, detail=f"Error de conexión a la base de datos: {str(e)}")

class DatabasePreviewReq(DatabaseConnectionReq):
    table_name: str

@router.post("/database/preview")
async def preview_database_table(conn_data: DatabasePreviewReq):
    """
    Endpoint para obtener una vista previa de las filas reales de una tabla en la base de datos conectada.
    """
    if conn_data.db_type.lower() not in ["postgresql", "mysql", "oracle"]:
        raise HTTPException(status_code=400, detail="Motor de base de datos no soportado. Debe ser 'postgresql', 'mysql' o 'oracle'.")
        
    if conn_data.use_agent:
        if not conn_data.agent_id:
            raise HTTPException(status_code=400, detail="Falta el 'agent_id' para utilizar el agente local.")
        try:
            result = await agent_manager.send_command_and_wait(
                agent_id=conn_data.agent_id,
                action="get_preview",
                payload=conn_data.model_dump(exclude={"use_agent", "agent_id"})
            )
            if result.get("status") == "error":
                raise HTTPException(status_code=500, detail=result.get("message"))
            return result.get("data")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error a través del agente local: {str(e)}")

    try:
        result = extract_service.get_table_preview(
            db_type=conn_data.db_type,
            host=conn_data.host,
            port=conn_data.port,
            database=conn_data.database,
            user=conn_data.user,
            password=conn_data.password,
            table_name=conn_data.table_name,
            service_name=conn_data.service_name
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener la vista previa de la tabla: {str(e)}")


class DateDimensionReq(BaseModel):
    start_year: int
    end_year: int


@router.post("/date-dimension/preview")
async def preview_date_dimension(req: DateDimensionReq):
    """
    Endpoint para generar y previsualizar la dimensión de fechas (DateTime del core).
    """
    if req.start_year > req.end_year:
        raise HTTPException(status_code=400, detail="El año de inicio debe ser menor o igual al año de fin.")
        
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



