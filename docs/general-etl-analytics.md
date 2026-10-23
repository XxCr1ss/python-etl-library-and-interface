# ETL general, indicadores avanzados y reportes

La aplicación incorpora contratos de carga, operaciones analíticas y trabajos de varias salidas en el paquete `etl`. El backend y el agente usan las mismas implementaciones. Las nuevas pantallas no contienen nombres de tablas ni reglas del taller Colombia Saludable.

## Alcance entregado

| Capacidad | Superficie |
| --- | --- |
| Tipos explícitos, nulos, decimal exacto, PK/UNIQUE/FK, índices y checks | Carga → Esquema explícito y calidad |
| Preparar claves en una tabla existente sin recargar sus filas | Carga → Preparar estructura sin cargar filas |
| Anexar, crear si no existe, reemplazar o recargar conservando estructura | Carga → Modo de carga |
| Fórmulas, porcentajes, totales filtrados y medias por entidad/período | Bodega de datos → Análisis avanzados |
| Selección de cohortes, población registrada y denominadores | Constructor avanzado → Población y Cohortes |
| Pares de elementos y soporte | Patrón Pares y coocurrencia |
| Distribución por intervalos, percentiles y mediana | Patrón Distribución; medida PERCENTILE |
| Edad al evento/corte, rangos, categorías y temporadas | Agrupaciones avanzadas |
| Calendario, semana ISO y zona IANA | Agrupación temporal y calendario de observación |
| Varias series, barras agrupadas/apiladas, matrices y tablas | Resultados avanzados |
| Definición guardada, filtros compartidos mapeados y ejecución de varios paneles | Reporte de varios paneles |
| CSV/JSON del resultado ya calculado y SVG del gráfico | Acciones del resultado avanzado |
| Dependencias, resultados transformados reutilizables y manifiesto | Trabajos ETL, ruta `/jobs` |

Los nuevos patrones analíticos y el DDL están disponibles para PostgreSQL. MySQL/Oracle conservan la exploración y carga anteriores; el catálogo no anuncia los patrones nuevos para esos motores. SQLite se utiliza únicamente como oráculo aislado en pruebas, no como conexión pública del producto.

## Preparar una bodega desde la web

1. Configura el origen y prepara la receta en Extracción/Transformación.
2. En Carga, configura y prueba el destino. Abre **Configurar tipos y claves**.
3. Declara el grano: por ejemplo, una fila por pago, por línea o por persona. Elige tipos, precisión/escala, nulabilidad y claves. Las claves compuestas se configuran con varias columnas; los grupos de UNIQUE, FK e índices aceptan nombres separados por coma.
4. Aplica el esquema. Esto activa lectura exacta en los orígenes de la receta e invalida su preview. Actualiza la preview y revisa de nuevo los tipos y operaciones.
5. En CSV exacto, códigos y números se leen como texto; los campos vacíos se consideran nulos. `NA` no se transforma automáticamente en nulo. Convierte explícitamente los números antes de sumarlos para evitar concatenar texto. Excel conserva sus valores de celda; no recupera precisión que el archivo ya haya perdido.
6. Usa **Revisar impacto sin escribir**. Se valida el resultado y se inspecciona la estructura real. Las acciones indican creación/reemplazo, claves faltantes, índices y operación de datos. Esta revisión no reserva el destino: la ejecución lo comprueba otra vez.
7. Ejecuta el modo elegido y revisa filas anteriores, filas enviadas, total final y checks. Sus ámbitos son distintos.

Los alias de conversión `integer`/`Int64`, `boolean` y `numeric` conservan nulos y precisión. Una fracción no se convierte silenciosamente a entero. Los alias de texto conservan los nulos. `numeric` produce Decimal, no float. La conversión explícita a `float` sigue representando números aproximados.

### Modos de carga

| Modo | Efecto |
| --- | --- |
| `fail` | Crea y carga si no existe la tabla. Si existe, rechaza. No es un upsert ni una prueba de idempotencia. |
| `append` | Agrega filas; las restricciones del destino pueden rechazar duplicados. No actualiza registros existentes. |
| `replace` | Elimina y reconstruye la tabla solicitada con su contrato. No usa CASCADE. Las dependencias que impidan el reemplazo producen un error. |
| `reload` | Borra datos dentro de la transacción y vuelve a cargar, conservando la estructura compatible. No cambia tipos ni elimina claves. |
| `schema_only` | Prepara/verifica estructura y restricciones; no inserta ni borra filas. Puede crear una tabla vacía si no existe. |

