from etl import DB_Extractor, HeaderOperations, BasicsTransformOperations



# Ejemplo
db = DB_Extractor()
hd = HeaderOperations()
bt = BasicsTransformOperations()




hd = HeaderOperations
btf = BasicsTransformOperations


def test_mysql_connection():
    db_params = {
        "db_type": "oracle",
        "user" : "SYSTEM",
        "password": "admin",           
        "database": "ventas",
        "service_name": "xe"     
    }

    data_base = DB_Extractor(**db_params)
    
    try:
        # Conectar a la base de datos
        data_base.connect()

        #CONSULTAS A LAS TABLAS EN SQL
        query_clientes = "SELECT * FROM cliente"
        query_comerciales = "SELECT * FROM comercial"
        query_pedidos = "SELECT * FROM pedido"

        # Extraer los datos de las tablas
        print("Extrayendo datos de la tabla cliente...")
        clientes = data_base.execute_query(query_clientes)
        print("Extrayendo datos de la tabla comercial...")
        comerciales = data_base.execute_query(query_comerciales)
        print("Extrayendo datos de la tabla pedido...")
        pedidos = data_base.execute_query(query_pedidos)

        # Ejemplo: Mostrar las primeras y últimas filas de la tablas tablas
        print("\n--- DATOS PEDIDOS ---")
        data_head = btf.show_head(pedidos, 1)
        print(data_head)
        print("\n--- DATOS COMERCIALES ---")
        data_head = btf.show_head(comerciales, 1)
        print(data_head)
        print("\n--- DATOS CLIENTE ---")
        data_head = btf.show_head(clientes, 1)
        print(data_head)

        print("RENOMBRE DE ID A CC")
        clientes_2 = hd.rename_columns(clientes, {"id": "cc"}, show = 1)

        print("RENOMBRE DE APELLIDO 1 Y 2 A AP1 Y AP2")
        clientes_3 = hd.rename_columns(clientes_2, {"apellido2" : "ap2", "apellido1" : "ap1"}, show=1)


        print(" PRUEBA set_header")
        clientes_3 = hd.replace_all_headers(clientes, ['cc', 'name', 'ap1', 'ap2', 'ciu', 'cat'], show=3)

        print(" PRUEBA extende_header")
        #data_head = hd.extend_hd(clientes, ["madre", "padre"], show=-1)

        print("PRUEBA prefix_header")
        clientes = hd.prefix_header(clientes, "new_", show=3)
        
        print("PRUEBA suffix_header")
        clientes = hd.suffix_header(clientes, "_old", show=3)

        print("PRUEBA droop_header")
        clientes = hd.drop_header(clientes, "new_cc_old", show=3)


    except Exception as e:
        print(f"Error durante la ejecución: {e}")
    finally:
        data_base.close_connection()

if __name__ == "__main__":
    test_mysql_connection()