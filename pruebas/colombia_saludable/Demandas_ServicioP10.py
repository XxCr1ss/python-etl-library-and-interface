from etl import DB_Loader, DB_Extractor, TransformOperations, DataSelect, ConvertOperations, BasicsTransformOperations, DataExpresion

def create_db_connection():
    """Crea y retorna la conexión a la base de datos"""
    db_params = {
        "db_type": "postgresql",
        "user": "postgres",
        "password": "admin",           
        "database": "colombia_saludable"   
    }
    return DB_Extractor(**db_params)

def db_connection_loader():
    """Crea y retorna una conexión a la base de datos"""
    db_params = {
        "db_type": "postgresql",
        "user": "postgres",
        "password": "admin",           
        "database": "carga_colombia"   
    }
    return DB_Extractor(**db_params)


def extract_tables(db_connected, table_names):
    """Extrae múltiples tablas usando un bucle"""
    tables_data = {}
    
    for table_name in table_names:
        print(f"Extrayendo datos de la tabla {table_name.upper()}...")
        try:
            data = db_connected.get_table(table_name)
            tables_data[table_name] = data
            print(f"✅ {table_name.upper()} extraída exitosamente")
            BasicsTransformOperations.show_head(data, 0)
            
        except Exception as e:
            print(f"❌ Error extrayendo {table_name}: {e}")
            tables_data[table_name] = None
            
    return tables_data

def deman_country(datos_extraidos):
    """ Unimos todos los servicios con los medicos e IPS"""
    print("\n" + "="*50)
    print("ANÁLISIS")
    print("="*50)
    
    # Unir pagos con cotizante
    print("UNIENDO PAGOS X COTIZANTE")
    
    citas_ip = TransformOperations.left_join(
        datos_extraidos["citas_generales"], datos_extraidos["medico"], on=("id_medico", "cedula"), show=0
    )



    citas_ip = TransformOperations.left_join( 
        citas_ip, datos_extraidos["ips"], on=("id_ips", "id_ips"), show=0
    )

    urgencias_ip = TransformOperations.left_join(
        datos_extraidos["urgencias"], datos_extraidos["medico"], on=("id_medico", "cedula"), show=0
    )

    urgencias_ip = TransformOperations.left_join( 
        urgencias_ip, datos_extraidos["ips"], on=("id_ips", "id_ips"), show=0
    )
    
    hosp_ip = TransformOperations.left_join(
        datos_extraidos["hospitalizaciones"], datos_extraidos["medico"], on=("id_medico", "cedula"), show=0
    )

    hosp_ip = TransformOperations.left_join( 
        hosp_ip, datos_extraidos["ips"], on=("id_ips", "id_ips"), show=0
    )

    remi_ip = TransformOperations.left_join(
        datos_extraidos["remisiones"], datos_extraidos["medico"], on=("id_medico", "cedula"), show=0
    )
    remi_ip = TransformOperations.left_join( 
        remi_ip, datos_extraidos["ips"], on=("id_ips", "id_ips"), show=0
    )

     # Seleccionar columnas relevantes
    print("\nSELECCIONANDO DATOS RELEVANTES")

    citas_geo = DataSelect.select_columns(
        citas_ip, "codigo_cita", "departamento", "municipio", show=0
        )
    
    urgencias_geo = DataSelect.select_columns(
        urgencias_ip, "codigo_urgencia", "departamento", "municipio", show=0
        )
    
    hosp_geo = DataSelect.select_columns(
        hosp_ip, "codigo_hospitalizacion", "departamento", "municipio", show=0
        )

    remisiones_geo = DataSelect.select_columns(
        remi_ip, "codigo_remision", "departamento", "municipio", show=0
        )

    servicios = TransformOperations.union_all([
    citas_geo, urgencias_geo, hosp_geo, remisiones_geo], 0
    )

    departamentos = TransformOperations.group_by_count(servicios, by="departamento", show = 8)

    return print("\nUNIENDO TODOS LOS SERVICIOS")