En una tabla existente, **Permitir agregar restricciones verificadas** autoriza cambios aditivos: PK faltante, UNIQUE, FK y NOT NULL. La revisión detecta nulos, duplicados y huérfanos. No cambia una PK diferente ni convierte tipos de una tabla existente. Las restricciones y la carga se aplican dentro de la misma transacción PostgreSQL; un fallo revierte los cambios de esa salida.

Para preparar una bodega ya cargada, selecciona su tabla como origen, configura un contrato compatible y usa `schema_only`. Empieza por dimensiones referenciadas y continúa con hechos. Esto no requiere copiar filas al destino ni reconstruir toda la bodega.

Los checks declarativos se aplican al resultado transformado: no nulos, unicidad, rangos y suma mínima/máxima, con severidad error o advertencia. La evolución de restricciones verifica también los datos existentes pertinentes. Un check de entrada no certifica por sí solo todo el histórico de una tabla anexada.

## Definir un análisis

La consulta sencilla sigue disponible. Para extenderla, pulsa **Usar consulta sencilla** o inicia un análisis avanzado. Indica título, grano y, si procede, zona horaria. La zona vacía conserva la de la conexión; las semanas integradas empiezan el lunes y se rotulan con la fecha de inicio ISO.

Las selecciones permiten filtros AND y rutas hacia claves PK/UNIQUE completas. Cada relación tiene un alias y puede partir de una relación anterior. Se rechazan ciclos físicos, relaciones ambiguas y cruces que no acrediten unicidad. Se permiten varias funciones de una misma dimensión mediante aliases distintos.

### Medidas y fórmulas

Cada componente tiene ID, nombre, unidad, agregación y alcance:

- **Grupo actual**: calcula según las agrupaciones.
- **Total filtrado**: calcula antes del Top N y lo reutiliza como denominador en cada grupo.
- **Población por grupo**: calcula sobre una selección de referencia, con dimensiones mapeadas explícitamente.
- **Población total**: reutiliza el total de referencia en cada grupo. Permite, por ejemplo, dividir eventos diarios entre personas registradas sin inventar una fecha para cada persona.

Las fórmulas usan IDs, números y `+ - * /`. No admiten llamadas, atributos, SQL ni código Python. Se detectan referencias inexistentes y ciclos. División por cero o por valor desconocido produce nulo. La unidad `auto` se deriva de sus componentes; sumar/restar exige unidades iguales. Una unidad explícita debe coincidir con la calculada. Para ocupación o una proporción de magnitudes iguales, declara `ratio` o utiliza `require_dimensionless` en la definición JSON.

Ejemplo independiente: importes 10 y 30 de una persona y 60 de otra dan media por evento 100/3 y media por persona atendida 100/2. Con una tercera persona registrada sin eventos, la media de totales por persona registrada es 100/3. La aplicación no intercambia esas poblaciones.

`ENTITY_AVG` primero suma o cuenta por entidad y después promedia. La definición también admite `entity_bucket` para agrupar una entidad temporal por día/mes/año. Para incluir períodos o personas sin eventos se configura una población de referencia válida. El valor de una línea puede ser el producto de cantidad y precio, permitiendo calcular primero el importe del documento.

`PERCENTILE` usa cuantiles continuos, posición `1 + (N-1)*p`, sobre valores individuales elegibles. PostgreSQL los calcula con operaciones numéricas y etapas SQL, sin convertir Decimal a float. `p=0.5` es la mediana. Se devuelven observaciones válidas, observadas y excluidas por componente; en una media por entidad se cuentan entidades.

Los KPI se recalculan sobre la selección completa. No son la suma de distintos ni el promedio de medias de la tabla de grupos. Los importes y enteros grandes conservan precisión en tablas/JSON; los gráficos aproximan números únicamente para representarlos.

### Cohortes, población y capacidad

Una cohorte selecciona claves de entidad en una selección independiente. Después mide todos sus eventos elegibles en la selección principal. El período de pertenencia y el de medición se configuran por separado. Las cohortes se combinan mediante intersección o unión acotadas; no deben sumarse grupos superpuestos como si fueran excluyentes.

La población de referencia tiene su propia selección y clave de entidad, enlazada explícitamente con la de eventos. Solo se miden eventos de entidades elegibles de esa población. Sus filtros siguen siendo independientes: revisa si el denominador debe representar toda la población registrada o una cohorte concreta. Para denominadores globales puedes omitir los mapeos de agrupación de población; para valores por grupo y medias por entidad, mapea las mismas dimensiones.

