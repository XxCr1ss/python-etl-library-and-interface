# Bodega de datos: analítica y reportes

El módulo `/analytics` explora la bodega real mediante SELECT. Está disponible desde
«Bodega de datos» en la navegación y no necesita un pipeline ni una carga previa.
La muestra de Load y su conteo de destino no se utilizan como datos analíticos.

La evolución general incorpora un constructor avanzado, reportes reproducibles y
trabajos ETL con varias salidas. Consulta [la guía de ETL y analítica general](general-etl-analytics.md)
para tipos/claves explícitos, cohortes, pares, calendarios, fórmulas y sus garantías.
Las secciones siguientes describen principalmente la consulta sencilla original.

## Uso

1. Configura motor, host, puerto, base y usuario de lectura; en Oracle proporciona
   service name. Ingresa contraseña o selecciona explícitamente contraseña vacía.
   «Usar destino de Carga» copia la configuración disponible en memoria, sin
   modificar Load. Los cambios posteriores de Load requieren volver a copiar.
2. Conecta y lee catálogo. Se explora el esquema predeterminado de PostgreSQL,
   MySQL u Oracle, con tablas físicas; vistas y cruces entre esquemas quedan fuera.
3. Elige tabla base y agrega métricas. COUNT_ROWS cuenta filas, COUNT cuenta valores
   no nulos y COUNT_DISTINCT cuenta valores distintos no nulos. SUM/AVG requieren
   elegir explícitamente una columna numérica; un ID numérico no es una medida.
4. Agrega dimensiones y, si es necesario, relaciones directas hacia una PK/UNIQUE
   completa. El selector distingue varias FK al mismo destino y claves compuestas.
   Sin FK puedes definir un mapeo manual hacia una clave única verificable; sin ella
   puedes explorar la tabla individual. No se modifica el esquema de la bodega.
5. Configura filtros AND, orden y Top N; pulsa «Consultar y graficar». Cambiar campos
   no ejecuta SQL. Cambiar gráfico tampoco repite la consulta. Los filtros de texto
   son literales; CONTAINS escapa comodines y sigue la collation del motor. En IN la
   interfaz separa valores con punto y coma. Fechas/horas usan ISO; decimales usan
   punto, sin separadores de miles.
6. Los KPI representan todo el conjunto filtrado antes del Top N. AVG global no es
   el promedio de los promedios de categoría. Sin filas, conteos=0 y las demás
   agregaciones conservan null. No se infiere moneda ni significado de negocio.
7. Usa la tabla agregada o una barra/porción para abrir el detalle de una categoría.
   Elige columnas del detalle y pagina remotamente. Sin PK/UNIQUE no nula solo hay
   muestra inicial; el conteo completo se consulta al solicitar «Calcular total».
8. Elige alcance del reporte: agregado actual con Top N, detalle filtrado desde el
   inicio, o muestra. Descarga CSV/JSON. Detalle completo que exceda el presupuesto
   se rechaza antes de descargar; filtra más. Cada descarga consulta datos actuales.

Los resultados anteriores quedan señalados al editar el borrador; aplica o descarta
cambios para exportar o consultar detalle. Recargar elimina credenciales y datos
analíticos. Navegar conserva el contexto. «Desconectar bodega» limpia analítica;
el control global de reinicio limpia también esta sesión, manteniendo el historial
ETL y la identidad del agente conforme a su comportamiento existente.

## Lectura y exactitud

Usa una cuenta con permisos SELECT. Una credencial copiada de Load puede tener
permisos de escritura; copiarla no cambia sus privilegios. El compilador solo
acepta referencias validadas y operadores conocidos; no recibe SQL libre.
Las transacciones de lectura se configuran explícitamente; no hay degradación a
lectura/escritura si la configuración falla.

PostgreSQL usa REPEATABLE READ READ ONLY con statement_timeout y lock_timeout.
Oracle usa SET TRANSACTION READ ONLY y call_timeout; MySQL usa START TRANSACTION
READ ONLY y MAX_EXECUTION_TIME, con timeout del driver. En MySQL se declara
consistencia por sentencia por la posible presencia de tablas no transaccionales.
Gráfico y KPI comparten transacción en la misma operación. Detalle, páginas y
exportaciones posteriores pueden ver cambios; no se mantiene snapshot interactivo.

