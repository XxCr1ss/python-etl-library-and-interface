"""Bounded server-side analytical patterns shared by Python, HTTP and the agent."""
import datetime as dt
from uuid import uuid4
from sqlalchemy import select, func, case, literal, and_, or_, cast, Numeric, union, String, values, column

from .compiler import Compiler, invalid, ordered, temporal_expression, parse_value
from .catalog import family
from .serialization import descriptor, encode_rows, count_value
from .formulas import compile_formulas
from .settings import positive


def matching(left, right):
    return and_(*[a.is_not_distinct_from(b) for a, b in zip(left, right)]) if left else literal(True)


def value_expression(compiler, value):
    field = compiler.field(value.field)
    kind = family(field.type)
    if value.multiply_by:
        other = compiler.field(value.multiply_by)
        if kind not in {"integer", "decimal", "float"} or family(other.type) not in {"integer", "decimal", "float"}:
            invalid("El producto de línea requiere dos columnas numéricas.")
        field, kind = cast(field, Numeric()) * other, "decimal"
    if value.duration_end:
        other = compiler.field(value.duration_end)
        if kind not in {"date", "datetime"} or family(other.type) != kind:
            invalid("La duración requiere dos fechas de tipos compatibles.")
        if compiler.dialect == "postgresql":
            seconds = (other - field) * 86400 if kind == "date" else func.extract("epoch", other - field)
        elif compiler.dialect == "sqlite":
            seconds = (func.julianday(other) - func.julianday(field)) * 86400
        else:
            invalid("Las duraciones avanzadas requieren PostgreSQL en esta versión.")
        field = seconds / {"seconds": 1, "minutes": 60, "hours": 3600, "days": 86400}[value.duration_unit]
        if value.exclude_negative:
            field = case((field >= 0, field), else_=None)
        kind = "decimal"
    return field, kind


def dimension_expression(compiler, dimension):
    column = compiler.field(dimension.field)
    if dimension.categories:
        return case(*[(and_(*[compiler.filter(f) for f in rule.filters]), rule.label) for rule in dimension.categories], else_=dimension.unknown_label), "string"
    if dimension.age_at or dimension.age_at_date:
        other = compiler.field(dimension.age_at) if dimension.age_at else literal(dimension.age_at_date)
        if family(column.type) not in {"date", "datetime"} or family(other.type) not in {"date", "datetime"}:
            invalid("La edad requiere nacimiento y fecha de corte/evento.")
        if compiler.dialect == "postgresql":
            age = cast(func.extract("year", func.age(other, column)), Numeric(10, 0))
        elif compiler.dialect == "sqlite":
            age = cast(func.strftime("%Y", other), Numeric) - cast(func.strftime("%Y", column), Numeric) - case((func.strftime("%m-%d", other) < func.strftime("%m-%d", column), 1), else_=0)
        else:
            invalid("La edad al evento requiere PostgreSQL en esta versión.")
        column = case((other >= column, age), else_=None)
    if dimension.ranges:
        if not (dimension.age_at or dimension.age_at_date) and family(column.type) not in {"integer", "decimal", "float"}:
            invalid("Los rangos requieren un número o una edad calculada.")
        conditions = []
        for interval in dimension.ranges:
            kind = "integer" if dimension.age_at or dimension.age_at_date else family(column.type)
            minimum = parse_value(interval.minimum, kind) if interval.minimum is not None else None
            maximum = parse_value(interval.maximum, kind) if interval.maximum is not None else None
            if minimum is None and maximum is None or minimum is not None and maximum is not None and minimum >= maximum:
                invalid("El rango requiere límites válidos.")
            tests = ([column >= minimum] if minimum is not None else []) + ([column < maximum] if maximum is not None else [])
            conditions.append((and_(*tests), interval.label))
        return case(*conditions, else_=dimension.unknown_label), "string"
    if dimension.age_at or dimension.age_at_date:
        return column, "integer"
    if dimension.bucket == "week":
        if family(column.type) not in {"date", "datetime"}:
            invalid("La semana requiere una fecha.")
        if compiler.dialect == "postgresql":
            return func.to_char(func.date_trunc("week", column), "YYYY-MM-DD"), "string"
        if compiler.dialect == "sqlite":
            return func.date(column, "-6 days", "weekday 1"), "string"
        invalid("La semana avanzada requiere PostgreSQL en esta versión.")
    if dimension.bucket:
        return temporal_expression(column, dimension.bucket, compiler.dialect), "string"
    return column, family(column.type)