La misma estructura permite usar otra tabla de hechos como referencia, previamente agregada al grano compatible. No se unen directamente los detalles de dos hechos. Por ejemplo, minutos de recurso usados / minutos de recurso disponibles representa ocupación; contar eventos / plazas es otro indicador y otra unidad.

### Calendarios y clasificaciones

Completar calendario requiere una dimensión temporal y un intervalo acotado. **Confirmar cobertura** permite interpretar períodos sin eventos como ceros observados. Sin esa confirmación, permanecen nulos. Las medias vacías siguen siendo desconocidas. Las fórmulas se calculan en SQL después de completar el calendario, conservando sus denominadores globales.

Las categorías son reglas ordenadas: gana la primera coincidencia y se conserva una categoría desconocida. Los rangos numéricos incluyen el mínimo y excluyen el máximo; pueden aplicarse a edad calculada con nacimiento y fecha de evento/corte. Las temporadas se configuran con reglas de fecha o una tabla de calendario propia; no hay vacaciones o clasificaciones de negocio fijadas en el producto.

El límite de dimensiones es configurable mediante `ETL_WAREHOUSE_DIMENSIONS`, publicado en el catálogo y negociado con el agente. No se elimina el presupuesto de cardinalidad para obtener un cruce de cuatro características: también pueden usarse filtros y paneles por corte.

### Pares e histogramas

En pares, indica canasta/documento y elemento. El Core deduplica canasta–elemento, genera A < B, excluye pares consigo mismos y cuenta cada par una vez por canasta. Soporte = canastas con el par / todas las canastas elegibles, incluidas las de un elemento. Top N no modifica el denominador. Los límites se comprueban antes de materializar la expansión.

El histograma usa intervalos ascendentes; el último incluye su extremo superior. Fuera de rango y valores desconocidos tienen un grupo explícito. La tabla acompaña siempre la distribución.

## Reportes y resultados

Agrega definiciones de resultados al reporte y ejecuta hasta ocho paneles en una operación. PostgreSQL comparte un snapshot de lectura entre esos paneles; otras conexiones u operaciones posteriores no comparten ese snapshot.

**Filtros compartidos** permite añadir condiciones con AND mediante un mapeo explícito por panel. Selecciona campos del mismo tipo o excluye el panel. No se ejecuta SQL al aplicarlos. Las condiciones resultantes se guardan en cada definición; para sustituir una condición anterior edita ese panel, no añadas otra contradictoria.

La definición se guarda en el navegador, separada por cuenta y contexto de conexión, sin contraseñas ni resultados. Hay una definición guardada por contexto; exporta/importa JSON para conservar varias o compartir configuraciones. Recargar elimina credenciales y resultados en memoria, por lo que tendrás que conectar de nuevo.

La tabla y los gráficos de un resultado conservan su definición y su identificador de ejecución al editar el formulario. CSV/JSON de **este resultado** exportan esa ejecución acotada, sin consultar otra vez. Las descargas de la consulta sencilla conservan su comportamiento anterior: vuelven a leer la bodega. El SVG corresponde a barras/líneas ya representadas; las matrices tienen tabla y CSV/JSON. PDF y caja y bigotes no forman parte de esta entrega.

Las matrices distinguen nulo de combinación no devuelta; una combinación omitida por Top N no se convierte en cero. La intensidad de color no reemplaza el valor legible. La cantidad de series/celdas está acotada y todas las vistas tienen alternativa tabular.

## Trabajos ETL y recuperación

1. Prepara una receta y su esquema en Carga; actualiza su preview.
2. En **Trabajos ETL**, agrega el pipeline actual como salida. Sus credenciales se copian a un almacén independiente solo en memoria.
3. Prepara otras salidas y agrégalas. Elige una fuente o un resultado transformado como entrada; los cruces también pueden referenciar nodos. Los contratos FK entre salidas al mismo destino establecen orden de carga.
4. Añade dependencias adicionales, conservación de filas/sumas y checks. Los ciclos y destinos repetidos se rechazan.
5. **Validar sin escribir** ejecuta las transformaciones y checks, incluidas referencias entre salidas conocidas. No certifica que una bodega haya sido cargada. La estructura SQL y las referencias a tablas externas se validan en cada persistencia real.
6. Ejecuta. Reemplazar/recargar requiere confirmación explícita. Cada salida tiene su transacción; no existe rollback global del trabajo.
7. Consulta/descarga el manifiesto y revisa cualquier resultado parcial o incierto antes de otro intento.

