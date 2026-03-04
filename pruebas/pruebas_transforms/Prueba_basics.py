from etl import DB_Extractor, BasicsTransformOperations, TransformOperations
import pandas as pd

def test_mysql_connection():
    db_params = {
        "db_type": "postgresql",
        "user" : "postgres",
        "password": "admin",           
        "database": "ventas"   
    }

    db_loader = DB_Extractor(**db_params)
    tf = TransformOperations
    btf = BasicsTransformOperations
    
    try:
        # Conectar a la base de datos
        db_loader.connect()

        # Extraer los datos de las tablas
        print("Extrayendo datos de la tabla cliente...")
        query_clientes = "SELECT * FROM cliente"
        clientes = db_loader.execute_query(query_clientes)

        print("Extrayendo datos de la tabla comercial...")
        query_comerciales = "SELECT * FROM comercial"
        comerciales = db_loader.execute_query(query_comerciales)

        print("Extrayendo datos de la tabla pedido...")
        query_pedidos = "SELECT * FROM pedido"
        pedidos = db_loader.execute_query(query_pedidos)


        # Aplicar todas las transformaciones
        print("\n--- Transformaciones Basicas con las tabla ---")


        # Ejemplo: Mostrar las primeras y últimas filas de la tabla "pedido"
        print("\n HEAD (Primeras filas de la tabla 'pedido') ---")
        data_head = btf.show_head(pedidos, -1)
        print(data_head)

        print("\n TAIL (Últimas filas de la tabla 'pedido') ---")
        data_tail = btf.show_tail(pedidos, 5)
        print(data_tail)

       
        print("\n AGREGAR una columna calculada 'nuevo_total'...")
        funcion = lambda row: row["total"] * row["id_comercial"]
        data = btf.add_new_column(pedidos, "Nuevo_total", funcion, 3)

        print("\n APLICAR una transformación a la columna 'nuevo_total'...")
        data = btf.transform_column(data, "Nuevo_total", lambda x: round(x, 3), 3)  # Redondear el nuevo total

        print("\n FILTRAR filas donde el total es mayor a 1000...")
        data = btf.filter_by_condition(data, lambda row: row["total"] > 1000 and row["total"] < 2000 , -1)

        print("\n ELIMINAR columnas innecesarias...")
        data = btf.remove_columns(data, "fecha", show = 1)

        print("\n RENOMBRAR columnas para mayor claridad...")
        clientes2 = btf.rename_column_labels(clientes, {"id": "id_cliente"})

        print("\n ORDENAR los datos por 'nuevo_total' de forma descendente...")
        data = btf.sort_columns(data, "id", ascending=False)
        print(btf.show_head(data, 5))    

            

        print("\n REMPLAZAR valores en la columna 'monto_total' donde sea negativo...")
        data = tf.replace_values(data, "total", [5760, 2480.4, 2400.6], 1)  # Reemplazar valores negativos por 0
        print(btf.show_head(data, 5))



        print("\n ELIMINAR DUPLICADOS  basadas en 'id_cliente'...")
        data = tf.drop_duplicates(data, subset=["id_cliente"])
        print(btf.show_head(data, 5))

        print("\nRealizando left join entre 'pedido' y 'cliente'...")
        data = tf.left_join(data, clientes2, on="id_cliente", show = -1)  # Unir por 'id_cliente'
        
        data

        print("\nRealizando right entre 'pedido' y 'comerciales'...")
        data = tf.right_join(pedidos, clientes2, on="id_cliente", show = 2)  # Unir por 'id_cliente'
        


        print("\nCUT'...") 
        data = btf.select_columns(clientes, "nombre", "apellido1", show = 2)
       

        print("\nRealizando inner join entre 'pedido' y 'cliente'...")
        data_inner = tf.inner_join(pedidos, clientes2, on="id_cliente", show=3)
        
        print("\nRealizando outer join entre 'pedido' y 'cliente'...")
        data_outer = tf.outer_join(pedidos, clientes2, on="id_cliente", show=3)


        print("\nAgrupando los pedidos por 'id_cliente' y sumando el 'total'...")
        grouped_data = tf.group_by_sum(pedidos, by="id_cliente", column="total")
        print(btf.show_head(grouped_data, 5))

        print("\nAplicando transformación a la columna 'total', multiplicando por 1.19 (IVA)...")
        data_iva = tf.apply_to_column(pedidos.copy(), "total", lambda x: round(x * 1.19, 2))
        print(btf.show_head(data_iva, 5))

       

        # Cargar el último DataFrame procesado a la base de datos
        print("\nCargando los datos transformados a la base de datos...")
        #db_loader.load_data(data, "pedido_transformado", if_exists="replace")  # Puedes cambiar el nombre de la tabla

    except Exception as e:
        print(f"Error durante la ejecución: {e}")
    finally:
        db_loader.close_connection()

if __name__ == "__main__":
    test_mysql_connection()
