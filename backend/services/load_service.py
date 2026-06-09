import os
import pandas as pd
from typing import Dict, Any, List, Optional
from etl import DB_Extractor, DB_Loader
from services.transform_service import load_source_df, apply_transformation_steps
from services.extract_service import clean_records

def test_target_connection(target_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Verifica de forma activa la conexión a la bodega de datos destino (Target DB).
    """
    db_type = target_config.get("db_type")
    host = target_config.get("host")
    port = target_config.get("port")
    database = target_config.get("database")
    user = target_config.get("user")
    password = target_config.get("password")
    service_name = target_config.get("service_name")
    
    try:
        # Intentar conectar usando DB_Extractor como manejador de contexto
        with DB_Extractor(
            db_type=db_type,
            password=password,
            database=database,
            host=host,
            user=user,
            port=port,
            service_name=service_name
        ) as extractor:
            if extractor.check_connection_status():
                return {
                    "status": "success",
                    "message": f"Conexión exitosa a la base de datos destino '{database}' ({db_type.upper()})."
                }
            else:
                raise ValueError("La prueba de conexión retornó un estado inactivo.")
    except UnicodeDecodeError as e:
        raise ValueError(
            f"Error de conexión a la base de datos destino: error de decodificación del mensaje en Windows (habitualmente esto indica que el servidor destino '{db_type}' en '{host}:{port or 'default'}' no está activo o rechazó la conexión)."
        ) from e
    except Exception as e:
        if "codec can't decode" in str(e) or "UnicodeDecodeError" in type(e).__name__:
            raise ValueError(
                f"Error de conexión a la base de datos destino: error de decodificación en Windows (habitualmente esto indica que el servidor destino '{db_type}' en '{host}:{port or 'default'}' no está activo o rechazó la conexión)."
            )
        raise ValueError(f"No se pudo conectar a la base de datos destino: {str(e)}")

def execute_load(
    source: Dict[str, Any],
    target_config: Dict[str, Any],
    load_config: Dict[str, Any],
    recipe: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Ejecuta el flujo completo de la ETL:
    1. Carga los datos originales desde la fuente activa.
    2. Aplica la receta secuencial de transformaciones.
    3. Conecta a la bodega de datos destino y persiste los datos (dimensión o hecho).
    4. Verifica la carga retornando un reporte con conteo de registros e inserciones.
    """
    # 1. Procesamiento de Transformaciones
    try:
        df_src = load_source_df(source)
        df_final = apply_transformation_steps(df_src, recipe)
    except Exception as e:
        raise ValueError(f"Error en la ejecución del pipeline de transformación: {str(e)}")

    db_type = target_config.get("db_type")
    host = target_config.get("host")
    port = target_config.get("port")
    database = target_config.get("database")
    user = target_config.get("user")
    password = target_config.get("password")
    service_name = target_config.get("service_name")

    table_name = load_config.get("table_name")
    table_type = load_config.get("table_type", "dimension").lower()
    if_exists = load_config.get("if_exists")

    if not table_name:
        raise ValueError("El parámetro 'table_name' es requerido para ejecutar la carga.")

    # Comportamiento por defecto para cargas si no se define if_exists
    if not if_exists:
        if_exists = "replace" if table_type == "dimension" else "append"

    # 2. Conexión y persistencia en la Bodega de Datos
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
            
            loader = DB_Loader(engine=extractor.engine)

            # Carga según el tipo de tabla
            if table_type == "dimension":
                loader.load_dimension(
                    dfs=df_final,
                    table_names=table_name,
                    if_exists=if_exists
                )
            elif table_type == "fact":
                # Convertir foreign_keys a formato de tupla para DB_Loader
                fk_input = load_config.get("foreign_keys") or {}
                fk_map = {}
                for fk_col, val in fk_input.items():
                    if isinstance(val, list) and len(val) == 2:
                        fk_map[fk_col] = (val[0], val[1])
                    elif isinstance(val, tuple) and len(val) == 2:
                        fk_map[fk_col] = val
                    else:
                        raise ValueError(f"Mapeo de clave foránea inválido para '{fk_col}': debe ser una lista de [tabla_dimension, columna_pk]")

                loader.load_fact(
                    df=df_final,
                    table_name=table_name,
                    foreign_keys_map=fk_map,
                    if_exists=if_exists,
                    validate_foreign_keys=True
                )
            else:
                raise ValueError(f"Tipo de tabla '{table_type}' no soportado. Debe ser 'dimension' o 'fact'.")

            # 3. Verificación Post-Carga
            with extractor.engine.connect() as conn:
                db_backend = extractor.engine.url.get_backend_name()
                
                # Validar existencia de la tabla
                if db_backend == "postgresql":
                    exists_query = f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table_name}'
                    );
                    """
                    exists = pd.read_sql(exists_query, conn).iloc[0, 0]
                elif db_backend == "mysql":
                    exists_query = f"SHOW TABLES LIKE '{table_name}'"
                    res = pd.read_sql(exists_query, conn)
                    exists = len(res) > 0
                elif db_backend == "oracle":
                    exists_query = f"SELECT table_name FROM user_tables WHERE table_name = UPPER('{table_name}')"
                    res = pd.read_sql(exists_query, conn)
                    exists = len(res) > 0
                else:
                    exists = True

                if not exists:
                    raise ValueError(f"La tabla destino '{table_name}' no existe en la base de datos después de la carga.")

                # Contar filas cargadas en total
                total_query = f"SELECT COUNT(*) AS total FROM {table_name}"
                total_rows = int(pd.read_sql(total_query, conn)["total"].iloc[0])

                # Muestra de datos insertados
                sample_query = f"SELECT * FROM {table_name} LIMIT 5"
                if db_backend == "oracle":
                    sample_query = f"SELECT * FROM {table_name} WHERE ROWNUM <= 5"
                
                sample_df = pd.read_sql(sample_query, conn)
                preview_data = clean_records(sample_df, 5)

            return {
                "status": "success",
                "message": f"Carga completada de forma exitosa en la tabla '{table_name}' ({table_type.upper()}).",
                "table_name": table_name,
                "table_type": table_type,
                "total_rows": total_rows,
                "preview_data": preview_data
            }

    except UnicodeDecodeError as e:
        raise ValueError(
            f"Error de conexión a la base de datos destino durante la carga: error de decodificación del mensaje en Windows (habitualmente esto indica que el servidor destino '{db_type}' en '{host}:{port or 'default'}' no está activo o rechazó la conexión)."
        ) from e
    except Exception as e:
        if "codec can't decode" in str(e) or "UnicodeDecodeError" in type(e).__name__:
            raise ValueError(
                f"Error de conexión a la base de datos destino durante la carga: error de decodificación en Windows (habitualmente esto indica que el servidor destino '{db_type}' en '{host}:{port or 'default'}' no está activo o rechazó la conexión)."
            )
        raise ValueError(f"Fallo en el proceso de carga a la base de datos destino: {str(e)}")
