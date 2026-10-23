"""Load orchestration; persistence and transport live in the reusable etl core."""
import asyncio
import os
import math

import pandas as pd  # Kept as an adapter seam for existing characterization tests.
from etl import DB_Extractor, DB_Loader
from etl.load_execution import connection_parameters, persist_and_verify, test_connection, validate_load_config
from etl.load_transport import (LOAD_PROTOCOL_VERSION, MAX_LOAD_MESSAGE_BYTES, MAX_LOAD_ROWS,
                                LoadValidationError, encode_dataset, strict_json)
from services.agent_manager import agent_manager
from services.transform_service import load_source_df, apply_transformation_steps

def _timeout(name, default):
    value = float(os.environ.get(name, default))
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{name} debe ser un tiempo positivo y finito.")
    return value


TEST_TIMEOUT = _timeout("ETL_AGENT_TEST_TIMEOUT", "15")
LOAD_TIMEOUT = _timeout("ETL_AGENT_LOAD_TIMEOUT", "120")


def test_target_connection(target_config):
    return test_connection(target_config, extractor_factory=DB_Extractor)


def _result(response):
    if not isinstance(response, dict) or response.get("status") != "success" or not isinstance(response.get("data"), dict):
        raise LoadValidationError("El agente no pudo completar la operación; revisa su configuración y el destino.")
    return response["data"]


async def _capabilities(target, require_schema=False, require_preview=False):
    agent_id = target.get("agent_id")
    if not isinstance(agent_id, str) or not agent_id.strip():
        raise LoadValidationError("Falta agent_id para utilizar el agente local.")
    generation = agent_manager.connection_id(agent_id)
    response = await agent_manager.send_command_and_wait(agent_id, "get_capabilities", {}, timeout=TEST_TIMEOUT)
    if not isinstance(response, dict) or response.get("status") != "success" or not isinstance(response.get("data"), dict):
        raise LoadValidationError("Actualiza el agente y habilita Load con python etl_agent.py --allow-load.")
    data = response["data"]
    if require_schema and (type(data.get("load_schema_version")) is not int or data["load_schema_version"] != 1):
        raise LoadValidationError("Actualiza el agente para cargar con un esquema explícito.")
    if require_preview and "preview_load" not in (data.get("actions") or []):
        raise LoadValidationError("Actualiza el agente para revisar el impacto sin escribir.")
    if (type(data.get("load_protocol_version")) is not int or data["load_protocol_version"] != LOAD_PROTOCOL_VERSION or data.get("load_enabled") is not True or
            not isinstance(data.get("actions"), list) or not all(isinstance(a, str) for a in data["actions"]) or
            not {"test_target_connection", "execute_load"}.issubset(data["actions"]) or
            any(type(data.get(k)) is not int or data[k] <= 0 for k in ("max_load_message_bytes", "max_load_rows"))):
        raise LoadValidationError("Actualiza el agente y habilita Load con python etl_agent.py --allow-load.")
    if generation != agent_manager.connection_id(agent_id):
        raise LoadValidationError("La conexión del agente cambió; prueba de nuevo el destino.")
    return agent_id, generation, min(MAX_LOAD_MESSAGE_BYTES, data["max_load_message_bytes"]), min(MAX_LOAD_ROWS, data["max_load_rows"])


async def test_target_connection_agent(target_config):
    params = connection_parameters(target_config)
    agent_id, generation, _, _ = await _capabilities(target_config)
    data = _result(await agent_manager.send_command_and_wait(agent_id, "test_target_connection", params,
                   timeout=TEST_TIMEOUT, expected_connection=generation))
    if data.get("status") != "success" or not isinstance(data.get("message"), str):
        raise LoadValidationError("Respuesta de prueba del agente inválida.")
    return {"status": "success", "message": "Conexión exitosa a la base de datos destino mediante agente local."}