def aggregate_expression(compiler, measure):
    conditions = [compiler.filter(f) for f in measure.filters]
    if measure.aggregation == "COUNT_ROWS":
        return (func.count(case((and_(*conditions), 1), else_=None)) if conditions else func.count()), "integer"
    value, kind = value_expression(compiler, measure.value) if measure.value else (None, "integer")
    if conditions:
        value = case((and_(*conditions), value if value is not None else 1), else_=None)
    aggregation = measure.aggregation
    if aggregation == "COUNT_ROWS":
        return (func.count(value) if conditions else func.count()), "integer"
    if aggregation == "COUNT_DISTINCT":
        return func.count(value.distinct()), "integer"
    if aggregation in {"SUM", "AVG", "PERCENTILE"} and kind not in {"integer", "decimal", "float"}:
        invalid("Esta agregación requiere valores numéricos.")
    if aggregation == "PERCENTILE":
        if compiler.dialect != "postgresql":
            invalid("Los percentiles exactos requieren PostgreSQL en esta versión.")
        return func.percentile_cont(measure.percentile).within_group(value), "decimal"
    if aggregation == "ENTITY_AVG":
        invalid("La media por entidad requiere una etapa interior.")
    expression = {"COUNT": func.count, "SUM": func.sum, "AVG": func.avg, "MIN": func.min, "MAX": func.max}[aggregation](value)
    return expression, "integer" if aggregation == "COUNT" else "decimal" if aggregation == "AVG" and kind != "float" else kind


