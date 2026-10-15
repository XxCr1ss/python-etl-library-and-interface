"""Additional public descriptions of existing dispatcher branches; no execution logic."""


def parameter(kind, description, required=True, **metadata):
    return {"type": kind, "description": description, "required": required, **metadata}


COLUMN = parameter("str", "Nombre de la columna de entrada")
COLUMNS = parameter("any", "Columna o lista de columnas")
BY = parameter("any", "Columna o lista de columnas para agrupar")
EXPRESSION = parameter("str", "Expresión Python evaluada por el servidor")
ASCENDING = parameter("bool", "Orden ascendente", False, default=True)
COMPLEMENT = parameter("bool", "Invertir la selección", False, default=False)
PATTERN = parameter("str", "Patrón de expresión regular")
CASE_SENSITIVE = parameter("bool", "Distinguir mayúsculas", False, default=False)
DELIMITER = parameter("str", "Separador de valores")
JOIN_PARAMS = {
    "right_source": parameter("dict", "Fuente secundaria con el mismo contrato que source"),
    "on": parameter("any", "Llave común; dos llaves comunes en ambos datasets; o [llave_izquierda, llave_derecha] si no son ambas comunes"),
}


def operation(kind, name, description, params):
    return {"type": kind, "name": name, "description": description, "params": params}


