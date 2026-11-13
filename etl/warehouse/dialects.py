"""Dialect-specific expressions for advanced warehouse queries."""
from sqlalchemy import Numeric, String, case, cast, column, extract, func, literal, select, text, union_all, values
from sqlalchemy.dialects.oracle import NUMBER, TIMESTAMP
from sqlalchemy.dialects.mysql import TIMESTAMP as MYSQL_TIMESTAMP
from sqlalchemy.exc import DBAPIError

from .compiler import invalid


def decimal_type(dialect):
    # Bare DECIMAL/NUMERIC casts discard the fraction in MySQL and Oracle.
    if dialect == "mysql":
        return Numeric(65, 24)
    if dialect == "oracle":
        return NUMBER(asdecimal=True)
    return Numeric()


def duration_seconds(start, end, kind, dialect):
    if dialect == "mysql":
        if isinstance(start.type, MYSQL_TIMESTAMP) or isinstance(end.type, MYSQL_TIMESTAMP):
            if not isinstance(start.type, MYSQL_TIMESTAMP) or not isinstance(end.type, MYSQL_TIMESTAMP):
                invalid("La duración requiere dos instantes o dos fechas locales del mismo tipo.")
            return func.unix_timestamp(end) - func.unix_timestamp(start)
        return cast(func.timestampdiff(text("MICROSECOND"), start, end), Numeric(40, 12)) / 1_000_000
    if dialect == "oracle":
        zoned = any(getattr(value.type, "timezone", False) for value in (start, end))
        interval = cast(end, TIMESTAMP(timezone=zoned)) - cast(start, TIMESTAMP(timezone=zoned))
        return (extract("day", interval) * 86400 + extract("hour", interval) * 3600
                + extract("minute", interval) * 60 + extract("second", interval))
    if dialect == "sqlite":
        return (func.julianday(end) - func.julianday(start)) * 86400
    return (end - start) * 86400 if kind == "date" else func.extract("epoch", end - start)


def completed_years(start, end, dialect):
    if dialect == "postgresql":
        return cast(extract("year", func.age(end, start)), Numeric(10, 0))
    if dialect == "mysql":
        return func.timestampdiff(text("YEAR"), start, end)
    if dialect == "oracle":
        start, end = cast(start, TIMESTAMP()), cast(end, TIMESTAMP())
        year = extract("year", end) - extract("year", start)
        return year - case((func.to_char(end, "MMDDHH24MISSFF6") < func.to_char(start, "MMDDHH24MISSFF6"), 1), else_=0)
    return (cast(func.strftime("%Y", end), Numeric) - cast(func.strftime("%Y", start), Numeric)
            - case((func.strftime("%m-%d", end) < func.strftime("%m-%d", start), 1), else_=0))


def week_start(value, dialect):
    if dialect == "mysql":
        return func.date_format(func.subdate(func.date(value), func.weekday(value)), "%Y-%m-%d")
    if dialect == "oracle":
        return func.to_char(func.trunc(value, "IW"), "YYYY-MM-DD")
    if dialect == "sqlite":
        return func.date(value, "-6 days", "weekday 1")
    return func.to_char(func.date_trunc("week", value), "YYYY-MM-DD")


def calendar_source(labels, dialect):
    if dialect in {"mysql", "oracle"}:
        queries = [select(literal(label, String(10)).label("d0")) for label in labels]
        return union_all(*queries).cte("analysis_calendar")
    return values(column("d0", String())).data([(label,) for label in labels]).cte("analysis_calendar")


def set_analysis_timezone(connection, zone):
    dialect = connection.dialect.name
    if dialect == "postgresql":
        connection.execute(select(func.set_config("TimeZone", zone, True)))
    elif dialect == "mysql":
        try:
            connection.execute(text("SET SESSION time_zone = :zone"), {"zone": "+00:00" if zone == "UTC" else zone})
        except DBAPIError:
            invalid("MySQL no reconoce la zona horaria; revisa las tablas de zonas del servidor.")
    elif dialect == "oracle":
        # Oracle ALTER SESSION cannot bind its time_zone argument.
        quoted = "'" + zone.replace("'", "''") + "'"
        try:
            connection.exec_driver_sql("ALTER SESSION SET TIME_ZONE = " + quoted)
        except DBAPIError:
            invalid("Oracle no reconoce la zona horaria solicitada.")
    elif zone != "UTC":
        invalid("El oráculo SQLite admite únicamente UTC.")
