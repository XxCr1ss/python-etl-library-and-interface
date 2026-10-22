"""Compile validated selections into SQLAlchemy expressions; no user SQL."""
import datetime as dt
import re
import math
from decimal import Decimal, InvalidOperation
from sqlalchemy import and_, case, func, select
from .catalog import family
from .settings import LIMITS, WarehouseError
from .serialization import descriptor
from .models import FieldRef


def invalid(message, code="invalid_query"):
    raise WarehouseError(code, message)


def parse_value(value, kind):
    if isinstance(value, str) and len(value) > LIMITS["text_length"]:
        invalid("Un valor de filtro supera el límite de longitud.")
    try:
        if kind == "string" and isinstance(value, str):
            return value
        if kind == "boolean" and type(value) is bool:
            return value
        if kind == "integer" and not isinstance(value, bool):
            if isinstance(value, str) and re.fullmatch(r"[+-]?\d+", value):
                return int(value)
            if type(value) is int and abs(value) <= 2**53 - 1:
                return value
        if kind in {"decimal", "float"} and not isinstance(value, bool):
            result = Decimal(str(value))
            if result.is_finite():
                if kind == "decimal":
                    return result
                converted = float(result)
                if math.isfinite(converted):
                    return converted
        if kind == "date" and isinstance(value, str):
            return dt.date.fromisoformat(value)
        if kind == "datetime" and isinstance(value, str):
            return dt.datetime.fromisoformat(value)
    except (ValueError, InvalidOperation, OverflowError):
        pass
    invalid("El valor del filtro no corresponde al tipo de columna; usa texto para decimales y enteros grandes.")


def temporal_expression(column, bucket, dialect):
    if family(column.type) not in {"date", "datetime"}:
        invalid("Solo se pueden agrupar fechas por calendario.")
    pattern = {"year": "YYYY", "month": "YYYY-MM", "day": "YYYY-MM-DD"}[bucket]
    if dialect == "postgresql":
        return func.to_char(func.date_trunc(bucket, column), pattern)
    if dialect == "mysql":
        return func.date_format(column, {"year": "%Y", "month": "%Y-%m", "day": "%Y-%m-%d"}[bucket])
    if dialect == "oracle":
        return func.to_char(func.trunc(column, {"year": "YYYY", "month": "MM", "day": "DD"}[bucket]), pattern)
    if dialect == "sqlite":  # Test oracle only, never an exposed connection type.
        return func.strftime({"year": "%Y", "month": "%Y-%m", "day": "%Y-%m-%d"}[bucket], column)
    invalid("El motor no ofrece agrupación temporal compatible.")


def ordered(expression, direction):
    # CASE works on all three engines, including MySQL without NULLS LAST syntax.
    return [case((expression.is_(None), 1), else_=0).asc(), expression.desc() if direction == "DESC" else expression.asc()]


