# Fase 07: arranque, pruebas y soporte

## Pruebas del diagrama E-R

`e2e/mock/diagram.spec.ts` abre dos páginas del mismo contexto, comprueba restricción a Transformación, confirmar/cancelar origen, F5, muestra acotada, resize por pointer/teclado y reflow. Una fixture de 20 tablas/30 relaciones y 50 columnas valida accesibilidad/contraste del tema claro con ambos esquemas del sistema y produce capturas sintéticas para revisión.

`e2e/real/diagram.spec.ts` usa `seed-diagram` del harness PostgreSQL para crear tablas propias con restricciones FK simples, compuestas y autorreferentes reales. Verifica grafo, muestra HTTP y cambio de origen entre pestañas. Mantiene las restricciones de artefactos del perfil real. `backend/tests/integration/test_schema_graph_integration.py` añade paridad HTTP/agente CLI real.

Para ejecutar solo esta funcionalidad: `npm run test:e2e:mock -- diagram.spec.ts` y después `npm run test:e2e:real -- diagram.spec.ts`. Nunca ejecutar ambos perfiles a la vez. Los tests `src/tests/diagram-*.test.*` cubren contratos, aislamiento, cancelación, estado obsoleto, confirmación y panel; los umbrales críticos se mantienen en 80% líneas/75% ramas. `test:e2e:visual` compara siete referencias claras: diagrama a 1440 px y Transformación/editor a 375, 768 y 1440 px, sin actualizarlas automáticamente.

Revisado el 16 de octubre de 2026 (America/Bogota). Este manual está versionado aquí; la copia de `Planes/evidencia-fase07/` es local porque `Planes/` está ignorada por Git.

## Instalación limpia

Entorno local: Windows, Node 24.11.0, npm 11.6.1, Python 3.14 y PostgreSQL 18. CI declara Ubuntu, Node 24.11.0, Python 3.14 y `postgres:18-alpine`; su resultado remoto se comprobará después de publicar. Una ejecución local no certifica ese runner.

