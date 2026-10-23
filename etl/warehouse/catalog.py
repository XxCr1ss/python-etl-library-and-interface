from sqlalchemy import Column, MetaData, Table, inspect, text
from sqlalchemy import types as t
from etl.extractors.schema_graph import identity
from .settings import LIMITS, WarehouseError, capabilities


def family(sql_type):
    if isinstance(sql_type, t.Boolean):
        return "boolean"
    if isinstance(sql_type, t.Integer):
        return "integer"
    if isinstance(sql_type, t.Float):
        return "float"
    if isinstance(sql_type, t.Numeric):
        return "decimal"
    if isinstance(sql_type, t.DateTime):
        return "datetime"
    if isinstance(sql_type, t.Date):
        return "date"
    if isinstance(sql_type, t.String) and not isinstance(sql_type, (t.LargeBinary,)):
        # Oracle LOBs cannot be grouped/ordered consistently across the supported engines.
        return "unsupported" if sql_type.__class__.__name__ in {"CLOB", "NCLOB", "LONG"} else "string"
    return "unsupported"


def operations(kind):
    result = ["COUNT", "COUNT_DISTINCT"] if kind != "unsupported" else []
    if kind in {"integer", "decimal", "float"}:
        result += ["SUM", "AVG", "MIN", "MAX"]
    if kind in {"date", "datetime"}:
        result += ["MIN", "MAX"]
    return result


class Catalog:
    def __init__(self, connection, limits=None):
        self.dialect = connection.dialect.name
        self.limits = limits or LIMITS
        inspector = inspect(connection)
        self.schema = inspector.default_schema_name or ""
        self.tables, self.info, self.relationships, self.warnings = {}, {}, [], []
        names = sorted(inspector.get_table_names(schema=self.schema or None))
        if len(names) > self.limits["tables"]:
            raise WarehouseError("result_limit_exceeded", "El esquema supera el límite de tablas del catálogo.", 413)
        total_columns = 0
        metadata = MetaData()
        for name in names:
            table_id = identity(self.schema, name)
            columns = inspector.get_columns(name, schema=self.schema or None)
            total_columns += len(columns)
            if total_columns > self.limits["catalog_columns"]:
                raise WarehouseError("result_limit_exceeded", "El esquema supera el límite de columnas.", 413)
            def constraint(method, default):
                try:
                    return method(name, schema=self.schema or None)
                except NotImplementedError:
                    self.warnings.append({"code": "constraint_unavailable", "table_id": table_id,
                                          "message": "No se pudieron verificar todas las restricciones."})
                    return default
            pk_constraint = constraint(inspector.get_pk_constraint, {})
            pk = pk_constraint.get("constrained_columns") or []
            uniques = constraint(inspector.get_unique_constraints, [])
            foreign_keys = constraint(inspector.get_foreign_keys, [])
            if connection.dialect.name == "oracle":
                # Disabled/RELY/unvalidated Oracle constraints do not establish uniqueness.
                enabled = set(connection.execute(text("SELECT constraint_name FROM all_constraints WHERE owner = :owner AND table_name = :table_name AND constraint_type IN ('P', 'U') AND status = 'ENABLED' AND validated = 'VALIDATED'"),
                                                 {"owner": connection.dialect.denormalize_name(self.schema), "table_name": connection.dialect.denormalize_name(name)}).scalars())
                if connection.dialect.denormalize_name(pk_constraint.get("name")) not in enabled:
                    pk = []
                uniques = [u for u in uniques if connection.dialect.denormalize_name(u.get("name")) in enabled]
            keys = ([pk] if pk else []) + [u["column_names"] for u in uniques if u.get("column_names") and not any("where" in k or "length" in k for k in (u.get("dialect_options") or {}))]
            # Only complete, reflected constraints are accepted. Unique indexes with predicates/expressions are excluded.
            fk_names = {c for fk in foreign_keys for c in fk.get("constrained_columns", [])}
            self.tables[table_id] = Table(name, metadata, *[Column(c["name"], c["type"], nullable=c.get("nullable", True)) for c in columns], schema=self.schema or None)
            public_columns = [{"name": c["name"], "data_type": str(c["type"]), "logical_type": family(c["type"]),
                               "nullable": c.get("nullable"), "is_pk": c["name"] in pk,
                               "is_fk": c["name"] in fk_names, "operations": operations(family(c["type"]))} for c in columns]
            self.info[table_id] = {"table_id": table_id, "schema": self.schema, "table_name": name,
                                   "selectable": True, "role_hint": "table", "columns": public_columns,
                                   "primary_key": pk, "unique_keys": keys}
            for index, fk in enumerate(sorted(foreign_keys, key=lambda f: identity(f.get("name"), f.get("referred_schema"), f.get("referred_table"), f.get("constrained_columns"), f.get("referred_columns")))):
                target_schema = fk.get("referred_schema") or self.schema
                target_id = identity(target_schema, fk.get("referred_table"))
                left, right = fk.get("constrained_columns") or [], fk.get("referred_columns") or []
                if not left or len(left) != len(right):
                    self.warnings.append({"code": "invalid_reference", "message": "Una referencia incompleta fue omitida."})
                    continue
                self.relationships.append({"id": identity(table_id, fk.get("name"), index), "source_table_id": table_id,
                                           "target_table_id": target_id, "column_pairs": [{"source_column": a, "target_column": b} for a, b in zip(left, right)],
                                           "evidence": "foreign_key", "external": target_schema != self.schema})
        for rel in self.relationships:
            target = self.info.get(rel["target_table_id"])
            pairs = rel["column_pairs"]
            rel["selectable"] = bool(target and not rel["external"] and any(set(k) == {p["target_column"] for p in pairs} for k in target["unique_keys"]))
        for entry in self.info.values():
            count = sum(r["source_table_id"] == entry["table_id"] for r in self.relationships)
            entry["role_hint"] = "fact" if count >= 2 else "dimension" if entry["primary_key"] and not count else "table"

    def public(self):
        return {"status": "success", "schema": self.schema, "tables": list(self.info.values()),
                "relationships": self.relationships, "warnings": self.warnings,
                "capabilities": {"protocol_version": 1, "supported_operations": [a for a in capabilities()["actions"] if self.dialect in {"postgresql", "sqlite"} or a not in {"warehouse_analyze", "warehouse_report"}], "effective_limits": self.limits}}
