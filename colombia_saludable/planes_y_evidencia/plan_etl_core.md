# Plan de implementación ETL usando exclusivamente el Core

Estado: **implementado y ejecutado el 22 de octubre de 2026**. Base: [análisis del origen](analisis_origen.md) y [cuaderno ejecutado](../cuadernos/etl_core.ipynb). Este documento conserva el diseño aprobado; el resultado está en [informe de implementación](implementacion_etl_core.md) y [manifiesto de carga](carga_core/manifest_carga.json).

## 1. Alcance y contrato

Construir en `colombia_saludable_dw_core.public` una constelación de hechos detallados para responder las preguntas posibles del taller sin perder información útil. No crear solo tablas con promedios finales: conservar el grano permite nuevas preguntas.

Todo acceso y toda transformación ETL se harán con funciones existentes en `etl/`. Python se utilizará para orquestación, configuración, diccionarios de mapeo, expresiones de fila y validaciones; no habrá `pandas.merge`, `DataFrame.to_sql`, `psycopg2.connect` ni escritura SQL directa en el cuaderno. Los DataFrames devueltos por el Core son el formato de intercambio. Las lambdas de limpieza o derivación se suministrarán a las operaciones públicas del Core.

Los SELECT de perfilado no son una implementación del ETL. En la implementación futura la extracción leerá las columnas de origen; las uniones, normalización y derivación se expresarán con los transformadores del Core. Las bibliotecas de visualización quedarán en `answers.ipynb`, donde el usuario sí permite otras funciones.

## 2. Capacidades verificadas y límites

| Necesidad | API existente | Uso previsto o limitación |
| --- | --- | --- |
| Conectar y comprobar | `DB_Extractor.connect`, `check_connection_status` | Origen de lectura y destino; configuración desde `.env` |
| Catálogo y extracción | `get_table_names`, `get_table_schema`, `execute_query`, `get_table` | Preferir SELECT explícito, con esquema y columnas |
| Proyectar/filtrar | `DataSelect.select_columns`, `filter_is_null`; `BasicsTransformOperations.filter_by_condition` | Separar registros válidos y errores sin perder trazabilidad |
| Renombrar y claves | `HeaderOperations.rename_columns`, `add_sequential_index` | Claves naturales o deterministas preferidas; secuenciales no persistentes entre cargas |
| Limpiar texto/tipos | `BasicsTransformOperations.transform_column`, `ConvertOperations.convert_column_type`, `fill_nulls` | Conservar original y derivar columna limpia; IDs como texto |
| Derivar campos | `BasicsTransformOperations.add_new_column` | Timestamps, espera, flags, edad al evento y claves con expresiones de fila |
| Unir personas/hechos | `TransformOperations.left_join`, `union_all` | Joins a dimensiones únicas y conservación de huérfanos para diagnóstico |
| Deduplicar | `TransformOperations.drop_duplicates` | Solo con grano y regla documentados; inicialmente puente IPS–droguería |
| Expandir medicamentos | `DataExpresion.split_column_into_rows` o `BasicsTransformOperations.normalize_delimited_column` | Delimitador `;`; preservar `codigo_formula` |
| Calendario colombiano | `DateTime(start_year, end_year).df` | Genera calendario y festivos; no define vacaciones ni todas las temporadas |
| Agregar para validación | `TransformOperations.group_by_count`, `group_by_sum`, `group_by_mean` | Conciliar con origen sin precalcular todas las respuestas |
| Cargar dimensiones | `DB_Loader.load_dimension` | Usar `if_exists='fail'`, `index=False`; no acepta `dtype` |
| Cargar hechos y puentes | `DB_Loader.load_fact` | `foreign_keys_map`, `dtype`, `validate_foreign_keys=True`; convierte FK a texto |
| Consultar bodega | `DB_Extractor.execute_query`; `etl.warehouse.execution.execute` | El segundo soporta agregaciones limitadas y exportación; no genera gráficos Python |

**Límite estructural:** `DB_Loader` materializa tablas a través de su implementación de `to_sql`, pero no expone creación de PK, UNIQUE, FK o índices físicos. `foreign_keys_map` comprueba valores antes de cargar; no crea una restricción SQL. No se afirmará que una bodega cargada así tiene integridad física impuesta por PostgreSQL. El esquema dimensional será lógico y sus claves se validarán en el proceso. Implementar las restricciones físicas exigiría ampliar el Core o autorizar una fase DDL externa; ninguna se realiza en esta tarea. Esto limita además los joins del módulo `etl.warehouse`, que verifica claves únicas físicas; las respuestas podrán usar SELECT mediante `DB_Extractor`.

