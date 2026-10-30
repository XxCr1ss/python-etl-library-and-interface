# Implementación de las respuestas del taller

Estado: **14 preguntas implementadas y ejecutadas** en [answers.ipynb](../cuadernos/answers.ipynb), 22 de octubre de 2026. El período principal es 2006-01-01 a 2008-12-31 y el corte de perfiles es 2008-12-09. La bodega y el Core permanecen sin cambios.

## Entregables y ejecución

El cuaderno contiene introducción, comprobación de la carga, parámetros comunes, calidad, P01–P14 y cierre de validación. Cada pregunta incluye definición de la métrica, consultas, tablas, figuras cuando hay datos, interpretación calculada y límites. No se implementó una aplicación gráfica adicional.

Las consultas usan exclusivamente `DB_Extractor` del Core contra `colombia_saludable_dw_core`. Matplotlib genera las figuras y pandas permite su presentación y el análisis autorizado en respuestas. El cuaderno no se conecta al origen ni ejecuta loaders. La verificación del ETL se ejecutó previamente como comprobación separada.

La ejecución principal produjo **45 CSV de resultados, 27 PNG, 43 consultas SQL registradas y 38 controles internos aprobados**. Las cifras exactas y las rutas están en [manifest_respuestas.json](respuestas/manifest_respuestas.json). El [índice de resultados](respuestas/README.md) lleva al resumen de las 14 respuestas y a todas las tablas y figuras.

Las exportaciones se guardan en `respuestas/ejecuciones/<run>/`; el manifiesto principal se publica solo después del cierre exitoso. Los archivos de ejecuciones anteriores no se sobrescriben. Los CSV monetarios conservan el decimal exacto que PostgreSQL devuelve como texto; la conversión aproximada se usa únicamente para dibujar gráficos. Los rankings de afiliados, familias y médicos son anónimos y no exportan sus identificadores.

## Cobertura de las preguntas

| Pregunta | Implementación y alcance |
| --- | --- |
| P01 | Media, mediana, P90 y distribución de espera de citas/cirugías; exclusiones visibles. Solicitud/remisión a atención, sin certificar asignación |
| P02 | Prestadores por eventos/pacientes; aportes por afiliado/familia anónimos, empresa y geografía de afiliación; tarifas familiares parciales |
| P03 | Tarifas parciales por estrato familiar, tipo de titular y edad; frecuencia de códigos por recetas |
| P04 | Pares no ordenados de medicamentos, soporte sobre todas las recetas y matriz de coocurrencias |
| P05 | Eventos por atendido, sexo, edad y tipo; comparación con afiliados registrados incluidos ceros, cuando los filtros lo permiten |
| P06 | Actividad por temporada, hospital y profesional anónimo; normalización por día calendario. No ocupación real |
| P07 | Solicitud y atención por su propia fecha, espera mensual y diagnóstico clasificado parcial; demanda por día y mapa de calor |
| P08 | Dos denominadores explícitos para estimaciones tarifarias: remisión y paciente con remisión; cobertura del subconjunto |
| P09 | Cohortes textuales de diagnóstico observado; separar eventos con diagnóstico y todas las remisiones de esos pacientes |
| P10 | Demanda por departamento de IPS asociada; retiros con/sin destino. Mora no calculable |
| P11 | Cobertura de catálogo y tabla de datos faltantes. Costo de receta desconocido, sin gráfico de costo cero |
| P12 | Perfil propio de cotizantes por procedencia de EPS, con porcentajes y edad histórica; pago tardío no identificable |
| P13 | Diagnósticos textuales clasificados por sexo, edad y estrato, con cobertura de controles/no clasificados separada |
| P14 | EPS de destino, perfil de retiros, edad y antigüedad; destino desconocido no se interpreta como mora |

## Algunos resultados principales

- Citas generales: **64,40 horas** de espera media, 3.013 válidas y ninguna excluida. Cirugías identificadas en remisiones: **207,43 horas** de media, 948 válidas y 12 excluidas. No son tiempos certificados desde asignación.
- Se observan **21.207 eventos de 504 pacientes distintos**: 42,08 eventos por atendido. Sobre los 4.416 afiliados registrados, incluidos 3.912 sin eventos, son 4,80 por registrado. Estos denominadores no equivalen a población activa durante todo el período ni a episodios clínicos independientes.
- El medicamento por código más frecuente es **2349**, presente en 895 recetas. El par **1047 + 2356** aparece en 280 recetas, con soporte de 3,74 %. No hay nombres, dosis o precios para interpretar más allá de códigos.
- Aportes recibidos: **8.548.421.149,00** unidades monetarias. Tarifas de remisiones: **4.380.604.114,00**; cubren el 78,95 % de los eventos. No representan costo real total.
- Los retiros con destino informado son **48**, de 48 pacientes. Hay 41 retiros con destino desconocido; no se les atribuye mora. Cafesalud es el destino informado más frecuente, con 16 retiros.

