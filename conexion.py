from etl.extractors.db_extractor import DB_Extractor
from etl.transformer.advanced_data_transforms import TransformOperations
from etl.transformer.selecs import DataSelect
from etl.transformer.convert import ConvertOperations
from etl.loaders.db_loader import DB_Loader
from etl.transformer.header import HeaderOperations
import pandas as pd


def test_petl_search():

    db_params_postgres = {#datos para extraer de postgres 
        "db_type": "postgresql",
        "user" : "postgres",
        "password": "admin",           
        "database": "colombia_saludable"      
    }

    db_params_oracle = {#datos para extraer de oracle   
        "db_type": "oracle",
        "user" : "USER_MIGUEL",
        "password": "Miguel99",           
        "database": "ventas",
        "service_name": "xe"     
    }

    db_params_mysql = {#Ddatos para extraer de mysql
        "db_type": "mysql",
        "password": "admin",           
        "database": "ventas",   
    }
    


    db_params_postgres_loader = {#baswe de datos para cargar dimensiones y hechos en postgres
        "db_type": "postgresql",
        "user" : "postgres",
        "password": "admin",           
        "database": "carga_colombia"      
    }
    
    db_extract_postgres = DB_Extractor(**db_params_postgres)
    db_extract_oracle = DB_Extractor(**db_params_oracle)
    db_extract_mysql = DB_Extractor(**db_params_mysql)
    db_params_postgres_loader = DB_Extractor(**db_params_postgres_loader)
    
    try:
        # Conectar a la base de datos
        db_extract_postgres.connect()
        db_extract_oracle.connect()
        db_extract_mysql.connect()
        db_params_postgres_loader.connect()

        loader_postgres = DB_Loader(engine=db_params_postgres_loader.engine)
        

        # Extraer los datos de las tablas
        print("Extrayendo datos de la tabla cliente...")
        formulas = db_extract_postgres.get_table('formulas_medicas')
        medico = db_extract_postgres.get_table('medico')
        cotizante = db_extract_postgres.get_table('cotizante')
        beneficiario = db_extract_postgres.get_table('beneficiario')
        print("hola")


        beneficiario = HeaderOperations.rename_columns(beneficiario, {'id_beneficiario' : 'cedula'}, show =0)
        cc_beneficiario = DataSelect.select_columns(beneficiario, 'cedula', 'nombre', 'sexo', show=0)
        cc_cotizante = DataSelect.select_columns(cotizante, 'cedula', 'nombre', 'sexo', show=0)
        personas = TransformOperations.union_all([cc_cotizante, cc_beneficiario], show=0)

        DataSelect.unique_values(formulas, "medicamentos_recetados", show=0)
        print("hola")
        formulas_2 = ConvertOperations.split_string_column(df=formulas, column='medicamentos_recetados', delimiter=";", new_columns=["medicamento1", "medicamento2", "medicamento3", "medicamento4"],show=0)
        

        medico = ConvertOperations.convert_column_type(
                medico, 
                columns=['cedula'],
                dtype={'cedula': 'string'},
                show=0  # Mostrar todo el dataframe
            )
        
        personas = ConvertOperations.convert_column_type(
                personas, 
                columns=['cedula'],
                dtype={'cedula': 'string'},
                show=0  # Mostrar todo el dataframe
    )
        

        formulas_type = ConvertOperations.convert_column_type(
                formulas_2, 
    columns=[
        'codigo_formula', 
        'id_medico', 
        'id_usuario', 
        'fecha', 
        'medicamentos_recetados', 
        'medicamento1', 
        'medicamento2', 
        'medicamento3', 
        'medicamento4'
    ],
    dtype={
        'codigo_formula': 'string',
        'id_medico': 'string',
        'id_usuario': 'string',
        'fecha': 'datetime',
        'medicamentos_recetados': 'string',
        'medicamento1': 'string',
        'medicamento2': 'string',
        'medicamento3': 'string',
        'medicamento4': 'string'
    },
    show=0  # Mostrar todo el dataframe
)
       

        ConvertOperations.fill_nulls(formulas_type, 'medicamento2', '0')
        ConvertOperations.fill_nulls(formulas_type, 'medicamento3', '0')
        ConvertOperations.fill_nulls(formulas_type, 'medicamento4', '0', 0)

        #DataSelect.unique_values(formulas_type, 'medicamento1', 5)
        #DataSelect.unique_values(formulas_type, 'medicamento2', 5)
        #DataSelect.unique_values(formulas_type, 'medicamento3', 5)
        #DataSelect.unique_values(formulas_type, 'medicamento4', 5)
       
        

        loader_postgres.load_dimension([medico, personas], ['dim_medico', 'dim_personas'])
        foreign_keys={
                            "id_usuario": ("dim_personas", "cedula"),
                            "id_medico": ("dim_medico", "cedula"),
                            }
        loader_postgres.load_fact(formulas_type, 'fact', foreign_keys)
                                                   

    except Exception as e:
        print(f"Error en la prueba ETL: {e}")
    finally:
        db_extract_postgres.close_connection()
        db_extract_oracle.close_connection()
        db_extract_mysql.close_connection()
        db_params_postgres_loader.close_connection()

if __name__ == "__main__":
    test_petl_search()