La receta se ejecuta en el Core; el backend solo resuelve conexiones y coordina I/O. Los jobs usan una lista de operaciones declarativas y referencias a fuentes/nodos. No incluyen las operaciones legacy con expresiones Python. El Core predice expansiones de joins/uniones/listas en las rutas acotadas y rechaza resultados excesivos antes de materializarlos cuando esa predicción es posible.

El manifiesto registra versiones/hashes, conteos y estados, sin filas ni credenciales. Reenviar el mismo UUID devuelve el intento aceptado, sin repetirlo. **Conciliar y reanudar** verifica definición, destino, contenido de entradas y estructura/contenido completo de salidas previas. Si no puede acreditarlo, no reintenta la escritura. Un append sobre un histórico anterior puede requerir conciliación manual: el verificador no inventa un hash del histórico que nunca observó.

Las solicitudes aceptadas conservan una tarea del servidor aunque el navegador deje de esperar. Reiniciar el backend puede dejar escrituras inciertas; el manifiesto las conserva como tales. La recuperación no es una compensación ni prueba de que una escritura se deshizo. El historial del contexto permite recuperar el UUID después de recargar. Una escritura incierta bloquea un trabajo nuevo sobre el mismo destino hasta conciliar/reanudar o confirmar una revisión manual; el servidor exige `reviewed_unknown` para esa excepción explícita.

Los jobs son secuenciales, con hasta 40 nodos, 100 pasos por nodo, presupuesto de caché de 64 MiB y comprobaciones de tiempo entre etapas de hasta 300 s. Los límites de filas/bytes de carga se heredan del transporte. El tiempo de Python no es una cancelación forzada de un driver o de una función que ya esté ejecutándose; SQL tiene sus propios timeouts. El despliegue usa el mismo supuesto de un proceso/réplica del broker existente.

Los manifiestos se guardan mediante un adaptador local reemplazable:

- `ETL_JOB_MANIFEST_DIR`: directorio; predeterminado `.etl_runtime/jobs/`, fuera de Git.
- `ETL_JOB_MANIFEST_RETENTION_DAYS`: 30 por defecto para registros terminados.
- `ETL_JOB_MAX_MANIFESTS`: 100 por contexto. Las ejecuciones inciertas/parciales no se eliminan automáticamente; si se alcanza el presupuesto, hay que revisarlas antes de crear otras.

En despliegues efímeros se necesita almacenamiento persistente para conservar esa evidencia entre reinicios del servicio. El JSON del trabajo contiene referencias; después de importarlo, vincula los alias al origen/destino actual del pipeline. `schema_only` se prepara por separado en Carga, no se captura como nodo de datos.

## API, Core y compatibilidad

Contratos: `etl.schema.LoadSchemaSpec`, `etl.warehouse.analysis_models.AnalysisSpec`/`ReportDefinition` y `etl.jobs.JobDefinition`, versión 1. El grano, entidades, unidades, roles temporales y poblaciones se expresan en estos contratos; no se infieren desde nombres de tablas.

```python
from etl import AnalysisSpec, LoadSchemaSpec, JobDefinition
from etl import execute_warehouse, persist_schema, execute_job

# Los diccionarios de conexión se proporcionan en memoria, fuera de las definiciones.
analysis = AnalysisSpec.model_validate({
    "version": 1, "title": "Eventos por entidad", "grain": "un evento",
    "selection": {"base_table_id": '["public","events"]'},
    "measures": [
        {"id": "events", "aggregation": "COUNT_ROWS"},
        {"id": "entities", "aggregation": "COUNT_DISTINCT",
         "value": {"field": {"column": "entity_id"}}},
    ],
    "formulas": [{"id": "usage", "label": "Uso medio",
                  "expression": "events / entities"}],
})
# execute_warehouse("analyze", {"connection": connection, "analysis": analysis.model_dump()})
```

Endpoints nuevos: `POST /load/schema-preview`, `POST /warehouse/analyze`, `POST /warehouse/report`, `POST /warehouse/definition`, `POST /jobs/definition`, `POST /jobs/execute`, `GET /jobs` y `GET /jobs/{run_id}`. El documento de trabajo/reporte excluye conexiones; la solicitud de ejecución las proporciona por separado.

