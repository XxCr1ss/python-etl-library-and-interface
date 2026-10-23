"""Portable analysis definitions: no SQL, Python, credentials or industry enums."""
import datetime as dt
from typing import Literal
from pydantic import Field, model_validator
from .models import Model, Name, OutputId, FieldRef, Filter, Selection, Order, CatalogRequest, Scalar
from .settings import LIMITS


class ValueSpec(Model):
    field: FieldRef
    multiply_by: FieldRef | None = None
    duration_end: FieldRef | None = None
    duration_unit: Literal["seconds", "minutes", "hours", "days"] = "minutes"
    exclude_negative: bool = True

    @model_validator(mode="after")
    def one_operation(self):
        if self.multiply_by and self.duration_end:
            raise ValueError("Elige producto o duración, no ambos sobre el mismo valor.")
        return self


class CategoryRule(Model):
    label: Name
    filters: list[Filter] = Field(min_length=1, max_length=LIMITS["filters"])


class NumericRange(Model):
    label: Name
    minimum: Scalar | None = None
    maximum: Scalar | None = None


class AnalysisDimension(Model):
    id: OutputId
    field: FieldRef
    label: Name | None = None
    bucket: Literal["year", "month", "week", "day"] | None = None
    age_at: FieldRef | None = None
    age_at_date: dt.date | None = None
    categories: list[CategoryRule] = Field(default_factory=list, max_length=30)
    unknown_label: Name = "Sin clasificar"
    ranges: list[NumericRange] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def one_classification(self):
        if self.age_at and self.age_at_date:
            raise ValueError("Elige fecha de evento o corte fijo para calcular edad.")
        if self.categories and (self.age_at or self.age_at_date or self.ranges or self.bucket) or self.bucket and (self.age_at or self.age_at_date or self.ranges):
            raise ValueError("Combina edad con rangos o elige una clasificación/calendario independiente.")
        return self


class Measure(Model):
    id: OutputId
    label: Name | None = None
    aggregation: Literal["COUNT_ROWS", "COUNT", "COUNT_DISTINCT", "SUM", "AVG", "MIN", "MAX", "PERCENTILE", "ENTITY_AVG"]
    value: ValueSpec | None = None
    filters: list[Filter] = Field(default_factory=list, max_length=LIMITS["filters"])
    entity: FieldRef | None = None
    inner_aggregation: Literal["SUM", "COUNT_ROWS"] = "SUM"
    entity_bucket: Literal["day", "month", "year"] | None = None
    percentile: float = Field(default=0.5, ge=0, le=1)
    unit: Name = "count"
    scope: Literal["group", "filtered_total", "population", "population_total"] = "group"

    @model_validator(mode="after")
    def requirements(self):
        if self.aggregation not in {"COUNT_ROWS", "ENTITY_AVG"} and self.value is None:
            raise ValueError("La medida requiere una columna o valor.")
        if self.aggregation == "ENTITY_AVG" and (self.entity is None or self.inner_aggregation == "SUM" and self.value is None):
            raise ValueError("La media por entidad requiere entidad y medida interior.")
        return self


class Formula(Model):
    id: OutputId
    label: Name
    expression: str = Field(min_length=1, max_length=500)
    unit: Name = "auto"
    require_dimensionless: bool = False


class PopulationDefinition(Model):
    selection: Selection
    entity: FieldRef
    event_entity: FieldRef
    # A population can supply groups with zero events. Each output dimension is mapped explicitly.
    dimensions: list[AnalysisDimension] = Field(default_factory=list, max_length=LIMITS["dimensions"])


class CohortDefinition(Model):
    selection: Selection
    entity: FieldRef
    event_entity: FieldRef


class CalendarDefinition(Model):
    dimension_id: OutputId
    start: dt.date
    end: dt.date
    bucket: Literal["day", "week", "month", "year"] = "day"
    observed: bool = False
    # Zero is only meaningful if the user confirms coverage of the interval.

    @model_validator(mode="after")
    def bounded(self):
        if self.end < self.start or self.end.year == 9999 or (self.end - self.start).days > 3660:
            raise ValueError("El calendario requiere un intervalo de hasta diez años.")
        return self


