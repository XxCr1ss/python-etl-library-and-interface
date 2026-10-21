"""JSON-only relational metadata, shared by the HTTP service and local agent."""
import json
from sqlalchemy import inspect


def identity(*parts):
    return json.dumps(parts, ensure_ascii=True, separators=(",", ":"))


def schema_graph(engine):
    nodes, edges, warnings = {}, [], []
    with engine.connect() as connection:
        inspector = inspect(connection)
        schema = inspector.default_schema_name or ""
        names = sorted(inspector.get_table_names(schema=schema or None))
        foreign_keys = {}
        for name in names:
            table_id = identity(schema, name)
            node = {"id": table_id, "schema": schema, "table_name": name,
                    "selectable": True, "columns": []}
            nodes[table_id] = node
            try:
                columns = inspector.get_columns(name, schema=schema or None)
            except Exception:
                connection.rollback()
                node["selectable"] = False
                warnings.append({"code": "columns_unavailable", "table_id": table_id,
                                 "message": "No se pudieron consultar las columnas de esta tabla."})
                continue
            def reflect(method, fallback, code):
                try:
                    return method(name, schema=schema or None)
                except Exception:
                    connection.rollback()
                    warnings.append({"code": code, "table_id": table_id,
                                     "message": "No se pudieron consultar todas las restricciones de esta tabla."})
                    return fallback
            pk = reflect(inspector.get_pk_constraint, None, "pk_unavailable")
            fks = reflect(inspector.get_foreign_keys, None, "fk_unavailable")
            foreign_keys[name] = fks or []
            pk_names = set((pk or {}).get("constrained_columns") or [])
            fk_names = {c for fk in (fks or []) for c in fk.get("constrained_columns", [])}
            node["columns"] = [
                {"name": c["name"], "data_type": str(c["type"]), "nullable": c.get("nullable"),
                 "is_pk": c["name"] in pk_names if pk is not None else None,
                 "is_fk": c["name"] in fk_names if fks is not None else None}
                for c in columns
            ]
        for name in names:
            fks = sorted(foreign_keys.get(name, []), key=lambda f: identity(
                f.get("name"), f.get("referred_schema"), f.get("referred_table"),
                f.get("constrained_columns"), f.get("referred_columns")))
            for index, fk in enumerate(fks):
                source_id = identity(schema, name)
                target_schema = fk.get("referred_schema") or schema
                target_name = fk.get("referred_table")
                source_columns = fk.get("constrained_columns") or []
                target_columns = fk.get("referred_columns") or []
                known = {c["name"] for c in nodes[source_id]["columns"]}
                if not target_name or not source_columns or len(source_columns) != len(target_columns) or not set(source_columns) <= known:
                    warnings.append({"code": "invalid_reference", "table_id": source_id,
                                     "message": "Una referencia incompleta no puede representarse."})
                    continue
                target_id = identity(target_schema, target_name)
                external = target_schema != schema or target_id not in nodes
                if target_id not in nodes:
                    nodes[target_id] = {"id": target_id, "schema": target_schema,
                                        "table_name": target_name, "selectable": False, "columns": []}
                target = nodes[target_id]
                for column in target_columns:
                    if column not in {c["name"] for c in target["columns"]}:
                        target["columns"].append({"name": column, "data_type": None,
                                                  "nullable": None, "is_pk": None, "is_fk": None})
                        target["selectable"] = False
                edges.append({"id": identity(source_id, fk.get("name"), index),
                              "constraint_name": fk.get("name"), "source_table_id": source_id,
                              "target_table_id": target_id, "target_schema": target_schema,
                              "target_table": target_name, "external": external,
                              "column_pairs": [{"source_column": a, "target_column": b}
                                               for a, b in zip(source_columns, target_columns)]})
    return {"status": "success", "schema": schema, "nodes": list(nodes.values()),
            "edges": edges, "warnings": warnings}


def preview_result(extractor, table_name, limit=5):
    if type(limit) is not int or not 1 <= limit <= 10:
        raise ValueError("El límite debe ser un entero entre 1 y 10.")
    from etl.json_utils import clean_value
    df = extractor.sample_data(table_name, limit)
    rows = [{str(k): clean_value(v) for k, v in row.items()} for row in df.head(limit).to_dict("records")]
    return {"status": "success", "table_name": table_name, "preview_data": rows,
            "total_rows": len(rows), "sample_rows": len(rows), "limit": limit,
            "columns": [str(c) for c in df.columns],
            "dtypes": {str(c): str(t) for c, t in df.dtypes.items()}}
