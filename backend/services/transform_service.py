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

def load_source_df(source: Dict[str, Any]) -> pd.DataFrame:
    """
    Carga un DataFrame a partir de la configuración de origen (archivo o base de datos).
    """
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
            return extractor.read_csv()
        elif suffix in ['.xlsx', '.xls']:
            extractor = XLSXExtractor(filepath)
            sheet_names = extractor.get_sheet_names()
            sheet_name = source.get("sheet_name") or (sheet_names[0] if sheet_names else None)
            return extractor.read_sheet(sheet_name=sheet_name)
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
            service_name=service_name
        ) as extractor:
            return extractor.get_table(table_name)
    else:
        raise ValueError(f"Tipo de origen '{source_type}' no soportado.")

def apply_transformation_steps(df: pd.DataFrame, steps: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Aplica una lista ordenada de pasos de transformación sobre el DataFrame dado.
    """
    working_df = df.copy()
    
    for step in steps:
        step_type = step.get("type")
        params = step.get("params", {})
        
        if step_type == "rename_columns":
            columns = params.get("columns")
            if not isinstance(columns, dict):
                raise ValueError("rename_columns requiere un parámetro 'columns' de tipo diccionario.")
            working_df = HeaderOperations.rename_columns(working_df, columns, show=0)
            
        elif step_type == "convert_types":
            columns = params.get("columns")
            dtype = params.get("dtype")
            if not columns or not dtype:
                raise ValueError("convert_types requiere parámetros 'columns' y 'dtype'.")
            working_df = ConvertOperations.convert_column_type(working_df, columns, dtype, show=0)
            
        elif step_type == "fill_nulls":
            column = params.get("column")
            value = params.get("value")
            if column is None or value is None:
                raise ValueError("fill_nulls requiere parámetros 'column' y 'value'.")
            working_df = ConvertOperations.fill_nulls(working_df, column, value, show=0)
            
        elif step_type == "select_columns":
            columns = params.get("columns")
            if not isinstance(columns, list):
                raise ValueError("select_columns requiere una lista 'columns'.")
            working_df = DataSelect.select_columns(working_df, *columns, show=0)
            
        elif step_type == "remove_columns":
            columns_to_drop = params.get("columns")
            if not columns_to_drop:
                raise ValueError("remove_columns requiere parámetro 'columns' (string o lista).")
            working_df = BasicsTransformOperations.remove_columns(working_df, columns_to_drop, show=0)
            
        elif step_type == "left_join":
            right_source = params.get("right_source")
            on = params.get("on")
            if not right_source or not on:
                raise ValueError("left_join requiere parámetros 'right_source' y 'on'.")
            
            df2 = load_source_df(right_source)
            
            # Convertir 'on' a tupla para pandas si son claves diferentes (ej. [clave1, clave2])
            if isinstance(on, list) and len(on) == 2 and all(isinstance(x, str) for x in on):
                if on[0] not in working_df.columns or on[1] not in df2.columns:
                    on = tuple(on)
                    
            working_df = TransformOperations.left_join(working_df, df2, on, show=0)
            
        elif step_type == "group_by":
            by = params.get("by")
            column = params.get("column")
            if not by or not column:
                raise ValueError("group_by requiere parámetros 'by' y 'column'.")
            working_df = TransformOperations.group_by_mean(working_df, by, column, show=0)
            
        elif step_type == "filter_value":
            column = params.get("column")
            value = params.get("value")
            operator = params.get("operator", "eq")
            if not column or value is None:
                raise ValueError("filter_value requiere parámetros 'column' y 'value'.")
            working_df = DataExpresion.filter_by_value(working_df, column, value, operator, show=0)
            
        elif step_type == "split_column":
            column = params.get("column")
            delimiter = params.get("delimiter")
            new_columns = params.get("new_columns")
            if not column or not delimiter:
                raise ValueError("split_column requiere parámetros 'column' y 'delimiter'.")
            working_df = ConvertOperations.split_string_column(working_df, column, delimiter, new_columns, show=0)
            
        else:
            raise ValueError(f"Operación de transformación '{step_type}' no soportada en el pipeline.")
            
    return working_df

def process_transform_preview(source: Dict[str, Any], steps: List[Dict[str, Any]], limit: int = 5) -> Dict[str, Any]:
    """
    Ejecuta el pipeline de transformación completo sobre el origen y retorna una vista previa.
    """
    # 1. Cargar origen
    df = load_source_df(source)
    
    # 2. Aplicar transformaciones
    df_transformed = apply_transformation_steps(df, steps)
    
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