def untimely_payment(datos_extraidos):
    """ 
    Calcula el promedio de desvinculación por pago no oportuno.
    Une la información de pagos con cotizante e IPS, calcula días de atraso,
    y calcula promedio por región (departamento / municipio).
    """  

    print("\n" + "="*50)
    print("ANÁLISIS: PAGO NO OPORTUNO")
    print("="*50)

    # ===============================
    # 1. UNIR TABLAS
    # ===============================

    print("\nUNIENDO PAGOS CON COTIZANTE E IPS...")

    pagos = TransformOperations.group_by_shift(
    df=datos_extraidos["pagos"],
    by="id_usuario",
    column="fecha_pago",
    new_column_name="pago_anterior",
    periods=1,
    show=4)

    ConvertOperations.convert_column_type(pagos, ['fecha_pago'], {'fecha_pago': 'datetime'})
    ConvertOperations.convert_column_type(pagos, 'pago_anterior', 'datetime')
    DataExpresion.get_column_types(pagos)

    tiempo_espera = lambda row: row["fecha_pago"] - row["pago_anterior"] #Se restan qya que son del mismo tipo datetime
    pagos_dias = BasicsTransformOperations.add_new_column(pagos, 'dias_pago', tiempo_espera, 5)

    
    print("\nLIMPIANDO FORMATOS DE FECHA...")
    ConvertOperations.clean_date_format(pagos_dias, "fecha_pago", show=0)
    ConvertOperations.clean_date_format(pagos_dias, "pago_anterior", show=5) 

    print("\nFILTRANDO PAGOS CON MÁS DE 90 DÍAS DE ATRASO...")
    resultado = DataSelect.filter_by_operation(
    df=pagos_dias,
    field="dias_pago",
    value=90,
    op=lambda x, v: x.days > v,
    complement=False,
    show=  10
)
    
    resultado = DataSelect.filter_equal(resultado, 'id_usuario',"973113543", show=10)





def display_results(resultados):
    """Muestra los resultados de forma organizada"""
    print("\n" + "="*60)
    print("RESULTADOS DEL ANÁLISIS")
    print("="*60)
    
    for categoria, dataframe in resultados.items():
        print(f"\n📍 PROMEDIO DE VALOR PAGADO POR {categoria.upper()}:")
        print(BasicsTransformOperations.show_head(dataframe, 0))
        print("-" * 40)



def load_dimension_table(loader, dfs, table_names):
    """Carga los datos en la tabla dimensional"""
    print("\nCargando dimensión: dim_citas_fechas3")
    loader.load_dimension(dfs, table_names)


def load_fact_table(loader, df, table_names):
    """Carga los datos en la tabla hechos"""
    foreign_keys={
                            "id_ips": ("dim_ips", "id_ips"),
                            }
    
    print("\nCargando hechos: fact_ips_region")
    loader.load_fact(df, table_names, foreign_keys, validate_foreign_keys=False)


    

def connection():
    """Función principal"""
    # Inicializar operaciones
    data_transformer = BasicsTransformOperations
    data_select = DataSelect
    advances_transform = TransformOperations
    
    # Crear conexión
    db_connected = create_db_connection()
    db_loader = db_connection_loader()


    try:
        # Conectar a la base de datos
        db_connected.connect()
        db_loader.connect()
        loader_carga_colombia = DB_Loader(engine=db_loader.engine)

        # Tablas a extraer
        tablas_a_extraer = ["citas_generales", "urgencias", "hospitalizaciones", "remisiones", "medico", "ips", "pagos", "retiros", "cotizante"]
        
        # Extraer tablas usando bucle
        datos_extraidos = extract_tables(db_connected, tablas_a_extraer)
        
        # Obtener datos específicos
        citas = datos_extraidos["citas_generales"]
        urgencias = datos_extraidos["urgencias"]
        hospitalizaciones = datos_extraidos["hospitalizaciones"]
        remisiones = datos_extraidos["remisiones"]
        medico = datos_extraidos["medico"]
        ips = datos_extraidos["ips"]
        pagos = datos_extraidos["pagos"]
        retiros = datos_extraidos["retiros"] 
        cotizante = datos_extraidos["cotizante"]
        
        # Analizar datos de pagos
        datos_analisis = deman_country(datos_extraidos)

        datos_anilisis2 = untimely_payment(datos_extraidos)
        
        
        # Calcular promedios usando bucle
        
        

        dimensiones= (pagos, cotizante)
        nombres_dimensiones = ("dim_pagos", "dim_cotizante")

        load_dimension_table(loader_carga_colombia, dimensiones, nombres_dimensiones)
  

        
        # Mostrar resultados
        print("\n✅ ANÁLISIS COMPLETADO EXITOSAMENTE")
        
        return 

    except Exception as e:
        print(f"❌ Error durante la ejecución: {e}")
        import traceback
        traceback.print_exc()
        return None

    
        
    finally:
        db_connected.close_connection()
        db_loader.close_connection()

if __name__ == "__main__":
    # Ejecutar análisis
    resultados_finales = connection()
    
    # Los resultados están disponibles para usar después
    if resultados_finales:
        print("\n🎯 Análisis completado. Resultados disponibles para reportes.")