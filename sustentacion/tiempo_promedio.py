from etl import (TransformOperations, DataSelect, ConvertOperations, BasicsTransformOperations, DB_Extractor, DB_Loader, HeaderOperations)
import pandas as pd


def database_extract_connection():

    print("\nConectando a la base de datos ORIGEN (colombia_saludable)...")

    db_params = {
        "db_type": "postgresql",
        "user": "postgres",
        "password": "admin",
        "database": "colombia_saludable"
    }

    db_extract = DB_Extractor(**db_params)
    db_extract.connect()

    print("Conexión exitosa a base de datos ORIGEN")
    return db_extract


def database_loader_connection():
    print("\nConectando a la base de datos DESTINO (carga_colombia)...")

    db_params = {
        "db_type": "postgresql",
        "user": "postgres",
        "password": "admin",
        "database": "carga_colombia"
    }

    db_loader = DB_Extractor(**db_params)
    db_loader.connect()

    print("Conexión exitosa a base de datos DESTINO")
    return db_loader



def extract_data(db_extract):
    """
    Extrae datos de las tablas necesarias desde la base de datos origen.
    """
    citas_generales = db_extract.get_table("citas_generales")
    urgencias = db_extract.get_table("urgencias")
    cotizante = db_extract.get_table('cotizante')
    beneficiario = db_extract.get_table('beneficiario')
    BasicsTransformOperations.show_head(citas_generales, 5)

    return citas_generales, urgencias, cotizante, beneficiario


def filter_cirugia_citas(citas_generales):

    citas_cirugia = DataSelect.filter_equal(citas_generales, 'diagnostico', 'cirugia', show=5)
    return citas_cirugia


def process_datetime_columns(df):
    """
    Limpia formatos de fecha, concatena fecha y hora,
    y convierte las nuevas columnas a tipo datetime.
    """

    print("\nTransformando columnas de fecha y hora...")

    # Limpieza de formato
    ConvertOperations.clean_date_format(df, "fecha_solicitud", show=1)
    ConvertOperations.clean_date_format(df, "fecha_atencion", show=1)

    print("Formatos de fecha limpiados")

    # Crear columnas combinadas
    print("\nCreando columnas combinadas fecha + hora")

    funcion_lambda = lambda row: f"{row['fecha_solicitud']} {row['hora_solicitud']}"
    BasicsTransformOperations.add_new_column(df, 'fechahora_solicitud', funcion_lambda, 2)

    funcion_lambda2 = lambda row: f"{row['fecha_atencion']} {row['hora_atencion']}"
    BasicsTransformOperations.add_new_column(df, 'fechahora_atencion', funcion_lambda2, 0)

    # Convertir a datetime
    ConvertOperations.convert_column_type(df, ['fechahora_solicitud'], {'fechahora_solicitud': 'datetime'})
    ConvertOperations.convert_column_type(df, 'fechahora_atencion', 'datetime')

    print("Conversión a datetime completada")

    return df


def calculate_wait_time(df):
    """
    Calcula el tiempo de espera entre solicitud y atención.
    Lo convierte a segundos.
    """

    print("\nCalculando tiempo de espera...")

    # Diferencia entre fechas
    tiempo_espera = lambda row: row["fechahora_atencion"] - row["fechahora_solicitud"]
    df = BasicsTransformOperations.add_new_column(df, 'tiempo_espera', tiempo_espera, 0)

    # Convertir a segundos
    df['tiempo_espera_segundos'] = df['tiempo_espera'].dt.total_seconds()

    print("Tiempo de espera calculado en segundos")
    print("Promedio parcial:", df['tiempo_espera_segundos'].mean())

    return df


def remove_unnecessary_columns(df):
    """
    Selecciona únicamente las columnas relevantes.
    """

    print("\n🧹 Seleccionando columnas relevantes...")

    df_cleaned = DataSelect.select_columns(
        df,
        'codigo_cita',
        'id_usuario',
        'id_medico',
        'tiempo_espera_segundos',
        complement=False,
        show=5
    )

    print("Columnas limpiadas")
    return df_cleaned


def calculate_average_wait_time(df):

    print("\nCalculando promedio de tiempo de espera...")

    promedio = df['tiempo_espera_segundos'].mean()
    print(f"Promedio final tiempo de espera: {promedio} segundos")

    resultado_df = pd.DataFrame({
        'metrica': ['tiempo_promedio_espera_segundos'],
        'valor': [promedio]
    })
    return promedio, resultado_df


def load_dimension_table(loader, df, names):
    """
    Carga tablas dimensionales en la base de datos destino.
    """
    loader.load_dimension(df, names)
    print("Dimensiones cargadas correctamente")


def load_facts_table(loader, df):
    """
    Carga tabla de hechos.
    """
    print("\nCargando tabla de hechos...")

    loader.load_fact(df, "fact_ventas", foreign_keys_map={
            "id_producto": ("dim_producto", "producto_id"),
            "id_cliente": ("dim_clientes", "cliente_id")
        }
    )

    print("✅ Tabla de hechos cargada")



def connection():
    """
    Orquesta todo el proceso ETL:
    EXTRACT → TRANSFORM → LOAD
    """

    print("\nINICIANDO PROCESO ETL - COLOMBIA SALUDABLE")

    try:

        # CONEXIONES

        db_extractor = database_extract_connection()
        db_loader_carcol = database_loader_connection()
        loader = DB_Loader(engine=db_loader_carcol.engine)

        # EXTRACT
        citas_generales, urgencias, cotizante, beneficiario = extract_data(db_extractor)

        # TRANSFORM
        filter_cirugia_citas(citas_generales)
        citas_procesadas = process_datetime_columns(citas_generales.copy())
        citas_con_tiempo = calculate_wait_time(citas_procesadas)
        print(citas_con_tiempo)
        citas_limpias = remove_unnecessary_columns(citas_con_tiempo)

        # Unificación personas
        print("\nUnificando cotizantes y beneficiarios...")
        beneficiario = HeaderOperations.rename_columns(beneficiario, {'id_beneficiario': 'cedula'},show=0 )
        cc_beneficiario = DataSelect.select_columns(beneficiario, 'cedula', 'nombre', 'sexo', show=0)
        cc_cotizante = DataSelect.select_columns(cotizante, 'cedula', 'nombre', 'sexo', show=0)

        personas = TransformOperations.union_all([cc_cotizante, cc_beneficiario], show=0)

        print("Unión de personas completada")

        # -------------------------
        # LOAD
        # -------------------------
        load_dimension_table(
            loader,
            [citas_limpias, personas],
            ["dim_citas_limpias", "dim_personas"]
        )

        load_facts_table(loader,)

        print("\n🎉 PROCESO ETL FINALIZADO EXITOSAMENTE")

    except Exception as e:
        print(f"\nError durante la ejecución del ETL: {e}")
        raise

    finally:
        if 'db_extractor' in locals():
            db_extractor.close_connection()
            print("Conexión cerrada correctamente")


# =============================================================================
# EJECUCIÓN
# =============================================================================

if __name__ == "__main__":
    connection()
