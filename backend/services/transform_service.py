from etl.load_execution import positive_setting
import os
import pandas as pd
from typing import Dict, Any, List, Optional
from etl import (
    HeaderOperations,
    ConvertOperations,
    DataSelect,
    BasicsTransformOperations,
    TransformOperations,
    DataExpresion,
    DB_Extractor,
    CSVExtractor,
    XLSXExtractor
)
from services.extract_service import clean_records, clean_value
from source_models import SourceModel

async def load_source_df(source: Dict[str, Any], typed=False) -> pd.DataFrame:
    """
    Carga un DataFrame a partir de la configuración de origen (archivo o base de datos).
    Soporta extracción delegada a través del agente local si se especifica use_agent.
    """
    source = SourceModel.model_validate(source).model_dump(exclude_none=True)
    typed = typed or source.get("read_mode") == "exact"
    from etl.load_transport import MAX_LOAD_ROWS, LoadValidationError
    def bounded_frame(frame):
        if len(frame) > MAX_LOAD_ROWS:
            raise LoadValidationError("El origen supera el presupuesto de filas para extracción tipada; reduce su alcance.")
        return frame
    if typed and source.get("type") == "database":
        import asyncio
        from etl.load_transport import decode_dataset, LoadValidationError
        if source.get("use_agent"):
            from services.agent_manager import agent_manager
            agent_id = source["agent_id"]
            generation = agent_manager.connection_id(agent_id)
            caps = await agent_manager.send_command_and_wait(agent_id, "get_capabilities", {}, expected_connection=generation)
            data = caps.get("data")
            if caps.get("status") != "success" or not isinstance(data, dict) or type(data.get("typed_extract_version")) is not int or data["typed_extract_version"] != 1:
                raise LoadValidationError("Actualiza el agente y usa HTTPS/WSS para extracción tipada.")
            payload = {k: v for k, v in source.items() if k not in {"type", "use_agent", "agent_id"}}
            response = await agent_manager.send_command_and_wait(agent_id, "get_typed_table", payload, timeout=120, expected_connection=generation)
            if response.get("status") != "success":
                raise LoadValidationError("No se pudo completar la extracción tipada del agente.")
            return decode_dataset(response.get("data", {}).get("dataset"))
        from etl.typed_source import read_typed_table
        return await asyncio.to_thread(read_typed_table, source, source["table_name"])
    if source.get("use_agent"):
        agent_id = source.get("agent_id")
        if not agent_id:
            raise ValueError("Falta el 'agent_id' para utilizar el agente local.")
        
        # Eliminar las banderas del payload para el extractor
        payload = {k: v for k, v in source.items() if k not in ["use_agent", "agent_id"]}
        
        from services.agent_manager import agent_manager
        result = await agent_manager.send_command_and_wait(
            agent_id=agent_id,
            action="get_table",
            payload=payload
        )
        if result.get("status") == "error":
            raise ValueError(result.get("message"))
            
        records = result.get("data", {}).get("records", [])
        return pd.DataFrame(records)

    source_type = source.get("type")
    if source_type == "file":
        filepath = source.get("filepath")
        if not filepath:
            raise ValueError("Falta el parámetro 'filepath' en la fuente del archivo.")
            
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"El archivo origen {filepath} no existe en el disco.")
            
        suffix = os.path.splitext(filepath)[1].lower()
        if suffix == '.csv':
            extractor = CSVExtractor(filepath)
            if typed:
                frame = extractor.read_csv(dtype="object", keep_default_na=False, na_values=[""], nrows=MAX_LOAD_ROWS + 1)
                return bounded_frame(frame.where(pd.notna(frame), None))
            return extractor.read_csv()
        elif suffix in ['.xlsx', '.xls']:
            extractor = XLSXExtractor(filepath)
            sheet_names = extractor.get_sheet_names()
            sheet_name = source.get("sheet_name") or (sheet_names[0] if sheet_names else None)
            frame = extractor.read_sheet(sheet_name=sheet_name, **({"dtype": "object", "keep_default_na": False, "na_values": [""], "nrows": MAX_LOAD_ROWS + 1} if typed else {}))
            return bounded_frame(frame) if typed else frame
        else:
            raise ValueError(f"Formato de archivo '{suffix}' no soportado para transformación.")
            
    elif source_type == "database":
        db_type = source.get("db_type")
        host = source.get("host")
        port = source.get("port")
        database = source.get("database")
        user = source.get("user")
        password = source.get("password")
        table_name = source.get("table_name")
        service_name = source.get("service_name")
        
        if not table_name:
            raise ValueError("Falta el parámetro 'table_name' en la fuente de la base de datos.")
            
        with DB_Extractor(
            db_type=db_type,
            password=password,
            database=database,
            host=host,
            user=user,
            port=port,
            service_name=service_name,
            connect_timeout=positive_setting("ETL_SOURCE_CONNECT_TIMEOUT",10)
        ) as extractor:
            return extractor.get_table(table_name)
    elif source_type == "date_dimension":
        start_year = source["start_year"]
        end_year = source["end_year"]
        if typed:
            from datetime import date
            if (date(end_year, 12, 31) - date(start_year, 1, 1)).days + 1 > MAX_LOAD_ROWS:
                raise LoadValidationError("El calendario supera el presupuesto de filas para extracción tipada.")
        from etl import DateTime
        date_dim = DateTime(start_year, end_year)
        return date_dim.df
    else:
        raise ValueError(f"Tipo de origen '{source_type}' no soportado.")

async def apply_transformation_steps(df: pd.DataFrame, steps: List[Dict[str, Any]], typed=False) -> pd.DataFrame:
    from etl.recipe import apply_transformation_steps as apply_core_recipe
    async def source_loader(source):
        return await load_source_df(source, typed=True) if typed else await load_source_df(source)
    from etl.load_transport import MAX_LOAD_ROWS
    return await apply_core_recipe(df, steps, source_loader, max_rows=MAX_LOAD_ROWS if typed else None)

async def process_transform_preview(source: Dict[str, Any], steps: List[Dict[str, Any]], limit: int = 5) -> Dict[str, Any]:
    """
    Ejecuta el pipeline de transformación completo sobre el origen y retorna una vista previa.
    """
    # 1. Cargar origen
    df = await load_source_df(source)
    
    # 2. Aplicar transformaciones
    exact = source.get("read_mode") == "exact" or any(step.get("params", {}).get(key, {}).get("read_mode") == "exact" for step in steps for key in ("right_source", "secondary_source") if isinstance(step.get("params", {}).get(key), dict))
    df_transformed = await apply_transformation_steps(df, steps, typed=True) if exact else await apply_transformation_steps(df, steps)
    
    # 3. Obtener metadatos resultantes
    total_rows = len(df_transformed)
    columns = df_transformed.columns.tolist()
    dtypes = {col: str(dtype) for col, dtype in df_transformed.dtypes.items()}
    
    # 4. Generar preview limpio
    preview_data = clean_records(df_transformed, limit)
    
    return {
        "status": "success",
        "total_rows": total_rows,
        "columns": columns,
        "dtypes": dtypes,
        "preview_data": preview_data
    }