class Compiler:
    def __init__(self, catalog, selection, dialect):
        self.catalog, self.dialect = catalog, dialect
        self.base = catalog.tables.get(selection.base_table_id)
        if self.base is None:
            invalid("La tabla base ya no está disponible; actualiza el catálogo.", "catalog_changed")
        self.base_info = catalog.info[selection.base_table_id]
        self.relations = {"base": self.base}
        self.source = self.base
        for index, join in enumerate(selection.joins):
            target = catalog.tables.get(join.target_table_id)
            if target is None or join.target_table_id == selection.base_table_id:
                invalid("No se admite esta tabla o autounión.", "unsupported_relationship")
            if join.via.kind == "foreign_key":
                rel = next((r for r in catalog.relationships if r["id"] == join.via.relationship_id and
                            r["source_table_id"] == selection.base_table_id and r["target_table_id"] == join.target_table_id and r["selectable"]), None)
                if rel is None:
                    invalid("La relación no tiene una clave única verificable.", "unsupported_relationship")
                pairs = [(p["source_column"], p["target_column"]) for p in rel["column_pairs"]]
            else:
                pairs = [(p.base_column, p.target_column) for p in join.via.pairs]
            if len({a for a, _ in pairs}) != len(pairs) or len({b for _, b in pairs}) != len(pairs):
                invalid("La clave de la relación tiene columnas repetidas.", "unsupported_relationship")
            if not any(set(key) == {b for _, b in pairs} for key in catalog.info[join.target_table_id]["unique_keys"]):
                invalid("El destino de la relación debe tener una PK/UNIQUE completa.", "unsupported_relationship")
            alias = target.alias("dimension_" + str(index))
            for a, b in pairs:
                if a not in self.base.c or b not in alias.c or family(self.base.c[a].type) != family(alias.c[b].type) or family(alias.c[b].type) == "unsupported":
                    invalid("Las columnas de la relación no existen o no tienen tipos compatibles.", "unsupported_relationship")
                if getattr(self.base.c[a].type, "collation", None) != getattr(alias.c[b].type, "collation", None):
                    invalid("La relación tiene collations incompatibles.", "unsupported_relationship")
            self.source = self.source.join(alias, and_(*[self.base.c[a] == alias.c[b] for a, b in pairs]), isouter=join.type == "LEFT")
            self.relations[join.id] = alias
        self.conditions = [self.filter(f) for f in selection.filters]

    def field(self, ref):
        table = self.relations.get(ref.relation)
        if table is None or ref.column not in table.c:
            invalid("Una columna o relación ya no está disponible; actualiza el catálogo.", "catalog_changed")
        column = table.c[ref.column]
        if family(column.type) == "unsupported":
            invalid("El tipo de esta columna no está soportado en analítica.")
        return column

    def filter(self, f):
        column = self.field(f.field)
        if f.op == "IS_NULL":
            return column.is_(None)
        if f.op == "IS_NOT_NULL":
            return column.is_not(None)
        kind = family(column.type)
        if f.op == "IN":
            return column.in_([parse_value(v, kind) for v in f.values])
        if f.op == "BETWEEN":
            start, end = [parse_value(v, kind) for v in f.values]
            if start > end:
                invalid("El inicio del rango debe ser menor o igual al final.")
            return column.between(start, end)
        value = parse_value(f.value, kind)
        if f.op == "CONTAINS":
            if kind != "string":
                invalid("CONTAINS solo admite texto.")
            return column.contains(value, autoescape=True)
        if kind == "boolean" and f.op not in {"EQ", "NE"}:
            invalid("Los booleanos solo admiten igualdad o desigualdad.")
        return {"EQ": column.__eq__, "NE": column.__ne__, "GT": column.__gt__,
                "GTE": column.__ge__, "LT": column.__lt__, "LTE": column.__le__}[f.op](value)

    def statement(self, expressions):
        return select(*expressions).select_from(self.source).where(*self.conditions)

    def query(self, query):
        dims, metrics, columns = [], [], []
        for dim in query.dimensions:
            col = self.field(dim.field)
            expression = temporal_expression(col, dim.bucket, self.dialect) if dim.bucket else col
            dims.append(expression)
            columns.append(descriptor(dim.id, dim.label or dim.field.column, "string" if dim.bucket else family(col.type)))
        for metric in query.metrics:
            if metric.aggregation == "COUNT_ROWS":
                expression, kind = func.count(), "integer"
            else:
                col = self.field(FieldRef(relation="base", column=metric.column))
                kind = family(col.type)
                if metric.aggregation in {"SUM", "AVG"} and kind not in {"integer", "decimal", "float"}:
                    invalid("SUM/AVG requieren una columna numérica.")
                if metric.aggregation in {"MIN", "MAX"} and kind not in {"integer", "decimal", "float", "date", "datetime"}:
                    invalid("MIN/MAX requieren un número o una fecha.")
                if metric.aggregation == "COUNT_DISTINCT":
                    expression, kind = func.count(col.distinct()), "integer"
                else:
                    expression = {"SUM": func.sum, "AVG": func.avg, "MIN": func.min, "MAX": func.max, "COUNT": func.count}[metric.aggregation](col)
                    if metric.aggregation == "COUNT":
                        kind = "integer"
                    elif metric.aggregation == "AVG" and kind != "float":
                        kind = "decimal"
            metrics.append(expression)
            columns.append(descriptor(metric.id, metric.label or (metric.aggregation + (" · " + metric.column if hasattr(metric, "column") else "")), kind, "metric"))
        expressions = dims + metrics
        stmt = self.statement([e.label("value_" + str(i)) for i, e in enumerate(expressions)])
        if dims:
            stmt = stmt.group_by(*dims)
            by_id = {c["id"]: e for c, e in zip(columns, expressions)}
            ordering = [part for o in query.order_by for part in ordered(by_id[o.field_id], o.direction)]
            ordering += [part for d in dims for part in ordered(d, "ASC")]
            stmt = stmt.order_by(*ordering).limit(query.limit + 1)
        summary = self.statement([e.label("metric_" + str(i)) for i, e in enumerate(metrics)] + [func.count().label("filtered_rows")])
        return stmt, summary, columns

    def drill(self, items):
        for item in items:
            col = self.field(item.field)
            if item.value is None:
                self.conditions.append(col.is_(None))
            elif item.bucket:
                temporal_expression(col, item.bucket, self.dialect)  # Validate type.
                pattern = {"year": r"\d{4}", "month": r"\d{4}-\d{2}", "day": r"\d{4}-\d{2}-\d{2}"}[item.bucket]
                if not isinstance(item.value, str) or not re.fullmatch(pattern, item.value):
                    invalid("La categoría temporal seleccionada es inválida.")
                try:
                    value = item.value + {"year": "-01-01", "month": "-01", "day": ""}[item.bucket]
                    start = dt.date.fromisoformat(value)
                    end = (start + dt.timedelta(days=1)) if item.bucket == "day" else dt.date(start.year + (start.month == 12), start.month % 12 + 1, 1) if item.bucket == "month" else dt.date(start.year + 1, 1, 1)
                    if family(col.type) == "datetime":
                        start, end = dt.datetime.combine(start, dt.time()), dt.datetime.combine(end, dt.time())
                    self.conditions.extend([col >= start, col < end])
                except ValueError:
                    invalid("La categoría temporal está fuera del rango soportado.")
            else:
                self.conditions.append(col == parse_value(item.value, family(col.type)))

    def detail(self, spec, limit, offset=0, require_key=False):
        self.drill(spec.drilldown)
        keys = [key for key in self.base_info["unique_keys"] if all(self.base.c[c].nullable is False or c in self.base_info["primary_key"] for c in key)]
        stable = bool(keys)
        if not stable and (offset or require_key):
            invalid("Esta tabla no tiene una clave estable; usa Exportar muestra o aplica otra tabla.")
        expressions = [self.field(c.field) for c in spec.columns]
        columns = [descriptor(c.id, c.field.column, family(e.type)) for c, e in zip(spec.columns, expressions)]
        by_id = {c.id: e for c, e in zip(spec.columns, expressions)}
        ordering = [part for o in spec.order_by for part in ordered(by_id[o.field_id], o.direction)]
        if keys:
            ordering += [self.base.c[c].asc() for c in keys[0]]
        stmt = self.statement([e.label("value_" + str(i)) for i, e in enumerate(expressions)]).order_by(*ordering).limit(limit + 1).offset(offset)
        return stmt, self.statement([func.count()]), columns, stable
