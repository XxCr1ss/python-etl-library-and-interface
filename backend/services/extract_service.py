import os
import uuid
import tempfile
import pandas as pd
import numpy as np
import datetime
from fastapi import UploadFile
from etl.extractors.csv_extractor import CSVExtractor
from etl.extractors.xlsx_extractor import XLSXExtractor
from etl.extractors.db_extractor import DB_Extractor
from typing import Dict, Any, List, Optional

# UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
# os.makedirs(UPLOAD_DIR, exist_ok=True)

UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "etl_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def clean_value(val: Any) -> Any:
    """
    Convierte un valor de pandas/numpy a un tipo nativo de Python que sea compatible con JSON.
    """
    if pd.isna(val) or val is pd.NaT:
        return None
    if isinstance(val, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(val)
    if isinstance(val, (np.floating, np.float64, np.float32)):
        if np.isnan(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, (datetime.datetime, datetime.date, pd.Timestamp)):
        return val.isoformat()
    return val

def clean_records(df: pd.DataFrame, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Toma las primeras filas del DataFrame y las convierte en una lista de diccionarios limpios.
    """
    preview_df = df.head(limit)
    records = []
    for _, row in preview_df.iterrows():
        record = {str(col): clean_value(val) for col, val in row.items()}
        records.append(record)
    return records

async def process_uploaded_file(file: UploadFile, preview_rows: int = 5) -> Dict[str, Any]:
    """
    Guarda el archivo subido de forma persistente en backend/uploads/, lo lee usando CSVExtractor o XLSXExtractor,
    y genera una vista previa de los datos y su información general.
    """
    suffix = os.path.splitext(file.filename)[1].lower()
    
    # Generar un nombre único para evitar colisiones
    unique_id = uuid.uuid4().hex
    unique_filename = f"{unique_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Escribir el contenido binario del UploadFile en el archivo persistente
    with open(file_path, 'wb') as f:
        content = await file.read()
        f.write(content)
        
    # Procesar según el tipo de archivo
    if suffix == '.csv':
        extractor = CSVExtractor(file_path)
        df = extractor.read_csv()
    elif suffix in ['.xlsx', '.xls']:
        extractor = XLSXExtractor(file_path)
        sheet_names = extractor.get_sheet_names()
        sheet_name = sheet_names[0] if sheet_names else None
        df = extractor.read_sheet(sheet_name=sheet_name)
    else:
        # Limpiar archivo si no es compatible
        if os.path.exists(file_path):
            os.remove(file_path)
        raise ValueError(f"Formato de archivo '{suffix}' no soportado.")
        
    # Generar vista previa y conteo de filas
    total_rows = len(df)
    preview_data = clean_records(df, preview_rows)
    
    return {
        "status": "success",
        "filename": file.filename,
        "filepath": file_path,
        "unique_filename": unique_filename,
        "message": "Archivo recibido y procesado para vista previa",
        "preview_data": preview_data,
        "total_rows": total_rows
    }

def get_database_metadata(
    db_type: str,
    host: str,
    port: Optional[int],
    database: str,
    user: str,
    password: str,
    service_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Establece una conexión con la base de datos usando DB_Extractor,
    valida el estado de la conexión, obtiene los nombres de las tablas y un esquema básico.
    """
    try:
        with DB_Extractor(
            db_type=db_type,
            password=password,
            database=database,
            host=host,
            user=user,
            port=port,
            service_name=service_name
        ) as extractor:
            # Obtener lista de tablas
            tables = extractor.get_table_names()
            
            # Obtener esquemas para cada tabla
            schema_preview = {}
            for table in tables:
                try:
                    schema = extractor.get_table_schema(table)
                    schema_preview[table] = schema.get('columns', [])
                except Exception as e:
                    print(f"Error al obtener esquema para la tabla '{table}': {e}")
                    schema_preview[table] = []
                    
            return {
                "status": "success",
                "message": f"Conexión exitosa a {database}",
                "tables": tables,
                "schema_preview": schema_preview
            }
    except UnicodeDecodeError as e:
        raise ValueError(
            f"Error de conexión a la base de datos: error de codificación del mensaje en Windows (habitualmente esto indica que el servidor de base de datos '{db_type}' en '{host}:{port or 'default'}' no está activo o rechazó la conexión)."
        ) from e
    except Exception as e:
        # En caso de que se lance otra excepción que contenga el error de decodificación en su representación textual
        if "codec can't decode" in str(e) or "UnicodeDecodeError" in type(e).__name__:
            raise ValueError(
                f"Error de conexión a la base de datos: error de decodificación en Windows (habitualmente esto indica que el servidor de base de datos '{db_type}' en '{host}:{port or 'default'}' no está activo o rechazó la conexión)."
            )
        raise

def get_table_preview(
    db_type: str,
    host: str,
    port: Optional[int],
    database: str,
    user: str,
    password: str,
    table_name: str,
    service_name: Optional[str] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Conecta a la base de datos usando DB_Extractor, obtiene una muestra de la tabla dada,
    y retorna los registros limpios compatibles con JSON.
    """
    try:
        with DB_Extractor(
            db_type=db_type,
            password=password,
            database=database,
            host=host,
            user=user,
            port=port,
            service_name=service_name
        ) as extractor:
            df = extractor.sample_data(table_name, limit)
            preview_data = clean_records(df, limit)
            
            return {
                "status": "success",
                "table_name": table_name,
                "preview_data": preview_data,
                "total_rows": len(df)
            }
    except UnicodeDecodeError as e:
        raise ValueError(
            f"Error de conexión a la base de datos: error de codificación del mensaje en Windows (habitualmente esto indica que el servidor de base de datos '{db_type}' en '{host}:{port or 'default'}' no está activo o rechazó la conexión)."
        ) from e
    except Exception as e:
        if "codec can't decode" in str(e) or "UnicodeDecodeError" in type(e).__name__:
            raise ValueError(
                f"Error de conexión a la base de datos: error de decodificación en Windows (habitualmente esto indica que el servidor de base de datos '{db_type}' en '{host}:{port or 'default'}' no está activo o rechazó la conexión)."
            )
        raise
