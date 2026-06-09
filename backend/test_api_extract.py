import requests
import os
import pandas as pd

def test_api():
    base_url = "http://localhost:8000/api/v1/extract"
    
    print("=========================================")
    print("Iniciando pruebas de API de Extracción...")
    print("=========================================\n")
    
    # 1. Crear archivos de prueba locales
    csv_filename = "test_temp_sample.csv"
    xlsx_filename = "test_temp_sample.xlsx"
    
    # Datos de prueba
    data = {
        "id": [1, 2, 3, 4],
        "nombre": ["Juan", "Maria", "Carlos", "Ana"],
        "edad": [28, 34, None, 22],  # Tiene un NaN
        "fecha_registro": ["2026-01-01", None, "2026-05-15", "2026-06-01"]  # Tiene None/NaN
    }
    
    df = pd.DataFrame(data)
    df.to_csv(csv_filename, index=False)
    df.to_excel(xlsx_filename, index=False)
    
    try:
        # 2. Probar Endpoint de Carga de CSV
        print("--- Probando Carga de CSV ---")
        with open(csv_filename, 'rb') as f:
            files = {'file': (csv_filename, f, 'text/csv')}
            response = requests.post(f"{base_url}/upload", files=files)
            
        print("Status Code:", response.status_code)
        print("Response JSON:")
        print(response.json())
        print()
        
        # 3. Probar Endpoint de Carga de Excel
        print("--- Probando Carga de Excel ---")
        with open(xlsx_filename, 'rb') as f:
            files = {'file': (xlsx_filename, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            response = requests.post(f"{base_url}/upload", files=files)
            
        print("Status Code:", response.status_code)
        print("Response JSON:")
        print(response.json())
        print()
        
        # 4. Probar Endpoint con Formato No Soportado
        print("--- Probando Formato No Soportado ---")
        files = {'file': ('test.txt', b'hola mundo', 'text/plain')}
        response = requests.post(f"{base_url}/upload", files=files)
        print("Status Code (debe ser 400):", response.status_code)
        print("Response:", response.json())
        print()
        
        # 5. Probar Endpoint de Base de Datos
        print("--- Probando Conexión a Base de Datos (PostgreSQL local) ---")
        db_data = {
            "db_type": "postgresql",
            "host": "localhost",
            "port": 5432,
            "database": "colombia_saludable",
            "user": "postgres",
            "password": "admin"
        }
        response = requests.post(f"{base_url}/database", json=db_data)
        print("Status Code (200 o 500/400 según si el servidor de BD está activo):", response.status_code)
        print("Response JSON:")
        try:
            print(response.json())
        except Exception:
            print(response.text)
        print()
        
        # 5.1. Probar Vista Previa de Tabla de Base de Datos
        print("--- Probando Vista Previa de Tabla de Base de Datos (PostgreSQL local) ---")
        db_preview_data = {
            "db_type": "postgresql",
            "host": "localhost",
            "port": 5432,
            "database": "colombia_saludable",
            "user": "postgres",
            "password": "admin",
            "table_name": "cotizante"
        }
        response = requests.post(f"{base_url}/database/preview", json=db_preview_data)
        print("Status Code (200 o 500/400 según si el servidor de BD está activo):", response.status_code)
        print("Response JSON:")
        try:
            print(response.json())
        except Exception:
            print(response.text)
        print()
        
        # 6. Probar Endpoint de Base de Datos con Motor No Soportado
        print("--- Probando Motor de Base de Datos No Soportado ---")
        bad_db_data = {
            "db_type": "sqlite",
            "host": "localhost",
            "database": "test",
            "user": "root",
            "password": "root"
        }
        response = requests.post(f"{base_url}/database", json=bad_db_data)
        print("Status Code (debe ser 400):", response.status_code)
        print("Response:", response.json())
        print()

    finally:
        # Eliminar archivos temporales creados para la prueba
        for filename in [csv_filename, xlsx_filename]:
            if os.path.exists(filename):
                try:
                    os.remove(filename)
                except Exception as e:
                    print(f"Error al eliminar {filename}: {e}")
                    
if __name__ == "__main__":
    test_api()
