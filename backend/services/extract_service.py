import os
import uuid
import tempfile
import pandas as pd
import re
from pathlib import Path
from fastapi import UploadFile
from etl.extractors.csv_extractor import CSVExtractor
from etl.extractors.xlsx_extractor import XLSXExtractor
from etl.extractors.db_extractor import DB_Extractor
from etl.json_utils import clean_value
from etl.error_utils import public_error
from typing import Dict, Any, List, Optional

UPLOAD_DIR = os.getenv("ETL_UPLOAD_DIR") or os.path.join(tempfile.gettempdir(), "etl_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
    Guarda el archivo en UPLOAD_DIR temporal, lo lee usando CSVExtractor o XLSXExtractor,
    y genera una vista previa de los datos y su información general.
    """
    filename = re.sub(r'[^\w. -]', '_', (file.filename or '').replace('\\', '/').split('/')[-1])
    suffix = os.path.splitext(filename)[1].lower()
    if suffix not in ('.csv', '.xlsx', '.xls'):
        raise ValueError("Formato de archivo no soportado. Usa .csv, .xlsx o .xls")
    
    # Generar un nombre único para evitar colisiones
    unique_id = uuid.uuid4().hex
    unique_filename = f"{unique_id}_{filename}"
    directory = Path(UPLOAD_DIR).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    destination = (directory / unique_filename).resolve()
    if destination.parent != directory:
        raise ValueError("Nombre de archivo inválido.")
    file_path = str(destination)
    
    # Escribir el contenido binario del UploadFile en el archivo persistente
    with open(file_path, 'wb') as f:
        content = await file.read()
        f.write(content)
        
    # Procesar según el tipo de archivo
    try:
        if suffix == '.csv':
            df = CSVExtractor(file_path).read_csv()
        else:
            extractor = XLSXExtractor(file_path)
            sheet_names = extractor.get_sheet_names()
            df = extractor.read_sheet(sheet_name=sheet_names[0] if sheet_names else None)
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise ValueError("No se pudo leer el archivo: contenido vacío, corrupto o incompatible con su formato.") from exc
        
    # Generar vista previa y conteo de filas
    total_rows = len(df)
    preview_data = clean_records(df, preview_rows)
    
    return {
        "status": "success",
        "filename": filename,
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
                    print(f"Error al obtener esquema para la tabla '{table}': {public_error(e, {'password': password})}")
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

def get_database_schema_graph(**connection) -> Dict[str, Any]:
    from etl.extractors.schema_graph import schema_graph
    with DB_Extractor(**connection) as extractor:
        return schema_graph(extractor.engine)


def get_table_preview(
    db_type: str, host: str, port: Optional[int], database: str,
    user: str, password: str, table_name: str,
    service_name: Optional[str] = None, limit: int = 5
) -> Dict[str, Any]:
    from etl.extractors.schema_graph import preview_result
    with DB_Extractor(db_type=db_type, host=host, port=port, database=database,
                      user=user, password=password, service_name=service_name) as extractor:
        return preview_result(extractor, table_name, limit)
