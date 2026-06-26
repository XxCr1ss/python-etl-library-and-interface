import sys
import os
import json
import asyncio
import datetime
import pandas as pd
import numpy as np
from typing import Any, Dict, List

# Añadir el directorio actual al path para poder importar la librería etl
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from etl.extractors.db_extractor import DB_Extractor

# Intentar importar websockets, informar si no está instalado
try:
    import websockets
except ImportError:
    print("❌ Error: La librería 'websockets' no está instalada en tu entorno de Python.")
    print("👉 Por favor, instálala ejecutando: pip install websockets")
    sys.exit(1)

def clean_value(val: Any) -> Any:
    """Convierte un valor de pandas/numpy a un tipo nativo de Python serializable en JSON."""
    if pd.isna(val) or val is pd.NaT:
        return None
    if isinstance(val, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(val)
    if isinstance(val, (np.floating, np.float64, np.float32)):
        if np.isnan(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, (datetime.datetime, datetime.date, pd.Timestamp)):
        return val.isoformat()
    return val

def clean_records(df: pd.DataFrame, limit: int = 5) -> List[Dict[str, Any]]:
    """Convierte las primeras filas de un DataFrame en una lista de diccionarios JSON-serializables."""
    preview_df = df.head(limit)
    records = []
    for _, row in preview_df.iterrows():
        record = {str(col): clean_value(val) for col, val in row.items()}
        records.append(record)
    return records

async def handle_get_metadata(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Establece conexión a base de datos local y extrae nombres de tablas y esquemas."""
    db_type = payload.get("db_type")
    host = payload.get("host")
    port = payload.get("port")
    database = payload.get("database")
    user = payload.get("user")
    password = payload.get("password")
    service_name = payload.get("service_name")
    
    print(f"🔌 [Local] Conectando a {db_type.upper()} ({host}:{port}/{database})...")
    with DB_Extractor(
        db_type=db_type,
        password=password,
        database=database,
        host=host,
        user=user,
        port=port,
        service_name=service_name
    ) as extractor:
        tables = extractor.get_table_names()
        schema_preview = {}
        for table in tables:
            try:
                schema = extractor.get_table_schema(table)
                schema_preview[table] = schema.get('columns', [])
            except Exception as e:
                schema_preview[table] = []
                
        return {
            "status": "success",
            "message": f"Conexión exitosa a la base de datos local '{database}'",
            "tables": tables,
            "schema_preview": schema_preview
        }

async def handle_get_preview(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Obtiene una muestra (preview) de una tabla local."""
    db_type = payload.get("db_type")
    host = payload.get("host")
    port = payload.get("port")
    database = payload.get("database")
    user = payload.get("user")
    password = payload.get("password")
    service_name = payload.get("service_name")
    table_name = payload.get("table_name")
    limit = payload.get("limit", 5)
    
    if not table_name:
        raise ValueError("Falta el parámetro 'table_name' para previsualizar datos.")
        
    print(f"📊 [Local] Extrayendo vista previa de tabla '{table_name}'...")
    with DB_Extractor(
        db_type=db_type,
        password=password,
        database=database,
        host=host,
        user=user,
        port=port,
        service_name=service_name
    ) as extractor:
        df = extractor.sample_data(table_name, limit)
        preview_data = clean_records(df, limit)
        return {
            "status": "success",
            "table_name": table_name,
            "preview_data": preview_data,
            "total_rows": len(df)
        }

async def handle_get_table(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Obtiene todos los registros de una tabla local."""
    db_type = payload.get("db_type")
    host = payload.get("host")
    port = payload.get("port")
    database = payload.get("database")
    user = payload.get("user")
    password = payload.get("password")
    service_name = payload.get("service_name")
    table_name = payload.get("table_name")
    
    if not table_name:
        raise ValueError("Falta el parámetro 'table_name' para extraer los datos de la tabla.")
        
    print(f"📥 [Local] Extrayendo todos los registros de la tabla '{table_name}'...")
    with DB_Extractor(
        db_type=db_type,
        password=password,
        database=database,
        host=host,
        user=user,
        port=port,
        service_name=service_name
    ) as extractor:
        df = extractor.get_table(table_name)
        records = clean_records(df, len(df))
        return {
            "status": "success",
            "table_name": table_name,
            "records": records,
            "total_rows": len(df)
        }

async def agent_loop(server_url: str, agent_id: str):
    """Bucle principal de conexión y escucha de comandos WebSocket."""
    ws_url = f"{server_url}/api/v1/ws/agent/{agent_id}".replace("http://", "ws://").replace("https://", "wss://")
    print(f"⏳ Conectando al backend de la ETL en: {ws_url} ...")
    
    async for websocket in websockets.connect(ws_url, ping_interval=20, ping_timeout=20):
        try:
            print(f"🟢 [CONECTADO] Agente '{agent_id}' en línea y listo para recibir comandos.")
            
            async for message in websocket:
                data = json.loads(message)
                request_id = data.get("request_id")
                action = data.get("action")
                payload = data.get("payload", {})
                
                print(f"📥 Comando recibido: '{action}' (ID de petición: {request_id})")
                
                # Procesar comando
                try:
                    if action == "get_metadata":
                        result_data = await handle_get_metadata(payload)
                    elif action == "get_preview":
                        result_data = await handle_get_preview(payload)
                    elif action == "get_table":
                        result_data = await handle_get_table(payload)
                    else:
                        raise ValueError(f"Acción '{action}' no soportada por el agente local.")
                        
                    response = {
                        "request_id": request_id,
                        "status": "success",
                        "data": result_data
                    }
                    print(f"📤 Comando procesado con éxito. Enviando respuesta...")
                    
                except Exception as e:
                    print(f"❌ Error al procesar comando: {e}")
                    response = {
                        "request_id": request_id,
                        "status": "error",
                        "message": str(e)
                    }
                
                await websocket.send(json.dumps(response))
                
        except websockets.ConnectionClosed:
            print("⚠️ Conexión cerrada con el servidor. Intentando reconectar en 5 segundos...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"⚠️ Error inesperado en el túnel: {e}. Reconectando en 5 segundos...")
            await asyncio.sleep(5)

def main():
    print("=" * 60)
    print("     🤖 AGENTE LOCAL HÍBRIDO - LIBRERÍA ETL FLOW 🤖")
    print("=" * 60)
    
    # URL del servidor backend por defecto
    default_server = "http://localhost:8000"
    server_url = input(f"Introduce la URL de la API del Backend (Por defecto [{default_server}]): ").strip()
    if not server_url:
        server_url = default_server
        
    # ID del agente
    default_agent = "local-agent-default"
    agent_id = input(f"Introduce tu Identificador de Agente (Por defecto [{default_agent}]): ").strip()
    if not agent_id:
        agent_id = default_agent
        
    print("\n")
    try:
        asyncio.run(agent_loop(server_url, agent_id))
    except KeyboardInterrupt:
        print("\n🔒 Agente local detenido por el usuario. Cerrando recursos.")
        sys.exit(0)

if __name__ == "__main__":
    main()