**Límite de carga:** no se encontró API pública de UPSERT, SCD2, control de marcas de agua, publicación atómica de toda una bodega o recuperación integral. La primera entrega será una carga completa inicial. Si hay datos previos, se detendrá antes de escribir. No utilizar los valores predeterminados `replace` de dimensiones ni `append` de hechos. No utilizar `truncate_table` como mecanismo de reinicio: su implementación actual usa SQL textual sin `text()` ni commit explícito y no es una base fiable para la recarga.

**FK opcionales:** `load_fact` aplica `astype(str)` a cada columna de `foreign_keys_map`, incluidos sus nulos. Por ello, el mapa solo incluirá referencias obligatorias y no nulas. Las referencias opcionales, como servicio o médico remitente según el tipo de evento, se validarán previamente con operaciones Core sobre el subconjunto no nulo y consultas de conciliación; se cargarán conservando el nulo SQL y con tipo explícito, fuera de ese mapa. No convertir ausencia en las cadenas `nan`, `None` o `<NA>`, ni desactivar toda la validación FK para evitar el problema.

**Booleanos opcionales:** el alias de tipo `'boolean'` de `ConvertOperations.convert_column_type` se traduce a `astype(bool)` y convierte `None` en `False`. Para `proviene_otra_eps_propio` se pasa el objeto `pd.BooleanDtype()` dentro del diccionario de tipos de esa misma función Core. La validación de negocio exige NULL en beneficiarios. No se cambió el Core.

`execute_query` está diseñado para devolver un DataFrame y no es una API de DDL con commit; no se usará como atajo para sortear estos límites. No se modificará el Core durante esta implementación sin una tarea que lo solicite.

## 3. Modelo lógico y grano

Las claves de paciente, familia, IPS, médico, empresa, servicio, medicamento y fecha serán texto coherente entre dimensiones y hechos. Las claves naturales del origen se conservan con nombre explícito. La clave de persona distinguirá tipo de registro: `C:<cedula>` o `B:<id_beneficiario>`; no se inventará un tipo de documento de cotizante que el esquema no contiene.

| Tabla propuesta | Grano / clave lógica | Contenido esencial y fuentes |
| --- | --- | --- |
| `dim_fecha` | Una fecha; `fecha_id=YYYYMMDD` | Fecha, año, mes, trimestre, día de semana, fin de semana y festivo colombiano |
| `dim_familia` | Un cotizante titular; `familia_id` | Identificador de titular y número de beneficiarios; `cotizante` + puente |
| `dim_empresa` | Un NIT; `empresa_id` | Actividad económica, ciudad, total empleados registrado; `empresa` |
| `dim_ips` | Una IPS; `ips_id` | Tipo, nivel si aplica, municipio y departamento, valores originales/normalizados |
| `dim_medico` | Un médico; `medico_id` | Especialidad, subespecialidad e IPS asociada; `medico` |
| `dim_paciente` | Una persona y tipo de registro; `paciente_id` | Sexo, nacimiento, clase de afiliado, familia, IPS de afiliación, empresa del titular y atributos de perfil disponibles |
| `dim_servicio` | Un código POS; `servicio_id` | Descripción, tarifa de catálogo, tipo de servicio explícitamente mapeado |
| `dim_medicamento` | Un código observado; `medicamento_id` | Código, nombre/precio desconocidos, flag `sin_catalogo=1`; no inferir desde POS |
| `dim_diagnostico` | Una etiqueta normalizada; `diagnostico_id` determinista | Texto normalizado y grupo opcional por mapeo explícito; sin inventar CIE-10 |
| `dim_drogueria` | Una droguería; `drogueria_id` | Ciudad y atributos de entidad; no hechos de dispensación |
| `puente_ips_drogueria` | Par único IPS–droguería | 69 pares esperados después de retirar cuatro copias exactas |
| `fact_atencion` | Un registro de una de cuatro tablas; `atencion_id=<origen>:<codigo>` | Tipo, paciente, médico, médico remitente si aplica, IPS asociada al médico, diagnóstico, servicio si existe, fechas en roles solicitud/atención, timestamps, espera cruda/válida, flags, edad, duración original y tarifa parcial |
| `fact_pago` | Una transacción; `id_transaccion` | Paciente cotizante, familia, empresa e IPS de afiliación, fecha, `valor_aporte` |
| `fact_formula` | Una receta; `codigo_formula` | Paciente, médico, IPS asociada y fecha; conservar cabecera para denominadores |
| `puente_formula_medicamento` | Par único fórmula–código | 15.770 pares esperados; presencia en receta, sin cantidad o precio inventado |
| `fact_retiro` | Un retiro; `id_retiro` | Cotizante, familia, fecha, EPS destino original/limpia y `destino_informado` |
| `fact_antecedente_familiar` | Usuario–familiar–enfermedad, sin fecha | Antecedente asociado a persona, no diagnóstico confirmado de la persona |

