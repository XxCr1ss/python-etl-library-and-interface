from etl.extractors.db_extractor import DB_Extractor
from etl.transformer.advanced_data_transforms import TransformOperations
from etl.transformer.basics_data_transformer import BasicsTransformOperations
from etl.transformer.expresions import DataExpresion
import pandas as pd

def test_petl_search():
    db_params = {
        "db_type": "postgresql",
        "user" : "postgres",
        "password": "admin",           
        "database": "ventas"      
    }

    db_loader = DB_Extractor(**db_params)
    tf = TransformOperations
    btf = BasicsTransformOperations
    er = DataExpresion
    
    try:
        # Conectar a la base de datos
        db_loader.connect()

        # Extraer los datos de las tablas
        print("Extrayendo datos de la tabla cliente...")
        query_clientes = "SELECT * FROM cliente"
        clientes = db_loader.execute_query(query_clientes)
        DataExpresion.head(clientes, n=5)

        print("Extrayendo datos de la tabla comercial...")
        query_comerciales = "SELECT * FROM comercial"
        comerciales = db_loader.execute_query(query_comerciales)

        print("Extrayendo datos de la tabla pedido...")
        query_pedidos = "SELECT * FROM pedido"
        pedidos = db_loader.execute_query(query_pedidos)

        print("\n--- Búsquedas con search en la tabla 'cliente' ---")
        print("\nClientes cuyo nombre contiene 'Aar'")
        DataExpresion.search_in_column(clientes, 'nombre', 'Aar', show=5)

        print("\nClientes cuya ciudad contiene 'Sev'")
        DataExpresion.search_in_column(clientes, 'ciudad', 'Sev', show=5)

        print("\n--- Búsquedas con search_any en la tabla 'pedido' ---")
        print("\nPedidos que contienen '2017' en cualquier campo")
        pedidos_fecha = DataExpresion.search_in_table(pedidos, '2017', show=5)

        print("os_total = DataExpresio\nPedidos que contienen '150.50' en cualquier campo")
        pedidos = DataExpresion.search_in_table(pedidos, '150.5', show=5)

        print("\nPedidos delminatos por fecha")
        DataExpresion.split_column_into_rows(pedidos, 'fecha', '-', show=-1)

    except Exception as e:
        print(f"Error en la prueba ETL: {e}")
    finally:
        db_loader.close_connection()

if __name__ == "__main__":
    test_petl_search()