Solo se admiten joins directos hacia claves únicas completas, con todos los pares
de una FK compuesta. LEFT conserva huérfanos; un filtro no nulo sobre dimensión en
WHERE puede excluirlos. No hay relaciones inversas uno-a-muchos, autouniones,
cruces muchos-a-muchos ni recorridos multinivel de copo de nieve.

Decimal y enteros fuera del rango seguro de JavaScript viajan como texto tipado,
sin pasar por float/Pandas. La tabla y JSON conservan valores exactos. El dibujo
del gráfico aproxima números finitos; ofrece tabla alternativa. Los nulos son
«Sin valor» y se distinguen de cero, false y cadena vacía. Una dona presenta
porcentajes sobre categorías mostradas, sin «Otros» inferido; no admite negativos,
nulos, total no positivo o más de 12 categorías. Líneas requieren calendario
cronológico. Las fechas usan zona/calendario de sesión declarados, no los del
navegador; timestamp sin zona se considera local.

CSV usa UTF-8, protege texto/encabezados contra fórmulas y representa null con
celda vacía. JSON conserva tipos y null, columnas y alcance público de consulta;
ningún reporte contiene configuración de conexión o credenciales.

## Agente híbrido

Arranca un agente actualizado con `python etl_agent.py`, con URL e ID mostrados en
la interfaz. Para analítica no se necesita `--allow-load`. Host y puerto se
interpretan desde su máquina. Backend remoto requiere HTTPS/WSS; HTTP solo se
permite en loopback. La API también comprueba el transporte de las solicitudes.

El backend negocia el bloque `warehouse` del protocolo 1 antes de enviar
credenciales. Agente antiguo produce incompatibilidad, sin fallback directo.
Un túnel remoto HTTP/WS no anuncia capacidad analítica: se rechaza antes de enviar
credenciales de bodega. Esta restricción no cambia las operaciones legacy de Extract.
Catálogo, query, detail y export comparten core entre ejecutores. Se elige el menor
límite de ambos lados, incluido sobre JSON y expansión base64 de exportaciones.
La respuesta del agente se valida antes de devolver datos o descargar bytes.

Un agente no procesa comandos analíticos en paralelo con Load. Tras cancelar la
espera, SQL puede seguir activo: no se libera la exclusión hasta respuesta o
desconexión segura. Una carga incierta conserva la cuarentena de Load. Consulta
[la guía del agente](hybrid-load.md) para recuperación. No hay reintentos automáticos.
El broker actual requiere un worker y una réplica. ID de agente y CORS no son
autenticación: este despliegue es controlado y de un usuario, como el ETL existente.

## Límites

Todos se configuran con variables `ETL_WAREHOUSE_<NOMBRE>` positivas en backend y
agente. Los valores efectivos se publican en catálogo/capacidades. No son garantías
de rendimiento; un GROUP BY puede examinar muchas filas pese al límite de salida.

| Nombre | Predeterminado |
| --- | --- |
| TABLES / CATALOG_COLUMNS | 200 tablas / 5.000 columnas |
| METRICS / DIMENSIONS / JOINS / FILTERS | 6 / 3 / 4 / 20 |
| IN_VALUES / TEXT_LENGTH | 100 / 1.000 caracteres |
| GROUPS | 1.000; interfaz inicialmente Top 20 |
| PAGE_SIZE / COLUMNS / OFFSET | 100 / 50 / 10.000; interfaz usa páginas de hasta 50 |
| EXPORT_ROWS / EXPORT_BYTES | 20.000 filas / 10 MiB |
| MESSAGE_BYTES | 16 MiB con sobre/base64; reduce presupuesto de archivo si hace falta |
| CONNECT_SECONDS / STATEMENT_SECONDS / EXPORT_SECONDS | 10 / 30 / 60 segundos |
| OPERATION_SECONDS | 90 segundos, incluyendo reflexión y sentencias |