def _validate_report(data, config):
    name, kind, _, _ = validate_load_config(config)
    if (data.get("status") != "success" or data.get("table_name") != name or data.get("table_type") != kind or
            type(data.get("total_rows")) is not int or data["total_rows"] < 0 or
            not isinstance(data.get("preview_data"), list) or len(data["preview_data"]) > 5 or
            not all(isinstance(row, dict) for row in data["preview_data"])):
        raise LoadValidationError("No se pudo confirmar un reporte válido del agente; revisa el destino antes de repetir.")
    try:
        strict_json(data["preview_data"])
    except (ValueError, TypeError):
        raise LoadValidationError("La muestra del agente no cumple el contrato JSON; revisa el destino antes de repetir.") from None
    # Do not echo arbitrary diagnostic text from an agent into the report.
    extra = {}
    if config.get("schema_spec"):
        for key in ("previous_rows", "submitted_rows"):
            if type(data.get(key)) is not int or data[key] < 0:
                raise LoadValidationError("Reporte estructurado del agente inválido; revisa el destino antes de repetir.")
            extra[key] = data[key]
        if type(data.get("preview_only")) is not bool or data["preview_only"] != config.get("preview_only", False):
            raise LoadValidationError("Respuesta de prevalidación incompatible.")
        if not isinstance(data.get("schema_actions"), list) or any(a not in {"preserve_schema", "delete_rows", "append_rows", "drop_table", "create_table", "insert_rows", "create_indexes", "add_primary_key", "add_unique", "add_foreign_key", "set_not_null"} for a in data["schema_actions"]):
            raise LoadValidationError("Acciones de esquema inválidas.")
        extra.update(preview_only=data["preview_only"], schema_actions=data["schema_actions"])
        from etl.schema import CheckOutcome
        try:
            extra["checks"] = [CheckOutcome.model_validate(c).model_dump() for c in data.get("checks", [])]
        except ValueError:
            raise LoadValidationError("Comprobaciones del agente inválidas; revisa el destino antes de repetir.") from None
    return {**extra, "status": "success", "message": f"Carga completada de forma exitosa en la tabla '{name}' ({kind.upper()}).",
            "table_name": name, "table_type": kind, "total_rows": data["total_rows"], "preview_data": data["preview_data"]}


async def execute_load(source, target_config, load_config, recipe):
    connection_parameters(target_config)
    validate_load_config(load_config)
    if load_config.get("schema_spec"):
        inputs = [source] + [step.get("params", {}).get(key) for step in recipe for key in ("right_source", "secondary_source")]
        if any(s and s.get("type") in {"file", "database"} and s.get("read_mode") != "exact" for s in inputs):
            raise LoadValidationError("Activa lectura exacta en todos los orígenes y actualiza la vista previa antes de cargar con esquema.")
    capability = await _capabilities(target_config, require_schema=bool(load_config.get("schema_spec")), require_preview=bool(load_config.get("preview_only"))) if target_config.get("use_agent") else None
    try:
        frame = await load_source_df(source, typed=True) if load_config.get("schema_spec") else await load_source_df(source)
        frame = await apply_transformation_steps(frame, recipe, typed=True) if load_config.get("schema_spec") else await apply_transformation_steps(frame, recipe)
    except Exception:
        raise LoadValidationError("No se pudo completar la transformación antes de la carga.") from None
    if capability:
        agent_id, generation, max_bytes, max_rows = capability
        dataset = await asyncio.to_thread(encode_dataset, frame, max_bytes, max_rows)
        payload = {"load_protocol_version": LOAD_PROTOCOL_VERSION, "target_connection": connection_parameters(target_config),
                   "load_config": load_config, "dataset": dataset}
        response = await agent_manager.send_command_and_wait(agent_id, "preview_load" if load_config.get("preview_only") else "execute_load", payload,
                       timeout=LOAD_TIMEOUT, expected_connection=generation, max_message_bytes=max_bytes)
        return _validate_report(_result(response), load_config)
    return await asyncio.to_thread(persist_and_verify, frame, target_config, load_config, DB_Extractor, DB_Loader)