Las interpretaciones completas y sus tablas de respaldo están en el resumen de la ejecución, accesible desde el índice. No se extrapolan a la atención actual de salud ni a toda la población afiliada.

## Filtros y significado de fechas

Son editables fechas, tipos de atención, IPS, departamento, sexo, grupo etario y Top N. Los valores se validan contra catálogos y se escapan antes de componer las consultas. La conexión PostgreSQL es READ ONLY, con límites de tiempo de sentencia y bloqueo.

La demanda usa fecha de solicitud; atención/espera usan fecha de atención; pagos, recetas y retiros sus fechas propias. La edad usa la fecha del evento y los perfiles el corte histórico. Las relaciones geográficas y laborales son asociaciones actuales sin historia de vigencia.

IPS/departamento significan IPS asociada al médico en atención/recetas y de afiliación en pagos/perfiles/retiros. Por eso se omite la comparación de utilización con afiliados registrados si se filtra edad o geografía: sus denominadores no son directamente equivalentes. Los tipos de atención solo filtran hechos asistenciales, no aportes o recetas.

Los últimos meses de 2008 tienen cobertura incompleta. Mes sin registros no prueba ausencia real de actividad; los promedios por calendario no certifican días operativos. La clasificación diagnóstica es parcial y no validada clínicamente: solo 1.972 de 21.207 eventos se clasifican como diagnóstico observado. No se calculan prevalencias poblacionales.

## Validación

1. Antes de responder se comprobó manifiesto exitoso, verificación independiente del ETL, catálogo de 17 tablas, conteos, unicidad de claves y 42 relaciones. Las huellas de la bodega coincidieron con la fotografía aprobada.
2. Los 38 controles internos comprueban conciliación de eventos, aportes, tarifas, exclusiones, pares, proporciones, denominadores y cierre de las 14 preguntas. Las huellas inicial y final coinciden; no se mantuvo un único snapshot entre todas las consultas.
3. [verificar_respuestas.py](verificar_respuestas.py) aporta **19 controles independientes**, usando contadores y conjuntos Python para contrastar frecuencias, pares, aportes por afiliado, medias globales, roles de fecha y cohortes de las consultas SQL. Solo lee la bodega y guarda resultados agregados: [verificacion_respuestas.json](respuestas/verificacion_respuestas.json).
4. Se ejecutó una selección de mujeres, 45–64 años, Valle del Cauca, enero–noviembre de 2008, con Top 5; los eventos forman un subconjunto válido y la bodega no cambia. Parámetros reproducibles: [parametros_answers_ejemplo.json](parametros_answers_ejemplo.json).
5. Se ejecutó un intervalo sin observaciones (2004): las 14 secciones terminan sin error, con cero eventos y **ninguna figura ficticia**. Ambos casos están registrados en la verificación independiente y sus propios manifiestos.
6. Se revisaron visualmente las 27 figuras: legibilidad, ejes, orden cronológico de edades, leyendas y notas. Las tres hojas de revisión están en `respuestas/revision_figuras_1.png`, `respuestas/revision_figuras_2.png` y `respuestas/revision_figuras_3.png`.

## Reproducir desde la raíz

```powershell
.\.venv\Scripts\python.exe -m pip install -r colombia_saludable\planes_y_evidencia\requirements_cuadernos.txt
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\ejecutar_answers.py
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\verificar_respuestas.py
```

Selección adicional sin sustituir el cuaderno principal:

```powershell
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\ejecutar_answers.py --parametros colombia_saludable\planes_y_evidencia\parametros_answers_ejemplo.json --no-guardar-cuaderno
```

Cada ejecución exitosa actualiza el índice de exportaciones; si se desea dejar el índice y el cuaderno en la selección principal, ejecutar nuevamente el comando sin parámetros. El verificador independiente se diseñó para esa selección completa y los casos de prueba documentados.

## Límites que permanecen

No se calculan costos reales completos, mora, ocupación hospitalaria real o precio promedio de recetas porque faltan los datos. Las tarifas, departamentos y clasificaciones textuales se identifican como aproximaciones. No se modificó la bodega, la base transaccional, el Core ni la interfaz del proyecto.
