"""Physical types and publication for engines with implicit DDL commits."""
import hashlib
from contextlib import contextmanager

import sqlalchemy as sa
from sqlalchemy.dialects import mysql, oracle

from .load_transport import LoadReconciliationRequired, LoadValidationError


STRUCTURED_ENGINES = ("postgresql", "mysql", "oracle")
IMPLICIT_DDL = ("mysql", "oracle")
KEY_TEXT_LENGTH = 191


def physical_type(column, dialect, keyed=False):
    if dialect == "oracle":
        return {
            "integer": oracle.NUMBER(19, 0, asdecimal=False),
            "boolean": oracle.NUMBER(1, 0, asdecimal=False),
            "float": oracle.BINARY_DOUBLE(),
            "datetime": oracle.TIMESTAMP(timezone=column.timezone),
            "string": oracle.VARCHAR2(KEY_TEXT_LENGTH) if keyed else oracle.CLOB(),
        }.get(column.type, column.sql_type())
    if dialect == "mysql":
        return {
            "boolean": mysql.TINYINT(1),
            "float": mysql.DOUBLE(),
            "datetime": mysql.TIMESTAMP(fsp=6) if column.timezone else mysql.DATETIME(fsp=6),
            "string": mysql.VARCHAR(KEY_TEXT_LENGTH) if keyed else mysql.LONGTEXT(),
        }.get(column.type, column.sql_type())
    return column.sql_type()


def storage_values(frame, spec, dialect, keyed):
    if dialect not in IMPLICIT_DDL:
        return frame
    frame = frame.copy()
    for column in spec.columns:
        values = frame[column.name]
        if column.type == "string":
            if dialect == "oracle" and any(value == "" for value in values.dropna()):
                raise LoadValidationError("Oracle convierte texto vacío en NULL. Normaliza ese valor antes de cargar.")
            if column.name in keyed and any(len(value) > KEY_TEXT_LENGTH for value in values.dropna()):
                raise LoadValidationError(f"El texto de la clave {column.name} supera {KEY_TEXT_LENGTH} caracteres.")
        elif column.type == "boolean":
            frame[column.name] = values.map(lambda value: None if value is None else int(value)).astype(object).where(values.notna(), None)
        elif dialect == "mysql" and column.type == "datetime" and column.timezone:
            frame[column.name] = values.dt.tz_convert("UTC").dt.tz_localize(None)
    return frame


def column_matches(actual, column, dialect):
    from .warehouse.catalog import family

    if column.type == "boolean":
        if dialect == "mysql":
            return isinstance(actual, mysql.TINYINT) and actual.display_width == 1
        if dialect == "oracle":
            return isinstance(actual, oracle.NUMBER) and (actual.precision, actual.scale) == (1, 0)
    if dialect == "oracle":
        if column.type == "integer":
            if isinstance(actual, oracle.NUMBER):
                return (actual.precision, actual.scale) == (19, 0)
            return isinstance(actual, sa.Integer)
        if column.type == "date":
            return isinstance(actual, (oracle.DATE, sa.Date))
        if column.type == "string":
            return isinstance(actual, sa.String)
    if dialect == "mysql" and column.type == "datetime":
        expected = mysql.TIMESTAMP if column.timezone else mysql.DATETIME
        return isinstance(actual, expected) and actual.fsp == 6
    return family(actual) == column.type and bool(getattr(actual, "timezone", False)) == column.timezone


@contextmanager
def write_session(engine, name, preview):
    with engine.connect() as connection:
        lock = prepare_write(connection, name, preview)
        try:
            yield connection
        finally:
            if lock and not connection.invalidated:
                try:
                    connection.rollback()
                    connection.scalar(sa.select(sa.func.release_lock(lock)))
                except sa.exc.SQLAlchemyError:
                    connection.invalidate()


def prepare_write(connection, name, preview):
    dialect = connection.dialect.name
    if dialect == "mysql":
        connection.exec_driver_sql("SET SESSION time_zone = '+00:00'")
        modes = set(connection.exec_driver_sql("SELECT @@session.sql_mode").scalar_one().split(",")) - {""}
        if "STRICT_ALL_TABLES" not in modes:
            connection.execute(sa.text("SET SESSION sql_mode = :mode"), {"mode": ",".join(sorted(modes | {"STRICT_ALL_TABLES"}))})
        if not preview:
            lock = "etl_" + hashlib.sha256((str(connection.engine.url.database) + "\0" + name).encode()).hexdigest()[:60]
            if connection.execute(sa.select(sa.func.get_lock(lock, 5))).scalar_one() != 1:
                raise LoadValidationError("Otra carga está usando este destino MySQL.")
            return lock
    elif dialect == "oracle":
        connection.exec_driver_sql("ALTER SESSION SET DDL_LOCK_TIMEOUT = 5")
    return None


def lock_existing_table(connection, table):
    if connection.dialect.name == "oracle":
        name = connection.dialect.identifier_preparer.format_table(table)
        connection.exec_driver_sql(f"LOCK TABLE {name} IN SHARE ROW EXCLUSIVE MODE WAIT 5")


