import type { StepType } from "@/types/etl";
import type { TransformationDoc } from "../types";

// Synthetic examples checked against the transformation dispatcher. No API calls or test imports.
export const transformationsCatalog = {
  "rename_columns": {
    "type": "rename_columns",
    "name": "Renombrar",
    "family": "Cabeceras y estructura",
    "description": "Para dar nombres claros a columnas antes de combinarlas o cargarlas.",
    "parameters": [
      {
        "key": "columns",
        "type": "Record<string, string>",
        "description": "Diccionario de {nombre_viejo: nombre_nuevo}",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cabeceras y estructura → Renombrar.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Los nombres finales deben ser únicos y no vacíos; la columna original debe existir antes de este paso."
    ],
    "troubleshooting": "Si una columna ya cambió de nombre, elige su nombre actual o mueve el renombre antes del paso que la utiliza.",
    "example": {
      "params": {
        "columns": {
          "a": "x",
          "b": "y"
        }
      },
      "before": {
        "columns": [
          "a",
          "b"
        ],
        "rows": [
          {
            "a": 1,
            "b": 2
          }
        ]
      },
      "after": {
        "columns": [
          "x",
          "y"
        ],
        "rows": [
          {
            "x": 1,
            "y": 2
          }
        ]
      }
    }
  },
  "select_columns": {
    "type": "select_columns",
    "name": "Mantener Cols",
    "family": "Cabeceras y estructura",
    "description": "Para conservar solo los campos que necesitas, en el orden elegido.",
    "parameters": [
      {
        "key": "columns",
        "type": "string[]",
        "description": "Lista de columnas a mantener",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cabeceras y estructura → Mantener Cols.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "El orden de selección define las cabeceras de salida; las demás columnas se descartan."
    ],
    "troubleshooting": "Si falta un campo en un paso posterior, inclúyelo en la selección o revisa el orden de la receta.",
    "example": {
      "params": {
        "columns": [
          "c",
          "a"
        ]
      },
      "before": {
        "columns": [
          "a",
          "b",
          "c"
        ],
        "rows": [
          {
            "a": 1,
            "b": 2,
            "c": 3
          }
        ]
      },
      "after": {
        "columns": [
          "c",
          "a"
        ],
        "rows": [
          {
            "c": 3,
            "a": 1
          }
        ]
      }
    }
  },
  "remove_columns": {
    "type": "remove_columns",
    "name": "Eliminar Cols",
    "family": "Cabeceras y estructura",
    "description": "Para retirar campos innecesarios del resultado.",
    "parameters": [
      {
        "key": "columns",
        "type": "string | string[]",
        "description": "Lista de columnas a eliminar o un string para una sola",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cabeceras y estructura → Eliminar Cols.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Acepta una columna o una lista. No elimina columnas de la fuente original."
    ],
    "troubleshooting": "Si una expresión o cruce requiere una columna eliminada, retira ese nombre del paso o reordena la receta.",
    "example": {
      "params": {
        "columns": "a"
      },
      "before": {
        "columns": [
          "a",
          "b"
        ],
        "rows": [
          {
            "a": 1,
            "b": 2
          }
        ]
      },
      "after": {
        "columns": [
          "b"
        ],
        "rows": [
          {
            "b": 2
          }
        ]
      }
    }
  },
  "replace_all_headers": {
    "type": "replace_all_headers",
    "name": "Reemplazar Cabeceras",
    "family": "Cabeceras y estructura",
    "description": "Para sustituir todas las cabeceras de una tabla de una vez.",
    "parameters": [
      {
        "key": "new_headers",
        "type": "string[]",
        "description": "Lista de nombres de igual longitud al esquema",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cabeceras y estructura → Reemplazar Cabeceras.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "La lista debe tener exactamente un nombre por columna, en orden, sin duplicados ni nombres vacíos."
    ],
    "troubleshooting": "Si falla la cantidad de nombres, consulta las columnas de entrada de este paso y ajusta la lista JSON.",
    "example": {
      "params": {
        "new_headers": [
          "x",
          "y"
        ]
      },
      "before": {
        "columns": [
          "a",
          "b"
        ],
        "rows": [
          {
            "a": 1,
            "b": 2
          }
        ]
      },
      "after": {
        "columns": [
          "x",
          "y"
        ],
        "rows": [
          {
            "x": 1,
            "y": 2
          }
        ]
      }
    }
  },
  "prefix_header": {
    "type": "prefix_header",
    "name": "Agregar Prefijo",
    "family": "Cabeceras y estructura",
    "description": "Para identificar el origen o rol de todas las columnas.",
    "parameters": [
      {
        "key": "prefix",
        "type": "string",
        "description": "Prefijo",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cabeceras y estructura → Agregar Prefijo.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Se aplica a cada cabecera. El prefijo no puede quedar vacío."
    ],
    "troubleshooting": "Los pasos siguientes deben usar los nombres con prefijo; actualiza sus columnas o aplica el prefijo más tarde.",
    "example": {
      "params": {
        "prefix": "pre_"
      },
      "before": {
        "columns": [
          "a"
        ],
        "rows": [
          {
            "a": 1
          }
        ]
      },
      "after": {
        "columns": [
          "pre_a"
        ],
        "rows": [
          {
            "pre_a": 1
          }
        ]
      }
    }
  },
  "suffix_header": {
    "type": "suffix_header",
    "name": "Agregar Sufijo",
    "family": "Cabeceras y estructura",
    "description": "Para distinguir columnas que representan una versión o unidad.",
    "parameters": [
      {
        "key": "suffix",
        "type": "string",
        "description": "Sufijo",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cabeceras y estructura → Agregar Sufijo.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Se aplica a todas las cabeceras. El sufijo no puede quedar vacío."
    ],
    "troubleshooting": "Si el editor indica una columna inexistente, selecciona el nombre completo con su nuevo sufijo.",
    "example": {
      "params": {
        "suffix": "_suf"
      },
      "before": {
        "columns": [
          "a"
        ],
        "rows": [
          {
            "a": 1
          }
        ]
      },
      "after": {
        "columns": [
          "a_suf"
        ],
        "rows": [
          {
            "a_suf": 1
          }
        ]
      }
    }
  },
  "add_sequential_index": {
    "type": "add_sequential_index",
    "name": "Índice Secuencial",
    "family": "Cabeceras y estructura",
    "description": "Para numerar las filas en su orden actual.",
    "parameters": [
      {
        "key": "column_name",
        "type": "string",
        "description": "Nombre de columna",
        "required": false,
        "defaultLabel": "\"index\""
      },
      {
        "key": "start",
        "type": "number (entero)",
        "description": "Valor inicial, incluido cero",
        "required": false,
        "defaultLabel": "1"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cabeceras y estructura → Índice Secuencial.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Inicio entero, incluso cero o negativo. No sobrescribe una columna existente. El editor propone id; si se omite el nombre, el backend usa index. No garantiza un ID estable entre ejecuciones."
    ],
    "troubleshooting": "Si el nombre ya existe, elige otro. Ordena antes si la numeración debe seguir un criterio concreto.",
    "example": {
      "params": {
        "column_name": "idx",
        "start": 0
      },
      "before": {
        "columns": [
          "a"
        ],
        "rows": [
          {
            "a": 5
          },
          {
            "a": 6
          }
        ]
      },
      "after": {
        "columns": [
          "a",
          "idx"
        ],
        "rows": [
          {
            "a": 5,
            "idx": 0
          },
          {
            "a": 6,
            "idx": 1
          }
        ]
      }
    }
  },
  "convert_types": {
    "type": "convert_types",
    "name": "Cambiar Tipo",
    "family": "Conversión y limpieza",
    "description": "Para preparar números, texto, fechas o booleanos antes de calcular o cargar.",
    "parameters": [
      {
        "key": "columns",
        "type": "string | string[]",
        "description": "Lista de columnas a convertir o un string para una sola",
        "required": true
      },
      {
        "key": "dtype",
        "type": "string | Record<string, string>",
        "description": "Tipo de dato destino o mapeo de columnas",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Conversión y limpieza → Cambiar Tipo.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Acepta un tipo para todas las columnas o un mapa por nombre. Tipos habituales: str, int64, float64, bool, datetime, category y object; también alias SQL como text, integer, numeric, date y timestamp. Las fechas no interpretables se convierten a nulo; otras conversiones pueden fallar. bool no interpreta automáticamente el texto false como falso."
    ],
    "troubleshooting": "Si hay texto no numérico, limpia o reemplaza esos valores antes de convertir. Comprueba los nulos antes de elegir un entero.",
    "example": {
      "params": {
        "columns": "a",
        "dtype": "int64"
      },
      "before": {
        "columns": [
          "a"
        ],
        "rows": [
          {
            "a": "1"
          },
          {
            "a": "2"
          }
        ]
      },
      "after": {
        "columns": [
          "a"
        ],
        "rows": [
          {
            "a": 1
          },
          {
            "a": 2
          }
        ]
      }
    }
  },
  "fill_nulls": {
    "type": "fill_nulls",
    "name": "Rellenar Nulos",
    "family": "Conversión y limpieza",
    "description": "Para sustituir datos ausentes por un valor explícito.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Columna a rellenar",
        "required": true
      },
      {
        "key": "value",
        "type": "JSON sin null",
        "description": "Valor de reemplazo",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Conversión y limpieza → Rellenar Nulos.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "0, false y texto vacío son rellenos válidos; null no lo es. No sustituye cadenas vacías que ya existían."
    ],
    "troubleshooting": "Para encontrar ausencias usa Filtrar Vacíos. Si el tipo rechaza el relleno, revisa el dtype y el valor elegido.",
    "example": {
      "params": {
        "column": "a",
        "value": 0
      },
      "before": {
        "columns": [
          "a"
        ],
        "rows": [
          {
            "a": null
          },
          {
            "a": 2
          }
        ]
      },
      "after": {
        "columns": [
          "a"
        ],
        "rows": [
          {
            "a": 0
          },
          {
            "a": 2
          }
        ]
      }
    }
  },
  "clean_numeric_columns": {
    "type": "clean_numeric_columns",
    "name": "Limpiar Números",
    "family": "Conversión y limpieza",
    "description": "Para convertir importes escritos con símbolos a números utilizables.",
    "parameters": [
      {
        "key": "columns",
        "type": "string | string[]",
        "description": "Columna o lista de columnas",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Conversión y limpieza → Limpiar Números.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Solo conserva dígitos, punto y signo menos; aplica coerción a número y deja nulo lo no convertible. No reconoce coma decimal: 1,50 puede resultar en 150; un porcentaje pierde el símbolo sin dividir por 100."
    ],
    "troubleshooting": "Normaliza primero el separador decimal cuando tus datos usen coma; después revisa los nuevos nulos en la preview.",
    "example": {
      "params": {
        "columns": [
          "v"
        ]
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": "$1,200.50"
          },
          {
            "v": "-2 USD"
          },
          {
            "v": "bad"
          }
        ]
      },
      "after": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 1200.5
          },
          {
            "v": -2
          },
          {
            "v": null
          }
        ]
      }
    }
  },
  "clean_date_format": {
    "type": "clean_date_format",
    "name": "Estandarizar Fecha",
    "family": "Conversión y limpieza",
    "description": "Para presentar fechas en un formato uniforme.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "format_output",
        "type": "string",
        "description": "Formato strftime",
        "required": false,
        "defaultLabel": "\"%Y-%m-%d\""
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Conversión y limpieza → Estandarizar Fecha.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "El formato es Python strftime: %Y-%m-%d por defecto. Las entradas no interpretables quedan nulas; la salida formateada es texto."
    ],
    "troubleshooting": "Usa un formato Python válido y revisa fechas ambiguas de día/mes en la fuente antes de estandarizarlas.",
    "example": {
      "params": {
        "column": "d"
      },
      "before": {
        "columns": [
          "d"
        ],
        "rows": [
          {
            "d": "2024-01-02"
          },
          {
            "d": "invalid"
          }
        ]
      },
      "after": {
        "columns": [
          "d"
        ],
        "rows": [
          {
            "d": "2024-01-02"
          },
          {
            "d": null
          }
        ]
      }
    }
  },
  "convert_to_ordered_category": {
    "type": "convert_to_ordered_category",
    "name": "Categoría Ordenada",
    "family": "Conversión y limpieza",
    "description": "Para ordenar niveles como Bajo, Medio y Alto según una jerarquía.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "categories",
        "type": "JsonValue[]",
        "description": "Categorías en orden",
        "required": true
      },
      {
        "key": "ordered",
        "type": "boolean",
        "description": "Aplicar orden",
        "required": false,
        "defaultLabel": "true"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Conversión y limpieza → Categoría Ordenada.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "La lista define las categorías permitidas y su orden; no debe estar vacía. Valores fuera de ella quedan nulos. Convertir a categoría no reordena filas: añade Ordenar Filas si lo necesitas."
    ],
    "troubleshooting": "Incluye todas las etiquetas válidas con su escritura exacta para evitar convertirlas en nulos.",
    "example": {
      "params": {
        "column": "level",
        "categories": [
          "low",
          "high"
        ]
      },
      "before": {
        "columns": [
          "level"
        ],
        "rows": [
          {
            "level": "high"
          },
          {
            "level": "low"
          }
        ]
      },
      "after": {
        "columns": [
          "level"
        ],
        "rows": [
          {
            "level": "high"
          },
          {
            "level": "low"
          }
        ]
      }
    }
  },
  "boolean_to_binary": {
    "type": "boolean_to_binary",
    "name": "Booleano a Binario",
    "family": "Conversión y limpieza",
    "description": "Para representar indicadores booleanos como 1 y 0.",
    "parameters": [
      {
        "key": "columns",
        "type": "string | string[]",
        "description": "Columna o lista de columnas",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Conversión y limpieza → Booleano a Binario.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Convierte la columna a enteros: true pasa a 1 y false a 0. No restringe otros números al rango binario; nulos o textos no convertibles pueden provocar un error. No es un clasificador de textos sí/no."
    ],
    "troubleshooting": "Normaliza primero los valores a booleanos reales y trata los nulos antes de convertir a enteros.",
    "example": {
      "params": {
        "columns": [
          "b"
        ]
      },
      "before": {
        "columns": [
          "b"
        ],
        "rows": [
          {
            "b": true
          },
          {
            "b": false
          }
        ]
      },
      "after": {
        "columns": [
          "b"
        ],
        "rows": [
          {
            "b": 1
          },
          {
            "b": 0
          }
        ]
      }
    }
  },
  "replace_values": {
    "type": "replace_values",
    "name": "Reemplazar Valores",
    "family": "Conversión y limpieza",
    "description": "Para corregir un valor concreto de una columna.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "old_value",
        "type": "JSON sin null",
        "description": "Valor no nulo a sustituir",
        "required": true
      },
      {
        "key": "new_value",
        "type": "JSON sin null",
        "description": "Valor no nulo de reemplazo; admite texto vacío",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Conversión y limpieza → Reemplazar Valores.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Admite 0, false y texto vacío. No acepta null como valor anterior o nuevo; usa Rellenar Nulos para ausencias. El dtype puede cambiar."
    ],
    "troubleshooting": "Selecciona el tipo de valor correcto: el texto 001 y el número 1 no expresan el mismo identificador.",
    "example": {
      "params": {
        "column": "s",
        "old_value": "old",
        "new_value": ""
      },
      "before": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": "old"
          },
          {
            "s": "other"
          }
        ]
      },
      "after": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": ""
          },
          {
            "s": "other"
          }
        ]
      }
    }
  },
  "filter_value": {
    "type": "filter_value",
    "name": "Filtrar Datos",
    "family": "Filtros y búsqueda",
    "description": "Para conservar filas que cumplen una comparación simple.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Columna a evaluar",
        "required": true
      },
      {
        "key": "value",
        "type": "JSON sin null",
        "description": "Valor de comparación",
        "required": true
      },
      {
        "key": "operator",
        "type": "string",
        "description": "Operador lógico: 'eq' (=), 'ne' (!=), 'gt' (>), 'ge' (>=), 'lt' (<), 'le' (<=)",
        "required": false,
        "defaultLabel": "\"eq\""
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Filtros y búsqueda → Filtrar Datos.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Operadores: eq (=), ne (!=), gt (>), ge (>=), lt (<), le (<=); eq es el predeterminado. El editor y el servidor rechazan null aunque figure en el tipo general."
    ],
    "troubleshooting": "Para nulos usa Filtrar Vacíos; para números verifica que la columna y el valor sean numéricos.",
    "example": {
      "params": {
        "column": "v",
        "value": 0
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 0
          },
          {
            "v": 1
          },
          {
            "v": 2
          }
        ]
      },
      "after": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 0
          }
        ]
      }
    }
  },
  "filter_in_range": {
    "type": "filter_in_range",
    "name": "Filtrar por Rango",
    "family": "Filtros y búsqueda",
    "description": "Para limitar una medida a un intervalo.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "min_value",
        "type": "number",
        "description": "Límite inferior",
        "required": true
      },
      {
        "key": "max_value",
        "type": "number",
        "description": "Límite superior",
        "required": true
      },
      {
        "key": "complement",
        "type": "boolean",
        "description": "Invertir la selección",
        "required": false,
        "defaultLabel": "false"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Filtros y búsqueda → Filtrar por Rango.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Ambos extremos se incluyen. Mínimo debe ser menor o igual al máximo; complemento conserva lo que queda fuera."
    ],
    "troubleshooting": "Si no aparecen filas, revisa los límites y el tipo numérico antes de invertir el filtro.",
    "example": {
      "params": {
        "column": "v",
        "min_value": 1,
        "max_value": 2
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 0
          },
          {
            "v": 1
          },
          {
            "v": 2
          },
          {
            "v": 3
          }
        ]
      },
      "after": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 1
          },
          {
            "v": 2
          }
        ]
      }
    }
  },
  "filter_in_list": {
    "type": "filter_in_list",
    "name": "Filtrar por Lista",
    "family": "Filtros y búsqueda",
    "description": "Para conservar un conjunto de códigos o valores seleccionados.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "values",
        "type": "JsonValue[]",
        "description": "Valores aceptados",
        "required": true
      },
      {
        "key": "complement",
        "type": "boolean",
        "description": "Invertir la selección",
        "required": false,
        "defaultLabel": "false"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Filtros y búsqueda → Filtrar por Lista.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "La lista JSON no puede estar vacía; complemento invierte la pertenencia. Conserva tipos al escribir identificadores como \"001\"."
    ],
    "troubleshooting": "Usa comillas dobles en el JSON para códigos de texto y revisa espacios en las etiquetas de origen.",
    "example": {
      "params": {
        "column": "v",
        "values": [
          "001",
          "2"
        ]
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": "001"
          },
          {
            "v": "1"
          },
          {
            "v": "2"
          }
        ]
      },
      "after": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": "001"
          },
          {
            "v": "2"
          }
        ]
      }
    }
  },
  "filter_is_null": {
    "type": "filter_is_null",
    "name": "Filtrar Vacíos",
    "family": "Filtros y búsqueda",
    "description": "Para localizar filas con valores ausentes.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "complement",
        "type": "boolean",
        "description": "Invertir la selección",
        "required": false,
        "defaultLabel": "false"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Filtros y búsqueda → Filtrar Vacíos.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "null es distinto de texto vacío, 0 y false. Con complemento se conservan las filas no nulas."
    ],
    "troubleshooting": "Si buscas celdas con texto vacío, usa Filtrar Datos con valor de texto vacío en lugar de este filtro.",
    "example": {
      "params": {
        "column": "v"
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": null
          },
          {
            "v": 0
          },
          {
            "v": ""
          }
        ]
      },
      "after": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": null
          }
        ]
      }
    }
  },
  "select_not_none": {
    "type": "select_not_none",
    "name": "Filtrar Completos",
    "family": "Filtros y búsqueda",
    "description": "Para conservar filas cuyo campo no sea nulo.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "complement",
        "type": "boolean",
        "description": "Invertir la selección",
        "required": false,
        "defaultLabel": "false"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Filtros y búsqueda → Filtrar Completos.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Usa notna(): conserva 0, false y texto vacío. Complemento devuelve las filas nulas. No verifica calidad o completitud del texto."
    ],
    "troubleshooting": "Si también deseas quitar texto vacío, añade un filtro ne con texto vacío después de este paso.",
    "example": {
      "params": {
        "column": "v"
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": null
          },
          {
            "v": 0
          },
          {
            "v": ""
          }
        ]
      },
      "after": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 0
          },
          {
            "v": ""
          }
        ]
      }
    }
  },
  "search_in_column": {
    "type": "search_in_column",
    "name": "Buscar en Columna",
    "family": "Filtros y búsqueda",
    "description": "Para buscar un patrón de texto dentro de una columna.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "pattern",
        "type": "string",
        "description": "Patrón de expresión regular",
        "required": true
      },
      {
        "key": "complement",
        "type": "boolean",
        "description": "Invertir la selección",
        "required": false,
        "defaultLabel": "false"
      },
      {
        "key": "case_sensitive",
        "type": "boolean",
        "description": "Distinguir mayúsculas",
        "required": false,
        "defaultLabel": "false"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Filtros y búsqueda → Buscar en Columna.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "El patrón es una expresión regular Python evaluada en el servidor. Por defecto no distingue mayúsculas; complemento excluye coincidencias."
    ],
    "troubleshooting": "Si hay un error de patrón, revisa paréntesis y corchetes; escapa caracteres especiales para buscarlos literalmente.",
    "example": {
      "params": {
        "column": "s",
        "pattern": "^al"
      },
      "before": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": "Alpha"
          },
          {
            "s": "beta"
          },
          {
            "s": "ALTO"
          }
        ]
      },
      "after": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": "Alpha"
          },
          {
            "s": "ALTO"
          }
        ]
      }
    }
  },
  "search_in_table": {
    "type": "search_in_table",
    "name": "Buscar en Tabla",
    "family": "Filtros y búsqueda",
    "description": "Para encontrar filas con un patrón en cualquiera de sus campos.",
    "parameters": [
      {
        "key": "pattern",
        "type": "string",
        "description": "Patrón de expresión regular",
        "required": true
      },
      {
        "key": "complement",
        "type": "boolean",
        "description": "Invertir la selección",
        "required": false,
        "defaultLabel": "false"
      },
      {
        "key": "case_sensitive",
        "type": "boolean",
        "description": "Distinguir mayúsculas",
        "required": false,
        "defaultLabel": "false"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Filtros y búsqueda → Buscar en Tabla.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Una coincidencia en cualquier columna basta. La evaluación convierte valores a texto; complemento invierte el resultado. El patrón no se ejecuta en el navegador."
    ],
    "troubleshooting": "Para limitar la búsqueda a un campo concreto usa Buscar en Columna y evita coincidencias en otras columnas.",
    "example": {
      "params": {
        "pattern": "^al"
      },
      "before": {
        "columns": [
          "a",
          "b"
        ],
        "rows": [
          {
            "a": "x",
            "b": "ALTO"
          },
          {
            "a": "Alpha",
            "b": "y"
          }
        ]
      },
      "after": {
        "columns": [
          "a",
          "b"
        ],
        "rows": [
          {
            "a": "x",
            "b": "ALTO"
          },
          {
            "a": "Alpha",
            "b": "y"
          }
        ]
      }
    }
  },
  "filter_by_list_length": {
    "type": "filter_by_list_length",
    "name": "Filtrar por Longitud",
    "family": "Filtros y búsqueda",
    "description": "Para seleccionar listas con una cantidad determinada de elementos.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "length",
        "type": "number | number[]",
        "description": "Entero o lista de enteros no negativos",
        "required": true
      },
      {
        "key": "keep_in",
        "type": "boolean",
        "description": "Conservar longitudes coincidentes",
        "required": false,
        "defaultLabel": "true"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Filtros y búsqueda → Filtrar por Longitud.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Longitud es un entero no negativo o lista no vacía de enteros; admite 0. keep_in=false conserva las longitudes que no coinciden."
    ],
    "troubleshooting": "Convierte primero el texto delimitado a lista; no confundas longitud de lista con cantidad de caracteres de un texto.",
    "example": {
      "params": {
        "column": "s",
        "length": [
          0,
          2
        ]
      },
      "before": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": []
          },
          {
            "s": [
              1
            ]
          },
          {
            "s": [
              1,
              2
            ]
          }
        ]
      },
      "after": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": []
          },
          {
            "s": [
              1,
              2
            ]
          }
        ]
      }
    }
  },
  "split_column": {
    "type": "split_column",
    "name": "Dividir Columna",
    "family": "Listas, orden y duplicados",
    "description": "Para separar una ubicación, código u otro texto compuesto en columnas.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Columna a dividir",
        "required": true
      },
      {
        "key": "delimiter",
        "type": "string",
        "description": "Carácter delimitador",
        "required": true
      },
      {
        "key": "new_columns",
        "type": "string[] | null",
        "description": "Lista opcional con nombres de las nuevas columnas",
        "required": false,
        "defaultLabel": "null · nombres automáticos"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Listas, orden y duplicados → Dividir Columna.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "La columna original se conserva. Nombres opcionales únicos y sin colisiones; su cantidad debe coincidir con las partes generadas. Sin nombres se generan columna_1, columna_2, etc."
    ],
    "troubleshooting": "Si el número de nombres falla, revisa cuántas partes produce el delimitador en el conjunto de datos, no solo en la primera fila.",
    "example": {
      "params": {
        "column": "s",
        "delimiter": ":",
        "new_columns": [
          "x",
          "y"
        ]
      },
      "before": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": "a:b"
          },
          {
            "s": "c:d"
          }
        ]
      },
      "after": {
        "columns": [
          "s",
          "x",
          "y"
        ],
        "rows": [
          {
            "s": "a:b",
            "x": "a",
            "y": "b"
          },
          {
            "s": "c:d",
            "x": "c",
            "y": "d"
          }
        ]
      }
    }
  },
  "normalize_delimited_column": {
    "type": "normalize_delimited_column",
    "name": "Normalizar Celda",
    "family": "Listas, orden y duplicados",
    "description": "Para obtener una fila por elemento manteniendo su contexto.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "delimiter",
        "type": "string",
        "description": "Separador",
        "required": false,
        "defaultLabel": "\",\""
      },
      {
        "key": "keep_original",
        "type": "boolean",
        "description": "Conservar la columna original",
        "required": false,
        "defaultLabel": "true"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Listas, orden y duplicados → Normalizar Celda.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Por defecto separa con coma y conserva la original. Genera <columna>_lista y expande sus elementos. Al desactivar conservar original elimina la columna de texto inicial."
    ],
    "troubleshooting": "Para datos con punto y coma indica ese delimitador; comprueba el nombre generado antes de añadir otros pasos.",
    "example": {
      "params": {
        "column": "s",
        "keep_original": true
      },
      "before": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": "a,b"
          },
          {
            "s": "c"
          }
        ]
      },
      "after": {
        "columns": [
          "s",
          "s_lista"
        ],
        "rows": [
          {
            "s": "a,b",
            "s_lista": "a"
          },
          {
            "s": "a,b",
            "s_lista": "b"
          },
          {
            "s": "c",
            "s_lista": "c"
          }
        ]
      }
    }
  },
  "convert_column_to_list": {
    "type": "convert_column_to_list",
    "name": "Texto a Lista",
    "family": "Listas, orden y duplicados",
    "description": "Para preparar una columna delimitada antes de expandirla.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "delimiter",
        "type": "string",
        "description": "Separador",
        "required": false,
        "defaultLabel": "\";\""
      },
      {
        "key": "new_column",
        "type": "string | null",
        "description": "Columna nueva; si se omite reemplaza la original",
        "required": false,
        "defaultLabel": "null · reemplaza la columna"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Listas, orden y duplicados → Texto a Lista.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Por defecto separa con punto y coma y sobrescribe la columna. new_column crea otra. Primero convierte a texto: los nulos pueden convertirse en texto; texto vacío produce una lista con un texto vacío."
    ],
    "troubleshooting": "Si necesitas conservar la cadena original, indica una nueva columna. Trata nulos antes de esta conversión.",
    "example": {
      "params": {
        "column": "s",
        "new_column": "parts"
      },
      "before": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": "a;b"
          },
          {
            "s": ""
          }
        ]
      },
      "after": {
        "columns": [
          "s",
          "parts"
        ],
        "rows": [
          {
            "s": "a;b",
            "parts": [
              "a",
              "b"
            ]
          },
          {
            "s": "",
            "parts": [
              ""
            ]
          }
        ]
      }
    }
  },
  "explode_column_list": {
    "type": "explode_column_list",
    "name": "Desglosar Lista",
    "family": "Listas, orden y duplicados",
    "description": "Para convertir cada elemento de una lista en una fila.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Listas, orden y duplicados → Desglosar Lista.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Debe haber listas válidas en la columna. Repite los demás campos y convierte los elementos a texto quitando espacios exteriores."
    ],
    "troubleshooting": "Si la columna es texto delimitado, usa Texto a Lista antes de expandirla.",
    "example": {
      "params": {
        "column": "s"
      },
      "before": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": [
              "a",
              "b"
            ]
          },
          {
            "s": [
              "c"
            ]
          }
        ]
      },
      "after": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": "a"
          },
          {
            "s": "b"
          },
          {
            "s": "c"
          }
        ]
      }
    }
  },
  "split_column_into_rows": {
    "type": "split_column_into_rows",
    "name": "Dividir en Filas",
    "family": "Listas, orden y duplicados",
    "description": "Para expandir texto delimitado directamente en filas.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "delimiter",
        "type": "string",
        "description": "Separador de valores",
        "required": true
      },
      {
        "key": "new_column_name",
        "type": "string | null",
        "description": "Columna de salida",
        "required": false,
        "defaultLabel": "null · usa el nombre original"
      },
      {
        "key": "drop_original",
        "type": "boolean",
        "description": "Eliminar columna original si se crea otra",
        "required": false,
        "defaultLabel": "false"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Listas, orden y duplicados → Dividir en Filas.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Si no se indica otro nombre, la columna se reemplaza por sus partes. drop_original solo elimina la original cuando hay un nombre nuevo distinto. Las otras columnas se repiten."
    ],
    "troubleshooting": "Para conservar el texto completo, indica new_column_name y deja desactivado Eliminar original.",
    "example": {
      "params": {
        "column": "s",
        "delimiter": ";",
        "new_column_name": "part",
        "drop_original": false
      },
      "before": {
        "columns": [
          "s"
        ],
        "rows": [
          {
            "s": "a;b"
          },
          {
            "s": "c"
          }
        ]
      },
      "after": {
        "columns": [
          "s",
          "part"
        ],
        "rows": [
          {
            "s": "a;b",
            "part": "a"
          },
          {
            "s": "a;b",
            "part": "b"
          },
          {
            "s": "c",
            "part": "c"
          }
        ]
      }
    }
  },
  "sort_columns": {
    "type": "sort_columns",
    "name": "Ordenar Filas",
    "family": "Listas, orden y duplicados",
    "description": "Para ordenar registros antes de numerarlos o compararlos.",
    "parameters": [
      {
        "key": "columns",
        "type": "string | string[]",
        "description": "Columna o lista de columnas",
        "required": true
      },
      {
        "key": "ascending",
        "type": "boolean",
        "description": "Orden ascendente",
        "required": false,
        "defaultLabel": "true"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Listas, orden y duplicados → Ordenar Filas.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Ordena filas, no cabeceras. Admite una o varias columnas; ascending se aplica a todas y es true por defecto."
    ],
    "troubleshooting": "Si necesitas reordenar cabeceras, usa Mantener Cols. Verifica tipos cuando el orden de números parece alfabético.",
    "example": {
      "params": {
        "columns": "v"
      },
      "before": {
        "columns": [
          "v",
          "a"
        ],
        "rows": [
          {
            "v": 2,
            "a": "b"
          },
          {
            "v": 1,
            "a": "c"
          }
        ]
      },
      "after": {
        "columns": [
          "v",
          "a"
        ],
        "rows": [
          {
            "v": 1,
            "a": "c"
          },
          {
            "v": 2,
            "a": "b"
          }
        ]
      }
    }
  },
  "sort_by": {
    "type": "sort_by",
    "name": "Ordenar Registros",
    "family": "Listas, orden y duplicados",
    "description": "Para ordenar filas por una o varias claves.",
    "parameters": [
      {
        "key": "columns",
        "type": "string | string[]",
        "description": "Columna o lista de columnas",
        "required": true
      },
      {
        "key": "ascending",
        "type": "boolean",
        "description": "Orden ascendente",
        "required": false,
        "defaultLabel": "true"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Listas, orden y duplicados → Ordenar Registros.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Tiene un tipo de operación independiente, pero no promete optimizaciones especiales de índices respecto a Ordenar Filas. ascending es un booleano global."
    ],
    "troubleshooting": "Convierte primero los números guardados como texto si el orden no coincide con el numérico esperado.",
    "example": {
      "params": {
        "columns": [
          "v"
        ],
        "ascending": false
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 1
          },
          {
            "v": 2
          }
        ]
      },
      "after": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 2
          },
          {
            "v": 1
          }
        ]
      }
    }
  },
  "drop_duplicates": {
    "type": "drop_duplicates",
    "name": "Eliminar Duplicados",
    "family": "Listas, orden y duplicados",
    "description": "Para dejar una sola aparición de cada registro o clave.",
    "parameters": [
      {
        "key": "subset",
        "type": "string | string[] | null",
        "description": "Columna o lista; null compara todas",
        "required": false,
        "defaultLabel": "null · todas las columnas"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Listas, orden y duplicados → Eliminar Duplicados.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Sin subconjunto compara todas las columnas. Conserva la primera aparición; un subconjunto compara solo esas claves y puede descartar filas con otros valores diferentes."
    ],
    "troubleshooting": "Ordena antes si necesitas decidir qué aparición conservar. Revisa el subconjunto para no perder registros válidos.",
    "example": {
      "params": {},
      "before": {
        "columns": [
          "a",
          "b"
        ],
        "rows": [
          {
            "a": 1,
            "b": "x"
          },
          {
            "a": 1,
            "b": "x"
          },
          {
            "a": 2,
            "b": "y"
          }
        ]
      },
      "after": {
        "columns": [
          "a",
          "b"
        ],
        "rows": [
          {
            "a": 1,
            "b": "x"
          },
          {
            "a": 2,
            "b": "y"
          }
        ]
      }
    }
  },
  "group_by": {
    "type": "group_by",
    "name": "Agrupar (Promedio)",
    "family": "Agregación y expresiones",
    "description": "Para resumir una medida numérica con su promedio por grupo.",
    "parameters": [
      {
        "key": "by",
        "type": "string | string[]",
        "description": "Columna o columnas por las cuales agrupar (string o lista)",
        "required": true
      },
      {
        "key": "column",
        "type": "string",
        "description": "Columna numérica a promediar",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Agregación y expresiones → Agrupar (Promedio).",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "La salida contiene las columnas de agrupación y la medida agregada; se pierden los demás campos. Las claves nulas pueden quedar fuera de la agrupación."
    ],
    "troubleshooting": "Convierte la medida a número y selecciona todas las claves necesarias antes de agrupar.",
    "example": {
      "params": {
        "by": "g",
        "column": "v"
      },
      "before": {
        "columns": [
          "g",
          "v"
        ],
        "rows": [
          {
            "g": "a",
            "v": 2
          },
          {
            "g": "a",
            "v": 4
          },
          {
            "g": "b",
            "v": 9
          }
        ]
      },
      "after": {
        "columns": [
          "g",
          "v"
        ],
        "rows": [
          {
            "g": "a",
            "v": 3
          },
          {
            "g": "b",
            "v": 9
          }
        ]
      }
    }
  },
  "group_by_sum": {
    "type": "group_by_sum",
    "name": "Agrupar por Suma",
    "family": "Agregación y expresiones",
    "description": "Para obtener el total de una medida por grupo.",
    "parameters": [
      {
        "key": "by",
        "type": "string | string[]",
        "description": "Columna o lista de columnas para agrupar",
        "required": true
      },
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Agregación y expresiones → Agrupar por Suma.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Produce una suma por grupo, no un acumulado fila a fila. Conserva las claves y la columna sumada; no las demás."
    ],
    "troubleshooting": "Si los resultados concatenan texto o fallan, convierte la medida a número antes de sumar.",
    "example": {
      "params": {
        "by": [
          "g"
        ],
        "column": "v"
      },
      "before": {
        "columns": [
          "g",
          "v"
        ],
        "rows": [
          {
            "g": "a",
            "v": 2
          },
          {
            "g": "a",
            "v": 4
          },
          {
            "g": "b",
            "v": 9
          }
        ]
      },
      "after": {
        "columns": [
          "g",
          "v"
        ],
        "rows": [
          {
            "g": "a",
            "v": 6
          },
          {
            "g": "b",
            "v": 9
          }
        ]
      }
    }
  },
  "group_by_count": {
    "type": "group_by_count",
    "name": "Agrupar por Conteo",
    "family": "Agregación y expresiones",
    "description": "Para contar registros por combinación de claves.",
    "parameters": [
      {
        "key": "by",
        "type": "string | string[]",
        "description": "Columna o lista de columnas para agrupar",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Agregación y expresiones → Agrupar por Conteo.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Cuenta filas y crea la columna conteo. No requiere una columna de valores ni calcula un conteo distinto."
    ],
    "troubleshooting": "Si necesitas contar entidades únicas, elimina duplicados por esas entidades antes de agrupar.",
    "example": {
      "params": {
        "by": "g"
      },
      "before": {
        "columns": [
          "g"
        ],
        "rows": [
          {
            "g": "a"
          },
          {
            "g": "a"
          },
          {
            "g": "b"
          }
        ]
      },
      "after": {
        "columns": [
          "g",
          "conteo"
        ],
        "rows": [
          {
            "g": "a",
            "conteo": 2
          },
          {
            "g": "b",
            "conteo": 1
          }
        ]
      }
    }
  },
  "group_by_shift": {
    "type": "group_by_shift",
    "name": "Desfase Temporal",
    "family": "Agregación y expresiones",
    "description": "Para comparar una fila con valores previos o siguientes dentro de un grupo.",
    "parameters": [
      {
        "key": "by",
        "type": "string | string[]",
        "description": "Columna o lista de columnas para agrupar",
        "required": true
      },
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "new_column_name",
        "type": "string",
        "description": "Columna de salida",
        "required": true
      },
      {
        "key": "periods",
        "type": "number (entero)",
        "description": "Periodos de desplazamiento, incluido cero",
        "required": false,
        "defaultLabel": "1"
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Agregación y expresiones → Desfase Temporal.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Desplaza según el orden actual; no ordena por fecha ni calcula diferencias. periods es entero, admite negativos y cero; por defecto 1. Los extremos sin valor previo/siguiente quedan nulos."
    ],
    "troubleshooting": "Ordena por grupo y fecha antes del desfase. Para variaciones, añade después una columna calculada.",
    "example": {
      "params": {
        "by": "g",
        "column": "v",
        "new_column_name": "prev",
        "periods": 0
      },
      "before": {
        "columns": [
          "g",
          "v"
        ],
        "rows": [
          {
            "g": "a",
            "v": 2
          },
          {
            "g": "a",
            "v": 4
          }
        ]
      },
      "after": {
        "columns": [
          "g",
          "v",
          "prev"
        ],
        "rows": [
          {
            "g": "a",
            "v": 2,
            "prev": 2
          },
          {
            "g": "a",
            "v": 4,
            "prev": 4
          }
        ]
      }
    }
  },
  "add_new_column": {
    "type": "add_new_column",
    "name": "Columna Calculada",
    "family": "Agregación y expresiones",
    "description": "Para calcular una medida o etiqueta a partir de los campos de cada fila.",
    "parameters": [
      {
        "key": "new_column_name",
        "type": "string",
        "description": "Nombre de la columna creada",
        "required": true
      },
      {
        "key": "expression",
        "type": "string",
        "description": "Expresión Python evaluada por el servidor",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Agregación y expresiones → Columna Calculada.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Usa nombres de columnas como variables: v * 2. Funciones disponibles: abs, round, str, int, float, len y bool. Nombre nuevo sin colisiones. Se evalúa en el servidor, no es un intérprete Python general."
    ],
    "troubleshooting": "Si hay NameError, revisa los nombres actuales y evita nombres con espacios como variables. Revisa divisiones por cero y nulos.",
    "example": {
      "params": {
        "new_column_name": "double",
        "expression": "v * 2"
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 2
          },
          {
            "v": 3
          }
        ]
      },
      "after": {
        "columns": [
          "v",
          "double"
        ],
        "rows": [
          {
            "v": 2,
            "double": 4
          },
          {
            "v": 3,
            "double": 6
          }
        ]
      }
    }
  },
  "transform_column": {
    "type": "transform_column",
    "name": "Transformar Col",
    "family": "Agregación y expresiones",
    "description": "Para modificar cada celda de una columna con una expresión.",
    "parameters": [
      {
        "key": "column",
        "type": "string",
        "description": "Nombre de la columna de entrada",
        "required": true
      },
      {
        "key": "expression",
        "type": "string",
        "description": "Expresión Python evaluada por el servidor",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Agregación y expresiones → Transformar Col.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "x representa la celda actual: x * 2 o str(x).upper(). Se admiten las mismas funciones básicas que en Columna Calculada y se evalúa en el servidor."
    ],
    "troubleshooting": "Usa x y no el nombre de la columna. Si el valor puede ser nulo, contempla ese caso en la expresión.",
    "example": {
      "params": {
        "column": "v",
        "expression": "x * 2"
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 2
          },
          {
            "v": 3
          }
        ]
      },
      "after": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 4
          },
          {
            "v": 6
          }
        ]
      }
    }
  },
  "filter_by_condition": {
    "type": "filter_by_condition",
    "name": "Filtro Condicional",
    "family": "Agregación y expresiones",
    "description": "Para conservar filas mediante una condición sobre varios campos.",
    "parameters": [
      {
        "key": "expression",
        "type": "string",
        "description": "Expresión Python evaluada por el servidor",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Agregación y expresiones → Filtro Condicional.",
      "Configura los campos indicados en la tabla de parámetros; usa los valores del ejemplo como referencia.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Los nombres de columna son variables de fila: edad >= 18 and saldo > 0. La expresión debe dar un resultado interpretable como booleano; no ejecuta código en el navegador."
    ],
    "troubleshooting": "Comprueba sintaxis Python, nombres de columna y tipos. Valida la preview antes de cargar.",
    "example": {
      "params": {
        "expression": "v > 0"
      },
      "before": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 0
          },
          {
            "v": 1
          },
          {
            "v": 2
          }
        ]
      },
      "after": {
        "columns": [
          "v"
        ],
        "rows": [
          {
            "v": 1
          },
          {
            "v": 2
          }
        ]
      }
    }
  },
  "union": {
    "type": "union",
    "name": "Unión Vertical",
    "family": "Cruces y combinación",
    "description": "Para apilar registros de otra fuente debajo de los actuales.",
    "parameters": [
      {
        "key": "secondary_source",
        "type": "Fuente confirmada",
        "description": "Configuración de origen del dataset secundario",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cruces y combinación → Unión Vertical.",
      "Confirma un archivo o tabla secundaria en el formulario del paso; después configura las claves si se trata de un cruce.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Alinea columnas por nombre, conserva duplicados y rellena con nulos las columnas ausentes. No exige esquemas idénticos; no equivale a SQL UNION sin duplicados."
    ],
    "troubleshooting": "Si aparecen columnas duplicadas conceptualmente, renómbralas para que coincidan antes de unir; verifica compatibilidad de tipos.",
    "example": {
      "params": {
        "secondary_source": "Fuente secundaria confirmada"
      },
      "before": {
        "columns": [
          "a"
        ],
        "rows": [
          {
            "a": 1
          }
        ]
      },
      "after": {
        "columns": [
          "a",
          "b"
        ],
        "rows": [
          {
            "a": 1,
            "b": null
          },
          {
            "a": null,
            "b": 2
          }
        ]
      },
      "secondary": {
        "columns": [
          "b"
        ],
        "rows": [
          {
            "b": 2
          }
        ]
      }
    }
  },
  "left_join": {
    "type": "left_join",
    "name": "Unión Horizontal · Left",
    "family": "Cruces y combinación",
    "description": "Para enriquecer todos los registros principales con datos de una fuente derecha.",
    "parameters": [
      {
        "key": "right_source",
        "type": "Fuente confirmada",
        "description": "Fuente secundaria con el mismo contrato que source",
        "required": true
      },
      {
        "key": "on",
        "type": "string | string[]",
        "description": "Llave común; dos llaves comunes en ambos datasets; o [llave_izquierda, llave_derecha] si no son ambas comunes",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cruces y combinación → Unión Horizontal · Left.",
      "Confirma un archivo o tabla secundaria en el formulario del paso; después configura las claves si se trata de un cruce.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Conserva la izquierda y completa con nulos donde no coincide. Una clave repetida a la derecha puede multiplicar las filas izquierdas.",
      "En cruces, on=\"id\" usa una clave común; dos nombres compartidos por ambas tablas forman una clave compuesta. Si no son ambos compartidos, [\"id\", \"customer_id\"] representa clave izquierda y derecha. No se admiten múltiples pares con nombres distintos."
    ],
    "troubleshooting": "Si crece el número de filas, revisa duplicados de las claves derechas y la selección de claves de cruce.",
    "example": {
      "params": {
        "right_source": "Fuente secundaria confirmada",
        "on": "id"
      },
      "before": {
        "columns": [
          "id",
          "a"
        ],
        "rows": [
          {
            "id": 1,
            "a": 10
          },
          {
            "id": 2,
            "a": 20
          }
        ]
      },
      "after": {
        "columns": [
          "id",
          "a",
          "b"
        ],
        "rows": [
          {
            "id": 1,
            "a": 10,
            "b": null
          },
          {
            "id": 2,
            "a": 20,
            "b": 200
          }
        ]
      },
      "secondary": {
        "columns": [
          "id",
          "b"
        ],
        "rows": [
          {
            "id": 2,
            "b": 200
          },
          {
            "id": 3,
            "b": 300
          }
        ]
      }
    }
  },
  "right_join": {
    "type": "right_join",
    "name": "Unión Horizontal · Right",
    "family": "Cruces y combinación",
    "description": "Para conservar todos los registros de la fuente derecha al combinarlos.",
    "parameters": [
      {
        "key": "right_source",
        "type": "Fuente confirmada",
        "description": "Fuente secundaria con el mismo contrato que source",
        "required": true
      },
      {
        "key": "on",
        "type": "string | string[]",
        "description": "Llave común; dos llaves comunes en ambos datasets; o [llave_izquierda, llave_derecha] si no son ambas comunes",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cruces y combinación → Unión Horizontal · Right.",
      "Confirma un archivo o tabla secundaria en el formulario del paso; después configura las claves si se trata de un cruce.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Conserva la derecha; donde no hay coincidencia los campos izquierdos quedan nulos. Las coincidencias repetidas pueden multiplicar filas.",
      "En cruces, on=\"id\" usa una clave común; dos nombres compartidos por ambas tablas forman una clave compuesta. Si no son ambos compartidos, [\"id\", \"customer_id\"] representa clave izquierda y derecha. No se admiten múltiples pares con nombres distintos."
    ],
    "troubleshooting": "Comprueba cuál es la fuente principal y cuál la derecha; no intercambies el rol de las claves.",
    "example": {
      "params": {
        "right_source": "Fuente secundaria confirmada",
        "on": "id"
      },
      "before": {
        "columns": [
          "id",
          "a"
        ],
        "rows": [
          {
            "id": 1,
            "a": 10
          },
          {
            "id": 2,
            "a": 20
          }
        ]
      },
      "after": {
        "columns": [
          "id",
          "a",
          "b"
        ],
        "rows": [
          {
            "id": 2,
            "a": 20,
            "b": 200
          },
          {
            "id": 3,
            "a": null,
            "b": 300
          }
        ]
      },
      "secondary": {
        "columns": [
          "id",
          "b"
        ],
        "rows": [
          {
            "id": 2,
            "b": 200
          },
          {
            "id": 3,
            "b": 300
          }
        ]
      }
    }
  },
  "inner_join": {
    "type": "inner_join",
    "name": "Unión Horizontal · Inner",
    "family": "Cruces y combinación",
    "description": "Para conservar solo registros con coincidencias entre ambas fuentes.",
    "parameters": [
      {
        "key": "right_source",
        "type": "Fuente confirmada",
        "description": "Fuente secundaria con el mismo contrato que source",
        "required": true
      },
      {
        "key": "on",
        "type": "string | string[]",
        "description": "Llave común; dos llaves comunes en ambos datasets; o [llave_izquierda, llave_derecha] si no son ambas comunes",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cruces y combinación → Unión Horizontal · Inner.",
      "Confirma un archivo o tabla secundaria en el formulario del paso; después configura las claves si se trata de un cruce.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "No equivale a deduplicar: varias coincidencias producen varias filas. Columnas homónimas ajenas a la clave reciben sufijos _x y _y.",
      "En cruces, on=\"id\" usa una clave común; dos nombres compartidos por ambas tablas forman una clave compuesta. Si no son ambos compartidos, [\"id\", \"customer_id\"] representa clave izquierda y derecha. No se admiten múltiples pares con nombres distintos."
    ],
    "troubleshooting": "Si faltan filas, revisa tipos, espacios y valores de las claves antes de cambiar el tipo de cruce.",
    "example": {
      "params": {
        "right_source": "Fuente secundaria confirmada",
        "on": "id"
      },
      "before": {
        "columns": [
          "id",
          "a"
        ],
        "rows": [
          {
            "id": 1,
            "a": 10
          },
          {
            "id": 2,
            "a": 20
          }
        ]
      },
      "after": {
        "columns": [
          "id",
          "a",
          "b"
        ],
        "rows": [
          {
            "id": 2,
            "a": 20,
            "b": 200
          }
        ]
      },
      "secondary": {
        "columns": [
          "id",
          "b"
        ],
        "rows": [
          {
            "id": 2,
            "b": 200
          },
          {
            "id": 3,
            "b": 300
          }
        ]
      }
    }
  },
  "outer_join": {
    "type": "outer_join",
    "name": "Unión Horizontal · Outer",
    "family": "Cruces y combinación",
    "description": "Para conservar registros de ambas fuentes, coincidan o no.",
    "parameters": [
      {
        "key": "right_source",
        "type": "Fuente confirmada",
        "description": "Fuente secundaria con el mismo contrato que source",
        "required": true
      },
      {
        "key": "on",
        "type": "string | string[]",
        "description": "Llave común; dos llaves comunes en ambos datasets; o [llave_izquierda, llave_derecha] si no son ambas comunes",
        "required": true
      }
    ],
    "instructions": [
      "En Transformación, elige Agregar Transformación → Cruces y combinación → Unión Horizontal · Outer.",
      "Confirma un archivo o tabla secundaria en el formulario del paso; después configura las claves si se trata de un cruce.",
      "Pulsa Aplicar Operación. Revisa las columnas, el conteo y los valores de la preview antes de continuar."
    ],
    "rules": [
      "Rellena ausencias con nulos. Claves repetidas pueden multiplicar filas; en el motor pandas claves nulas pueden coincidir entre sí, distinto de una comparación SQL habitual.",
      "En cruces, on=\"id\" usa una clave común; dos nombres compartidos por ambas tablas forman una clave compuesta. Si no son ambos compartidos, [\"id\", \"customer_id\"] representa clave izquierda y derecha. No se admiten múltiples pares con nombres distintos."
    ],
    "troubleshooting": "No rellenes claves nulas con el mismo valor sin analizar el cruce: podrías generar coincidencias no deseadas.",
    "example": {
      "params": {
        "right_source": "Fuente secundaria confirmada",
        "on": "id"
      },
      "before": {
        "columns": [
          "id",
          "a"
        ],
        "rows": [
          {
            "id": 1,
            "a": 10
          },
          {
            "id": 2,
            "a": 20
          }
        ]
      },
      "after": {
        "columns": [
          "id",
          "a",
          "b"
        ],
        "rows": [
          {
            "id": 1,
            "a": 10,
            "b": null
          },
          {
            "id": 2,
            "a": 20,
            "b": 200
          },
          {
            "id": 3,
            "a": null,
            "b": 300
          }
        ]
      },
      "secondary": {
        "columns": [
          "id",
          "b"
        ],
        "rows": [
          {
            "id": 2,
            "b": 200
          },
          {
            "id": 3,
            "b": 300
          }
        ]
      }
    }
  }
} satisfies { [K in StepType]: TransformationDoc<K> };

export const transformations: TransformationDoc[] = Object.values(transformationsCatalog);
