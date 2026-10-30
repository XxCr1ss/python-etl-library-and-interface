"""Transport and command boundaries for the local ETL agent."""
from urllib.parse import quote, urlsplit, urlunsplit

from etl.error_utils import public_error
from etl.load_transport import LoadValidationError
from etl.warehouse.settings import WarehouseError

LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
LOAD_ACTIONS = frozenset({"execute_load", "preview_load", "test_target_connection", "get_typed_table"})
DISABLED_LOAD = "La carga local está deshabilitada; inicia el agente con --allow-load."
INVALID_URL = "Usa una URL de backend válida, sin credenciales, rutas ni parámetros."


def backend_url(server_url):
    """Accept TLS remotely and plaintext only for explicitly local development."""
    if not isinstance(server_url, str) or any(char.isspace() or ord(char) < 32 for char in server_url):
        raise ValueError(INVALID_URL)
    try:
        parsed = urlsplit(server_url)
        port = parsed.port
    except ValueError as exc:
        raise ValueError(INVALID_URL) from exc
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError(INVALID_URL)
    if parsed.username is not None or parsed.password is not None or parsed.query or parsed.fragment:
        raise ValueError(INVALID_URL)
    if parsed.path not in {"", "/"} or "\\" in parsed.netloc or port == 0:
        raise ValueError(INVALID_URL)
    if parsed.scheme != "https" and parsed.hostname not in LOOPBACK_HOSTS:
        raise ValueError("El backend remoto requiere HTTPS/WSS.")
    return parsed._replace(path="")


def websocket_url(server_url, agent_id):
    parsed = backend_url(server_url)
    if not isinstance(agent_id, str) or not agent_id.strip():
        raise ValueError("Falta el identificador del agente.")
    # The non-TLS scheme is reachable only after the explicit loopback check above.
    scheme = "wss" if parsed.scheme == "https" else "ws"
    return urlunsplit((scheme, parsed.netloc, "/api/v1/ws/agent/" + quote(agent_id, safe=""), "", ""))


def warehouse_transport_allowed(server_url):
    try:
        backend_url(server_url)
    except ValueError:
        return False
    return True


def require_load(allow_load):
    if not allow_load:
        raise LoadValidationError(DISABLED_LOAD)


def validate_command(data):
    if not isinstance(data.get("action"), str) or not data["action"]:
        raise LoadValidationError("Falta una acción válida en el comando.")
    if not isinstance(data.get("payload", {}), dict):
        raise LoadValidationError("El payload del comando debe ser un objeto.")


def command_error(request_id, action, payload, error, pair_token=None):
    """Choose the public policy first and redact the final message exactly once."""
    code = None
    message = error
    if isinstance(action, str) and action.startswith("warehouse_"):
        code = error.code if isinstance(error, WarehouseError) else "connection_failed"
        message = error if isinstance(error, WarehouseError) else "No se pudo completar la lectura local."
    elif isinstance(action, str) and action in LOAD_ACTIONS and not isinstance(error, LoadValidationError):
        message = "No se pudo completar la carga local; revisa el destino antes de repetir."
    response = {"request_id": request_id, "status": "error",
                "message": public_error(message, {"payload": payload, "pair_token": pair_token})}
    if code is not None:
        response["code"] = code
    return response