Desde la **raíz**, en PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt -c backend/constraints.txt
.\.venv\Scripts\python.exe -m pip check
npm --prefix frontend ci
Push-Location frontend
npx playwright install chromium
Pop-Location
```

En Linux usar `.venv/bin/python` y `npx playwright install --with-deps chromium` desde `frontend/`. El manifiesto dev incluye el de ejecución. Las constraints se resolvieron originalmente en Windows; CI comprueba su instalación en Linux.

PostgreSQL debe estar iniciado y la base de pruebas creada previamente. Crear una base descartable cuyo nombre empiece por `etl_test`, con usuario dedicado y permisos para crear/eliminar tablas en ella. No usar credenciales de negocio. CI provisiona su propio servicio; en local se necesita PostgreSQL instalado o un contenedor descartable. La falta de infraestructura no equivale a prueba aprobada.

Definir en `.env.local` de la raíz (ignorado por Git), o en el entorno:

```dotenv
ETL_TEST_DB_TYPE=postgresql
ETL_TEST_DB_HOST=127.0.0.1
ETL_TEST_DB_PORT=5432
ETL_TEST_DB_NAME=etl_test_isolated
ETL_TEST_DB_USER=etl_test_user
ETL_TEST_DB_PASSWORD=<password_sintetica_de_la_base_descartable>
```

Se exige configuración explícita y base `etl_test*`. `ETL_IGNORE_DOTENV=1` desactiva el archivo para comprobar el rechazo de configuración ausente. `PYTHON_EXECUTABLE` selecciona un ejecutable existente; sin él se buscan los virtualenvs del repositorio en Windows y Linux.

## Aceptación

Desde raíz:

```powershell
.\.venv\Scripts\python.exe -m pytest -c backend/pytest.ini backend/tests -m "not integration" -q
.\.venv\Scripts\python.exe -m pytest -c backend/pytest.ini backend/tests/integration -m integration -q
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test:coverage
npm --prefix frontend run build
npm --prefix frontend run test:e2e:mock
npm --prefix frontend run test:e2e:real
.\.venv\Scripts\python.exe backend/tests/integration/artifact_audit.py frontend/test-results/real
# Solo Windows: compara las 7 referencias visuales claras revisadas
npm --prefix frontend run test:e2e:visual
```

Cada perfil E2E **compila siempre** los fuentes vigentes y fija `NEXT_PUBLIC_API_URL` antes del build. No reutiliza servidores. Reserva frontend 3100 y backend 8000; detener servidores manuales antes de probar. `ETL_E2E_FRONTEND_PORT` cambia frontend y CORS. No ejecutar los perfiles simultáneamente: comparten el build de Next. El perfil por defecto es mock; real requiere `--project=real` o `ETL_E2E_MODE=real`.

La suite rápida prohíbe adaptadores externos; integración los restaura explícitamente. No ejecutar pytest indiscriminadamente desde raíz: `pruebas/` y `backend/test_api_*.py` contienen scripts heredados con conexiones locales.

## Aislamiento y diagnóstico

Cada corrida real recibe un directorio temporal `etl-e2e-<UUID>` independiente del `ETL_UPLOAD_DIR` del usuario. La fixture registra rutas entregadas por el upload y elimina exclusivamente esos archivos, dentro del directorio propio, con nombre UUID y sin enlaces simbólicos. Expiración borra solo su fuente y comprueba que sobrevive un CSV vecino. La eliminación final del directorio es no recursiva.

Las tablas tienen nombres únicos `etl_e2e_*`. El harness Python es la única implementación de preparación, inspección SQL y limpieza; Playwright lo invoca mediante `sqlClient.ts`. Solo elimina nombres registrados. FK inválida mide el contenido antes/después; no se presume atomicidad general. `fail` se verifica en API porque la UI ofrece replace/append.

La validación de FK comprueba referencias en el loader; no crea ni certifica restricciones SQL FOREIGN KEY en el esquema destino.

**Mock:** HTML/JUnit/capturas/trazas del primer fallo en `frontend/playwright-report/mock/` y `frontend/test-results/mock/`. Solo usa contraseñas sintéticas de fixtures; no carga credenciales reales. Joins/union usan oráculos compartidos con Python, contrastados con HTTP real, y comprueban payload, claves, fuente y valores.

Los dos escenarios sintéticos de errores/carreras y edición conservan también la traza cuando pasan, para documentar la recuperación. Los outputs mock se preservan; los outputs internos reales se eliminan. Al ejecutar otra vez Playwright, exportar primero cualquier evidencia que deba archivarse.

**Real:** `summary.json`, `junit.xml`, `index.html` en `frontend/test-results/real/`. Solo contienen estado, archivo/línea, duración y reintento. No serializan títulos dinámicos, errores, pasos, stdout/stderr, adjuntos, requests ni entorno. `TestDbConfig` excluye password de su representación. CI condiciona la publicación de los archivos permitidos a una auditoría de artefactos.

**Excepción al plan de trazas:** el perfil real desactiva trace/screenshot/video y usa `preserveOutput=never`. Playwright conserva cuerpos HTTP y argumentos de `fill`, incluso de campos password; redactar el DOM no basta. Se sustituyen por reportes públicos y verificación SQL. Los fallos reproducibles con datos sintéticos se investigan en mock, que conserva el primer fallo. Una regresión introduce secretos en errores/pasos/adjuntos y comprueba que el reporte no los publica.

V8 exige 80% líneas y 75% ramas globales y por grupos críticos: serializadores, validadores, reducer/storage/provider, registry/definiciones y hooks. No se excluyen módulos difíciles del denominador.

## Auditoría de interfaz y rendimiento

`final-audit.spec.ts` verifica tema claro con sistema claro/oscuro a 375×812, 768×1024, 1440×900. Comprueba axe WCAG A/AA con contraste, semántica, foco cíclico/restaurado, movimiento reducido, modal, tabla 10×50 y ausencia de overflow del documento. Adjunta capturas y casos `incomplete` para revisión; axe no certifica lectores de pantalla ni sustituye revisión humana.

El reflow equivalente a 200% usa viewport CSS 720×450 respecto a pantalla 1440×900, con footer del editor accesible y operable. Certifica reflow, no todas las combinaciones de zoom nativo/lector/navegador. La comparación visual se realiza en el mismo Windows/Chromium/fixtures; CI no regenera snapshots automáticamente.

Las 12 referencias de transformación/editor están en `e2e/visual-baselines/win32/`. `test:e2e:visual` activa su comparación (máximo 0.2% de píxeles diferentes) y falla si faltan; nunca las actualiza. Linux ejecuta axe, teclado/reflow y captura evidencia con `test:e2e:mock`; la comparación de píxeles con las referencias de Windows no se certifica en Linux. Una nueva plataforma necesita sus propias capturas revisadas. El reloj de los mocks está fijado y las aserciones del total buscan su etiqueta, no coincidencias parciales con fechas.

El build mock usa `next build --profile`; el hook DevTools registra commits React con 10×50 y comprueba que abrir/cambiar/cerrar editor no añade previews. Los tiempos se adjuntan al reporte, separados de red/SQL. Los builds real y normal no incluyen profiling. Comparar bundle sobre el build normal. Las mediciones locales no son un presupuesto universal de latencia.

## Arranque manual

Ambas terminales desde **raíz**:

```powershell
# Terminal 1
$env:PYTHONUTF8='1'
$env:CORS_ORIGINS='http://localhost:3000,http://127.0.0.1:3000'
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

```powershell
# Terminal 2
$env:NEXT_PUBLIC_API_URL='http://localhost:8000/api/v1'
npm --prefix frontend run build
npm --prefix frontend run start
```

## Arquitectura y sesión