Espera HTTP/agente: hasta 120 segundos, sin garantizar cancelación del driver.
El presupuesto de mensajes también respeta ETL_LOAD_MAX_MESSAGE_BYTES del canal
existente. Alinear --ws-max-size y el proxy con los límites anunciados; reducir
solo el límite externo del servidor puede cerrar el socket antes de responder.
Los errores públicos diferencian consulta inválida (422), catálogo/agente ocupado
(409), exceso de salida (413), ejecutor/conexión no disponible (503), timeout (504)
y transporte remoto inseguro (400). Respuestas del módulo usan Cache-Control no-store.
No habilitar logs de SQL, payloads ni tramas con datos/credenciales.

## Verificación

Desde raíz, con el entorno existente:

```powershell
.\.venv\Scripts\python.exe -m pytest -c backend/pytest.ini backend/tests -m "not integration" -q
.\.venv\Scripts\python.exe -m pytest -c backend/pytest.ini backend/tests/integration -m integration -q
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test:coverage
npm --prefix frontend run build
npm --prefix frontend run test:e2e:mock -- warehouse.spec.ts
npm --prefix frontend run test:e2e:real -- warehouse.spec.ts
.\.venv\Scripts\python.exe backend/tests/integration/artifact_audit.py frontend/test-results/real
```

Mock y real deben ejecutarse secuencialmente: comparten build. Las pruebas reales
usan únicamente bases descartables `etl_test*`, tablas registradas `etl_e2e_*` y el
harness existente. El perfil real no conserva trazas, capturas, videos ni errores
crudos con credenciales; su reporte usa una lista permitida de campos públicos.

Los tests aislados usan SQLite como oráculo SQL, mocks y compilación de dialectos;
eso no certifica MySQL/Oracle. Sus pruebas reales son optativas mediante variables
ETL_TEST_MYSQL_* / ETL_TEST_ORACLE_* ya documentadas en hybrid-load.md; sin ellas se
omiten explícitamente. PostgreSQL tiene prueba HTTP/agente CLI real, clave compuesta,
KPI/Top N, paginación, exportación, precisión y rechazo de escritura/timeout SQL.

Fuentes técnicas de los adaptadores: [transacciones PostgreSQL](https://www.postgresql.org/docs/current/sql-set-transaction.html),
[presupuesto SELECT MySQL](https://dev.mysql.com/doc/refman/8.4/en/optimizer-hints.html),
[call_timeout de python-oracledb](https://python-oracledb.readthedocs.io/en/latest/api_manual/connection.html).

## Evidencia local del 21 de octubre de 2026

Entorno: Windows, Python 3.14.0, Node 24.11.0 y npm 11.6.1. Recharts 3.10.1 y
react-is 18.3.1 fijados en package.json y lockfile; sin migración de React/Next.

| Verificación | Resultado |
| --- | --- |
| Backend aislado completo | 269 aprobadas; seis avisos existentes del generador histórico de fechas |
| Integración completa | 16 aprobadas; 4 omitidas (Load/Analítica MySQL y Oracle sin infraestructura) |
| Frontend Vitest completo | 391 aprobadas en 37 archivos |
| Cobertura V8 | 92,45 % líneas / 83,52 % ramas; umbrales globales y críticos aprobados |
| Typecheck, lint y build normal | Aprobados; sin advertencias ESLint |
| Playwright mock | 4 aprobadas: analítica y tres regresiones del diagrama E-R |
| Playwright real | 1 aprobada: analítica contra PostgreSQL |
| Auditoría de artefactos reales | Aprobada; sin credenciales ni capturas crudas |

La prueba real del agente CLI/WebSocket forma parte de integración backend. Axe
y reflow se comprobaron en mock con temas claro/oscuro y anchos 375/768/1440 px;
también 720×450 para reflow. Las capturas sintéticas se revisaron visualmente.
Esto no certifica lectores de pantalla ni ejecución en otros sistemas operativos.

Build normal: `/analytics` 10,2 kB de ruta y 126 kB de First Load JS; compartido
global 87,9 kB. Recharts queda en chunk dinámico separado para los resultados,
fuera del shell compartido. Son mediciones locales del build actual, no un
presupuesto universal de rendimiento. No se ha desplegado esta funcionalidad.
