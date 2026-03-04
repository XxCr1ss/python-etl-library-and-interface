from etl.extractors.db_extractor import DB_Extractor
from etl.transformer.basics_data_transformer import BasicsTransformOperations
from etl.loaders.db_loader import DB_Loader
from etl.transformer.convert import ConvertOperations
from etl.transformer.selecs import DataSelect

  # Asegúrate de que esta importación esté arriba


def connection():
    db_params = {
        "db_type": "postgresql",
        "user" : "postgres",
        "password": "admin",           
        "database": "colombia_saludable"   
    }

    basic_transform = BasicsTransformOperations
    data_select = DataSelect
    db_loader = DB_Extractor(**db_params)
    data_convert = ConvertOperations

    try:
            # Conectar a la base de datos
            db_loader.connect()
            loader = DB_Loader(engine=db_loader.engine)# instanciamos la conexion existente

            print("Extrayendo datos de la tabla CITAS_GENERALES...")

            citas_generales = db_loader.get_table("citas_generales")
            data = basic_transform.show_head(citas_generales, 5)
            print(data)

            print("Extrayendo datos de la tabla URGENCIAS...")
            urgencias = db_loader.get_table("urgencias")
            data2 = basic_transform.show_head(urgencias, 5)


            print("\n citas de cirugia")

            citas = data_select.filter_equal(citas_generales, 'diagnostico', 'cirugia', 5)

            print("\n nueva columna fechahorasolicitud y fechahoraatencion")
            funcion1 = lambda row: str(row["fecha_solicitud"]) + " " + str(row["hora_solicitud"])
            basic_transform.add_new_column(citas_generales, 'fechahora_solicitud', funcion1, 0)

            funcion2 = lambda row: str(row["fecha_atencion"]) + " " + str(row["hora_atencion"])
            basic_transform.add_new_column(citas_generales, 'fechahora_atencion', funcion2, 0)

            print("\n convertimos las columnas a datatime para operarlos")
            data_convert.convert_column_type(citas_generales, 'fechahora_solicitud', 'datetime')
            data_convert.convert_column_type(citas_generales, 'fechahora_atencion', 'datetime')

            print("\n restamos la fechas para tenes el tiempo de espera por cita y creamos la nueva columna tempo espera")
            funcion3 = lambda row: (row["fechahora_atencion"])  - (row["fechahora_solicitud"])
            citas_fechas = basic_transform.add_new_column(citas_generales, 'tiempo de espera', funcion3, 1)

            print("\n quitamos columnas irrelevantes")
            data_select.select_columns(citas_fechas, "fecha_solicitud", "hora_solicitud", complement= True, show = 3)

            
            print("\n nobtenemos el tiempo promedio de citas generales")
            promedio_tiempo_espera = citas_fechas['tiempo de espera'].mean()
            print(f"El promedio del tiempo de espera es: {promedio_tiempo_espera}")
            
            
            
            print("\nCargando dimensión: citas_dim")
            loader.load_dimension(df=citas_fechas, table_name="dim_citas_fechas3")

            #print("\nvalores unicos citas")

            #pedidos_cliente = data_select.unique_values(citas_generales, 'diagnostico', True)

            #print("\nvalores unicos urge")
            #pedidos_cliente = data_select.unique_values(urgencias, 'diagnostico', True)



    except Exception as e:
        print(f"Error durante la ejecución: {e}")
    finally:
        db_loader.close_connection()

if __name__ == "__main__":
    connection()