class PairSpec(Model):
    basket: FieldRef
    item: FieldRef


class HistogramSpec(Model):
    value: ValueSpec
    boundaries: list[Scalar] = Field(min_length=2, max_length=51)

    @model_validator(mode="after")
    def ascending(self):
        from decimal import Decimal, InvalidOperation
        try:
            values = [Decimal(str(v)) for v in self.boundaries]
            if any(not v.is_finite() for v in values) or sorted(set(values)) != values:
                raise ValueError()
        except (InvalidOperation, ValueError):
            raise ValueError("Los límites del histograma deben ser únicos y ascendentes.")
        return self


class AnalysisSpec(Model):
    version: Literal[1] = 1
    title: Name
    timezone: Name | None = None
    grain: Name
    selection: Selection
    dimensions: list[AnalysisDimension] = Field(default_factory=list, max_length=LIMITS["dimensions"])
    measures: list[Measure] = Field(default_factory=list, max_length=LIMITS["metrics"])
    formulas: list[Formula] = Field(default_factory=list, max_length=LIMITS["metrics"])
    cohorts: list[CohortDefinition] = Field(default_factory=list, max_length=4)
    cohort_logic: Literal["all", "any"] = "all"
    population: PopulationDefinition | None = None
    calendar: CalendarDefinition | None = None
    pairs: PairSpec | None = None
    histogram: HistogramSpec | None = None
    order_by: list[Order] = Field(default_factory=list, max_length=10)
    limit: int = Field(default=20, ge=1, le=LIMITS["groups"])

    @model_validator(mode="after")
    def consistent(self):
        outputs = [x.id for x in [*self.dimensions, *self.measures, *self.formulas]]
        if len(set(outputs)) != len(outputs):
            raise ValueError("IDs de salida repetidos.")
        if self.pairs or self.histogram:
            if self.pairs and self.histogram or self.dimensions or self.measures or self.formulas or self.population or self.calendar:
                raise ValueError("Pares e histograma generan sus propias dimensiones y medidas.")
        elif not self.measures:
            raise ValueError("Agrega al menos una medida.")
        if self.population and [d.id for d in self.population.dimensions] != [d.id for d in self.dimensions] and (self.population.dimensions or any(m.scope == "population" or m.aggregation == "ENTITY_AVG" for m in self.measures)):
            raise ValueError("Mapea cada dimensión en la población de referencia y en el mismo orden.")
        if any(m.scope in {"population", "population_total"} for m in self.measures) and not self.population:
            raise ValueError("El denominador de población requiere una población de referencia.")
        if self.calendar and (len(self.dimensions) != 1 or self.dimensions[0].id != self.calendar.dimension_id or self.dimensions[0].bucket != self.calendar.bucket):
            raise ValueError("Completar calendario requiere una única dimensión temporal del mismo intervalo.")
        if self.calendar and any(o.field_id != self.calendar.dimension_id or o.direction != "ASC" for o in self.order_by):
            raise ValueError("El calendario completo requiere orden cronológico ascendente.")
        ids = set(outputs) if not (self.pairs or self.histogram) else ({"item_a", "item_b", "frequency", "support", "baskets"} if self.pairs else {"interval", "frequency"})
        if any(o.field_id not in ids for o in self.order_by):
            raise ValueError("Solo se puede ordenar por salidas del análisis.")
        return self


class AnalysisRequest(CatalogRequest):
    analysis: AnalysisSpec


class ReportRequest(CatalogRequest):
    version: Literal[1] = 1
    analyses: list[AnalysisSpec] = Field(min_length=1, max_length=8)


class ReportDefinition(Model):
    version: Literal[1] = 1
    title: Name
    analyses: list[AnalysisSpec] = Field(min_length=1, max_length=8)
