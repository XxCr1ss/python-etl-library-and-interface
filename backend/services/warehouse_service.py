import base64
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from etl.warehouse.execution import execute
from etl.warehouse.responses import RESPONSES
from etl.warehouse.serialization import bounded
from etl.warehouse.settings import ACTIONS, LIMITS, WarehouseError, effective_limits
from services.agent_manager import agent_manager


async def perform(operation, request):
    payload = request.model_dump()
    if not request.connection.use_agent:
        result = await run_in_threadpool(execute, operation, payload)
    else:
        agent_id = request.connection.agent_id
        if not agent_manager.is_agent_connected(agent_id):
            raise WarehouseError("agent_unavailable", "El agente no está conectado.", 503)
        if agent_manager.is_busy(agent_id):
            raise WarehouseError("agent_busy", "El agente está ocupado o tiene una carga sin confirmar.", 409)
        generation = agent_manager.connection_id(agent_id)
        try:
            capability_response = await agent_manager.send_command_and_wait(agent_id, "get_capabilities", {}, timeout=15, expected_connection=generation)
            capability_data = capability_response.get("data")
            caps = capability_data.get("warehouse") if isinstance(capability_data, dict) else None
            if not isinstance(caps, dict):
                if isinstance(capability_data, dict) and capability_data.get("warehouse_unavailable") == "insecure_transport":
                    raise WarehouseError("agent_incompatible", "El túnel remoto del agente requiere HTTPS/WSS para analítica.", 503)
                raise WarehouseError("agent_incompatible", "Actualiza el agente para usar analítica de solo lectura.", 503)
            if (capability_response.get("status") != "success" or type(caps.get("protocol_version")) is not int or caps.get("protocol_version") != 1 or
                    not isinstance(caps.get("actions"), list) or not all(isinstance(a, str) for a in caps["actions"]) or not set(ACTIONS).issubset(caps["actions"]) or
                    not isinstance(caps.get("limits"), dict) or
                    any(type(caps["limits"].get(k)) is not int or caps["limits"][k] <= 0 for k in LIMITS)):
                raise WarehouseError("agent_incompatible", "Actualiza el agente para usar analítica de solo lectura.", 503)
            limits = effective_limits(caps["limits"])
            bounded(payload, limits["message_bytes"] - 2048)
            response = await agent_manager.send_command_and_wait(agent_id, "warehouse_" + operation,
                        {"request": payload, "limits": limits}, timeout=120, expected_connection=generation,
                        max_message_bytes=limits["message_bytes"])
            bounded(response, limits["message_bytes"])
            if response.get("status") != "success":
                code = response.get("code")
                allowed = {"invalid_query": 422, "unsupported_relationship": 422, "catalog_changed": 409,
                           "query_timeout": 504, "result_limit_exceeded": 413, "export_limit_exceeded": 413,
                           "connection_failed": 503, "agent_busy": 409}
                if code not in allowed:
                    raise WarehouseError("connection_failed", "El agente no pudo completar la lectura.", 503)
                # Do not relay untrusted driver messages from older/malformed agents.
                raise WarehouseError(code, {413: "El resultado supera el límite; reduce su alcance.",
                                           504: "La consulta agotó su tiempo.", 409: "Actualiza el catálogo o espera a que el agente esté disponible."}.get(allowed[code], "El agente no pudo completar la consulta; revisa configuración y permisos."), allowed[code])
            result = response.get("data")
        except WarehouseError:
            raise
        except TimeoutError:
            raise WarehouseError("query_timeout", "Se agotó la espera del agente; una consulta puede seguir activa.", 504) from None
        except (ConnectionError, ValueError):
            raise WarehouseError("agent_unavailable", "La conexión del agente cambió o está ocupada; vuelve a conectar.", 503) from None
    try:
        result = RESPONSES[operation].validate_python(result).model_dump(exclude_none=False, by_alias=True)
        bounded(result)
        if operation in {"query", "detail"}:
            expected = [x.id for x in request.query.dimensions] + [x.id for x in request.query.metrics] if operation == "query" else [x.id for x in request.columns]
            if [c["id"] for c in result["columns"]] != expected or any(set(row) != set(expected) for row in result["data"]):
                raise TypeError()
            if operation == "query" and [(k["metric_id"], k["aggregation"]) for k in result["summary_kpis"]] != [(m.id, m.aggregation) for m in request.query.metrics]:
                raise TypeError()
            if result["meta"]["returned_rows"] != len(result["data"]):
                raise TypeError()
    except (ValidationError, TypeError):
        raise WarehouseError("connection_failed", "La respuesta del ejecutor no cumple el contrato analítico.", 503) from None
    return result


def download(result):
    try:
        content = base64.b64decode(result["content_base64"], validate=True)
        if len(content) != result["size"] or len(content) > LIMITS["export_bytes"]:
            raise ValueError()
        if result["filename"].endswith(".json") != (result["mime_type"] == "application/json"):
            raise ValueError()
        return content
    except (ValueError, KeyError):
        raise WarehouseError("connection_failed", "El archivo recibido no cumple el contrato de descarga.", 503) from None
