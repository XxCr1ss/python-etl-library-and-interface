import requests
import os
import pandas as pd

def test_transformation():
    base_url = "http://localhost:8000/api/v1"
    
    print("=====================================================")
    print("Iniciando pruebas de API de Transformación...")
    print("=====================================================\n")
    
    # 1. Probar Catálogo de Operaciones
    print("--- 1. Probando GET /transform/operations ---")
    res_ops = requests.get(f"{base_url}/transform/operations")
    print("Status Code:", res_ops.status_code)
    print("Operations Count:", len(res_ops.json()))
    print("First Operation Name:", res_ops.json()[0]["name"])
    print()
    
    # 2. Subir Archivo para Guardar en uploads/ y obtener filepath
    print("--- 2. Subiendo Archivo CSV para persistencia ---")
    test_csv = "test_transform_sample.csv"
    data = {
        "id": [1, 2, 3, 4],
        "nombre": ["Juan", "Maria", "Carlos", "Ana"],
        "edad": [28, 34, 18, 22],
        "fecha_registro": ["2026-01-01", None, "2026-05-15", None]
    }
    df = pd.DataFrame(data)
    df.to_csv(test_csv, index=False)
    
    try:
        with open(test_csv, 'rb') as f:
            files = {'file': (test_csv, f, 'text/csv')}
            res_upload = requests.post(f"{base_url}/extract/upload", files=files)
            
        upload_data = res_upload.json()
        print("Upload Status Code:", res_upload.status_code)
        filepath = upload_data.get("filepath")
        print("Saved File Path:", filepath)
        print()
        
        if not filepath:
            print("Error: No se pudo obtener la ruta del archivo del upload.")
            return
            
        # 3. Probar Pipeline de Transformación
        print("--- 3. Probando POST /transform/preview (Pipeline Receta) ---")
        recipe = {
            "source": {
                "type": "file",
                "filepath": filepath
            },
            "steps": [
                {
                    "type": "rename_columns",
                    "params": {
                        "columns": {
                            "edad": "anios",
                            "nombre": "nombre_completo"
                        }
                    }
                },
                {
                    "type": "filter_value",
                    "params": {
                        "column": "anios",
                        "value": 20,
                        "operator": "gt" # mayores que 20 (debe excluir a Carlos de 18)
                    }
                },
                {
                    "type": "fill_nulls",
                    "params": {
                        "column": "fecha_registro",
                        "value": "2026-06-05"
                    }
                }
            ],
            "limit": 5
        }
        
        res_transform = requests.post(f"{base_url}/transform/preview", json=recipe)
        print("Transform Status Code:", res_transform.status_code)
        
        if res_transform.status_code == 200:
            transform_data = res_transform.json()
            print("Response preview_data:")
            for row in transform_data["preview_data"]:
                print(row)
            print("Total Rows Resulting:", transform_data["total_rows"])
            print("Columns Resulting:", transform_data["columns"])
            print("Data Types:", transform_data["dtypes"])
        else:
            print("Transform failed:", res_transform.text)
            
    finally:
        if os.path.exists(test_csv):
            try:
                os.remove(test_csv)
            except Exception as e:
                print(f"Error cleaning test local file: {e}")
                
if __name__ == "__main__":
    test_transformation()
