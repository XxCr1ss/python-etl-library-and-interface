from etl import ConvertOperations, DB_Extractor, TransformOperations, BasicsTransformOperations, DataSelect, HeaderOperations, DB_Loader

data_transformer = BasicsTransformOperations
data_select = DataSelect
advances_transform = TransformOperations
header_operations = HeaderOperations


def db_connection_extract():
    """Crea y retorna la conexión a la base de datos origen"""
    
    db_params = {"db_type": "postgresql",
        "user": "postgres",
        "password": "admin",
        "database": "colombia_saludable"}

    return DB_Extractor(**db_params)

def db_connection_loader():
    """Crea y retorna la conexión a la base de datos destino"""
    
    db_params = {
        "db_type": "postgresql",
        "user": "postgres",
        "password": "admin",
        "database": "carga_colombia"
    }

    return DB_Extractor(**db_params)


def extract_tables(db_extract, tablas):
    """
    Extrae las tablas indicadas desde la base de datos
    y muestra una vista previa de cada una.
    """
    resultados = []

    for tabla in tablas:
        print(f"Extrayendo datos de la tabla {tabla.upper()}...")
        datos = db_extract.get_table(tabla)
        print(data_transformer.show_head(datos, 1))
        resultados.append(datos)

    return tuple(resultados)


def transform_and_merge_data(citas, urg, hosp, medico, ips, empresa):

    tablas = {
        "citas": (citas, "codigo_cita"),
        "hospitalizaciones": (hosp, "codigo_hospitalizacion"),
        "urgencias": (urg, "codigo_urgencia")
    }

    # Join con médico
    resultados_join_medico = []
    print("\n LEFT JOIN con medico")
    for nombre_tabla, (tabla, _) in tablas.items():
        datos = advances_transform.left_join(tabla, medico, ("id_medico", "cedula"), 0)
        resultados_join_medico.append((nombre_tabla, datos))

    # Selección de columnas clave
    resultados_seleccion = []
    print("\n SELECT COLUMNS")
    for nombre_tabla, datos in resultados_join_medico:
        codigo_col = tablas[nombre_tabla][1]
        datos_select = data_select.select_columns(datos, "id_ips", codigo_col, "id_medico", "id_usuario", show=1)
        resultados_seleccion.append((nombre_tabla, datos_select))

    # Join con empresa cotizante
    resultados_join_usuario = []
    print("\n LEFT JOIN con empresa_cotizante ")
    for nombre_tabla, datos_select in resultados_seleccion:
        datos_con_usuario = advances_transform.left_join(datos_select, empresa, ("id_usuario", "cotizante"), 0 )
        resultados_join_usuario.append((nombre_tabla, datos_con_usuario))


    # Join final con IPS y estandarización
    resultados_finales = []
    print("\n LEFT JOIN con IPS ")
    for nombre_tabla, datos_select in resultados_join_usuario:
        codigo_col = tablas[nombre_tabla][1]

        datos_left = advances_transform.left_join(ips, datos_select, "id_ips", 0)
        datos_con_tipo = data_transformer.add_new_column(datos_left, "tipo", lambda row: nombre_tabla, 0)
        datos_estandarizados = header_operations.rename_columns(datos_con_tipo, {codigo_col: "codigo"}, show=0)

        resultados_finales.append(datos_estandarizados)

    print("\n UNION ALL ")
    ipsXregion = advances_transform.union_all(resultados_finales, show=1)

 
    print("\n SELECCIONAMOS LAS COLUMANS RELEVANTES ")
    ipsXregion2 = data_select.select_columns(ipsXregion,
        "id_ips", "codigo", "id_medico", "id_usuario",
        "empresa", "departamento", "municipio", "tipo",
        show=0
    )

    print("\n LIMPIAMOS LOS VALORES NULOS ")
    ipsXregion_limpia = data_select.select_not_none(ipsXregion2, "codigo", show=0)
    ipsXregion_limpia = data_select.select_not_none(ipsXregion_limpia, "empresa", show=0)

    return ipsXregion_limpia

def analyze_data(ipsXregion_limpia):

    atenciones_por_departamento = advances_transform.group_by_count(ipsXregion_limpia, ["departamento", "id_ips"], show=3)
    atenciones_por_departamento = advances_transform.sort_by(atenciones_por_departamento, ["conteo"], ascending=[False], show=3)

    return atenciones_por_departamento

def load_dimension_table(loader, dfs, table_names):

    loader.load_dimension(dfs, table_names)
    #for table in table_names:
        #loader.verify_table_load(table)

def load_fact_table(loader, df, table_name):
    """
    Carga la tabla de hechos y valida llaves foráneas.
    """

    foreign_keys = {
        "id_ips": ("dim_ips", "id_ips")
    }

    loader.load_fact(df, table_name, foreign_keys)
    #loader.verify_table_load(table_name)


def connection():
    """
    Ejecuta el flujo completo ETL:
    1. Conexión
    2. Extracción
    3. Transformación
    4. Análisis
    5. Carga
    """

    db_extractor = db_connection_extract()
    db_loader = db_connection_loader()

    tablas = [
        "citas_generales",
        "urgencias",
        "hospitalizaciones",
        "medico",
        "ips",
        "empresa_cotizante"
    ]

    try:
        # Conexión a ambas bases
        db_extractor.connect()
        db_loader.connect()

        loader_cargacolombia = DB_Loader(engine=db_loader.engine)

        # Extracción
        citas, urgencias, hospitalizacion, medico, ips, empresa =  extract_tables(db_extractor, tablas)

        # Conversión de tipos
        medico = ConvertOperations.convert_column_type(medico, columns=["cedula"], dtype={"cedula": "string"}, show=0)

        # Transformación
        ipsXregion_limpia = transform_and_merge_data(citas, urgencias, hospitalizacion, medico, ips, empresa)

        # Generación de hechos
        df_fact = analyze_data(ipsXregion_limpia)

        # Carga
        dimensiones = (citas, urgencias, hospitalizacion, medico, ips)
        nombres_dimensiones = ("dim_citas", "dim_urgencias", "dim_hospitalizaciones", "dim_medico", "dim_ips")

        load_dimension_table(loader_cargacolombia, dimensiones, nombres_dimensiones)
        load_fact_table(loader_cargacolombia, df_fact, "fact_ips_region")

    except Exception as e:
        print(f"Error durante la ejecución: {e}")

    finally:
        db_extractor.close_connection()
        db_loader.close_connection()


# ==============================
# EJECUCIÓN DEL SCRIPT
# ==============================
if __name__ == "__main__":
    connection()
