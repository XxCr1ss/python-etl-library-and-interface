"""Versioned, serializable load contracts. No implicit schema changes or lossy casts."""
import datetime as dt
import hashlib
from uuid import uuid4
from decimal import Decimal, InvalidOperation
from typing import Annotated, Literal

import pandas as pd
from pydantic import BaseModel, ConfigDict, Field, model_validator
import sqlalchemy as sa

from .load_transport import LoadReconciliationRequired, LoadValidationError
from .schema_dialects import (IMPLICIT_DDL, STRUCTURED_ENGINES, column_matches, ensure_transactional_table, lock_existing_table,
                              physical_type, publication_available, publication_names, publish, storage_values,
                              verify_column_size, verify_replace_dependencies, write_session)

Identifier = Annotated[str, Field(pattern=r"^[A-Za-z_][A-Za-z0-9_]*$", max_length=63)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class ColumnSpec(Contract):
    name: Identifier
    type: Literal["integer", "decimal", "float", "boolean", "string", "date", "datetime"]
    nullable: bool = True
    precision: int = Field(default=30, ge=1, le=38)
    scale: int = Field(default=8, ge=0, le=38)
    timezone: bool = False
    unit: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def valid_scale(self):
        if self.scale > self.precision:
            raise ValueError("La escala no puede superar la precisión.")
        if self.timezone and self.type != "datetime":
            raise ValueError("La zona horaria solo se admite en columnas de fecha y hora.")
        return self

    def sql_type(self):
        return {"integer": sa.BigInteger, "decimal": lambda: sa.Numeric(self.precision, self.scale),
                "float": sa.Float, "boolean": sa.Boolean, "string": sa.Text,
                "date": sa.Date, "datetime": lambda: sa.DateTime(timezone=self.timezone)}[self.type]()


class ForeignKeySpec(Contract):
    columns: list[Identifier] = Field(min_length=1, max_length=16)
    target_table: Identifier
    target_columns: list[Identifier] = Field(min_length=1, max_length=16)

    @model_validator(mode="after")
    def lengths(self):
        if len(self.columns) != len(self.target_columns) or len(set(self.columns)) != len(self.columns) or len(set(self.target_columns)) != len(self.target_columns):
            raise ValueError("La referencia debe contener pares únicos completos.")
        return self


class CheckSpec(Contract):
    column: Identifier
    kind: Literal["not_null", "unique", "range", "sum"]
    minimum: str | None = Field(default=None, max_length=100)
    maximum: str | None = Field(default=None, max_length=100)
    severity: Literal["error", "warning"] = "error"


class CheckOutcome(Contract):
    column: Identifier
    kind: Literal["not_null", "unique", "range", "sum"]
    severity: Literal["error", "warning"]
    failures: int = Field(ge=0)


class LoadSchemaSpec(Contract):
    version: Literal[1] = 1
    columns: list[ColumnSpec] = Field(min_length=1, max_length=500)
    primary_key: list[Identifier] = Field(default_factory=list, max_length=16)
    unique_keys: list[list[Identifier]] = Field(default_factory=list, max_length=20)
    foreign_keys: list[ForeignKeySpec] = Field(default_factory=list, max_length=20)
    indexes: list[list[Identifier]] = Field(default_factory=list, max_length=20)
    checks: list[CheckSpec] = Field(default_factory=list, max_length=50)
    grain: str = Field(min_length=1, max_length=500)
    allow_add_constraints: bool = False

    @model_validator(mode="after")
    def references(self):
        names = [c.name for c in self.columns]
        groups = [self.primary_key, *self.unique_keys, *self.indexes, *[f.columns for f in self.foreign_keys]]
        if len(set(names)) != len(names) or any(not g or len(set(g)) != len(g) or not set(g) <= set(names) for g in groups if g is not self.primary_key or g):
            raise ValueError("Columnas o claves inválidas/repetidas.")
        if any(c.column not in names for c in self.checks):
            raise ValueError("Una comprobación referencia una columna inexistente.")
        if len({tuple(sorted(key)) for key in self.unique_keys}) != len(self.unique_keys) or len({tuple(key) for key in self.indexes}) != len(self.indexes):
            raise ValueError("Restricciones o índices repetidos.")
        return self


def missing(value):
    return value is None or value is pd.NA or value is pd.NaT or bool(pd.isna(value))


def convert_scalar(value, spec):
    """Explicit conversions; values that would round, truncate or lose zones fail."""
    if missing(value):
        if not spec.nullable:
            raise ValueError("nulo")
        return None
    kind = spec.type
    if kind == "string":
        if not isinstance(value, str):
            raise ValueError("texto requerido")
        return value
    if kind == "boolean":
        if isinstance(value, str):
            if value.lower() not in {"true", "false", "1", "0"}:
                raise ValueError("booleano inválido")
            return value.lower() in {"true", "1"}
        if value not in (True, False, 0, 1):
            raise ValueError("booleano inválido")
        return bool(value)
    if kind in {"integer", "decimal", "float"}:
        if isinstance(value, bool):
            raise ValueError("número requerido")
        number = Decimal(str(value))
        if not number.is_finite():
            raise ValueError("número no finito")
        if kind == "integer":
            if number != number.to_integral_value() or not -(2**63) <= number < 2**63:
                raise ValueError("entero fuera de rango")
            return int(number)
        if kind == "float":
            import math
            result = float(number)
            if not math.isfinite(result):
                raise ValueError("float fuera de rango")
            return result
        sign, digits, exponent = number.as_tuple()
        fractional = max(0, -exponent)
        integral = max(0, len(digits) + exponent)
        if fractional > spec.scale or integral > spec.precision - spec.scale:
            raise ValueError("decimal pierde precisión")
        return number
    value = pd.Timestamp(value)
    if kind == "date":
        if value.tzinfo or value.time() != dt.time():
            raise ValueError("fecha con hora/zona")
        return value.date()
    if (value.tzinfo is not None) != spec.timezone or value.nanosecond:
        raise ValueError("zona/precisión temporal incompatible")
    return value.to_pydatetime()


def coerce_frame(frame, spec):
    from .load_transport import MAX_LOAD_ROWS
    if len(frame) > MAX_LOAD_ROWS:
        raise LoadValidationError("La carga estructurada supera el presupuesto de filas.")
    if set(frame.columns) != {c.name for c in spec.columns}:
        raise LoadValidationError("El esquema explícito debe describir todas y solo las columnas del resultado.")
    output = {}
    try:
        for column in spec.columns:
            dtype = pd.DatetimeTZDtype(unit="us", tz="UTC") if column.type == "datetime" and column.timezone else "datetime64[us]" if column.type == "datetime" else "object"
            output[column.name] = pd.Series([convert_scalar(v, column) for v in frame[column.name]], dtype=dtype)
        result = pd.DataFrame(output)
        for key in [spec.primary_key, *spec.unique_keys]:
            if key and (result[key].duplicated().any() or (key == spec.primary_key and result[key].isna().any().any())):
                raise LoadValidationError("La carga contiene claves duplicadas o nulos en la clave primaria.")
        return result
    except (ValueError, TypeError, InvalidOperation, OverflowError):
        raise LoadValidationError("Un valor no corresponde al contrato de tipos; no se escribió ningún dato.") from None


def check_frame(frame, checks):
    results = []
    for check in checks:
        values = frame[check.column].dropna()
        try:
            if check.kind == "not_null":
                failures = int(frame[check.column].isna().sum())
            elif check.kind == "unique":
                failures = int(values.duplicated().sum())
            else:
                numbers = [Decimal(str(v)) for v in values]
                if check.kind == "sum":
                    from decimal import localcontext
                    with localcontext() as context:
                        context.prec = 100
                        numbers = [sum(numbers, Decimal(0))]
                failures = sum((check.minimum is not None and v < Decimal(check.minimum)) or
                               (check.maximum is not None and v > Decimal(check.maximum)) for v in numbers)
        except (ValueError, InvalidOperation):
            raise LoadValidationError("Una comprobación requiere valores/límites numéricos válidos.") from None
        results.append({"column": check.column, "kind": check.kind, "severity": check.severity, "failures": failures})
    if any(r["failures"] and r["severity"] == "error" for r in results):
        raise LoadValidationError("La carga no cumple las comprobaciones configuradas; no se escribió ningún dato.")
    return results


def persist_schema(frame, engine, name, mode, spec, preview_only=False, validation_references=()):
    """Plan and persist the same schema contract under each engine's DDL semantics."""
    dialect = engine.dialect.name
    if dialect not in (*STRUCTURED_ENGINES, "sqlite"):
        raise LoadValidationError("El motor no admite carga con esquema explícito.")
    from pydantic import TypeAdapter
    TypeAdapter(Identifier).validate_python(name)
    if mode not in {"fail", "append", "reload", "replace", "schema_only"}:
        raise LoadValidationError("Modo de carga estructurada inválido.")
    frame = coerce_frame(frame, spec)
    checks = check_frame(frame, spec.checks)
    keyed = {column for key in (spec.primary_key, *spec.unique_keys, *spec.indexes,
                               *(fk.columns for fk in spec.foreign_keys)) for column in key}
    frame = storage_values(frame, spec, dialect, keyed)
    with write_session(engine, name, preview_only) as conn:
        if dialect == "postgresql":
            conn.exec_driver_sql("SET LOCAL lock_timeout = '5s'")
            conn.exec_driver_sql("SET LOCAL statement_timeout = '90s'")
        elif dialect in IMPLICIT_DDL:
            publication_available(conn, name)
        inspector = sa.inspect(conn)
        exists = inspector.has_table(name)
        old = sa.Table(name, sa.MetaData(), autoload_with=conn) if exists else None
        if old is not None:
            ensure_transactional_table(conn, old)
            if mode == "replace" and dialect in IMPLICIT_DDL:
                verify_replace_dependencies(conn, old)
            elif not preview_only and mode in {"append", "reload"}:
                lock_existing_table(conn, old)
        before = int(conn.execute(sa.select(sa.func.count()).select_from(old)).scalar_one()) if exists else 0
        actions = []
        if exists and mode == "fail":
            raise LoadValidationError("La tabla ya existe; el modo fail impide esta carga.")
        metadata = sa.MetaData()
        for reference in [*spec.foreign_keys, *validation_references]:
            sa.Table(reference.target_table, metadata, autoload_with=conn)
            target = metadata.tables[reference.target_table]
            keys = ([inspector.get_pk_constraint(target.name).get("constrained_columns") or []] +
                    [u["column_names"] for u in inspector.get_unique_constraints(target.name)])
            if not any(list(k) == reference.target_columns if dialect in IMPLICIT_DDL else set(k) == set(reference.target_columns) for k in keys):
                raise LoadValidationError("La FK debe apuntar a una PK/UNIQUE completa.")
            from .warehouse.catalog import family
            requested_types = {c.name: c for c in spec.columns}
            if any(c not in requested_types for c in reference.columns) or any(c not in target.c for c in reference.target_columns) or any(
                (not column_matches(target.c[b].type, requested_types[a], dialect) if dialect in IMPLICIT_DDL
                 else family(requested_types[a].sql_type()) != family(target.c[b].type))
                for a, b in zip(reference.columns, reference.target_columns)
            ):
                raise LoadValidationError("La FK tiene columnas inexistentes o tipos incompatibles.")
            values = list({row for row in frame[reference.columns].itertuples(index=False, name=None) if not any(missing(v) for v in row)})
            target_keys = [target.c[c] for c in reference.target_columns]
            for start in range(0, len(values), 400):
                batch = values[start:start + 400]
                actual = set(conn.execute(sa.select(*target_keys).where(sa.tuple_(*target_keys).in_(batch))).tuples())
                if set(batch) - actual:
                    raise LoadValidationError("Existen referencias sin correspondencia; no se escribió ningún dato.")
        if name in metadata.tables:
            raise LoadValidationError("Las referencias a la misma tabla no se admiten en esta versión.")
        stage = dialect in IMPLICIT_DDL and (not exists or mode == "replace")
        physical_name = publication_names(name)[0] if stage else name
        options = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_0900_bin"} if dialect == "mysql" else {}
        table = sa.Table(physical_name, metadata, *[sa.Column(c.name, physical_type(c, dialect, c.name in keyed),
            nullable=c.nullable and c.name not in spec.primary_key,
            autoincrement=False if dialect in IMPLICIT_DDL else "auto") for c in spec.columns], **options)
        if spec.primary_key:
            table.append_constraint(sa.PrimaryKeyConstraint(*spec.primary_key))
        for key in spec.unique_keys:
            table.append_constraint(sa.UniqueConstraint(*key))
        for fk in spec.foreign_keys:
            table.append_constraint(sa.ForeignKeyConstraint(fk.columns, [fk.target_table + "." + c for c in fk.target_columns]))
        if dialect in IMPLICIT_DDL:
            for c in spec.columns:
                if c.type == "boolean":
                    table.append_constraint(sa.CheckConstraint(table.c[c.name].in_([0, 1])))
        index_name = physical_name + "_" + uuid4().hex[:8] if dialect == "oracle" and stage else physical_name
        for key in spec.indexes:
            suffix = hashlib.sha256((index_name + "\0" + "\0".join(key)).encode()).hexdigest()[:16]
            sa.Index(f"ix_{name[:10 if dialect == 'oracle' else 36]}_{suffix}", *[table.c[c] for c in key])
        changes = []
        if exists and mode in {"append", "reload", "schema_only"}:
            if set(old.c.keys()) != set(table.c.keys()):
                raise LoadValidationError("La estructura existente no coincide con el contrato.")
            if dialect in IMPLICIT_DDL and mode != "schema_only":
                verify_column_size(old, spec, frame)
            for column in spec.columns:
                actual_type = old.c[column.name].type
                if not column_matches(actual_type, column, dialect):
                    raise LoadValidationError("El tipo existente no coincide con el contrato.")
                if column.type == "decimal" and (actual_type.precision, actual_type.scale) != (column.precision, column.scale):
                    raise LoadValidationError("La precisión/escala del destino no coincide con el contrato.")
            from .schema_evolution import additions
            changes = additions(conn, old, table, spec, mode)
            actions = ["preserve_schema"] + list(dict.fromkeys(action for action, _ in changes)) + ([] if mode == "schema_only" else ["delete_rows" if mode == "reload" else "append_rows"])
            existing_indexes = [index.get("column_names") for index in inspector.get_indexes(name)]
            pending_indexes = [index for index in table.indexes if list(index.columns.keys()) not in existing_indexes]
            if pending_indexes:
                actions.append("create_indexes")
            if dialect in IMPLICIT_DDL and mode == "reload" and (changes or pending_indexes):
                raise LoadValidationError("Aplica los cambios de estructura con Solo esquema antes de recargar las filas.")
        else:
            pending_indexes = []
            actions = (["drop_table"] if exists and not stage else []) + ["create_table"] + ([] if mode == "schema_only" else ["insert_rows"])
            if stage:
                actions += ["publish_table"] + (["replace_table"] if exists else [])
        report = {"status": "success", "message": "Plan de carga comprobado." if preview_only else "Estructura preparada; no se cargaron filas." if mode == "schema_only" else "Carga validada y confirmada.",
                  "table_name": name, "total_rows": before, "previous_rows": before, "submitted_rows": 0 if mode == "schema_only" else len(frame),
                  "preview_data": [], "schema_actions": actions, "checks": checks, "preview_only": preview_only}
        if preview_only:
            return report
        if changes and not spec.allow_add_constraints:
            raise LoadValidationError("Revisa el impacto y habilita agregar restricciones para modificar la estructura existente.")
        expected = before if mode == "schema_only" else before + len(frame) if exists and mode == "append" else len(frame)

        def insert_and_verify(current):
            if mode != "schema_only" and not frame.empty:
                rows = frame.astype(object).where(frame.notna(), None).to_dict("records")
                for start in range(0, len(rows), 1000):
                    conn.execute(current.insert(), rows[start:start + 1000])
            report["total_rows"] = int(conn.execute(sa.select(sa.func.count()).select_from(current)).scalar_one())
            if report["total_rows"] != expected:
                raise LoadValidationError("El conteo posterior no coincide; revisa el estado antes de repetir.")
            from .warehouse.serialization import scalar
            sample_columns = [sa.func.sys_extract_utc(c).label(c.name)
                              if dialect == "oracle" and getattr(c.type, "timezone", False) else c for c in current.c]
            for row in conn.execute(sa.select(*sample_columns).limit(5)).mappings():
                sample = {}
                for column in spec.columns:
                    value = row[column.name]
                    if dialect in IMPLICIT_DDL and column.timezone and value is not None:
                        value = value.replace(tzinfo=dt.timezone.utc)
                    if dialect in IMPLICIT_DDL and column.type in {"boolean", "date", "integer"}:
                        value = convert_scalar(value, column)
                    sample[column.name] = scalar(value, column.type)
                report["preview_data"].append(sample)
            return report

        if stage:
            return publish(conn, table, name, old, insert_and_verify)
        if exists and mode == "replace":
            old.drop(conn)  # Never CASCADE: dependencies reject the transaction.
        if not exists or mode == "replace":
            table.create(conn)
        elif mode == "reload":
            conn.execute(old.delete())
        completed = []
        try:
            if changes:
                from .schema_evolution import apply_additions
                apply_additions(conn, table, changes, completed)
            for index in pending_indexes:
                index.create(conn)
                completed.append("create_indexes")
            current = sa.Table(name, sa.MetaData(), autoload_with=conn)
            result = insert_and_verify(current)
            conn.commit()
            return result
        except Exception:
            if dialect in IMPLICIT_DDL and (completed or changes or pending_indexes):
                detail = ", ".join(dict.fromkeys(completed)) or "sin confirmar"
                raise LoadReconciliationRequired(f"Revisa la estructura antes de repetir. Cambios confirmados por la aplicación: {detail}.") from None
            raise
