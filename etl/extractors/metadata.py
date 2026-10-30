"""Metadata collection shared by local and HTTP database adapters."""
from etl.error_utils import public_error


def table_metadata(extractor, connection):
    tables = extractor.get_table_names()
    schemas = {}
    for table in tables:
        try:
            schemas[table] = extractor.get_table_schema(table).get("columns", [])
        except Exception as error:
            # A denied table must not hide the schemas of accessible tables.
            print(public_error(f"No se pudo obtener el esquema de '{table}': {error}", connection))
            schemas[table] = []
    return {"tables": tables, "schema_preview": schemas}