DTO/validación en `src/types/etl.ts`/`etlValidation.ts`; transporte/codecs en `src/services/`; sesión en `src/state/`; formularios compartidos en `src/components/etl/`. Los servicios no importan React.

`etl_pipeline_session_v1` (schemaVersion 1) persiste por allowlist fuente, receta con IDs, configuración/FK e historial resumido. Retira `etl_active_source` y `etl_transform_recipe`. JSON corrupto ofrece restablecer; historial corrupto puede limpiarse por separado. CredentialStore conserva passwords solo en memoria con referencias opacas. F5 exige reingreso de origen/secundarios/destino; password vacía requiere confirmación explícita.

## Añadir una transformación

1. Implementar/exportar la operación pandas en `etl/transformer/`.
2. Registrar el despacho en **apply_transformation_steps**, función de `backend/services/transform_service.py`. Actualizar CATALOG_OPERATIONS en `backend/api/routes/transform.py` o las extensiones de `backend/operation_catalog.py`.
3. Añadir parámetros en StepParamsByType (`frontend/src/types/etl.ts`) y validación en `etlValidation.ts`.
4. Registrar definición/formulario/codec bajo `frontend/src/app/(app)/transform/components/step-editor/definitions/`, con dependencias de columnas cuando proceda.
5. Añadir input/params/expected en **backend/tests/fixtures/operations.json** y actualizar el snapshot HTTP **frontend/src/tests/fixtures/operations-catalog.json**. No existe una copia frontend de resultados de operaciones; el catálogo contiene metadatos.
6. Ejecutar `python -m pytest -c backend/pytest.ini backend/tests/test_operations.py -q` y `npm --prefix frontend run test:run`; añadir edición, validación, serialización y roundtrip. La paridad exige actualmente 42 operaciones: al ampliar inventario actualizar deliberadamente ese conteo esperado.

Regenerar fixtures E2E con `python backend/tests/fixtures/export_frontend_contracts.py`; `backend/tests/test_environment.py` verifica sus respuestas contra HTTP real. No actualizar expectativas para ocultar regresiones.

## Compatibilidad y límites

| Capacidad | Evidencia | Límite |
| --- | --- | --- |
| CSV | FastAPI/pandas y E2E PostgreSQL | Blancos se leen como NaN/null. |
| XLSX/XLS | Archivos reales en contratos Python | Primera hoja por defecto; sin E2E navegador→PostgreSQL para Excel. |
| Fecha | 366 filas y límites 2024-01-01/2024-12-31 por SQL | Años admitidos 100..9999; no prueba real de todos los años. |
| PostgreSQL | Origen, join secundario, destino, FK, modos y agente reales | Local PostgreSQL 18; CI configurado 18, ejecución remota pendiente al publicar. |
| MySQL/Oracle | Payloads y dobles de adaptador | **No verificados con motores reales**; Oracle conserva service_name. |
| Agente | WebSocket y CLI real con PostgreSQL | Solo extracción; carga en backend. Identificador sin autenticación criptográfica. |

Uploads temporales: al expirar hay recuperación; confirmar otra fuente invalida receta. Preview BD cuenta muestra; transformación cuenta dataset; carga cuenta total final en destino, incluyendo filas previas de append.

Error de red/HTTP distinto de 422 tras enviar carga implica unknown. Navegar/F5 no reenvía; repetir exige revisar destino. Revertir código no revierte reemplazos SQL. Persisten eval de expresiones y agente sin autenticación criptográfica: no se certifica un servicio público multiusuario.

## Demo sintética

1. Arrancar app y PostgreSQL de prueba; abrir dashboard y reiniciar pipeline si procede.
2. Subir `frontend/src/tests/fixtures/sample_sales.csv`: muestra 5 de 12.
3. Renombrar col_monto a ingreso_total: muestra 10 de 12, edición con esquema previo.
4. Probar destino descartable, tabla etl_e2e_demo_ventas, dimensión/replace; confirmar y comprobar total 12.
5. Revisar dashboard, export sin requests/filas/secretos y F5 con reingreso de credenciales.
6. Limpiar solo esa tabla: `python backend/tests/integration/sql_harness.py drop-tables --tables etl_e2e_demo_ventas` con el mismo entorno de pruebas.

Las regresiones de `diagram.spec.ts` alternan foco entre pestañas y reproducen `visibilitychange` también en Chromium headless, que puede considerar visibles ambas páginas. Verifican conexión directa y agente simulado, reconexión con el mismo diagrama, apertura desde Transformación y recuperación del formulario al regresar. La comprobación geométrica a 1440/1920 px exige alineación con el stepper y 256 px de ancho adicional al ocultar navegación. La variante real de `e2e/real/diagram.spec.ts` repite el caso con PostgreSQL y un proceso CLI de agente, incluyendo cinco alternancias, reconexión y apertura desde Transformación. Si existe un virtualenv antiguo de replay, definir `PYTHON_EXECUTABLE` con la ruta del entorno actual antes de ejecutar el perfil real.