Las relaciones apuntan al identificador lógico de cada dimensión. `fact_atencion` conservará columnas `tabla_origen` y `codigo_origen`, y las fechas originales para auditoría. Los hechos tendrán referencias directas a los atributos dimensionales que necesitan las respuestas, evitando depender de recorridos multinivel.

`dim_paciente` es una fotografía tipo 1. Para beneficiarios, el estrato/empresa/IPS de titular que se hereden estarán rotulados como **familiares**, con flags de procedencia; no se presentarán como ocupación, ingresos o historia propios. Conservar separadamente `estrato_propio` y `estrato_familiar`, `tipo_cotizante_propio` y `tipo_cotizante_titular`. No inventar escolaridad o fecha de afiliación propia del beneficiario. Los nombres y direcciones personales no son necesarios para responder preguntas y se omitirán de la bodega analítica propuesta.

`dim_fecha` cubrirá años completos 2006–2008 según las fechas de eventos verificadas. Fecha de nacimiento permanece como atributo del paciente; no obliga a construir un calendario desde 1904. Los roles de solicitud, atención, pago, receta y retiro usan la misma dimensión. Las temporadas se asignarán de forma explícita y con precedencia documentada; vacaciones no tiene definición en el origen y no se inferirá automáticamente. Navidad y festivos se pueden estudiar bajo una regla declarada; Semana Santa requiere incluir el intervalo definido, no solo festivos aislados.

## 4. Secuencia de implementación en etl_core.ipynb

1. **Separar diagnóstico y ejecución.** Parte A de lectura y parte B de ETL, con opción explícita `--cargar` y comprobación del destino exacto. No reutilizar para escribir los engines protegidos READ ONLY del diagnóstico.
2. **Prevalidar antes de la primera escritura.** Comprobar ambas conexiones, destino distinto al origen, catálogo destino vacío, evidencia vigente, grano de tablas, unicidad de dimensiones y ausencia de fanout. No probar permisos creando una tabla temporal en esta etapa. La posibilidad de escribir solo se confirmará al comenzar la carga autorizada.
3. **Extraer las 18 tablas con el Core.** Conservar la fotografía de entrada en memoria para este volumen. Registrar conteos, rangos y duración, sin exportar personas a la evidencia. SQL de extracción sin funciones de transformación de negocio. No se promete un snapshot común entre tablas con la API actual; realizar en una ventana sin cambios o documentar esa limitación.
4. **Validar catálogos y reglas.** Preparar mapeo de 67 servicios a categorías, lista de normalizaciones textuales y clasificación diagnóstica opcional con flag de no clasificado. Conservar las tablas de mapeo como evidencia. No agregar nombres o precios de medicamentos no disponibles.
5. **Crear dimensiones y perfiles con transformadores Core.** Normalizar espacios y variantes de etiquetas mediante `transform_column`; renombrar `estracto` a un atributo analítico conservando procedencia; unir familia/empresa; unificar ambos tipos de persona mediante `union_all`. Cada join deberá mantener la cantidad de filas prevista. Construir calendario con `DateTime` y clave determinista de texto, descartando su índice secuencial como clave de negocio.
6. **Crear hechos con transformadores Core.** Unificar esquemas de eventos con selección, renombrado, derivaciones de fila y `union_all`. Desdoblar medicamentos con delimitador `;`, conservar cabeceras y deduplicar solo el par fórmula–código. Registrar reglas de datos no aplicables por tipo de evento.
7. **Validar todo el conjunto antes de cargar.** Unicidad, referencias, conteos, totales monetarios y calidad temporal. Si aparecen usuarios ambiguos/huérfanos, detenerse o separar errores con una regla visible; nunca elegir una coincidencia arbitraria ni perder filas por inner joins.
8. **Cargar dimensiones antes de hechos.** Orden sugerido: fecha, empresa, IPS, médico, familia, paciente, servicio, medicamento, diagnóstico, droguería; después puentes y hechos. Todas las llamadas `if_exists='fail'`, `index=False`. Usar `load_fact(..., foreign_keys_map=..., validate_foreign_keys=True)` con claves de texto y solo referencias obligatorias no nulas en el mapa. Validar por adelantado las referencias opcionales no nulas y las referencias de dimensiones, porque `load_dimension` no ofrece ese mapa.
9. **Cuidar tipos.** En `load_fact`, pasar `dtype` para importes `Numeric(18,2)` y medidas temporales cuando aplique. No convertir tarifas/aportes a float deliberadamente. `load_dimension` no permite tipos SQL explícitos: preparar tipos de DataFrame mediante el Core y verificar los tipos materializados; documentar si las fechas se almacenan como timestamp. Las claves textuales evitan que la conversión de FK de `load_fact` genere tipos incompatibles.
10. **Conciliar con lecturas del Core.** Comparar conteos por fuente y sumas de aportes, garantizar dimensiones únicas, referencias presentes y flags temporales. Usar consultas agregadas, sin `verify_table_load` si muestra información personal innecesaria. Guardar evidencia de carga solo después del éxito de todas las tablas.
11. **Entregar estado de carga.** Registrar fecha de corte, catálogo, métricas de conciliación, reglas utilizadas y limitaciones. Si falla una tabla, declarar la carga incompleta; no iniciar respuestas ni reintentar append. El Core actual no garantiza rollback de la bodega completa y el procedimiento de limpieza/recarga necesita una tarea separada.