EXTRA_OPERATIONS = [
    operation("right_join", "Cruce derecho", "Conserva todas las filas derechas y sus coincidencias.", JOIN_PARAMS),
    operation("inner_join", "Cruce interno", "Conserva las coincidencias de ambas fuentes.", JOIN_PARAMS),
    operation("outer_join", "Cruce completo", "Conserva todas las filas de ambas fuentes.", JOIN_PARAMS),
    operation("add_new_column", "Columna calculada", "Evalúa una expresión sobre cada fila.", {
        "new_column_name": parameter("str", "Nombre de la columna creada"), "expression": EXPRESSION}),
    operation("transform_column", "Transformar columna", "Evalúa la expresión con la variable x para cada celda.", {
        "column": COLUMN, "expression": EXPRESSION}),
    operation("filter_by_condition", "Filtro condicional", "Conserva las filas que cumplen la expresión.", {"expression": EXPRESSION}),
    operation("normalize_delimited_column", "Normalizar delimitados", "Expande los valores de column en column_lista.", {
        "column": COLUMN, "delimiter": parameter("str", "Separador", False, default=","),
        "keep_original": parameter("bool", "Conservar la columna original", False, default=True)}),
    operation("sort_columns", "Ordenar filas", "Ordena filas por valores de las columnas, conservando cabeceras.", {
        "columns": COLUMNS, "ascending": ASCENDING}),
    operation("convert_column_to_list", "Texto a lista", "Divide texto en una lista JSON; el texto vacío produce [\"\"].", {
        "column": COLUMN, "delimiter": parameter("str", "Separador", False, default=";"),
        "new_column": parameter("str", "Columna nueva; si se omite reemplaza la original", False)}),
    operation("explode_column_list", "Expandir listas", "Genera una fila por elemento en la misma columna.", {"column": COLUMN}),
    operation("clean_numeric_columns", "Limpiar números", "Elimina caracteres excepto dígitos, punto y signo menos; inválidos se vuelven nulos.", {"columns": COLUMNS}),
    operation("clean_date_format", "Normalizar fechas", "Formatea fechas e interpreta valores inválidos como nulos.", {
        "column": COLUMN, "format_output": parameter("str", "Formato strftime", False, default="%Y-%m-%d")}),
    operation("convert_to_ordered_category", "Categoría ordenada", "Convierte usando el orden de categorías indicado.", {
        "column": COLUMN, "categories": parameter("list", "Categorías en orden"),
        "ordered": parameter("bool", "Aplicar orden", False, default=True)}),
    operation("boolean_to_binary", "Booleano a binario", "Convierte true en 1 y false en 0.", {"columns": COLUMNS}),
    operation("sort_by", "Ordenar registros", "Ordena filas por las columnas indicadas.", {"columns": COLUMNS, "ascending": ASCENDING}),
    operation("search_in_column", "Buscar en columna", "Selecciona filas por regex en una columna.", {
        "column": COLUMN, "pattern": PATTERN, "complement": COMPLEMENT, "case_sensitive": CASE_SENSITIVE}),
    operation("search_in_table", "Buscar en tabla", "Selecciona filas por regex en cualquier columna.", {
        "pattern": PATTERN, "complement": COMPLEMENT, "case_sensitive": CASE_SENSITIVE}),
    operation("split_column_into_rows", "Dividir en filas", "Expande texto; puede conservar la columna original y crear otra.", {
        "column": COLUMN, "delimiter": DELIMITER, "new_column_name": parameter("str", "Columna de salida", False),
        "drop_original": parameter("bool", "Eliminar columna original si se crea otra", False, default=False)}),
    operation("drop_duplicates", "Eliminar duplicados", "Elimina filas repetidas usando todas las columnas o un subconjunto.", {
        "subset": parameter("any", "Columna o lista; null compara todas", False)}),
    operation("replace_values", "Reemplazar valores", "Sustituye un valor conservando el tipo del reemplazo.", {
        "column": COLUMN, "old_value": parameter("any", "Valor no nulo a sustituir"),
        "new_value": parameter("any", "Valor no nulo de reemplazo; admite texto vacío")}),
    operation("group_by_sum", "Agrupar y sumar", "Calcula la suma por grupo.", {"by": BY, "column": COLUMN}),
    operation("group_by_count", "Agrupar y contar", "Devuelve conteo de filas por grupo en conteo.", {"by": BY}),
    operation("group_by_shift", "Desplazamiento por grupo", "Desplaza los valores dentro de cada grupo.", {
        "by": BY, "column": COLUMN, "new_column_name": parameter("str", "Columna de salida"),
        "periods": parameter("int", "Periodos de desplazamiento, incluido cero", False, default=1)}),
    operation("filter_by_list_length", "Filtrar longitud de listas", "Selecciona filas por longitud de sus listas.", {
        "column": COLUMN, "length": parameter("any", "Entero o lista de enteros no negativos"),
        "keep_in": parameter("bool", "Conservar longitudes coincidentes", False, default=True)}),
    operation("replace_all_headers", "Reemplazar cabeceras", "Asigna un nombre por columna en el orden actual.", {
        "new_headers": parameter("list", "Lista de nombres de igual longitud al esquema")}),
    operation("prefix_header", "Prefijo de cabeceras", "Añade un prefijo a todas las cabeceras.", {"prefix": parameter("str", "Prefijo")}),
    operation("suffix_header", "Sufijo de cabeceras", "Añade un sufijo a todas las cabeceras.", {"suffix": parameter("str", "Sufijo")}),
    operation("add_sequential_index", "Índice secuencial", "Añade un contador secuencial por fila.", {
        "column_name": parameter("str", "Nombre de columna", False, default="index"),
        "start": parameter("int", "Valor inicial, incluido cero", False, default=1)}),
    operation("filter_in_range", "Filtrar por rango", "Selecciona valores entre límites inclusivos.", {
        "column": COLUMN, "min_value": parameter("number", "Límite inferior"),
        "max_value": parameter("number", "Límite superior"), "complement": COMPLEMENT}),
    operation("filter_in_list", "Filtrar por lista", "Selecciona valores presentes en la lista conservando sus tipos.", {
        "column": COLUMN, "values": parameter("list", "Valores aceptados"), "complement": COMPLEMENT}),
    operation("filter_is_null", "Seleccionar nulos", "Conserva filas con valores nulos.", {"column": COLUMN, "complement": COMPLEMENT}),
    operation("select_not_none", "Seleccionar no nulos", "Conserva filas con valores no nulos.", {"column": COLUMN, "complement": COMPLEMENT}),
]
