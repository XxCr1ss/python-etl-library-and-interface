import sys
import os
import json
import asyncio
import argparse
import threading
from urllib.parse import urlsplit, quote
import pandas as pd
from typing import Any, Dict, List

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Añadir el directorio actual al path para poder importar la librería etl
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from etl.extractors.db_extractor import DB_Extractor
from etl.error_utils import public_error
from etl.json_utils import clean_value
from etl.warehouse.settings import capabilities as warehouse_capabilities, WarehouseError
from etl.warehouse.execution import execute as execute_warehouse
from etl.load_execution import persist_and_verify, test_connection
from etl.load_transport import (LOAD_PROTOCOL_VERSION, MAX_LOAD_MESSAGE_BYTES, MAX_LOAD_ROWS,
                                LoadValidationError, decode_dataset, serialize_command, strict_json)

_write_lock = threading.Lock()


def warehouse_transport_allowed(server_url):
    parsed = urlsplit(server_url)
    return parsed.scheme == "https" or (parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"})


def load_capabilities(allow_load=False, allow_warehouse=True):
    return {"load_protocol_version": LOAD_PROTOCOL_VERSION, "load_enabled": allow_load,
            "actions": ["test_target_connection", "execute_load"] if allow_load else [],
            "max_load_message_bytes": MAX_LOAD_MESSAGE_BYTES, "max_load_rows": MAX_LOAD_ROWS,
            "warehouse": warehouse_capabilities() if allow_warehouse else None,
            "warehouse_unavailable": None if allow_warehouse else "insecure_transport"}


def _execute_load(payload, allow_load=False):
    if not allow_load:
        raise LoadValidationError("La carga local está deshabilitada; inicia el agente con --allow-load.")
    if not isinstance(payload, dict) or type(payload.get("load_protocol_version")) is not int or payload["load_protocol_version"] != LOAD_PROTOCOL_VERSION:
        raise LoadValidationError("Versión de protocolo de carga incompatible.")
    if not _write_lock.acquire(blocking=False):
        raise LoadValidationError("El agente ya está ejecutando una carga.")
    try:
        frame = decode_dataset(payload.get("dataset"))
        return persist_and_verify(frame, payload.get("target_connection"), payload.get("load_config"))
    finally:
        _write_lock.release()


async def handle_execute_load(payload, allow_load=False):
    return await asyncio.to_thread(_execute_load, payload, allow_load)


async def handle_test_target_connection(payload, allow_load=False):
    if not allow_load:
        raise LoadValidationError("La carga local está deshabilitada; inicia el agente con --allow-load.")
    return await asyncio.to_thread(test_connection, payload)

# Intentar importar websockets, informar si no está instalado
try:
    import websockets
except ImportError:
    print("❌ Error: La librería 'websockets' no está instalada en tu entorno de Python.")
    print("👉 Por favor, instálala ejecutando: pip install websockets")
    sys.exit(1)

def clean_records(df: pd.DataFrame, limit: int = 5) -> List[Dict[str, Any]]:
    """Convierte las primeras filas de un DataFrame en una lista de diccionarios JSON-serializables."""
    preview_df = df.head(limit)
    records = []
    for _, row in preview_df.iterrows():
        record = {str(col): clean_value(val) for col, val in row.items()}
        records.append(record)
    return records

def _get_metadata(payload: Dict[str, Any]) -> Dict[str, Any]:
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

def _connection(payload):
    return {key: payload.get(key) for key in
            ("db_type", "host", "port", "database", "user", "password", "service_name")}


def _get_preview(payload):
    from etl.extractors.schema_graph import preview_result
    with DB_Extractor(**_connection(payload)) as extractor:
        return preview_result(extractor, payload.get("table_name"), payload.get("limit", 5))


def _get_schema_graph(payload):
    from etl.extractors.schema_graph import schema_graph
    with DB_Extractor(**_connection(payload)) as extractor:
        return schema_graph(extractor.engine)


async def handle_get_metadata(payload):
    return await asyncio.to_thread(_get_metadata, payload)


async def handle_get_preview(payload):
    return await asyncio.to_thread(_get_preview, payload)


async def handle_get_schema_graph(payload):
    return await asyncio.to_thread(_get_schema_graph, payload)


async def handle_get_table(payload):
    return await asyncio.to_thread(_get_table, payload)


def _get_table(payload: Dict[str, Any]) -> Dict[str, Any]:
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

async def agent_loop(server_url: str, agent_id: str, allow_load: bool = False):
    """Bucle principal de conexión y escucha de comandos WebSocket."""
    ws_url = f"{server_url}/api/v1/ws/agent/{quote(agent_id, safe='')}".replace("http://", "ws://").replace("https://", "wss://")
    allow_warehouse = warehouse_transport_allowed(server_url)
    print(f"⏳ Conectando al backend de la ETL en: {ws_url} ...")
    
    async for websocket in websockets.connect(ws_url, max_size=MAX_LOAD_MESSAGE_BYTES,
                                              max_queue=1, ping_interval=20, ping_timeout=60):
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
                    if action == "get_capabilities":
                        result_data = load_capabilities(allow_load, allow_warehouse)
                    elif action in warehouse_capabilities()["actions"]:
                        if not allow_warehouse:
                            raise WarehouseError("insecure_transport", "El túnel remoto requiere HTTPS/WSS para analítica.", 400)
                        serialize_command(data, warehouse_capabilities()["limits"]["message_bytes"])
                        if not isinstance(payload, dict) or set(payload) != {"request", "limits"}:
                            raise WarehouseError("invalid_query", "Solicitud analítica inválida.")
                        result_data = await asyncio.to_thread(execute_warehouse, action.removeprefix("warehouse_"), payload["request"], payload["limits"])
                    elif action == "test_target_connection":
                        result_data = await handle_test_target_connection(payload, allow_load)
                    elif action == "execute_load":
                        serialize_command(data)
                        result_data = await handle_execute_load(payload, allow_load)
                    elif action == "get_metadata":
                        result_data = await handle_get_metadata(payload)
                    elif action == "get_schema_graph":
                        result_data = await handle_get_schema_graph(payload)
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
                    err_msg = str(e)
                    if isinstance(e, UnicodeDecodeError) and isinstance(getattr(e, "object", None), bytes):
                        for enc in ("cp1252", "iso-8859-1", "latin-1", "utf-8"):
                            try:
                                err_msg = e.object.decode(enc)
                                break
                            except Exception:
                                pass
                        else:
                            err_msg = e.object.decode("latin-1", errors="replace")
                    if action in {"execute_load", "test_target_connection"}:
                        err_msg = str(e) if isinstance(e, LoadValidationError) else "No se pudo completar la carga local; revisa el destino antes de repetir."
                    sanitized_msg = public_error(err_msg, payload)
                    print(f"❌ Error al procesar comando: {sanitized_msg}")
                    response = {
                        "request_id": request_id,
                        "status": "error",
                        "message": sanitized_msg
                    }
                    if isinstance(action, str) and action.startswith("warehouse_"):
                        response["code"] = e.code if isinstance(e, WarehouseError) else "connection_failed"
                        response["message"] = str(e) if isinstance(e, WarehouseError) else "No se pudo completar la lectura local."
                
                await websocket.send(strict_json(response))
                
        except websockets.ConnectionClosed:
            print("⚠️ Conexión cerrada con el servidor. Intentando reconectar en 5 segundos...")
            await asyncio.sleep(5)
        except Exception as e:
            print("Error inesperado en el túnel. Reconectando en 5 segundos...")
            await asyncio.sleep(5)

def main():
    parser = argparse.ArgumentParser(description="Agente ETL local. Load requiere habilitación explícita.")
    parser.add_argument("--allow-load", action="store_true", help="Permitir escrituras en la bodega local (entorno controlado).")
    parser.add_argument("--server-url", help="URL del backend, sin /api/v1; HTTPS para conexiones remotas.")
    parser.add_argument("--agent-id", help="Identificador del agente mostrado en la interfaz.")
    args = parser.parse_args()
    print("=" * 60)
    print("     🤖 AGENTE LOCAL HÍBRIDO - LIBRERÍA ETL FLOW 🤖")
    print("=" * 60)
    
    # URL del servidor backend por defecto
    default_server = "http://localhost:8000"
    server_url = args.server_url or input(f"Introduce la URL de la API del Backend (Por defecto [{default_server}]): ").strip()
    if not server_url:
        server_url = default_server
        
    # ID del agente
    default_agent = "local-agent-default"
    agent_id = args.agent_id or input(f"Introduce tu Identificador de Agente (Por defecto [{default_agent}]): ").strip()
    if not agent_id:
        agent_id = default_agent
        
    parsed = urlsplit(server_url)
    if (parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password or
            parsed.query or parsed.fragment or parsed.path not in {"", "/"}):
        parser.error("Usa una URL de backend válida, sin credenciales, rutas ni parámetros.")
    if args.allow_load and parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        parser.error("El backend remoto requiere HTTPS/WSS.")
    server_url = server_url.rstrip("/")
    print("Load habilitado explícitamente." if args.allow_load else "Solo extracción; añade --allow-load para permitir escrituras.")
    try:
        asyncio.run(agent_loop(server_url, agent_id, args.allow_load))
    except KeyboardInterrupt:
        print("\n🔒 Agente local detenido por el usuario. Cerrando recursos.")
        sys.exit(0)

if __name__ == "__main__":
    main()
