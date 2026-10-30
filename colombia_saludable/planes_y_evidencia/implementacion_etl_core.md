# Implementación y evidencia del ETL Core

Fecha: 22 de octubre de 2026, America/Bogota. Destino: `colombia_saludable_dw_core.public`. Estado: **carga inicial completada y conciliada**. Horas e identificador de carga: [manifest_carga.json](carga_core/manifest_carga.json).

## Implementación

Se amplió [etl_core.ipynb](../cuadernos/etl_core.ipynb) con una parte B que extrae las 18 tablas, construye el modelo en memoria, valida claves/referencias, carga y concilia. La parte A conserva el diagnóstico de lectura. Se usan exclusivamente funciones existentes de `etl` para accesos, transformaciones tabulares y escritura, sin modificar el Core ni usar backend, API o frontend.

Se utilizan `DB_Extractor`, `DataSelect`, `HeaderOperations`, `BasicsTransformOperations`, `TransformOperations`, `ConvertOperations`, `DataExpresion`, `DateTime` y `DB_Loader`. Las funciones auxiliares contienen expresiones de fila, mapeos, orquestación y comprobaciones. pandas aporta tipos, validaciones y tablas/archivos de evidencia; no sustituye los joins, la expansión de listas ni la escritura Core.

Se ejecutó primero la preparación completa sin escrituras y después la carga autorizada. El origen siempre usa READ ONLY. Se compararon huellas globales de las 18 tablas de origen antes y después de cargar y de los archivos Python del Core: sin cambios. No hubo snapshot global entre tablas; las huellas verifican la fotografía utilizada.

## Tablas cargadas

| Tabla | Filas | Grano |
| --- | ---: | --- |
| dim_fecha | 1.096 | Día, años completos 2006–2008 |
| dim_empresa | 21 | NIT |
| dim_ips | 86 | IPS |
| dim_medico | 720 | Médico |
| dim_familia | 1.100 | Titular cotizante |
| dim_paciente | 4.416 | Persona, prefijos C/B |
| dim_servicio | 67 | Servicio POS |
| dim_medicamento | 166 | Código observado |
| dim_diagnostico | 87 | Texto normalizado |
| dim_drogueria | 35 | Droguería |
| puente_ips_drogueria | 69 | Par único IPS–droguería |
| fact_atencion | 21.207 | Registro de tabla asistencial y código |
| fact_pago | 22.938 | Transacción de aporte |
| fact_formula | 7.484 | Cabecera de fórmula |
| puente_formula_medicamento | 15.770 | Fórmula–código |
| fact_retiro | 89 | Retiro |
| fact_antecedente_familiar | 4.416 | Antecedente del familiar de una persona |

Los eventos se concilian en 3.013 citas, 559 urgencias, 893 hospitalizaciones y 16.742 remisiones. No se interpretan como episodios clínicos independientes. Se retiraron cuatro copias exactas del puente IPS–droguería.

## Reglas aplicadas

- Claves de persona con prefijo de tipo; calendario `YYYYMMDD`; eventos con origen/código; diagnósticos con hash determinista de texto normalizado. Se conservaron originales y normalizados, sin inventar CIE-10.
- Los atributos del titular heredados por beneficiarios se nombran como familiares. Los atributos propios no informados del beneficiario permanecen nulos. No se cargan nombres o direcciones de personas.
- Solo las FK obligatorias no nulas se pasan al mapa del loader. Las opcionales se validan antes/después, conservando NULL y evitando cadenas `None`, `nan` o `<NA>`.
- **497 esperas negativas conservadas**, nulas en `espera_valida_min`; 20.710 esperas válidas, ninguna incompleta. Se guardan edades históricas a solicitud y atención.
- Los medicamentos tienen código y presencia por receta, sin precio, nombre ni cantidad inventados. Se conservan las cabeceras.
- Solo las remisiones tienen tarifa de catálogo. No se imputa a otros hechos. Los importes de hechos son NUMERIC(18,2); esperas NUMERIC(18,6). Fechas de hechos DATE, horas TIME y timestamps locales sin zona embebida, con referencia declarada America/Bogota. Las fechas de dimensiones se infieren como TIMESTAMP.
- Semana Santa se define de lunes a domingo de la semana del jueves santo; Navidad, 24–31 de diciembre; ordinario en los demás días. No se atribuyen vacaciones.

## Conciliación y pruebas

Se validaron claves lógicas en las 17 tablas, **42 referencias sin huérfanos**, nulos por columna, tipos, conteos, cobertura de tarifas y conservación de fuente/Core.

| Medida | Origen | Bodega | Resultado |
| --- | ---: | ---: | --- |
| Aportes recibidos | 8.548.421.149,00 | 8.548.421.149,00 | Exacto |
| Tarifas de remisiones | 4.380.604.114,00 | 4.380.604.114,00 | Exacto |