## 5. Reglas de negocio y calidad

| Regla | Decisión |
| --- | --- |
| Espera | `(fecha_atencion + hora_atencion) - (fecha_solicitud/remision + hora_solicitud/remision)` en minutos; válida si completa y >= 0 |
| 497 remisiones negativas | Conservar evento y diferencia cruda; `espera_valida_min` nula y flag. Excluir solo de métricas de espera |
| Edad | Años cumplidos a la fecha del evento; grupos propuestos 0–4, 5–14, 15–24, 25–44, 45–64, 65+ y desconocido |
| Valores vacíos y N/A | Mantener original y codificar desconocido/no informado según el atributo; no convertir ausencia de subespecialidad en un defecto automáticamente |
| Familia | Un titular más beneficiarios; hechos se suman por familia sin unir hechos con cada miembro y multiplicarlos |
| Empresa y geografía | Relación actual, sin fechas de vigencia; nunca atribución histórica certificada. Mantener grupo sin empresa |
| Costo | `tarifa_servicio_catalogo` solo donde el código existe, principalmente remisiones; no costo asistencial total |
| Medicamentos | Dimensión por código observado; nombre/precio desconocidos; un par por fórmula–código |
| Retiro | EPS destino informada o desconocida; no inferir mora por destino vacío ni falta de pagos |
| Enfermedades | Diagnósticos observados y antecedentes familiares separados. No todos los textos clínicos son enfermedades |
| Duplicados | Eliminar cuatro copias exactas de IPS–droguería; no deduplicar eventos de tipos distintos sin llave de episodio |
| Duración hospitalaria | Conservar número y unidad desconocida; no publicar ocupación en camas-día sin confirmación |

## 6. Criterios de aceptación de la carga

- Origen sin modificaciones. Ninguna escritura al origen; usuario/engine de lectura configurado explícitamente.
- 4.416 pacientes únicos, 1.100 familias, 21 empresas, 86 IPS, 720 médicos, 67 servicios, 166 códigos de medicamento y 35 droguerías, si no cambia la fotografía del origen.
- 21.207 eventos detallados, conciliados por tipo: 3.013 citas, 559 urgencias, 893 hospitalizaciones y 16.742 remisiones. No interpretarlos como episodios independientes.
- 22.938 pagos, 7.484 fórmulas, 15.770 pares fórmula–medicamento, 89 retiros y 4.416 antecedentes familiares, sujetos al mismo corte. 69 pares únicos IPS–droguería.
- 497 esperas de remisión no válidas y ningún registro de atención perdido por esa regla; conciliar también esperas incompletas si aparecieran.
- Suma de `valor_aporte` exactamente igual al origen. Tarifas preservadas donde existen; no imputar precios de medicamentos.
- Claves lógicas únicas y todas las referencias obligatorias resueltas; nulos únicamente para relaciones que no aplican o información ausente, documentados.
- Una segunda ejecución ante tablas existentes se detiene antes de escribir. No se duplica información ni se reemplazan tablas en silencio.
- `answers.ipynb` solo se habilita cuando el manifiesto de carga indique éxito y la conciliación esté aprobada. No usar el manifiesto de diagnóstico como prueba de carga.

## 7. Riesgos pendientes y siguiente paso

Se puede implementar una bodega de tablas con relaciones lógicas utilizando el Core actual. Una bodega con PK/FK/índices físicos, publicación atómica o cargas incrementales requiere capacidades adicionales. Los costos reales, precios de medicamentos, mora y ocupación tampoco se resuelven ampliando transformaciones: necesitan datos de negocio que no están en el origen.

La carga inicial se implementó bajo este contrato lógico. No se amplió el Core ni se añadió DDL externo. Una comprobación independiente detectó y permitió corregir un booleano nullable convertido a False: se reemplazó explícitamente solo `dim_paciente`, creada en esta misma carga, usando `load_dimension`. La corrección y sus comprobaciones están en [correccion_nullable.json](carga_core/correccion_nullable.json). Esta reparación acotada no forma parte de la ruta normal de carga: el cuaderno y el lanzador siguen bloqueando destinos no vacíos.
