import type { StepType } from "@/types/etl";
import type { TransformationDoc } from "../types";
import { example, parameter, table, transformation } from "./catalogBuilders";

// Synthetic examples checked against the dispatcher; production never imports test fixtures.
// Reused inputs make relationships between operations explicit.
const renameColumnsBefore = table({"a":[1],"b":[2]});
const renameColumnsAfter = table({"x":[1],"y":[2]});
const removeColumnsAfter = table({"b":[2]});
const prefixHeaderBefore = table({"a":[1]});
const convertToOrderedCategoryBefore = table({"level":["high","low"]});
const filterValueBefore = table({"v":[0,1,2]});
const filterInRangeAfter = table({"v":[1,2]});
const filterIsNullBefore = table({"v":[null,0,""]});
const searchInTableBefore = table({"a":["x","Alpha"],"b":["ALTO","y"]});
const groupByBefore = table({"g":["a","a","b"],"v":[2,4,9]});
const addNewColumnBefore = table({"v":[2,3]});
const leftJoinBefore = table({"id":[1,2],"a":[10,20]});
const leftJoinSecondary = table({"id":[2,3],"b":[200,300]});

export const transformationsCatalog = {
  rename_columns: transformation("rename_columns", {
    name: "Renombrar",
    family: "Cabeceras y estructura",
    description: "Para dar nombres claros a columnas antes de combinarlas o cargarlas.",
    parameters: [
      parameter("columns", "Record<string, string>", "Diccionario de {nombre_viejo: nombre_nuevo}"),
    ],
    rules: ["Los nombres finales deben ser únicos y no vacíos; la columna original debe existir antes de este paso."],
    troubleshooting: "Si una columna ya cambió de nombre, elige su nombre actual o mueve el renombre antes del paso que la utiliza.",
    example: example(
      {"columns":{"a":"x","b":"y"}},
      renameColumnsBefore,
      renameColumnsAfter,
    ),
  }),
  select_columns: transformation("select_columns", {
    name: "Mantener Cols",
    family: "Cabeceras y estructura",
    description: "Para conservar solo los campos que necesitas, en el orden elegido.",
    parameters: [
      parameter("columns", "string[]", "Lista de columnas a mantener"),
    ],
    rules: ["El orden de selección define las cabeceras de salida; las demás columnas se descartan."],
    troubleshooting: "Si falta un campo en un paso posterior, inclúyelo en la selección o revisa el orden de la receta.",
    example: example(
      {"columns":["c","a"]},
      table({"a":[1],"b":[2],"c":[3]}),
      table({"c":[3],"a":[1]}),
    ),
  }),
  remove_columns: transformation("remove_columns", {
    name: "Eliminar Cols",
    family: "Cabeceras y estructura",
    description: "Para retirar campos innecesarios del resultado.",
    parameters: [
      parameter("columns", "string | string[]", "Lista de columnas a eliminar o un string para una sola"),
    ],
    rules: ["Acepta una columna o una lista. No elimina columnas de la fuente original."],
    troubleshooting: "Si una expresión o cruce requiere una columna eliminada, retira ese nombre del paso o reordena la receta.",
    example: example(
      {"columns":"a"},
      renameColumnsBefore,
      removeColumnsAfter,
    ),
  }),
  replace_all_headers: transformation("replace_all_headers", {
    name: "Reemplazar Cabeceras",
    family: "Cabeceras y estructura",
    description: "Para sustituir todas las cabeceras de una tabla de una vez.",
    parameters: [
      parameter("new_headers", "string[]", "Lista de nombres de igual longitud al esquema"),
    ],
    rules: ["La lista debe tener exactamente un nombre por columna, en orden, sin duplicados ni nombres vacíos."],
    troubleshooting: "Si falla la cantidad de nombres, consulta las columnas de entrada de este paso y ajusta la lista JSON.",
    example: example(
      {"new_headers":["x","y"]},
      renameColumnsBefore,
      renameColumnsAfter,
    ),
  }),
  prefix_header: transformation("prefix_header", {
    name: "Agregar Prefijo",
    family: "Cabeceras y estructura",
    description: "Para identificar el origen o rol de todas las columnas.",
    parameters: [
      parameter("prefix", "string", "Prefijo"),
    ],
    rules: ["Se aplica a cada cabecera. El prefijo no puede quedar vacío."],
    troubleshooting: "Los pasos siguientes deben usar los nombres con prefijo; actualiza sus columnas o aplica el prefijo más tarde.",
    example: example(
      {"prefix":"pre_"},
      prefixHeaderBefore,
      table({"pre_a":[1]}),
    ),
  }),
  suffix_header: transformation("suffix_header", {
    name: "Agregar Sufijo",
    family: "Cabeceras y estructura",
    description: "Para distinguir columnas que representan una versión o unidad.",
    parameters: [
      parameter("suffix", "string", "Sufijo"),
    ],
    rules: ["Se aplica a todas las cabeceras. El sufijo no puede quedar vacío."],
    troubleshooting: "Si el editor indica una columna inexistente, selecciona el nombre completo con su nuevo sufijo.",
    example: example(
      {"suffix":"_suf"},
      prefixHeaderBefore,
      table({"a_suf":[1]}),
    ),
  }),
  add_sequential_index: transformation("add_sequential_index", {
    name: "Índice Secuencial",
    family: "Cabeceras y estructura",
    description: "Para numerar las filas en su orden actual.",
    parameters: [
      parameter("column_name", "string", "Nombre de columna", "\"index\""),
      parameter("start", "number (entero)", "Valor inicial, incluido cero", "1"),
    ],
    rules: ["Inicio entero, incluso cero o negativo. No sobrescribe una columna existente. El editor propone id; si se omite el nombre, el backend usa index. No garantiza un ID estable entre ejecuciones."],
    troubleshooting: "Si el nombre ya existe, elige otro. Ordena antes si la numeración debe seguir un criterio concreto.",
    example: example(
      {"column_name":"idx","start":0},
      table({"a":[5,6]}),
      table({"a":[5,6],"idx":[0,1]}),
    ),
  }),
  convert_types: transformation("convert_types", {
    name: "Cambiar Tipo",
    family: "Conversión y limpieza",
    description: "Para preparar números, texto, fechas o booleanos antes de calcular o cargar.",
    parameters: [
      parameter("columns", "string | string[]", "Lista de columnas a convertir o un string para una sola"),
      parameter("dtype", "string | Record<string, string>", "Tipo de dato destino o mapeo de columnas"),
    ],
    rules: ["Acepta un tipo para todas las columnas o un mapa por nombre. Tipos habituales: str, int64, float64, bool, datetime, category y object; también alias SQL como text, integer, numeric, date y timestamp. Las fechas no interpretables se convierten a nulo; otras conversiones pueden fallar. bool no interpreta automáticamente el texto false como falso."],
    troubleshooting: "Si hay texto no numérico, limpia o reemplaza esos valores antes de convertir. Comprueba los nulos antes de elegir un entero.",
    example: example(
      {"columns":"a","dtype":"int64"},
      table({"a":["1","2"]}),
      table({"a":[1,2]}),
    ),
  }),
  fill_nulls: transformation("fill_nulls", {
    name: "Rellenar Nulos",
    family: "Conversión y limpieza",
    description: "Para sustituir datos ausentes por un valor explícito.",
    parameters: [
      parameter("column", "string", "Columna a rellenar"),
      parameter("value", "JSON sin null", "Valor de reemplazo"),
    ],
    rules: ["0, false y texto vacío son rellenos válidos; null no lo es. No sustituye cadenas vacías que ya existían."],
    troubleshooting: "Para encontrar ausencias usa Filtrar Vacíos. Si el tipo rechaza el relleno, revisa el dtype y el valor elegido.",
    example: example(
      {"column":"a","value":0},
      table({"a":[null,2]}),
      table({"a":[0,2]}),
    ),
  }),
  clean_numeric_columns: transformation("clean_numeric_columns", {
    name: "Limpiar Números",
    family: "Conversión y limpieza",
    description: "Para convertir importes escritos con símbolos a números utilizables.",
    parameters: [
      parameter("columns", "string | string[]", "Columna o lista de columnas"),
    ],
    rules: ["Solo conserva dígitos, punto y signo menos; aplica coerción a número y deja nulo lo no convertible. No reconoce coma decimal: 1,50 puede resultar en 150; un porcentaje pierde el símbolo sin dividir por 100."],
    troubleshooting: "Normaliza primero el separador decimal cuando tus datos usen coma; después revisa los nuevos nulos en la preview.",
    example: example(
      {"columns":["v"]},
      table({"v":["$1,200.50","-2 USD","bad"]}),
      table({"v":[1200.5,-2,null]}),
    ),
  }),
  clean_date_format: transformation("clean_date_format", {
    name: "Estandarizar Fecha",
    family: "Conversión y limpieza",
    description: "Para presentar fechas en un formato uniforme.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("format_output", "string", "Formato strftime", "\"%Y-%m-%d\""),
    ],
    rules: ["El formato es Python strftime: %Y-%m-%d por defecto. Las entradas no interpretables quedan nulas; la salida formateada es texto."],
    troubleshooting: "Usa un formato Python válido y revisa fechas ambiguas de día/mes en la fuente antes de estandarizarlas.",
    example: example(
      {"column":"d"},
      table({"d":["2024-01-02","invalid"]}),
      table({"d":["2024-01-02",null]}),
    ),
  }),
  convert_to_ordered_category: transformation("convert_to_ordered_category", {
    name: "Categoría Ordenada",
    family: "Conversión y limpieza",
    description: "Para ordenar niveles como Bajo, Medio y Alto según una jerarquía.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("categories", "JsonValue[]", "Categorías en orden"),
      parameter("ordered", "boolean", "Aplicar orden", "true"),
    ],
    rules: ["La lista define las categorías permitidas y su orden; no debe estar vacía. Valores fuera de ella quedan nulos. Convertir a categoría no reordena filas: añade Ordenar Filas si lo necesitas."],
    troubleshooting: "Incluye todas las etiquetas válidas con su escritura exacta para evitar convertirlas en nulos.",
    example: example(
      {"column":"level","categories":["low","high"]},
      convertToOrderedCategoryBefore,
      convertToOrderedCategoryBefore,
    ),
  }),
  boolean_to_binary: transformation("boolean_to_binary", {
    name: "Booleano a Binario",
    family: "Conversión y limpieza",
    description: "Para representar indicadores booleanos como 1 y 0.",
    parameters: [
      parameter("columns", "string | string[]", "Columna o lista de columnas"),
    ],
    rules: ["Convierte la columna a enteros: true pasa a 1 y false a 0. No restringe otros números al rango binario; nulos o textos no convertibles pueden provocar un error. No es un clasificador de textos sí/no."],
    troubleshooting: "Normaliza primero los valores a booleanos reales y trata los nulos antes de convertir a enteros.",
    example: example(
      {"columns":["b"]},
      table({"b":[true,false]}),
      table({"b":[1,0]}),
    ),
  }),
  replace_values: transformation("replace_values", {
    name: "Reemplazar Valores",
    family: "Conversión y limpieza",
    description: "Para corregir un valor concreto de una columna.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("old_value", "JSON sin null", "Valor no nulo a sustituir"),
      parameter("new_value", "JSON sin null", "Valor no nulo de reemplazo; admite texto vacío"),
    ],
    rules: ["Admite 0, false y texto vacío. No acepta null como valor anterior o nuevo; usa Rellenar Nulos para ausencias. El dtype puede cambiar."],
    troubleshooting: "Selecciona el tipo de valor correcto: el texto 001 y el número 1 no expresan el mismo identificador.",
    example: example(
      {"column":"s","old_value":"old","new_value":""},
      table({"s":["old","other"]}),
      table({"s":["","other"]}),
    ),
  }),
  filter_value: transformation("filter_value", {
    name: "Filtrar Datos",
    family: "Filtros y búsqueda",
    description: "Para conservar filas que cumplen una comparación simple.",
    parameters: [
      parameter("column", "string", "Columna a evaluar"),
      parameter("value", "JSON sin null", "Valor de comparación"),
      parameter("operator", "string", "Operador lógico: 'eq' (=), 'ne' (!=), 'gt' (>), 'ge' (>=), 'lt' (<), 'le' (<=)", "\"eq\""),
    ],
    rules: ["Operadores: eq (=), ne (!=), gt (>), ge (>=), lt (<), le (<=); eq es el predeterminado. El editor y el servidor rechazan null aunque figure en el tipo general."],
    troubleshooting: "Para nulos usa Filtrar Vacíos; para números verifica que la columna y el valor sean numéricos.",
    example: example(
      {"column":"v","value":0},
      filterValueBefore,
      table({"v":[0]}),
    ),
  }),
  filter_in_range: transformation("filter_in_range", {
    name: "Filtrar por Rango",
    family: "Filtros y búsqueda",
    description: "Para limitar una medida a un intervalo.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("min_value", "number", "Límite inferior"),
      parameter("max_value", "number", "Límite superior"),
      parameter("complement", "boolean", "Invertir la selección", "false"),
    ],
    rules: ["Ambos extremos se incluyen. Mínimo debe ser menor o igual al máximo; complemento conserva lo que queda fuera."],
    troubleshooting: "Si no aparecen filas, revisa los límites y el tipo numérico antes de invertir el filtro.",
    example: example(
      {"column":"v","min_value":1,"max_value":2},
      table({"v":[0,1,2,3]}),
      filterInRangeAfter,
    ),
  }),
  filter_in_list: transformation("filter_in_list", {
    name: "Filtrar por Lista",
    family: "Filtros y búsqueda",
    description: "Para conservar un conjunto de códigos o valores seleccionados.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("values", "JsonValue[]", "Valores aceptados"),
      parameter("complement", "boolean", "Invertir la selección", "false"),
    ],
    rules: ["La lista JSON no puede estar vacía; complemento invierte la pertenencia. Conserva tipos al escribir identificadores como \"001\"."],
    troubleshooting: "Usa comillas dobles en el JSON para códigos de texto y revisa espacios en las etiquetas de origen.",
    example: example(
      {"column":"v","values":["001","2"]},
      table({"v":["001","1","2"]}),
      table({"v":["001","2"]}),
    ),
  }),
  filter_is_null: transformation("filter_is_null", {
    name: "Filtrar Vacíos",
    family: "Filtros y búsqueda",
    description: "Para localizar filas con valores ausentes.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("complement", "boolean", "Invertir la selección", "false"),
    ],
    rules: ["null es distinto de texto vacío, 0 y false. Con complemento se conservan las filas no nulas."],
    troubleshooting: "Si buscas celdas con texto vacío, usa Filtrar Datos con valor de texto vacío en lugar de este filtro.",
    example: example(
      {"column":"v"},
      filterIsNullBefore,
      table({"v":[null]}),
    ),
  }),
  select_not_none: transformation("select_not_none", {
    name: "Filtrar Completos",
    family: "Filtros y búsqueda",
    description: "Para conservar filas cuyo campo no sea nulo.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("complement", "boolean", "Invertir la selección", "false"),
    ],
    rules: ["Usa notna(): conserva 0, false y texto vacío. Complemento devuelve las filas nulas. No verifica calidad o completitud del texto."],
    troubleshooting: "Si también deseas quitar texto vacío, añade un filtro ne con texto vacío después de este paso.",
    example: example(
      {"column":"v"},
      filterIsNullBefore,
      table({"v":[0,""]}),
    ),
  }),
  search_in_column: transformation("search_in_column", {
    name: "Buscar en Columna",
    family: "Filtros y búsqueda",
    description: "Para buscar un patrón de texto dentro de una columna.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("pattern", "string", "Patrón de expresión regular"),
      parameter("complement", "boolean", "Invertir la selección", "false"),
      parameter("case_sensitive", "boolean", "Distinguir mayúsculas", "false"),
    ],
    rules: ["El patrón es una expresión regular Python evaluada en el servidor. Por defecto no distingue mayúsculas; complemento excluye coincidencias."],
    troubleshooting: "Si hay un error de patrón, revisa paréntesis y corchetes; escapa caracteres especiales para buscarlos literalmente.",
    example: example(
      {"column":"s","pattern":"^al"},
      table({"s":["Alpha","beta","ALTO"]}),
      table({"s":["Alpha","ALTO"]}),
    ),
  }),
  search_in_table: transformation("search_in_table", {
    name: "Buscar en Tabla",
    family: "Filtros y búsqueda",
    description: "Para encontrar filas con un patrón en cualquiera de sus campos.",
    parameters: [
      parameter("pattern", "string", "Patrón de expresión regular"),
      parameter("complement", "boolean", "Invertir la selección", "false"),
      parameter("case_sensitive", "boolean", "Distinguir mayúsculas", "false"),
    ],
    rules: ["Una coincidencia en cualquier columna basta. La evaluación convierte valores a texto; complemento invierte el resultado. El patrón no se ejecuta en el navegador."],
    troubleshooting: "Para limitar la búsqueda a un campo concreto usa Buscar en Columna y evita coincidencias en otras columnas.",
    example: example(
      {"pattern":"^al"},
      searchInTableBefore,
      searchInTableBefore,
    ),
  }),
  filter_by_list_length: transformation("filter_by_list_length", {
    name: "Filtrar por Longitud",
    family: "Filtros y búsqueda",
    description: "Para seleccionar listas con una cantidad determinada de elementos.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("length", "number | number[]", "Entero o lista de enteros no negativos"),
      parameter("keep_in", "boolean", "Conservar longitudes coincidentes", "true"),
    ],
    rules: ["Longitud es un entero no negativo o lista no vacía de enteros; admite 0. keep_in=false conserva las longitudes que no coinciden."],
    troubleshooting: "Convierte primero el texto delimitado a lista; no confundas longitud de lista con cantidad de caracteres de un texto.",
    example: example(
      {"column":"s","length":[0,2]},
      table({"s":[[],[1],[1,2]]}),
      table({"s":[[],[1,2]]}),
    ),
  }),
  split_column: transformation("split_column", {
    name: "Dividir Columna",
    family: "Listas, orden y duplicados",
    description: "Para separar una ubicación, código u otro texto compuesto en columnas.",
    parameters: [
      parameter("column", "string", "Columna a dividir"),
      parameter("delimiter", "string", "Carácter delimitador"),
      parameter("new_columns", "string[] | null", "Lista opcional con nombres de las nuevas columnas", "null · nombres automáticos"),
    ],
    rules: ["La columna original se conserva. Nombres opcionales únicos y sin colisiones; su cantidad debe coincidir con las partes generadas. Sin nombres se generan columna_1, columna_2, etc."],
    troubleshooting: "Si el número de nombres falla, revisa cuántas partes produce el delimitador en el conjunto de datos, no solo en la primera fila.",
    example: example(
      {"column":"s","delimiter":":","new_columns":["x","y"]},
      table({"s":["a:b","c:d"]}),
      table({"s":["a:b","c:d"],"x":["a","c"],"y":["b","d"]}),
    ),
  }),
  normalize_delimited_column: transformation("normalize_delimited_column", {
    name: "Normalizar Celda",
    family: "Listas, orden y duplicados",
    description: "Para obtener una fila por elemento manteniendo su contexto.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("delimiter", "string", "Separador", "\",\""),
      parameter("keep_original", "boolean", "Conservar la columna original", "true"),
    ],
    rules: ["Por defecto separa con coma y conserva la original. Genera <columna>_lista y expande sus elementos. Al desactivar conservar original elimina la columna de texto inicial."],
    troubleshooting: "Para datos con punto y coma indica ese delimitador; comprueba el nombre generado antes de añadir otros pasos.",
    example: example(
      {"column":"s","keep_original":true},
      table({"s":["a,b","c"]}),
      table({"s":["a,b","a,b","c"],"s_lista":["a","b","c"]}),
    ),
  }),
  convert_column_to_list: transformation("convert_column_to_list", {
    name: "Texto a Lista",
    family: "Listas, orden y duplicados",
    description: "Para preparar una columna delimitada antes de expandirla.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("delimiter", "string", "Separador", "\";\""),
      parameter("new_column", "string | null", "Columna nueva; si se omite reemplaza la original", "null · reemplaza la columna"),
    ],
    rules: ["Por defecto separa con punto y coma y sobrescribe la columna. new_column crea otra. Primero convierte a texto: los nulos pueden convertirse en texto; texto vacío produce una lista con un texto vacío."],
    troubleshooting: "Si necesitas conservar la cadena original, indica una nueva columna. Trata nulos antes de esta conversión.",
    example: example(
      {"column":"s","new_column":"parts"},
      table({"s":["a;b",""]}),
      table({"s":["a;b",""],"parts":[["a","b"],[""]]}),
    ),
  }),
  explode_column_list: transformation("explode_column_list", {
    name: "Desglosar Lista",
    family: "Listas, orden y duplicados",
    description: "Para convertir cada elemento de una lista en una fila.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
    ],
    rules: ["Debe haber listas válidas en la columna. Repite los demás campos y convierte los elementos a texto quitando espacios exteriores."],
    troubleshooting: "Si la columna es texto delimitado, usa Texto a Lista antes de expandirla.",
    example: example(
      {"column":"s"},
      table({"s":[["a","b"],["c"]]}),
      table({"s":["a","b","c"]}),
    ),
  }),
  split_column_into_rows: transformation("split_column_into_rows", {
    name: "Dividir en Filas",
    family: "Listas, orden y duplicados",
    description: "Para expandir texto delimitado directamente en filas.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("delimiter", "string", "Separador de valores"),
      parameter("new_column_name", "string | null", "Columna de salida", "null · usa el nombre original"),
      parameter("drop_original", "boolean", "Eliminar columna original si se crea otra", "false"),
    ],
    rules: ["Si no se indica otro nombre, la columna se reemplaza por sus partes. drop_original solo elimina la original cuando hay un nombre nuevo distinto. Las otras columnas se repiten."],
    troubleshooting: "Para conservar el texto completo, indica new_column_name y deja desactivado Eliminar original.",
    example: example(
      {"column":"s","delimiter":";","new_column_name":"part","drop_original":false},
      table({"s":["a;b","c"]}),
      table({"s":["a;b","a;b","c"],"part":["a","b","c"]}),
    ),
  }),
  sort_columns: transformation("sort_columns", {
    name: "Ordenar Filas",
    family: "Listas, orden y duplicados",
    description: "Para ordenar registros antes de numerarlos o compararlos.",
    parameters: [
      parameter("columns", "string | string[]", "Columna o lista de columnas"),
      parameter("ascending", "boolean", "Orden ascendente", "true"),
    ],
    rules: ["Ordena filas, no cabeceras. Admite una o varias columnas; ascending se aplica a todas y es true por defecto."],
    troubleshooting: "Si necesitas reordenar cabeceras, usa Mantener Cols. Verifica tipos cuando el orden de números parece alfabético.",
    example: example(
      {"columns":"v"},
      table({"v":[2,1],"a":["b","c"]}),
      table({"v":[1,2],"a":["c","b"]}),
    ),
  }),
  sort_by: transformation("sort_by", {
    name: "Ordenar Registros",
    family: "Listas, orden y duplicados",
    description: "Para ordenar filas por una o varias claves.",
    parameters: [
      parameter("columns", "string | string[]", "Columna o lista de columnas"),
      parameter("ascending", "boolean", "Orden ascendente", "true"),
    ],
    rules: ["Tiene un tipo de operación independiente, pero no promete optimizaciones especiales de índices respecto a Ordenar Filas. ascending es un booleano global."],
    troubleshooting: "Convierte primero los números guardados como texto si el orden no coincide con el numérico esperado.",
    example: example(
      {"columns":["v"],"ascending":false},
      filterInRangeAfter,
      table({"v":[2,1]}),
    ),
  }),
  drop_duplicates: transformation("drop_duplicates", {
    name: "Eliminar Duplicados",
    family: "Listas, orden y duplicados",
    description: "Para dejar una sola aparición de cada registro o clave.",
    parameters: [
      parameter("subset", "string | string[] | null", "Columna o lista; null compara todas", "null · todas las columnas"),
    ],
    rules: ["Sin subconjunto compara todas las columnas. Conserva la primera aparición; un subconjunto compara solo esas claves y puede descartar filas con otros valores diferentes."],
    troubleshooting: "Ordena antes si necesitas decidir qué aparición conservar. Revisa el subconjunto para no perder registros válidos.",
    example: example(
      {},
      table({"a":[1,1,2],"b":["x","x","y"]}),
      table({"a":[1,2],"b":["x","y"]}),
    ),
  }),
  group_by: transformation("group_by", {
    name: "Agrupar (Promedio)",
    family: "Agregación y expresiones",
    description: "Para resumir una medida numérica con su promedio por grupo.",
    parameters: [
      parameter("by", "string | string[]", "Columna o columnas por las cuales agrupar (string o lista)"),
      parameter("column", "string", "Columna numérica a promediar"),
    ],
    rules: ["La salida contiene las columnas de agrupación y la medida agregada; se pierden los demás campos. Las claves nulas pueden quedar fuera de la agrupación."],
    troubleshooting: "Convierte la medida a número y selecciona todas las claves necesarias antes de agrupar.",
    example: example(
      {"by":"g","column":"v"},
      groupByBefore,
      table({"g":["a","b"],"v":[3,9]}),
    ),
  }),
  group_by_sum: transformation("group_by_sum", {
    name: "Agrupar por Suma",
    family: "Agregación y expresiones",
    description: "Para obtener el total de una medida por grupo.",
    parameters: [
      parameter("by", "string | string[]", "Columna o lista de columnas para agrupar"),
      parameter("column", "string", "Nombre de la columna de entrada"),
    ],
    rules: ["Produce una suma por grupo, no un acumulado fila a fila. Conserva las claves y la columna sumada; no las demás."],
    troubleshooting: "Si los resultados concatenan texto o fallan, convierte la medida a número antes de sumar.",
    example: example(
      {"by":["g"],"column":"v"},
      groupByBefore,
      table({"g":["a","b"],"v":[6,9]}),
    ),
  }),
  group_by_count: transformation("group_by_count", {
    name: "Agrupar por Conteo",
    family: "Agregación y expresiones",
    description: "Para contar registros por combinación de claves.",
    parameters: [
      parameter("by", "string | string[]", "Columna o lista de columnas para agrupar"),
    ],
    rules: ["Cuenta filas y crea la columna conteo. No requiere una columna de valores ni calcula un conteo distinto."],
    troubleshooting: "Si necesitas contar entidades únicas, elimina duplicados por esas entidades antes de agrupar.",
    example: example(
      {"by":"g"},
      table({"g":["a","a","b"]}),
      table({"g":["a","b"],"conteo":[2,1]}),
    ),
  }),
  group_by_shift: transformation("group_by_shift", {
    name: "Desfase Temporal",
    family: "Agregación y expresiones",
    description: "Para comparar una fila con valores previos o siguientes dentro de un grupo.",
    parameters: [
      parameter("by", "string | string[]", "Columna o lista de columnas para agrupar"),
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("new_column_name", "string", "Columna de salida"),
      parameter("periods", "number (entero)", "Periodos de desplazamiento, incluido cero", "1"),
    ],
    rules: ["Desplaza según el orden actual; no ordena por fecha ni calcula diferencias. periods es entero, admite negativos y cero; por defecto 1. Los extremos sin valor previo/siguiente quedan nulos."],
    troubleshooting: "Ordena por grupo y fecha antes del desfase. Para variaciones, añade después una columna calculada.",
    example: example(
      {"by":"g","column":"v","new_column_name":"prev","periods":0},
      table({"g":["a","a"],"v":[2,4]}),
      table({"g":["a","a"],"v":[2,4],"prev":[2,4]}),
    ),
  }),
  add_new_column: transformation("add_new_column", {
    name: "Columna Calculada",
    family: "Agregación y expresiones",
    description: "Para calcular una medida o etiqueta a partir de los campos de cada fila.",
    parameters: [
      parameter("new_column_name", "string", "Nombre de la columna creada"),
      parameter("expression", "string", "Expresión Python evaluada por el servidor"),
    ],
    rules: ["Usa nombres de columnas como variables: v * 2. Funciones disponibles: abs, round, str, int, float, len y bool. Nombre nuevo sin colisiones. Se evalúa en el servidor, no es un intérprete Python general."],
    troubleshooting: "Si hay NameError, revisa los nombres actuales y evita nombres con espacios como variables. Revisa divisiones por cero y nulos.",
    example: example(
      {"new_column_name":"double","expression":"v * 2"},
      addNewColumnBefore,
      table({"v":[2,3],"double":[4,6]}),
    ),
  }),
  transform_column: transformation("transform_column", {
    name: "Transformar Col",
    family: "Agregación y expresiones",
    description: "Para modificar cada celda de una columna con una expresión.",
    parameters: [
      parameter("column", "string", "Nombre de la columna de entrada"),
      parameter("expression", "string", "Expresión Python evaluada por el servidor"),
    ],
    rules: ["x representa la celda actual: x * 2 o str(x).upper(). Se admiten las mismas funciones básicas que en Columna Calculada y se evalúa en el servidor."],
    troubleshooting: "Usa x y no el nombre de la columna. Si el valor puede ser nulo, contempla ese caso en la expresión.",
    example: example(
      {"column":"v","expression":"x * 2"},
      addNewColumnBefore,
      table({"v":[4,6]}),
    ),
  }),
  filter_by_condition: transformation("filter_by_condition", {
    name: "Filtro Condicional",
    family: "Agregación y expresiones",
    description: "Para conservar filas mediante una condición sobre varios campos.",
    parameters: [
      parameter("expression", "string", "Expresión Python evaluada por el servidor"),
    ],
    rules: ["Los nombres de columna son variables de fila: edad >= 18 and saldo > 0. La expresión debe dar un resultado interpretable como booleano; no ejecuta código en el navegador."],
    troubleshooting: "Comprueba sintaxis Python, nombres de columna y tipos. Valida la preview antes de cargar.",
    example: example(
      {"expression":"v > 0"},
      filterValueBefore,
      filterInRangeAfter,
    ),
  }),
  union: transformation("union", {
    name: "Unión Vertical",
    family: "Cruces y combinación",
    description: "Para apilar registros de otra fuente debajo de los actuales.",
    parameters: [
      parameter("secondary_source", "Fuente confirmada", "Configuración de origen del dataset secundario"),
    ],
    rules: ["Alinea columnas por nombre, conserva duplicados y rellena con nulos las columnas ausentes. No exige esquemas idénticos; no equivale a SQL UNION sin duplicados."],
    troubleshooting: "Si aparecen columnas duplicadas conceptualmente, renómbralas para que coincidan antes de unir; verifica compatibilidad de tipos.",
    example: example(
      {"secondary_source":"Fuente secundaria confirmada"},
      prefixHeaderBefore,
      table({"a":[1,null],"b":[null,2]}),
      removeColumnsAfter,
    ),
  }),
  left_join: transformation("left_join", {
    name: "Unión Horizontal · Left",
    family: "Cruces y combinación",
    description: "Para enriquecer todos los registros principales con datos de una fuente derecha.",
    parameters: [
      parameter("right_source", "Fuente confirmada", "Fuente secundaria con el mismo contrato que source"),
      parameter("on", "string | string[]", "Llave común; dos llaves comunes en ambos datasets; o [llave_izquierda, llave_derecha] si no son ambas comunes"),
    ],
    rules: ["Conserva la izquierda y completa con nulos donde no coincide. Una clave repetida a la derecha puede multiplicar las filas izquierdas.","En cruces, on=\"id\" usa una clave común; dos nombres compartidos por ambas tablas forman una clave compuesta. Si no son ambos compartidos, [\"id\", \"customer_id\"] representa clave izquierda y derecha. No se admiten múltiples pares con nombres distintos."],
    troubleshooting: "Si crece el número de filas, revisa duplicados de las claves derechas y la selección de claves de cruce.",
    example: example(
      {"right_source":"Fuente secundaria confirmada","on":"id"},
      leftJoinBefore,
      table({"id":[1,2],"a":[10,20],"b":[null,200]}),
      leftJoinSecondary,
    ),
  }),
  right_join: transformation("right_join", {
    name: "Unión Horizontal · Right",
    family: "Cruces y combinación",
    description: "Para conservar todos los registros de la fuente derecha al combinarlos.",
    parameters: [
      parameter("right_source", "Fuente confirmada", "Fuente secundaria con el mismo contrato que source"),
      parameter("on", "string | string[]", "Llave común; dos llaves comunes en ambos datasets; o [llave_izquierda, llave_derecha] si no son ambas comunes"),
    ],
    rules: ["Conserva la derecha; donde no hay coincidencia los campos izquierdos quedan nulos. Las coincidencias repetidas pueden multiplicar filas.","En cruces, on=\"id\" usa una clave común; dos nombres compartidos por ambas tablas forman una clave compuesta. Si no son ambos compartidos, [\"id\", \"customer_id\"] representa clave izquierda y derecha. No se admiten múltiples pares con nombres distintos."],
    troubleshooting: "Comprueba cuál es la fuente principal y cuál la derecha; no intercambies el rol de las claves.",
    example: example(
      {"right_source":"Fuente secundaria confirmada","on":"id"},
      leftJoinBefore,
      table({"id":[2,3],"a":[20,null],"b":[200,300]}),
      leftJoinSecondary,
    ),
  }),
  inner_join: transformation("inner_join", {
    name: "Unión Horizontal · Inner",
    family: "Cruces y combinación",
    description: "Para conservar solo registros con coincidencias entre ambas fuentes.",
    parameters: [
      parameter("right_source", "Fuente confirmada", "Fuente secundaria con el mismo contrato que source"),
      parameter("on", "string | string[]", "Llave común; dos llaves comunes en ambos datasets; o [llave_izquierda, llave_derecha] si no son ambas comunes"),
    ],
    rules: ["No equivale a deduplicar: varias coincidencias producen varias filas. Columnas homónimas ajenas a la clave reciben sufijos _x y _y.","En cruces, on=\"id\" usa una clave común; dos nombres compartidos por ambas tablas forman una clave compuesta. Si no son ambos compartidos, [\"id\", \"customer_id\"] representa clave izquierda y derecha. No se admiten múltiples pares con nombres distintos."],
    troubleshooting: "Si faltan filas, revisa tipos, espacios y valores de las claves antes de cambiar el tipo de cruce.",
    example: example(
      {"right_source":"Fuente secundaria confirmada","on":"id"},
      leftJoinBefore,
      table({"id":[2],"a":[20],"b":[200]}),
      leftJoinSecondary,
    ),
  }),
  outer_join: transformation("outer_join", {
    name: "Unión Horizontal · Outer",
    family: "Cruces y combinación",
    description: "Para conservar registros de ambas fuentes, coincidan o no.",
    parameters: [
      parameter("right_source", "Fuente confirmada", "Fuente secundaria con el mismo contrato que source"),
      parameter("on", "string | string[]", "Llave común; dos llaves comunes en ambos datasets; o [llave_izquierda, llave_derecha] si no son ambas comunes"),
    ],
    rules: ["Rellena ausencias con nulos. Claves repetidas pueden multiplicar filas; en el motor pandas claves nulas pueden coincidir entre sí, distinto de una comparación SQL habitual.","En cruces, on=\"id\" usa una clave común; dos nombres compartidos por ambas tablas forman una clave compuesta. Si no son ambos compartidos, [\"id\", \"customer_id\"] representa clave izquierda y derecha. No se admiten múltiples pares con nombres distintos."],
    troubleshooting: "No rellenes claves nulas con el mismo valor sin analizar el cruce: podrías generar coincidencias no deseadas.",
    example: example(
      {"right_source":"Fuente secundaria confirmada","on":"id"},
      leftJoinBefore,
      table({"id":[1,2,3],"a":[10,20,null],"b":[null,200,300]}),
      leftJoinSecondary,
    ),
  }),
} satisfies { [K in StepType]: TransformationDoc<K> };

export const transformations: TransformationDoc[] = Object.values(transformationsCatalog);
