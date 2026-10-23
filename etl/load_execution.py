"""Shared local write path for the HTTP backend and standalone agent."""
import re

import pandas as pd
from sqlalchemy import MetaData, Table, func, inspect, select
from sqlalchemy.exc import IntegrityError

from etl.extractors.db_extractor import DB_Extractor
from etl.json_utils import clean_value
from etl.loaders.db_loader import DB_Loader
from etl.load_transport import LoadValidationError, positive_setting

IDENTIFIER = re.compile(r"[A-Za-z_][A-Za-z0-9_]*\Z")
CONNECTION_FIELDS = ("db_type", "host", "port", "database", "user", "password", "service_name")


def connection_parameters(target):
    if not isinstance(target, dict) or target.get("db_type") not in {"postgresql", "mysql", "oracle"}:
        raise LoadValidationError("Motor destino inválido.")
    if any(not isinstance(target.get(k), str) or not target[k].strip() for k in ("host", "database", "user")):
        raise LoadValidationError("Completa host, base de datos y usuario del destino.")
    if not isinstance(target.get("password"), str):
        raise LoadValidationError("Falta la contraseña del destino.")
    port = target.get("port")
    if port is not None and (type(port) is not int or not 1 <= port <= 65535):
        raise LoadValidationError("Puerto destino inválido.")
    if target["db_type"] == "oracle" and not target.get("service_name"):
        raise LoadValidationError("Oracle requiere service_name.")
    return {k: target.get(k) for k in CONNECTION_FIELDS}


def identifier(value):
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value):
        raise LoadValidationError("Usa nombres SQL simples sin esquema, espacios ni comillas.")
    return value


def validate_load_config(config):
    if not isinstance(config, dict):
        raise LoadValidationError("Configuración de carga inválida.")
    name = identifier(config.get("table_name"))
    kind = config.get("table_type", "dimension")
    if kind not in {"dimension", "fact"}:
        raise LoadValidationError("Tipo de tabla inválido.")
    mode = config.get("if_exists") or ("replace" if kind == "dimension" else "append")
    if mode not in {"replace", "append", "fail", "reload", "schema_only"}:
        raise LoadValidationError("Modo de carga inválido.")
    if mode in {"reload", "schema_only"} and not config.get("schema_spec"):
        raise LoadValidationError("Recargar conservando estructura requiere un esquema explícito.")
    if config.get("schema_spec") is not None:
        from etl.schema import LoadSchemaSpec
        try:
            LoadSchemaSpec.model_validate(config["schema_spec"])
        except ValueError:
            raise LoadValidationError("Contrato de esquema inválido.") from None
    keys = config.get("foreign_keys") or {}
    if not isinstance(keys, dict):
        raise LoadValidationError("Mapeo de claves foráneas inválido.")
    mapping = {}
    for key, pair in keys.items():
        if not isinstance(key, str) or not key.strip():
            raise LoadValidationError("La columna FK no puede estar vacía.")
        if not isinstance(pair, (list, tuple)) or len(pair) != 2:
            raise LoadValidationError("Mapeo FK requiere [tabla_dimension, columna_pk].")
        # Source headers may contain spaces; membership is checked against the
        # DataFrame, and this name is never interpolated into a SQL statement.
        mapping[key] = (identifier(pair[0]), identifier(pair[1]))
    return name, kind, mode, mapping if kind == "fact" else {}


def test_connection(target, extractor_factory=DB_Extractor):
    params = connection_parameters(target)
    try:
        with extractor_factory(**params, connect_timeout=positive_setting("ETL_TARGET_CONNECT_TIMEOUT", 10)) as extractor:
            if not extractor.check_connection_status():
                raise LoadValidationError("La prueba de conexión retornó un estado inactivo.")
        return {"status": "success", "message": "Conexión exitosa a la base de datos destino."}
    except LoadValidationError:
        raise
    except Exception:
        raise LoadValidationError("No se pudo conectar al destino; revisa el motor, red y credenciales.") from None


def persist_and_verify(frame, target, config, extractor_factory=DB_Extractor, loader_factory=DB_Loader):
    params = connection_parameters(target)
    name, kind, mode, keys = validate_load_config(config)
    if not len(frame.columns) or not frame.columns.is_unique:
        raise LoadValidationError("El resultado requiere columnas únicas y al menos una columna.")
    if any(key not in frame.columns for key in keys):
        raise LoadValidationError("Una columna FK no existe en el resultado transformado.")
    stage = "conexión"
    try:
        with extractor_factory(**params, connect_timeout=positive_setting("ETL_TARGET_CONNECT_TIMEOUT", 10)) as extractor:
            stage = "persistencia"
            if config.get("schema_spec"):
                from etl.schema import LoadSchemaSpec, ForeignKeySpec, persist_schema
                result = persist_schema(frame, extractor.engine, name, mode,
                                        LoadSchemaSpec.model_validate(config["schema_spec"]), config.get("preview_only", False),
                                        [ForeignKeySpec(columns=[column], target_table=pair[0], target_columns=[pair[1]]) for column, pair in keys.items()])
                return {**result, "table_type": kind}
            if config.get("preview_only"):
                raise LoadValidationError("La vista previa de impacto requiere un esquema explícito.")
            loader = loader_factory(engine=extractor.engine)
            if kind == "dimension":
                loader.load_dimension(dfs=frame, table_names=name, if_exists=mode)
            else:
                loader.load_fact(df=frame, table_name=name, foreign_keys_map=keys, if_exists=mode, validate_foreign_keys=True)
            stage = "verificación posterior a la escritura"
            with extractor.engine.connect() as conn:
                if not inspect(conn).has_table(name):
                    raise LoadValidationError("No se encontró la tabla después de la carga; revisa el destino antes de repetir.")
                table = Table(name, MetaData(), autoload_with=conn)
                total = int(pd.read_sql(select(func.count().label("total")).select_from(table), conn)["total"].iloc[0])
                sample = pd.read_sql(select(table).limit(5), conn)
                # Preserve Python ints/Decimals instead of iterrows' numeric coercion.
                preview = [{str(k): clean_value(v) for k, v in row.items()} for row in sample.to_dict("records")]
            return {"status": "success", "message": f"Carga completada de forma exitosa en la tabla '{name}' ({kind.upper()}).",
                    "table_name": name, "table_type": kind, "total_rows": total, "preview_data": preview}
    except LoadValidationError:
        raise
    except IntegrityError:
        raise LoadValidationError("La base destino rechazó la carga por una restricción de integridad; revisa el destino antes de repetir.") from None
    except Exception:
        raise LoadValidationError(f"Fallo en {stage} de la carga; revisa el destino antes de repetir.") from None
