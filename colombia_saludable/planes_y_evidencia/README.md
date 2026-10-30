# Colombia Saludable: ETL Core y evidencia

## Estado actual

**Proceso completo ejecutado el 30 de octubre de 2026** en `colombia_saludable_dw_core_v2`, configurada en `colombia_saludable/.env`: 17 tablas, 79.767 filas y 42 referencias lógicas conciliadas. El origen y el Core permanecieron sin cambios. Esta carga no necesitó reparación del booleano nullable.

Los dos cuadernos conservan sus comentarios, documentación y las 36 celdas ejecutadas sin errores. Se generaron las 14 respuestas, 45 tablas analíticas, 47 CSV en total y 27 gráficos. Aprobaron 13 controles independientes de carga, 38 controles del cuaderno de respuestas y 19 controles independientes de respuestas, incluidas selecciones filtrada y vacía. Una segunda carga se bloqueó y se comprobaron las huellas de las 17 tablas sin cambios.

Los cuadernos y evidencias anteriores se copiaron a [historial_ejecuciones/20261030T150841](../historial_ejecuciones/20261030T150841/). Los informes de implementación anteriores describen la ejecución histórica; los manifiestos y [verificacion_entrega.json](verificacion_entrega.json) describen esta ejecución. Ver las [respuestas actuales](respuestas/README.md).

## Archivos principales

- [etl_core.ipynb](../cuadernos/etl_core.ipynb): diagnóstico y ETL. La ejecución guardada incluye el diagnóstico, la carga inicial y la conciliación de la nueva bodega.
- [implementacion_etl_core.md](implementacion_etl_core.md): implementación, resultados, reparación y límites.
- [manifest_carga.json](carga_core/manifest_carga.json): carga exitosa, conteos, conciliación y huellas de origen/Core.
- [modelo_bodega.json](carga_core/modelo_bodega.json) y [diccionario_bodega.csv](carga_core/diccionario_bodega.csv): tablas, columnas, tipos y relaciones lógicas.
- [verificacion_independiente.json](carga_core/verificacion_independiente.json): 13 controles de lectura con comparaciones por registro contra el origen.
- [prueba_reejecucion.json](carga_core/prueba_reejecucion.json): carga repetida bloqueada; cuaderno exitoso, manifiesto, origen y bodega sin cambios.
- [analisis_origen.md](analisis_origen.md): diagnóstico histórico previo al ETL, con CSV preservados en `diagnostico_pre_etl/`.
- [plan_etl_core.md](plan_etl_core.md) y [plan_answers.md](plan_answers.md): diseño aplicado y alcance de las respuestas.
- [answers.ipynb](../cuadernos/answers.ipynb): 14 respuestas ejecutadas, tablas, gráficos, interpretaciones y límites.
- [verificacion_entrega.json](verificacion_entrega.json): revisión final de cuadernos, archivos, privacidad y uso del Core.

`carga_core/` contiene agregados, mapeos y metadatos. `intentos/` distingue carga, preparación y bloqueo esperado. `corregir_booleano_nullable.py` documenta una reparación ya aplicada a la dimensión creada en esta tarea; no debe utilizarse como mecanismo de recarga.

## Ejecutar desde la raíz con PowerShell

```powershell
# Si se prepara otro entorno, instalar Core y complemento de cuadernos.
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip install -r colombia_saludable\planes_y_evidencia\requirements_cuadernos.txt

# Preparar y validar en memoria; nunca escribe en la bodega.
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\ejecutar_etl.py

# Verificar la bodega existente contra el origen, en READ ONLY.
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\verificar_bodega.py

# Comprobar el bloqueo de recarga y publicar huellas de esta carga.
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\verificar_reejecucion.py

# Ejecutar únicamente el diagnóstico, excluyendo las celdas ETL.
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\ejecutar_diagnostico.py

# Carga inicial: SOLO con destino autorizado vacío.
# En el estado actual se bloquea sin modificar las tablas existentes.
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\ejecutar_etl.py --cargar
```

Los lanzadores usan el Python invocado como kernel, sin registro global. En Jupyter/VS Code, elegir `.venv` y ejecutar todas las celdas solo prepara en memoria por defecto. La opción de carga se activa explícitamente con el lanzador. Se lee únicamente `colombia_saludable/.env`, sin imprimir credenciales.

Las preparaciones nuevas guardan mapeos en `carga_core/preparaciones/<run>/`, sin sustituir los de una carga publicada. Los CSV de diagnóstico principales se actualizan al ejecutar la parte A; `diagnostico_pre_etl/` conserva la fotografía original. Los Markdown no se regeneran automáticamente.

## Ejecutar las respuestas

```powershell
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\ejecutar_answers.py
.\.venv\Scripts\python.exe colombia_saludable\planes_y_evidencia\verificar_respuestas.py
```

Las exportaciones por ejecución están en `respuestas/ejecuciones/<run>/`. [manifest_respuestas.json](respuestas/manifest_respuestas.json) identifica la selección y el último resultado exitoso. [verificacion_respuestas.json](respuestas/verificacion_respuestas.json) registra 19 comprobaciones independientes y pruebas filtrada/vacía. Los gráficos se generan con Matplotlib; las consultas usan el Core en READ ONLY, sin leer el origen.

## Límites relevantes

La ruta DB_Loader utilizada no crea PK/FK/índices físicos ni garantiza una transacción global de bodega. El Core actual ofrece LoadSchemaSpec/persist_schema para contratos con restricciones; esta ejecución conserva el modelo lógico existente. Las relaciones son lógicas y se validan en el proceso. No hay UPSERT o recarga automática: un destino existente bloquea `--cargar`. Faltan precios de medicamentos, costos reales completos, datos de mora y capacidad para ocupación real; no se inventan resultados para suplirlos.

Los artefactos no contienen contraseñas ni muestras de personas. Leer distribuciones con `pd.read_csv(..., keep_default_na=False)` para distinguir el literal `N/A` de un nulo. Las imágenes del taller son revisiones del PDF, no resultados ETL.

La carpeta `colombia_saludable/` ya estaba ignorada por `.gitignore`; los entregables son locales y no se cambió esa preferencia.