class AnalysisCompiler:
    def __init__(self, catalog, spec, dialect, limits):
        self.spec, self.dialect, self.catalog = spec, dialect, catalog
        self.limits = limits
        self.compiler = Compiler(catalog, spec.selection, dialect)
        cohorts = []
        for i, cohort in enumerate(spec.cohorts):
            c = Compiler(catalog, cohort.selection, dialect)
            key, outer = c.field(cohort.entity), self.compiler.field(cohort.event_entity)
            if family(key.type) != family(outer.type):
                invalid("Las claves de cohorte y evento deben tener tipos compatibles.")
            eligible = c.statement([key.label("entity")]).distinct().subquery(f"cohort_{i}")
            cohorts.append(outer.in_(select(eligible.c.entity)))
        if cohorts:
            self.compiler.conditions.append((and_ if spec.cohort_logic == "all" else or_)(*cohorts))
        self.dimensions = [dimension_expression(self.compiler, d) for d in spec.dimensions]
        if spec.calendar:
            date_field = self.compiler.field(spec.dimensions[0].field)
            self.compiler.conditions.extend([date_field >= spec.calendar.start, date_field < spec.calendar.end + dt.timedelta(days=1)])
        self.population = Compiler(catalog, spec.population.selection, dialect) if spec.population else None
        population_dimensions = [dimension_expression(self.population, d) for d in spec.population.dimensions] if spec.population else []
        self.pop_dimensions = [e for e, _ in population_dimensions]
        if spec.population:
            for (_, kind), (_, other) in zip(self.dimensions, population_dimensions):
                if kind != other:
                    invalid("Las dimensiones de población y eventos deben tener tipos compatibles.")
            if family(self.population.field(spec.population.entity).type) != family(self.compiler.field(spec.population.event_entity).type):
                invalid("Las claves de población y eventos deben tener tipos compatibles.")
            entity = self.population.field(spec.population.entity)
            eligible = self.population.statement([entity.label("entity")]).where(entity.is_not(None)).distinct().subquery()
            self.compiler.conditions.append(self.compiler.field(spec.population.event_entity).in_(select(eligible.c.entity)))

    def measure_query(self, measure, summary=False):
        c = self.population if measure.scope in {"population", "population_total"} else self.compiler
        dims = [] if summary or measure.scope in {"filtered_total", "population_total"} else (self.pop_dimensions if measure.scope == "population" else [e for e, _ in self.dimensions])
        if measure.aggregation == "PERCENTILE":
            if self.dialect != "postgresql":
                invalid("Los percentiles exactos requieren PostgreSQL en esta versión.")
            value, kind = value_expression(c, measure.value)
            if kind not in {"integer", "decimal", "float"}:
                invalid("Los percentiles requieren números.")
            value = cast(value, Numeric())
            eligible = c.statement([*[d.label(f"d{i}") for i, d in enumerate(dims)], value.label("value"),
                                    func.row_number().over(partition_by=dims, order_by=value).label("position"),
                                    func.count().over(partition_by=dims).label("n")]).where(value.is_not(None), *[c.filter(f) for f in measure.filters]).subquery()
            from decimal import Decimal
            point = 1 + (eligible.c.n - 1) * Decimal(str(measure.percentile))
            low = func.max(case((eligible.c.position == func.floor(point), eligible.c.value), else_=None))
            high = func.max(case((eligible.c.position == func.ceil(point), eligible.c.value), else_=None))
            fraction = func.max(point) - func.floor(func.max(point))
            keys = [eligible.c[f"d{i}"] for i in range(len(dims))]
            observed = c.statement([func.count()]).scalar_subquery()
            return select(*keys, (low + (high - low) * fraction).label("value"), observed.label("observations"), func.count().label("valid_count")).select_from(eligible).group_by(*keys), "decimal"
        if measure.aggregation != "ENTITY_AVG":
            expression, kind = aggregate_expression(c, measure)
            valid = value_expression(c, measure.value)[0] if measure.value and measure.aggregation != "COUNT_ROWS" else literal(1)
            if measure.filters:
                valid = case((and_(*[c.filter(f) for f in measure.filters]), valid), else_=None)
            query = c.statement([*[d.label(f"d{i}") for i, d in enumerate(dims)], expression.label("value"), func.count().label("observations"), func.count(valid).label("valid_count")])
            return query.group_by(*dims) if dims else query, kind
        if measure.scope != "group":
            invalid("La media por entidad usa alcance de grupo; configura aparte su población.")
        entity = c.field(measure.entity)
        if measure.entity_bucket:
            entity = temporal_expression(entity, measure.entity_bucket, self.dialect)
        if self.spec.population and measure.entity != self.spec.population.event_entity:
            invalid("La media por entidad debe usar la clave de entidad de la población.")
        value, kind = value_expression(c, measure.value) if measure.value and measure.inner_aggregation == "SUM" else (literal(1), "integer")
        conditions = [c.filter(f) for f in measure.filters]
        eligible_value = case((and_(*conditions), value), else_=None) if conditions else value
        inner = func.sum(eligible_value) if measure.inner_aggregation == "SUM" else func.count(eligible_value)
        inner_query = c.statement([*[d.label(f"d{i}") for i, d in enumerate(dims)], entity.label("entity"), inner.label("value"), func.count().label("observations")]).where(entity.is_not(None)).group_by(*dims, entity).subquery()
        source, expression = inner_query, inner_query.c.value
        keys = [inner_query.c[f"d{i}"] for i in range(len(dims))]
        if self.population:
            pc = self.population
            pdims = [] if summary else self.pop_dimensions
            pop_entity = pc.field(self.spec.population.entity)
            if measure.entity_bucket:
                pop_entity = temporal_expression(pop_entity, measure.entity_bucket, self.dialect)
            population = pc.statement([*[d.label(f"d{i}") for i, d in enumerate(pdims)], pop_entity.label("entity")]).where(pop_entity.is_not(None)).distinct().subquery()
            pkeys = [population.c[f"d{i}"] for i in range(len(dims))]
            source = population.outerjoin(inner_query, and_(population.c.entity == inner_query.c.entity, matching(pkeys, keys)))
            expression = case((inner_query.c.observations.is_(None), 0), else_=inner_query.c.value)
            keys = pkeys
        return select(*[k.label(f"d{i}") for i, k in enumerate(keys)], func.avg(expression).label("value"), func.count().label("observations"), func.count(expression).label("valid_count")).select_from(source).group_by(*keys), "decimal"

    def compile(self, summary=False):
        dims = [] if summary else [e for e, _ in self.dimensions]
        if dims and self.spec.calendar:
            labels = calendar_labels(self.spec.calendar, self.limits["groups"])
            groups = values(column("d0", String())).data([(label,) for label in labels]).cte("analysis_calendar")
        elif dims:
            group_query = self.compiler.statement([d.label(f"d{i}") for i, d in enumerate(dims)]).distinct()
            if self.population and self.pop_dimensions:
                group_query = union(group_query, self.population.statement([d.label(f"d{i}") for i, d in enumerate(self.pop_dimensions)]).distinct())
            groups = group_query.subquery("groups")
        else:
            groups = select(literal(1).label("one")).subquery("groups")
        source, expressions, units, columns = groups, {}, {}, []
        count_expressions, self.count_columns = [], []
        for i, dimension in enumerate([] if summary else self.spec.dimensions):
            expressions[dimension.id] = groups.c[f"d{i}"]
            columns.append(descriptor(dimension.id, dimension.label or dimension.field.column, self.dimensions[i][1]))
        for i, measure in enumerate(self.spec.measures):
            query, kind = self.measure_query(measure, summary)
            staged = query.subquery(f"measure_{i}")
            keys = [groups.c[f"d{n}"] for n in range(len(dims))]
            skeys = [staged.c[f"d{n}"] for n in range(len(dims))] if measure.scope not in {"filtered_total", "population_total"} else []
            source = source.outerjoin(staged, matching(keys, skeys) if skeys else literal(True))
            expression = staged.c.value
            if measure.aggregation in {"COUNT_ROWS", "COUNT", "COUNT_DISTINCT"}:
                if summary or not self.spec.calendar or self.spec.calendar.observed or measure.scope in {"filtered_total", "population_total"}:
                    expression = func.coalesce(expression, 0)
            elif (self.spec.calendar.observed if self.spec.calendar else bool(self.population)) and measure.aggregation == "SUM" and measure.scope == "group":
                expression = case((or_(staged.c.observations.is_(None), staged.c.observations == 0), 0), else_=expression)
            expressions[measure.id], units[measure.id] = expression, measure.unit
            columns.append(descriptor(measure.id, measure.label or measure.id, kind, "metric"))
            if summary:
                for suffix, value in [("observed", staged.c.observations), ("valid", staged.c.valid_count)]:
                    name = "_" + suffix + "_" + measure.id
                    count_expressions.append(func.coalesce(value, 0).label(name))
                    self.count_columns.append(descriptor(name, name, "integer", "metric"))
        compile_formulas(self.spec.formulas, expressions, units)
        self.units = units
        for formula in self.spec.formulas:
            columns.append(descriptor(formula.id, formula.label, "decimal", "metric"))
        statement = select(*[expressions[c["id"]].label(c["id"]) for c in columns], *count_expressions).select_from(source)
        if not summary:
            order = [part for o in self.spec.order_by for part in ordered(expressions[o.field_id], o.direction)]
            order += [part for d in self.spec.dimensions for part in ordered(expressions[d.id], "ASC")]
            statement = statement.order_by(*order)
            if not self.spec.calendar:
                statement = statement.limit(self.spec.limit + 1)
        return statement, columns + self.count_columns


