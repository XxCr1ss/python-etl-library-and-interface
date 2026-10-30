"""Local ETL agent: command orchestration, session lifecycle and CLI."""
import argparse
import asyncio
import getpass
import json
import threading

try:
    import websockets
except ImportError:
    websockets = None

from etl.agent_protocol import (backend_url, command_error, require_load,
                                validate_command, warehouse_transport_allowed, websocket_url)
from etl.extractors.db_extractor import DB_Extractor
from etl.extractors.metadata import table_metadata
from etl.json_utils import clean_records, clean_value as clean_value
from etl.load_execution import persist_and_verify, test_connection
from etl.load_transport import (LOAD_PROTOCOL_VERSION, MAX_LOAD_MESSAGE_BYTES, MAX_LOAD_ROWS,
                                LoadValidationError, decode_dataset, encode_dataset,
                                serialize_command, strict_json)
from etl.typed_source import read_typed_table
from etl.warehouse.execution import execute as execute_warehouse
from etl.warehouse.settings import capabilities as warehouse_capabilities, WarehouseError

_write_lock = threading.Lock()
RECONNECT_SECONDS = 5
PAIRED_SESSION_ENDED = "La sesión del agente terminó. Genera otro código de emparejamiento para reconectar."


def load_capabilities(allow_load=False, allow_warehouse=True):
    return {"load_protocol_version": LOAD_PROTOCOL_VERSION, "load_enabled": allow_load,
            "load_schema_version": 1 if allow_warehouse else None,
            "typed_extract_version": 1 if allow_warehouse else None,
            "actions": ["test_target_connection", "execute_load", "preview_load"] if allow_load else [],
            "max_load_message_bytes": MAX_LOAD_MESSAGE_BYTES, "max_load_rows": MAX_LOAD_ROWS,
            "warehouse": warehouse_capabilities() if allow_warehouse else None,
            "warehouse_unavailable": None if allow_warehouse else "insecure_transport"}


def _execute_load(payload, allow_load=False):
    require_load(allow_load)
    if (not isinstance(payload, dict) or type(payload.get("load_protocol_version")) is not int
            or payload["load_protocol_version"] != LOAD_PROTOCOL_VERSION):
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
    require_load(allow_load)
    return await asyncio.to_thread(test_connection, payload)


def _connection(payload):
    return {key: payload.get(key) for key in
            ("db_type", "host", "port", "database", "user", "password", "service_name")}


def _get_metadata(payload):
    with DB_Extractor(**_connection(payload)) as extractor:
        return {"status": "success",
                "message": f"Conexión exitosa a la base de datos local '{payload.get('database')}'",
                **table_metadata(extractor, payload)}


def _get_preview(payload):
    from etl.extractors.schema_graph import preview_result
    with DB_Extractor(**_connection(payload)) as extractor:
        return preview_result(extractor, payload.get("table_name"), payload.get("limit", 5))


def _get_schema_graph(payload):
    from etl.extractors.schema_graph import schema_graph
    with DB_Extractor(**_connection(payload)) as extractor:
        return schema_graph(extractor.engine)


def _get_table(payload):
    table_name = payload.get("table_name")
    if not table_name:
        raise ValueError("Falta el parámetro 'table_name' para extraer los datos de la tabla.")
    with DB_Extractor(**_connection(payload)) as extractor:
        frame = extractor.get_table(table_name)
        return {"status": "success", "table_name": table_name,
                "records": clean_records(frame, len(frame)), "total_rows": len(frame)}


async def handle_get_metadata(payload):
    return await asyncio.to_thread(_get_metadata, payload)


async def handle_get_preview(payload):
    return await asyncio.to_thread(_get_preview, payload)


async def handle_get_schema_graph(payload):
    return await asyncio.to_thread(_get_schema_graph, payload)


async def handle_get_table(payload):
    return await asyncio.to_thread(_get_table, payload)


async def _warehouse_command(data, allow_warehouse):
    if not allow_warehouse:
        raise WarehouseError("insecure_transport", "El túnel remoto requiere HTTPS/WSS para analítica.", 400)
    serialize_command(data, warehouse_capabilities()["limits"]["message_bytes"])
    payload = data.get("payload", {})
    if set(payload) != {"request", "limits"}:
        raise WarehouseError("invalid_query", "Solicitud analítica inválida.")
    return await asyncio.to_thread(execute_warehouse, data["action"].removeprefix("warehouse_"),
                                   payload["request"], payload["limits"])


async def _load_command(data, allow_load, allow_warehouse):
    serialize_command(data)
    payload = data.get("payload", {})
    config = payload.get("load_config", {})
    if not isinstance(config, dict):
        raise LoadValidationError("La configuración de carga debe ser un objeto.")
    if config.get("schema_spec") and not allow_warehouse:
        raise LoadValidationError("El esquema explícito requiere transporte HTTPS/WSS o loopback.")
    if data["action"] == "preview_load":
        payload = {**payload, "load_config": {**config, "preview_only": True}}
    return await handle_execute_load(payload, allow_load)


async def _typed_table_command(payload, allow_warehouse):
    if not allow_warehouse:
        raise LoadValidationError("El transporte remoto requiere HTTPS/WSS para extracción tipada.")
    frame = await asyncio.to_thread(read_typed_table, payload, payload.get("table_name"))
    return {"dataset": encode_dataset(frame)}


