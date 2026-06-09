import sys
import requests
import os
import pandas as pd

# Reconfigurar stdout para UTF-8 en Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def test_load_pipeline():
    base_url = "http://localhost:8000/api/v1"
    
    print("=====================================================")
    print("Iniciando pruebas de API de Carga (Load)...")
    print("=====================================================\n")

    # 1. Probar Conexión con datos correctos
    print("--- 1. Probando POST /load/test-connection (Credenciales Correctas) ---")
    correct_conn = {
        "db_type": "postgresql",
        "host": "localhost",
        "port": 5432,
        "database": "colombia_saludable",
        "user": "postgres",
        "password": "admin"
    }
    res_conn_ok = requests.post(f"{base_url}/load/test-connection", json=correct_conn)
    print("Status Code:", res_conn_ok.status_code)
    print("Response:", res_conn_ok.json())
    print()

    # 2. Probar Conexión con datos erróneos
    print("--- 2. Probando POST /load/test-connection (Credenciales Erróneas) ---")
    wrong_conn = {
        "db_type": "postgresql",
        "host": "localhost",
        "port": 5432,
        "database": "colombia_saludable",
        "user": "postgres",
        "password": "incorrect_password"
    }
    res_conn_fail = requests.post(f"{base_url}/load/test-connection", json=wrong_conn)
    print("Status Code (debe ser 400):", res_conn_fail.status_code)
    print("Response:", res_conn_fail.json())
    print()

    # Si la conexión ok falló, abortamos pruebas de base de datos
    if res_conn_ok.status_code != 200:
        print("[WARN] No se pudo conectar a PostgreSQL en localhost:5432 (colombia_saludable/postgres/admin).")
        print("Asegúrate de que PostgreSQL esté iniciado para completar las pruebas de carga.")
        return

    # 3. Preparar archivos CSV y cargarlos
    dim_csv = "test_dim_medico.csv"
    fact_invalid_csv = "test_fact_consulta_invalid.csv"
    fact_valid_csv = "test_fact_consulta_valid.csv"

    # Datos Dimensión
    df_dim = pd.DataFrame({
        "id_medico": [1, 2, 3],
        "nombre": ["Dr. Perez", "Dra. Gomez", "Dr. Rodriguez"],
        "especialidad": ["Cardiología", "Pediatría", "Dermatología"]
    })
    df_dim.to_csv(dim_csv, index=False)

    # Datos Hechos - Con FK inválido (id_medico 999 no existe)
    df_fact_invalid = pd.DataFrame({
        "id_consulta": [101, 102],
        "id_medico": [1, 999], # 999 es inválido
        "costo": [150000, 200000]
    })
    df_fact_invalid.to_csv(fact_invalid_csv, index=False)

    # Datos Hechos - Con FK válidos
    df_fact_valid = pd.DataFrame({
        "id_consulta": [101, 102],
        "id_medico": [1, 2], # Todos válidos
        "costo": [150000, 180000]
    })
    df_fact_valid.to_csv(fact_valid_csv, index=False)

    try:
        # A. Cargar Dimensión
        print("--- 3. Subiendo archivo para Dimensión ---")
        with open(dim_csv, 'rb') as f:
            files = {'file': (dim_csv, f, 'text/csv')}
            res_upload_dim = requests.post(f"{base_url}/extract/upload", files=files)
        
        filepath_dim = res_upload_dim.json().get("filepath")
        print("Saved Dimension Filepath:", filepath_dim)

        print("\n--- 4. Ejecutando Carga de Dimensión (dim_test_medico) ---")
        load_dim_req = {
            "source": {
                "type": "file",
                "filepath": filepath_dim
            },
            "target_connection": correct_conn,
            "load_config": {
                "table_name": "dim_test_medico",
                "table_type": "dimension",
                "if_exists": "replace"
            },
            "recipe": []
        }
        res_load_dim = requests.post(f"{base_url}/load/execute", json=load_dim_req)
        print("Status Code:", res_load_dim.status_code)
        print("Response:", res_load_dim.json())
        print()

        # B. Cargar Hechos con FK Inválida (Debe fallar)
        print("--- 5. Subiendo archivo de Hechos con FK Inválida ---")
        with open(fact_invalid_csv, 'rb') as f:
            files = {'file': (fact_invalid_csv, f, 'text/csv')}
            res_upload_invalid = requests.post(f"{base_url}/extract/upload", files=files)
            
        filepath_invalid = res_upload_invalid.json().get("filepath")
        
        print("\n--- 6. Ejecutando Carga de Hechos con FK Inválida (debe arrojar 400 por integridad referencial) ---")
        load_invalid_req = {
            "source": {
                "type": "file",
                "filepath": filepath_invalid
            },
            "target_connection": correct_conn,
            "load_config": {
                "table_name": "fact_test_consulta",
                "table_type": "fact",
                "if_exists": "replace",
                "foreign_keys": {
                    "id_medico": ["dim_test_medico", "id_medico"]
                }
            },
            "recipe": []
        }
        res_load_invalid = requests.post(f"{base_url}/load/execute", json=load_invalid_req)
        print("Status Code (debe ser 400):", res_load_invalid.status_code)
        print("Response detail:", res_load_invalid.json().get("detail") if res_load_invalid.status_code == 400 else res_load_invalid.text)
        print()

        # C. Cargar Hechos con FK Válida (Debe funcionar)
        print("--- 7. Subiendo archivo de Hechos con FK Válida ---")
        with open(fact_valid_csv, 'rb') as f:
            files = {'file': (fact_valid_csv, f, 'text/csv')}
            res_upload_valid = requests.post(f"{base_url}/extract/upload", files=files)
            
        filepath_valid = res_upload_valid.json().get("filepath")

        print("\n--- 8. Ejecutando Carga de Hechos con FK Válida (debe tener éxito) ---")
        load_valid_req = {
            "source": {
                "type": "file",
                "filepath": filepath_valid
            },
            "target_connection": correct_conn,
            "load_config": {
                "table_name": "fact_test_consulta",
                "table_type": "fact",
                "if_exists": "replace",
                "foreign_keys": {
                    "id_medico": ["dim_test_medico", "id_medico"]
                }
            },
            "recipe": []
        }
        res_load_valid = requests.post(f"{base_url}/load/execute", json=load_valid_req)
        print("Status Code:", res_load_valid.status_code)
        print("Response:", res_load_valid.json())
        print()

    finally:
        # Limpiar archivos temporales locales
        for f in [dim_csv, fact_invalid_csv, fact_valid_csv]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception as e:
                    print(f"Error cleaning {f}: {e}")

if __name__ == "__main__":
    test_load_pipeline()