def pair_result(connection, compiler, spec, budget, limits):
    from .execution import rows
    basket, item = compiler.field(spec.pairs.basket), compiler.field(spec.pairs.item)
    if family(item.type) not in {"string", "integer"}:
        invalid("Los elementos de pares deben ser códigos de texto o enteros.")
    eligible = compiler.statement([basket.label("basket")]).where(basket.is_not(None)).distinct().subquery()
    total = int(connection.execute(select(func.count()).select_from(eligible)).scalar_one())
    unique = compiler.statement([basket.label("basket"), item.label("item")]).where(basket.is_not(None), item.is_not(None)).distinct().subquery()
    sizes = select(func.count().label("n")).select_from(unique).group_by(unique.c.basket).subquery()
    maximum, candidates = connection.execute(select(func.max(sizes.c.n), func.sum(sizes.c.n * (sizes.c.n - 1) / 2))).one()
    if (maximum or 0) > positive("pair_items", 100) or (candidates or 0) > positive("pair_candidates", 100000):
        invalid("La expansión de pares supera el presupuesto; reduce período o elementos.", "result_limit_exceeded")
    a, b = unique.alias("a"), unique.alias("b")
    paired = a.join(b, and_(a.c.basket == b.c.basket, a.c.item < b.c.item))
    frequency = func.count()
    expressions = {"item_a": a.c.item, "item_b": b.c.item, "frequency": frequency,
                   "support": cast(frequency, Numeric()) / func.nullif(total, 0), "baskets": literal(total)}
    columns = [descriptor(n, n, family(item.type) if n.startswith("item_") else "decimal" if n == "support" else "integer", "dimension" if n.startswith("item_") else "metric") for n in expressions]
    statement = select(*[e.label(n) for n, e in expressions.items()]).select_from(paired).group_by(a.c.item, b.c.item)
    ordering = spec.order_by or []
    order = [part for o in ordering for part in ordered(expressions[o.field_id], o.direction)] or [frequency.desc()]
    raw = rows(connection, statement.order_by(*order, a.c.item, b.c.item).limit(spec.limit + 1), columns, budget, limits)
    return raw, columns, [{"metric_id": "baskets", "aggregation": "COUNT_DISTINCT", "value": total, "logical_type": "integer", "encoding": "native"}], total