async def dispatch_command(data, allow_load=False, allow_warehouse=True):
    """Dispatch validated commands while keeping privileged checks at execution."""
    validate_command(data)
    action, payload = data["action"], data.get("payload", {})
    if action == "get_capabilities":
        return load_capabilities(allow_load, allow_warehouse)
    if action in warehouse_capabilities()["actions"]:
        return await _warehouse_command(data, allow_warehouse)
    if action in {"execute_load", "preview_load"}:
        return await _load_command(data, allow_load, allow_warehouse)
    if action == "test_target_connection":
        return await handle_test_target_connection(payload, allow_load)
    if action == "get_typed_table":
        return await _typed_table_command(payload, allow_warehouse)
    readers = {"get_metadata": handle_get_metadata, "get_schema_graph": handle_get_schema_graph,
               "get_preview": handle_get_preview, "get_table": handle_get_table}
    if action not in readers:
        raise ValueError(f"Acción '{action}' no soportada por el agente local.")
    return await readers[action](payload)


async def command_response(message, allow_load, allow_warehouse, pair_token=None):
    """Reject uncorrelated frames and return one JSON response for each request."""
    try:
        data = json.loads(message)
    except (ValueError, TypeError):
        print("Comando rechazado: JSON inválido.")
        return None
    if not isinstance(data, dict) or not isinstance(data.get("request_id"), str) or not data["request_id"]:
        print("Comando rechazado: falta un identificador de petición válido.")
        return None
    request_id = data["request_id"]
    try:
        result = await dispatch_command(data, allow_load, allow_warehouse)
        return strict_json({"request_id": request_id, "status": "success", "data": result})
    except Exception as error:
        # This is the command boundary: driver failures must not terminate the session.
        response = command_error(request_id, data.get("action"), data.get("payload", {}), error, pair_token)
        print(f"Error al procesar comando: {response['message']}")
        return strict_json(response)


async def _serve_session(websocket, allow_load, allow_warehouse, pair_token):
    async for message in websocket:
        response = await command_response(message, allow_load, allow_warehouse, pair_token)
        if response is not None:
            await websocket.send(response)


async def agent_loop(server_url: str, agent_id: str, allow_load: bool = False, pair_token: str | None = None):
    """Connect, serve a session and reconnect only without a one-use token."""
    ws_url = websocket_url(server_url, agent_id)
    if websockets is None:
        raise RuntimeError("La librería 'websockets' no está instalada. Ejecuta: pip install websockets")
    allow_warehouse = warehouse_transport_allowed(server_url)
    options = {"max_size": MAX_LOAD_MESSAGE_BYTES, "max_queue": 1, "ping_interval": 20, "ping_timeout": 60}
    if pair_token:
        options["additional_headers"] = {"X-ETL-Pair-Token": pair_token}
        # Never replay a one-use credential on automatic opening retries either.
        options["process_exception"] = lambda error: error
    print(f"Conectando al backend de la ETL en: {ws_url} ...")
    async for websocket in websockets.connect(ws_url, **options):
        failure = None
        try:
            await _serve_session(websocket, allow_load, allow_warehouse, pair_token)
        except websockets.ConnectionClosed:
            failure = "Conexión cerrada con el servidor."
        except Exception:
            # Only the session boundary retries unexpected transport failures.
            failure = "Error inesperado en el túnel."
        if pair_token:
            print(PAIRED_SESSION_ENDED)
            return
        if failure:
            print(f"{failure} Reconectando en {RECONNECT_SECONDS} segundos...")
            await asyncio.sleep(RECONNECT_SECONDS)


def _argument_parser():
    parser = argparse.ArgumentParser(description="Agente ETL local. Load requiere habilitación explícita.")
    parser.add_argument("--allow-load", action="store_true", help="Permitir escrituras en la bodega local (entorno controlado).")
    parser.add_argument("--server-url", help="URL del backend, sin /api/v1; HTTPS para toda conexión remota.")
    parser.add_argument("--agent-id", help="Identificador del agente mostrado en la interfaz.")
    parser.add_argument("--pair", action="store_true", help="Solicitar código de emparejamiento de un solo uso, sin mostrarlo en pantalla.")
    return parser


def _option_or_prompt(value, label, default):
    return value or input(f"{label} (Por defecto [{default}]): ").strip() or default


def _pair_token(parser, enabled):
    if not enabled:
        return None
    token = getpass.getpass("Código temporal de emparejamiento: ").strip()
    if not token:
        parser.error("Falta el código temporal.")
    return token


def main():
    parser = _argument_parser()
    args = parser.parse_args()
    print("AGENTE LOCAL HÍBRIDO - LIBRERÍA ETL FLOW")
    server_url = _option_or_prompt(args.server_url, "Introduce la URL de la API del Backend", "http://localhost:8000")
    agent_id = _option_or_prompt(args.agent_id, "Introduce tu Identificador de Agente", "local-agent-default")
    try:
        server_url = backend_url(server_url).geturl()
    except ValueError as error:
        parser.error(str(error))
    print("Load habilitado explícitamente." if args.allow_load else "Solo extracción; añade --allow-load para permitir escrituras.")
    try:
        asyncio.run(agent_loop(server_url, agent_id, args.allow_load, _pair_token(parser, args.pair)))
    except KeyboardInterrupt:
        print("Agente local detenido por el usuario. Cerrando recursos.")
    except RuntimeError as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