El agente negocia `load_schema_version`, `typed_extract_version`, `preview_load` y acciones analíticas antes de recibir sus credenciales correspondientes. Un agente antiguo puede seguir usando funciones anteriores, pero no recibe una solicitud avanzada que no anunció. No hay fallback a escritura, otro host o modo directo. Las rutas nuevas exigen HTTPS remoto o loopback y respetan el emparejamiento y política de conexiones existentes.

Para el historial autenticado se incluye `supabase/migrations/20261023090927_general_etl_load_modes.sql`: amplía únicamente el CHECK de modos de carga para `reload`/`schema_only`. Se debe aplicar al desplegar esta versión cuando se utilice ese historial. No cambia permisos, RLS ni autenticación. La migración se prueba con consultas de PostgreSQL embebido y las pruebas de aislamiento de roles del proyecto; no se aplicó a un proyecto remoto durante el desarrollo.

## Cobertura funcional del taller

Esta tabla supone fuentes y definiciones suficientes; no afirma disponibilidad de datos del caso.

| Familias del taller | Operaciones generales |
| --- | --- |
| P01 | Duración validada, media, percentiles, N válido/excluido e histograma. |
| P02–P03 | Agregados, distintos, rutas dimensionales y clasificaciones. |
| P04 | Pares, frecuencia y soporte. |
| P05 | Eventos/personas; población atendida o registrada, incluyendo ceros declarados. |
| P06 | Recurso-tiempo/capacidad compatible y temporadas. |
| P07 | Roles de fecha, calendario, períodos vacíos y series. |
| P08 | Separación entre media por evento y media de totales por entidad. |
| P09 | Selección de cohorte y medición independiente de sus eventos. |
| P10 | Geografía, condiciones de causa y denominadores/tasas explícitos. |
| P11 | Cantidad × precio, suma por documento y media posterior. |
| P12–P14 | Cohortes de comportamiento/salida, edad al evento, segmentos, distintos y porcentajes. |

No se han añadido soluciones especiales para esas preguntas. Los fixtures de ventas y educación contrastan los mismos mecanismos. El número de figuras del cuaderno no determina el número de consultas ni de paneles de la aplicación.

## Verificación y límites de entrega

Validación del 23 de octubre de 2026: 319 pruebas aisladas de backend; 18 integraciones PostgreSQL/agente aprobadas (4 opcionales omitidas); 482 pruebas frontend; 9 pruebas de metadatos/roles; dos recorridos mock y dos reales en navegador. Build, TypeScript, ESLint y auditoría de artefactos reales aprobados. Cobertura frontend: 89,25 % de líneas y 78,17 % de ramas.

Las pruebas usan únicamente `etl_test*` y tablas registradas `etl_e2e_*` para escritura real. Incluyen carga directa/agente, claves físicas, decimales, enteros grandes, booleanos nulos, timestamps con zona, fórmulas, cuantiles, pares, reportes y recuperación de jobs. Los tests aislados incluyen ventanas sin eventos, cohortes, capacidad, edad al evento y defensa ante multiplicación de filas. El navegador comprueba formularios, exportaciones, accesibilidad y reflow con datos sintéticos; el perfil real no guarda capturas ni trazas con credenciales.

```powershell
.\.venv\Scripts\python.exe -m pytest -c backend/pytest.ini backend/tests -m "not integration" -q
.\.venv\Scripts\python.exe -m pytest -c backend/pytest.ini backend/tests/integration -m integration -q
npm --prefix supabase test
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test:coverage
npm --prefix frontend run build
npm --prefix frontend run test:e2e:mock -- warehouse.spec.ts general-analytics.spec.ts
$env:PYTHON_EXECUTABLE = (Resolve-Path .\.venv\Scripts\python.exe).Path
npm --prefix frontend run test:e2e:real -- warehouse.spec.ts general-analytics.spec.ts
.\.venv\Scripts\python.exe backend/tests/integration/artifact_audit.py frontend/test-results/real
```

Build, typecheck y E2E que reconstruyen `.next` deben ejecutarse secuencialmente. MySQL/Oracle reales se omiten si no existe infraestructura explícita. La suite SQL embebida no equivale a un despliegue Supabase; `supabase db advisors --local` requiere el stack local, que no estaba escuchando durante esta implementación.

Siguen fuera de esta entrega incremental/upsert, SCD2, publicación atómica global, vistas/cruces entre esquemas, soporte universal de tipos SQL, PDF, caja y bigotes y trabajos distribuidos. Son extensiones separadas; ninguna se presenta como ya disponible.