def calendar_labels(calendar, maximum):
    current, end = calendar.start, calendar.end
    if calendar.bucket == "week":
        current -= dt.timedelta(days=current.weekday())
    elif calendar.bucket == "month":
        current = current.replace(day=1)
    elif calendar.bucket == "year":
        current = current.replace(month=1, day=1)
    labels = []
    while current <= end:
        labels.append(current.isoformat()[:{"day": 10, "week": 10, "month": 7, "year": 4}[calendar.bucket]])
        if len(labels) > maximum:
            invalid("El calendario supera el presupuesto de grupos.", "result_limit_exceeded")
        try:
            current = current + dt.timedelta(days=1 if calendar.bucket == "day" else 7) if calendar.bucket in {"day", "week"} else dt.date(current.year + (current.month == 12), current.month % 12 + 1, 1) if calendar.bucket == "month" else dt.date(current.year + 1, 1, 1)
        except (OverflowError, ValueError):
            break
    return labels


def run_analysis(connection, catalog, spec, budget, limits, meta):
    import time
    started = time.monotonic()
    from .execution import rows
    if connection.dialect.name not in {"postgresql", "sqlite"}:
        invalid("Los patrones avanzados requieren PostgreSQL en esta versión.")
    zone = spec.timezone or meta["temporal_context"]["timezone"]
    if spec.timezone:
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
        try:
            ZoneInfo(zone)
        except (ZoneInfoNotFoundError, ValueError):
            invalid("Zona horaria IANA inválida.")
    if connection.dialect.name == "postgresql":
        connection.execute(select(func.set_config("TimeZone", zone, True)))
    elif spec.timezone and spec.timezone != "UTC":
        invalid("El oráculo SQLite admite únicamente UTC.")
    meta = {**meta, "temporal_context": {**meta["temporal_context"], "timezone": zone}}
    ac = AnalysisCompiler(catalog, spec, connection.dialect.name, limits)
    warnings = list(catalog.warnings)
    measure_counts = []
    if spec.pairs:
        units = {"frequency": "count", "support": "ratio", "baskets": "count"}
        raw, columns, kpis, filtered = pair_result(connection, ac.compiler, spec, budget, limits)
        # Public scalar policies also apply to global counts.
        for k in kpis:
            encoded = count_value(k["value"])
            k.update(value=encoded["value"], encoding=encoded["encoding"])
        warnings.append({"code": "pair_scope", "message": "Soporte = canastas con el par / todas las canastas elegibles; no sumar soportes entre pares."})
    elif spec.histogram:
        units = {"frequency": "count"}
        expression, kind = value_expression(ac.compiler, spec.histogram.value)
        if kind not in {"integer", "float", "decimal"}:
            invalid("El histograma requiere números.")
        boundaries = [parse_value(v, kind) for v in spec.histogram.boundaries]
        intervals = [(and_(expression >= a, expression < b if i < len(boundaries) - 2 else expression <= b), f"{i + 1:02d}: [{a}, {b}{')' if i < len(boundaries) - 2 else ']'}") for i, (a, b) in enumerate(zip(boundaries, boundaries[1:]))]
        bucket = case(*intervals, else_="Fuera de rango / sin valor")
        columns = [descriptor("interval", "Intervalo", "string"), descriptor("frequency", "Frecuencia", "integer", "metric")]
        raw = rows(connection, ac.compiler.statement([bucket.label("interval"), func.count().label("frequency")]).group_by(bucket).order_by(bucket).limit(spec.limit + 1), columns, budget, limits)
        filtered = int(connection.execute(ac.compiler.statement([func.count()])).scalar_one())
        kpis = [{"metric_id": "frequency", "aggregation": "COUNT_ROWS", **count_value(filtered)}]
    else:
        statement, columns = ac.compile()
        if spec.calendar:
            statement = statement.limit(limits["groups"] + 1)
        raw = rows(connection, statement, columns, budget, limits)
        summary, summary_columns = ac.compile(summary=True)
        units = ac.units
        summary_raw = rows(connection, summary, summary_columns, budget, limits)
        encoded_summary = encode_rows(summary_raw, summary_columns, warnings)[0]
        aggregations = {m.id: m.aggregation for m in spec.measures}
        kpis = [{"metric_id": c["id"], "aggregation": aggregations.get(c["id"], "FORMULA"), "value": encoded_summary[c["id"]], "logical_type": c["logical_type"], "encoding": c["encoding"]} for c in summary_columns if not c["id"].startswith("_")]
        for measure in spec.measures:
            observed = int(summary_raw[0]["_observed_" + measure.id])
            valid = int(summary_raw[0]["_valid_" + measure.id])
            measure_counts.append({"metric_id": measure.id, "observed": count_value(observed), "valid": count_value(valid), "excluded": count_value(observed - valid)})
        filtered = int(connection.execute(ac.compiler.statement([func.count()])).scalar_one())
        if spec.formulas:
            warnings.append({"code": "division_policy", "message": "Una división por cero o componente desconocido produce Sin valor. Los totales se recalculan sobre toda la selección."})
        if spec.population:
            warnings.append({"code": "population_scope", "message": "La población y la selección de eventos tienen filtros independientes. Se incluyen grupos de población sin eventos."})
    data = encode_rows(raw[:spec.limit], columns, warnings)
    return {"status": "success", "columns": columns, "data": data, "summary_kpis": kpis,
            "filtered_rows": count_value(filtered), "warnings": warnings,
            "definition": spec.model_dump(mode="json"), "execution_id": str(uuid4()), "units": units, "measure_counts": measure_counts,
            "meta": {**meta, "execution_time_ms": round((time.monotonic() - started) * 1000, 2), "returned_rows": len(data), "applied_limit": spec.limit, "truncated": len(raw) > spec.limit}}
