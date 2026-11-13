"""Additive schema changes that preserve existing keys and column types."""
import sqlalchemy as sa
from .load_transport import LoadValidationError


def additions(connection, old, desired, spec, mode):
    inspector = sa.inspect(connection)
    primary = inspector.get_pk_constraint(old.name).get("constrained_columns") or []
    unique = [u["column_names"] for u in inspector.get_unique_constraints(old.name)]
    foreign = inspector.get_foreign_keys(old.name)
    changes = []

    def validate_key(key, is_primary=False):
        if mode == "reload":
            return  # Old rows will be deleted inside the same transaction.
        columns = [old.c[c] for c in key]
        if is_primary and connection.execute(sa.select(sa.func.count()).select_from(old).where(sa.or_(*[c.is_(None) for c in columns]))).scalar_one():
            raise LoadValidationError("El destino contiene nulos en la PK solicitada.")
        duplicates = sa.select(*columns).select_from(old).where(*[c.is_not(None) for c in columns]).group_by(*columns).having(sa.func.count() > 1).limit(1)
        if connection.execute(duplicates).first() is not None:
            raise LoadValidationError("El destino contiene duplicados en una clave solicitada.")

    if spec.primary_key and set(primary) != set(spec.primary_key):
        if primary:
            raise LoadValidationError("Cambiar una PK existente requiere una migración explícita, no una carga aditiva.")
        validate_key(spec.primary_key, True)
        changes.append(("add_primary_key", next(c for c in desired.constraints if isinstance(c, sa.PrimaryKeyConstraint))))
    for key in spec.unique_keys:
        if not any(set(key) == set(u) for u in unique) and set(key) != set(primary):
            validate_key(key)
            changes.append(("add_unique", next(c for c in desired.constraints if isinstance(c, sa.UniqueConstraint) and set(c.columns.keys()) == set(key))))
    for column in spec.columns:
        if not column.nullable and old.c[column.name].nullable and column.name not in spec.primary_key:
            if mode != "reload" and connection.execute(sa.select(sa.func.count()).select_from(old).where(old.c[column.name].is_(None))).scalar_one():
                raise LoadValidationError("El destino contiene nulos en una columna obligatoria.")
            changes.append(("set_not_null", column.name))
    for fk in spec.foreign_keys:
        if not any(f["constrained_columns"] == fk.columns and f["referred_table"] == fk.target_table and f["referred_columns"] == fk.target_columns for f in foreign):
            target = desired.metadata.tables[fk.target_table]
            if mode != "reload":
                exists = sa.select(sa.literal(1)).select_from(target).where(*[old.c[a] == target.c[b] for a, b in zip(fk.columns, fk.target_columns)]).exists()
                invalid = connection.execute(sa.select(sa.func.count()).select_from(old).where(*[old.c[c].is_not(None) for c in fk.columns], ~exists)).scalar_one()
                if invalid:
                    raise LoadValidationError("El destino contiene referencias sin correspondencia para la FK solicitada.")
            constraint = next(c for c in desired.constraints if isinstance(c, sa.ForeignKeyConstraint) and list(c.columns.keys()) == fk.columns and [e.target_fullname for e in c.elements] == [fk.target_table + "." + name for name in fk.target_columns])
            changes.append(("add_foreign_key", constraint))
    if changes and connection.dialect.name not in {"postgresql", "mysql", "oracle"}:
        raise LoadValidationError("Agregar restricciones a tablas existentes requiere PostgreSQL.")
    return changes


def apply_additions(connection, table, changes, completed):
    for action, value in changes:
        if action == "set_not_null":
            # Both names were validated and reflected, then quoted by the actual dialect.
            quote = connection.dialect.identifier_preparer
            column = quote.quote(value)
            dialect = connection.dialect.name
            if dialect == "oracle":
                definition = f"MODIFY ({column} NOT NULL)"
            elif dialect == "mysql":
                actual = sa.Table(table.name, sa.MetaData(), autoload_with=connection).c[value]
                if actual.server_default is not None or actual.computed is not None or actual.comment or actual.autoincrement is True:
                    raise LoadValidationError("La columna MySQL tiene atributos que requieren conservarse mediante una migración explícita.")
                definition = f"MODIFY COLUMN {column} {actual.type.compile(dialect=connection.dialect)} NOT NULL"
            else:
                definition = f"ALTER COLUMN {column} SET NOT NULL"
            connection.exec_driver_sql(f"ALTER TABLE {quote.format_table(table)} {definition}")
        else:
            connection.execute(sa.schema.AddConstraint(value))
        completed.append(action)