def ensure_transactional_table(connection, table):
    if connection.dialect.name == "mysql":
        options = sa.inspect(connection).get_table_options(table.name, schema=table.schema)
        if options.get("mysql_engine", "").lower() != "innodb":
            raise LoadValidationError("La carga estructurada de MySQL requiere una tabla InnoDB.")


def publication_names(name):
    identity = hashlib.sha256(name.encode()).hexdigest()[:16]
    return "etl_stg_" + identity, "etl_bak_" + identity


def publication_available(connection, name):
    inspector = sa.inspect(connection)
    stage, backup = publication_names(name)
    if inspector.has_table(stage) or inspector.has_table(backup):
        raise LoadReconciliationRequired(f"El destino tiene una publicación pendiente. Revisa {stage} y {backup} antes de repetir.")


def verify_replace_dependencies(connection, old):
    dialect = connection.dialect.name
    inspector = sa.inspect(connection)
    params = {"name": connection.dialect.denormalize_name(old.name)}
    if dialect == "oracle":
        probes = (
            "SELECT 1 FROM all_constraints WHERE r_owner = USER AND constraint_type = 'R' AND r_constraint_name IN (SELECT constraint_name FROM user_constraints WHERE table_name = :name)",
            "SELECT 1 FROM all_dependencies WHERE referenced_owner = USER AND referenced_name = :name AND referenced_type = 'TABLE'",
            "SELECT 1 FROM user_triggers WHERE table_name = :name",
            "SELECT 1 FROM user_tab_privs_made WHERE table_name = :name",
            "SELECT 1 FROM user_col_privs_made WHERE table_name = :name",
            "SELECT 1 FROM all_synonyms WHERE table_owner = USER AND table_name = :name",
        )
    else:
        params["name"] = old.name
        probes = (
            "SELECT 1 FROM information_schema.key_column_usage WHERE referenced_table_schema = DATABASE() AND referenced_table_name = :name",
            "SELECT 1 FROM information_schema.view_table_usage WHERE table_schema = DATABASE() AND table_name = :name",
            "SELECT 1 FROM information_schema.triggers WHERE event_object_schema = DATABASE() AND event_object_table = :name",
            "SELECT 1 FROM information_schema.table_privileges WHERE table_schema = DATABASE() AND table_name = :name",
            "SELECT 1 FROM information_schema.column_privileges WHERE table_schema = DATABASE() AND table_name = :name",
        )
    if any(connection.execute(sa.text(query), params).first() is not None for query in probes):
        raise LoadValidationError("El reemplazo no puede conservar las dependencias o permisos detectados. Usa recarga si la estructura coincide.")
    if old.name not in inspector.get_table_names(schema=old.schema):
        raise LoadValidationError("La tabla cambió mientras se comprobaba el reemplazo.")


def publish(connection, table, name, old, insert_and_verify):
    """Create and validate before publishing. The old object survives until verification."""
    stage, backup = publication_names(name)
    publication_available(connection, name)
    dialect = connection.dialect.name
    quote = connection.dialect.identifier_preparer.quote
    stage_sql, target_sql, backup_sql = map(quote, (stage, name, backup))
    owned_stage = False
    publishing = False
    try:
        # Use separate DDL and row transactions on engines that implicitly commit DDL.
        connection.execute(sa.schema.CreateTable(table))
        owned_stage = True
        for index in table.indexes:
            index.create(connection)
        report = insert_and_verify(table)
        connection.commit()
        if old is not None:
            verify_replace_dependencies(connection, old)
        publishing = True
        if dialect == "mysql":
            previous = f"{target_sql} TO {backup_sql}, " if old is not None else ""
            connection.exec_driver_sql(f"RENAME TABLE {previous}{stage_sql} TO {target_sql}")
        else:
            if old is not None:
                connection.exec_driver_sql(f"RENAME {target_sql} TO {backup_sql}")
            connection.exec_driver_sql(f"RENAME {stage_sql} TO {target_sql}")
        count = connection.scalar(sa.select(sa.func.count()).select_from(sa.table(name)))
        if count != report["total_rows"]:
            raise LoadValidationError("El conteo publicado no coincide con la carga validada.")
        if old is not None:
            connection.execute(sa.schema.DropTable(sa.Table(backup, sa.MetaData())))
        connection.commit()
        return report
    except Exception as exc:
        connection.rollback()
        if not publishing and owned_stage:
            try:
                table.drop(connection, checkfirst=True)
            except sa.exc.SQLAlchemyError:
                raise LoadReconciliationRequired(f"La tabla auxiliar {stage} requiere conciliación antes de repetir.") from None
        if publishing:
            try:
                inspector = sa.inspect(connection)
                if dialect == "oracle" and old is not None and not inspector.has_table(name) and inspector.has_table(backup):
                    connection.exec_driver_sql(f"RENAME {backup_sql} TO {target_sql}")
                    table.drop(connection, checkfirst=True)
                    raise LoadValidationError("El reemplazo falló y se restauró la tabla anterior.") from exc
            except sa.exc.SQLAlchemyError:
                pass
            raise LoadReconciliationRequired(f"Publicación por conciliar. Revisa el destino, la auxiliar {stage} y la copia {backup} antes de repetir.") from None
        raise