Se expresan en unidades monetarias del origen, cuya moneda no está confirmada. Las tarifas no son costos reales. Evidencia: [conciliacion_monetaria.csv](carga_core/conciliacion_monetaria.csv).

[verificar_bodega.py](verificar_bodega.py) contrasta valores por registro mediante SELECT de lectura, usando PostgreSQL como oráculo independiente de las expresiones del cuaderno para edades y tiempos. Sus 13 controles incluyen pagos, los cuatro tipos de evento, recetas, atribución familiar, ausencia de atributos inventados, retiros, lectura y Core sin cambios. Resultado: [verificacion_independiente.json](carga_core/verificacion_independiente.json). No exporta personas.

La repetición de `--cargar` fue bloqueada por destino no vacío sin cambiar datos ni sustituir el cuaderno anterior. La preparación corregida también se ejecutó sobre la bodega poblada sin escrituras ni cambios en evidencia publicada. Se compararon huellas de las 17 tablas de bodega y las 18 de origen: [prueba_reejecucion.json](carga_core/prueba_reejecucion.json).

## Hallazgo corregido

La primera verificación independiente detectó que el alias `'boolean'` del Core convierte `None` en `False`. Afectaba `dim_paciente.proviene_otra_eps_propio` de los 3.316 beneficiarios, para quienes el dato propio es desconocido.

Se corrigió el parámetro de `ConvertOperations.convert_column_type` a un diccionario con `pd.BooleanDtype()`, sin modificar el Core. Se comprobó con True, False y None, y se añadió al cuaderno una validación de negocio que impide escribir atributos propios inventados en beneficiarios.

Se reparó únicamente `dim_paciente`, creada por esta misma carga, usando `DB_Loader.load_dimension(..., if_exists='replace')`. Esta excepción de reparación fue explícita; las demás tablas no se reemplazaron. Una comparación por huella confirmó que las otras columnas y valores de la dimensión no cambiaron. Se actualizaron los contratos de nulos y se aprobaron después los 13 controles independientes y la preparación del código corregido.

[corregir_booleano_nullable.py](corregir_booleano_nullable.py) conserva el procedimiento: exige el identificador de carga afectado y el defecto exacto, y se bloquea si ya fue aplicado. No es una ruta general de recarga. Registro: [correccion_nullable.json](carga_core/correccion_nullable.json) y manifiesto.

## Evidencia y estado de los cuadernos

- [conteos_carga.csv](carga_core/conteos_carga.csv), [claves_logicas.csv](carga_core/claves_logicas.csv), [referencias_carga.csv](carga_core/referencias_carga.csv) y [nulos_carga.csv](carga_core/nulos_carga.csv).
- [diccionario_bodega.csv](carga_core/diccionario_bodega.csv) y [modelo_bodega.json](carga_core/modelo_bodega.json), para desarrollar las consultas de respuestas.
- [eventos_por_fuente.csv](carga_core/eventos_por_fuente.csv) y [calidad_temporal_tarifas.csv](carga_core/calidad_temporal_tarifas.csv).
- [mapeo_servicios.csv](carga_core/mapeo_servicios.csv), [mapeo_diagnosticos.csv](carga_core/mapeo_diagnosticos.csv) y [clasificacion_diagnosticos.csv](carga_core/clasificacion_diagnosticos.csv). La agrupación clínica es textual, parcial y no validada clínicamente.
- `carga_core/intentos/` distingue preparación, carga exitosa y bloqueo esperado; `diagnostico_pre_etl/` conserva la fotografía anterior a cargar. Los CSV de diagnóstico principales reflejan su última ejecución.

La última ejecución guardada de `etl_core.ipynb` prepara el modelo con la conversión corregida y comprueba sus contratos sin volver a cargar el destino existente. El manifiesto registra la carga y la corrección realmente aplicadas. Una nueva preparación guarda mapeos en `carga_core/preparaciones/<run>/`, sin sustituir los publicados.

## Límites y siguiente etapa

La ruta normal exige destino vacío y usa `if_exists='fail'`. Una recarga completa sobre datos existentes requiere otra tarea; no se borran tablas automáticamente. La bodega tiene relaciones lógicas verificadas, sin PK/FK/UNIQUE/índices físicos, porque el Core no expone ese DDL. Tampoco hay transacción global entre tablas.

Siguen ausentes costos reales completos, catálogo/precios de medicamentos, obligaciones para mora, capacidad hospitalaria e historia completa de perfiles. `answers.ipynb` tiene el ETL como prerrequisito completado; sus respuestas y gráficos no se implementaron en esta tarea. Puede continuar con [plan_answers.md](plan_answers.md) y consultas Core contra las tablas detalladas.


## Actualización posterior: respuestas

El plan de respuestas ya se implementó en una tarea posterior. Ver [implementacion_answers.md](implementacion_answers.md) y [resultados](respuestas/README.md). El estado de la bodega y los resultados de esta carga no cambiaron.
