from etl import DB_Loader, DB_Extractor, TransformOperations, DataSelect, BasicsTransformOperations

# ==========================================================
# CONFIGURACIÓN
# ==========================================================

SOURCE_DB_CONFIG = {
    "db_type": "postgresql",
    "user": "postgres",
    "password": "admin",
    "database": "colombia_saludable"
}

TARGET_DB_CONFIG = {
    "db_type": "postgresql",
    "user": "postgres",
    "password": "admin",
    "database": "carga_colombia"
}

TABLES_TO_EXTRACT = ["pagos", "cotizante", "hospitalizaciones"]


# ==========================================================
# CONEXIONES
# ==========================================================

def create_connection(config):
    """Crea una conexión a base de datos."""
    return DB_Extractor(**config)


# ==========================================================
# EXTRACCIÓN
# ==========================================================

def extract_tables(db_connection, table_names):
    """Extrae múltiples tablas y las retorna en un diccionario."""
    extracted_data = {}

    for table in table_names:
        print(f"\nExtrayendo {table.upper()}...")
        try:
            df = db_connection.get_table(table)

            extracted_data[table] = df
            BasicsTransformOperations.show_head(df, 3)
            print(f"{table.upper()} extraída correctamente")

        except Exception as e:
            print(f"Error extrayendo {table}: {e}")
            extracted_data[table] = None

    return extracted_data


# ==========================================================
# TRANSFORMACIÓN
# ==========================================================

def analyze_payments(pagos, cotizante):
    """Realiza join y selección de columnas relevantes."""

    print("\nUniéndose PAGOS con COTIZANTE...")

    df_joined = TransformOperations.left_join(
        pagos, cotizante, on=("id_usuario", "cedula"), show=5
    )

    df_selected = DataSelect.select_columns(df_joined, "id_usuario", "sexo", "nivel_escolaridad", "valor_pagado",  "estracto", "fecha_nacimiento", show=5
    )

    return df_selected


def calculate_averages(df):
    """Calcula promedios agrupados por distintas dimensiones."""

    grouping_columns = ["estracto", "nivel_escolaridad", "sexo"]
    results = {}

    for column in grouping_columns:
        print(f"\nCalculando promedio por {column.upper()}")

        try:
            result = TransformOperations.group_by_mean(
                df, column, "valor_pagado", show=5
            )
            results[column] = result
            print(f"Promedio por {column} calculado correctamente")

        except Exception as e:
            print(f"Error en promedio por {column}: {e}")

    return results


# ==========================================================
# CARGA
# ==========================================================

def load_dimensions(loader, dimensions_dict):
    """
    Carga dimensiones automáticamente usando diccionario:
    {"pagos": df_pagos} → dim_pagos
    """
    for name, df in dimensions_dict.items():
        table_name = f"dim_{name}"
        print(f"\nCargando dimensión: {table_name}")
        loader.load_dimension(df, table_name)



def load_fact(loader, df, table_name):
    """Carga tabla de hechos."""

    foreign_keys = {
        "id_ips": ("dim_ips", "id_ips"),
    }

    print(f"\nCargando hecho: {table_name}")
    loader.load_fact(
        df,
        table_name,
        foreign_keys,
        validate_foreign_keys=False
    )
    loader.verify_table_load(table_name)




# ==========================================================
# PIPELINE PRINCIPAL
# ==========================================================




def run_etl():
    print("\nINICIANDO PROCESO ETL")

    source_conn = create_connection(SOURCE_DB_CONFIG)
    target_conn = create_connection(TARGET_DB_CONFIG)

    try:
        source_conn.connect()
        target_conn.connect()

        loader = DB_Loader(engine=target_conn.engine)

        # -------- EXTRACCIÓN --------
        extracted = extract_tables(source_conn, TABLES_TO_EXTRACT)

        pagos = extracted["pagos"]
        cotizante = extracted["cotizante"]

        # -------- TRANSFORMACIÓN --------
        analysis_df = analyze_payments(pagos, cotizante)
        averages = calculate_averages(analysis_df)

        # -------- CARGA DIMENSIONES --------
        dimensions = {
            "pagos": pagos,
            "cotizante": cotizante
        }

        load_dimensions(loader, dimensions)

        # -------- CARGA HECHOS --------
        load_fact(loader, averages["estracto"], "fact_costo_extracto")
        load_fact(loader, averages["nivel_escolaridad"], "fact_costo_nivel_escolaridad")
        load_fact(loader, averages["sexo"], "fact_costo_sexo")

        print("\nETL FINALIZADO EXITOSAMENTE")
        return averages

    except Exception as e:
        print(f"\nError en el proceso ETL: {e}")
        import traceback
        traceback.print_exc()
        return None

    finally:
        source_conn.close_connection()
        target_conn.close_connection()


# ==========================================================
# EJECUCIÓN
# ==========================================================

if __name__ == "__main__":
    resultados = run_etl()

    if resultados:
        print("\nResultados disponibles para reportes.")
