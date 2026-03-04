import pandas as pd
from etl import DB_Extractor, TransformOperations, BasicsTransformOperations, DataSelect

def test_mysql_connection():
    db_params = {
        "db_type": "mysql",
        "password": "admin",           
        "database": "ventas"     
    }

    db_loader = DB_Extractor(**db_params)
    tf = TransformOperations
    btf = BasicsTransformOperations
    ds = DataSelect
    
    try:
        # Conectar a la base de datos
        db_loader.connect()

        # Extraer los datos de las tablas
        print("Extrayendo datos de la tabla cliente...")
        query_clientes = "SELECT * FROM cliente;"
        clientes = db_loader.execute_query(query_clientes)

        print("Extrayendo datos de la tabla comercial...")
        query_comerciales = "SELECT * FROM comercial;"
        comerciales = db_loader.execute_query(query_comerciales)

        print("Extrayendo datos de la tabla pedido...")
        query_pedidos = "SELECT * FROM pedido;"
        pedidos = db_loader.execute_query(query_pedidos)

        # Aplicar transformaciones básicas
        print("\n--- Transformaciones Básicas con la tabla 'pedido' ---")

        print("\nHEAD (Primeras filas de la tabla 'pedido') ---")
        data_head = btf.show_head(pedidos, 5)
        print(data_head)

        print("\nTAIL (Últimas filas de la tabla 'pedido') ---")
        data_tail = btf.show_tail(pedidos, 5)
        print(data_tail)

        # Aplicar filtros con DataSelect
        print("\n--- Filtros con DataSelect ---")
        
        print("\nPedidos con total mayor a 100")
        pedidos_filtrados = ds.filter_by_operation(pedidos, 'total', 100, lambda x, y: x > y, show=5)
        
        print("\nPedidos donde el cliente es 'Aarón'")
        pedidos_cliente = ds.filter_equal(clientes, 'nombre', 'Aarón', True, show=5)

        print("\nPedidos donde el total es diferente de 150.5") #hace lo mismo que arriba
        pedidos_diferentes = ds.filter_not_equal(pedidos, 'total', 150.5, show=5)
        
        print("\nPedidos donde el total está entre 50 y 200")
        pedidos_rango_precio = ds.filter_in_range(pedidos, 'total', 50, 200, show=5)

        print("\nPedidos donde el estado contiene 'fecha 2017-10-05'")
        pedidos_estado = ds.filter_contains(pedidos, 'fecha', '2017-10-05', show=5)

        print("\nPedidos donde el ID está en la lista [1, 2, 3, 4, 5]")
        pedidos_in = ds.filter_in_list(pedidos, 'id', [ 2, 3, 4, 5], show=5)

        #print("\nPedidos donde la columna 'comentarios' es None")
        #pedidos_none = ds.select_none(pedidos, 'comentarios', show=5)

        print("\nPedidos donde la columna 'comentarios' NO es None")
        pedidos_not_none = ds.filter_is_null(clientes, 'categoria', show=5)
    
    except Exception as e:  
        print(f"Error en la prueba ETL: {e}")
    finally:
        db_loader.close_connection()

if __name__ == "__main__":
    test_mysql_connection()
