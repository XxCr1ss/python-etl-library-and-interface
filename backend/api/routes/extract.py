from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
from services import extract_service

router = APIRouter()

class DatabaseConnectionReq(BaseModel):
    db_type: str
    host: str
    port: Optional[int] = None
    database: str
    user: str
    password: str
    service_name: Optional[str] = None

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

@router.post("/database")
async def connect_database(conn_data: DatabaseConnectionReq):
    """
    Endpoint para probar conexión y extraer metadata de una base de datos relacional.
    Usa el DB_Extractor de la librería core.
    """
    if conn_data.db_type.lower() not in ["postgresql", "mysql", "oracle"]:
        raise HTTPException(status_code=400, detail="Motor de base de datos no soportado. Debe ser 'postgresql', 'mysql' o 'oracle'.")
        
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

