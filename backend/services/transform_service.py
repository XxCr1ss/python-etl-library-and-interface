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

async def load_source_df(source: Dict[str, Any]) -> pd.DataFrame:
    """
    Carga un DataFrame a partir de la configuración de origen (archivo o base de datos).
    Soporta extracción delegada a través del agente local si se especifica use_agent.
    """
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
    elif source_type == "date_dimension":
        start_year = int(source.get("start_year", 2020))
        end_year = int(source.get("end_year", 2025))
        from etl import DateTime
        date_dim = DateTime(start_year, end_year)
        return date_dim.df
    else:
        raise ValueError(f"Tipo de origen '{source_type}' no soportado.")

async def apply_transformation_steps(df: pd.DataFrame, steps: List[Dict[str, Any]]) -> pd.DataFrame:
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
            
            df2 = await load_source_df(right_source)
            
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
            
        elif step_type == "union":
            secondary_source = params.get("secondary_source")
            if not secondary_source:
                raise ValueError("La operación de unión requiere un parámetro 'secondary_source'.")
            df2 = await load_source_df(secondary_source)
            working_df = TransformOperations.union_all([working_df, df2], show=0)
            
        elif step_type == "add_new_column":
            new_column_name = params.get("new_column_name")
            expression = params.get("expression")
            if not new_column_name or not expression:
                raise ValueError("add_new_column requiere parámetros 'new_column_name' y 'expression'.")
            try:
                code = compile(expression, "<string>", "eval")
                def safe_evaluator(row):
                    allowed_globals = {
                        "__builtins__": {
                            "abs": abs, "round": round, "str": str, "int": int,
                            "float": float, "len": len, "bool": bool
                        }
                    }
                    return eval(code, allowed_globals, row.to_dict())
            except Exception as compile_err:
                raise ValueError(f"Fórmula inválida: {str(compile_err)}")
            working_df = BasicsTransformOperations.add_new_column(working_df, new_column_name, safe_evaluator, show=0)

        elif step_type == "transform_column":
            column = params.get("column")
            expression = params.get("expression")
            if not column or not expression:
                raise ValueError("transform_column requiere parámetros 'column' y 'expression'.")
            try:
                code = compile(expression, "<string>", "eval")
                def safe_evaluator(x):
                    allowed_globals = {
                        "__builtins__": {
                            "abs": abs, "round": round, "str": str, "int": int,
                            "float": float, "len": len, "bool": bool
                        }
                    }
                    return eval(code, allowed_globals, {"x": x})
            except Exception as compile_err:
                raise ValueError(f"Fórmula de celda inválida: {str(compile_err)}")
            working_df = BasicsTransformOperations.transform_column(working_df, column, safe_evaluator, show=0)

        elif step_type == "filter_by_condition":
            expression = params.get("expression")
            if not expression:
                raise ValueError("filter_by_condition requiere el parámetro 'expression'.")
            try:
                code = compile(expression, "<string>", "eval")
                def safe_evaluator(row):
                    allowed_globals = {
                        "__builtins__": {
                            "abs": abs, "round": round, "str": str, "int": int,
                            "float": float, "len": len, "bool": bool
                        }
                    }
                    return bool(eval(code, allowed_globals, row.to_dict()))
            except Exception as compile_err:
                raise ValueError(f"Fórmula de filtro inválida: {str(compile_err)}")
            working_df = BasicsTransformOperations.filter_by_condition(working_df, safe_evaluator, show=0)

        elif step_type == "normalize_delimited_column":
            columna = params.get("column")
            delimitador = params.get("delimiter", ",")
            mantener_original = params.get("keep_original", True)
            if not columna:
                raise ValueError("normalize_delimited_column requiere el parámetro 'column'.")
            working_df = BasicsTransformOperations.normalize_delimited_column(
                working_df, columna, delimitador, mantener_original, show=0
            )

        elif step_type == "sort_columns":
            columns = params.get("columns")
            ascending = params.get("ascending", True)
            if not columns:
                raise ValueError("sort_columns requiere el parámetro 'columns'.")
            working_df = BasicsTransformOperations.sort_columns(working_df, columns, ascending)

        elif step_type == "convert_column_to_list":
            columna = params.get("column")
            delimitador = params.get("delimiter", ";")
            nueva_columna = params.get("new_column") or None
            if not columna:
                raise ValueError("convert_column_to_list requiere el parámetro 'column'.")
            working_df = BasicsTransformOperations.convert_column_to_list(
                working_df, columna, delimitador, nueva_columna, show=0
            )

        elif step_type == "explode_column_list":
            columna_lista = params.get("column")
            if not columna_lista:
                raise ValueError("explode_column_list requiere el parámetro 'column'.")
            working_df = BasicsTransformOperations.explode_column_list(
                working_df, columna_lista, mantener_original=True, show=0
            )

        elif step_type == "clean_numeric_columns":
            columns = params.get("columns")
            if not columns:
                raise ValueError("clean_numeric_columns requiere el parámetro 'columns'.")
            working_df = ConvertOperations.clean_numeric_columns(working_df, columns, show=0)

        elif step_type == "clean_date_format":
            column = params.get("column")
            format_output = params.get("format_output", "%Y-%m-%d")
            if not column:
                raise ValueError("clean_date_format requiere el parámetro 'column'.")
            working_df = ConvertOperations.clean_date_format(working_df, column, format_output, show=0)

        elif step_type == "convert_to_ordered_category":
            column = params.get("column")
            categories = params.get("categories")
            ordered = params.get("ordered", True)
            if not column or not categories:
                raise ValueError("convert_to_ordered_category requiere parámetros 'column' y 'categories'.")
            working_df = ConvertOperations.convert_to_ordered_category(working_df, column, categories, ordered, show=0)

        elif step_type == "boolean_to_binary":
            columns = params.get("columns")
            if not columns:
                raise ValueError("boolean_to_binary requiere el parámetro 'columns'.")
            working_df = ConvertOperations.boolean_to_binary(working_df, columns, show=0)

        elif step_type == "sort_by":
            columns = params.get("columns")
            ascending = params.get("ascending", True)
            if not columns:
                raise ValueError("sort_by requiere el parámetro 'columns'.")
            working_df = ConvertOperations.sort_by(working_df, columns, ascending, show=0)

        else:
            raise ValueError(f"Operación de transformación '{step_type}' no soportada en el pipeline.")
            
    return working_df

async def process_transform_preview(source: Dict[str, Any], steps: List[Dict[str, Any]], limit: int = 5) -> Dict[str, Any]:
    """
    Ejecuta el pipeline de transformación completo sobre el origen y retorna una vista previa.
    """
    # 1. Cargar origen
    df = await load_source_df(source)
    
    # 2. Aplicar transformaciones
    df_transformed = await apply_transformation_steps(df, steps)
    
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
