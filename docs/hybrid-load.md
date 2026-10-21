# Carga en una bodega local mediante agente

Load permite elegir conexión directa o «Usar agente local híbrido». El host/puerto
del destino se interpreta desde la máquina del agente. Origen y destino eligen
su transporte por separado; las transformaciones siguen ejecutándose en backend.

## Arranque

En la raíz del proyecto, con las dependencias de `requirements.txt` instaladas:

```console
python -m uvicorn backend.main:app --workers 1 --ws-max-size 52428800 --ws-max-queue 1
python etl_agent.py --allow-load
```

El agente solicita URL del backend sin `/api/v1` e ID mostrado en Load. También
pueden proporcionarse sin prompts:

```console
python etl_agent.py --allow-load --server-url http://localhost:8000 --agent-id ID_DE_LA_INTERFAZ
```

Para un backend remoto, Load exige HTTPS/WSS; HTTP se admite para loopback.
Sin `--allow-load`, el agente mantiene extracción pero rechaza prueba/carga de
destino. Actualizar agente y backend juntos: Load negocia protocolo versión 1
antes de enviar credenciales o datos. Un agente antiguo sigue sirviendo Extract.

En Load, completar destino, activar la opción y probar conexión. Presencia del
agente no implica que la base esté comprobada ni garantiza permisos de escritura.
Cambiar credenciales, transporte o ID, perder conexión o cambiar de generación de
socket invalida la prueba. `replace` exige la confirmación existente y puede vaciar
la tabla con un resultado de cero filas.

El ID del agente **no autentica**. Esta versión se destina a un entorno controlado
de un usuario. Antes de exponerla públicamente/multiusuario se requiere
emparejamiento y autorización HTTP/WebSocket. CORS no sustituye esos controles.
Credenciales y datos pasan por backend y agente, solo en memoria; no se guardan en
el historial. No habilitar logs de payloads/tramas SQL con datos.

## Límites y despliegue

| Configuración | Predeterminado | Dónde establecerla |
|---|---|---|
| `ETL_LOAD_MAX_MESSAGE_BYTES` | 52.428.800 bytes (50 MiB) | Backend y agente |
| `ETL_LOAD_MAX_ROWS` | 250.000 filas | Backend y agente |
| `ETL_AGENT_TEST_TIMEOUT` | 15 segundos por comando | Backend |
| `ETL_AGENT_LOAD_TIMEOUT` | 120 segundos, envío y respuesta | Backend |
| `ETL_TARGET_CONNECT_TIMEOUT` | 10 segundos por conexión del driver | Backend y agente |

Se usa el menor límite anunciado por ambos extremos. Bytes corresponden al
mensaje UTF-8 completo con configuración y esquema, no solo datos. Se rechaza el
lote entero al superar filas/bytes; no se trunca ni fragmenta. Los límites son
topes, no garantía de rendimiento. Al cambiar bytes, alinear `--ws-max-size` y el
proxy. Configurar timeouts HTTP/proxy para origen + transformación + transferencia
más escritura/verificación, que pueden exceder el presupuesto de un comando.

El registro y la exclusión viven en **un proceso backend**: usar un worker y una
réplica; afinidad HTTP por sí sola no crea un registro distribuido. No se admiten
dos conexiones simultáneas con el mismo ID. El agente recibe con cola acotada y
ejecuta SQL en un thread, conservando pings del canal. Un timeout de espera no
cancela el thread ni prueba rollback.

## Tipos de escritura del protocolo 1

Se conserva orden de columnas y dtype, y se comprueba esquema antes de escribir.

- NumPy enteros `int8/16/32/64`, `uint8/16/32/64` y sus variantes nullable Pandas.
  Enteros viajan como texto decimal exacto, sin pasar por float/JavaScript.
- `float32/64`, `Float32/64`, `bool`, `boolean`, strings Pandas `str`/`string`.
  NaN/NA/NaT del dtype se restituyen como ausentes; infinitos se rechazan.
- `datetime64[s/ms/us/ns]`, con o sin zona horaria.
- `object` homogéneo de `str`, `int`, `float` finito, `bool`, `Decimal` finito,
  `datetime.date`, `datetime.time` o `datetime.datetime` sin zona/fold ambiguo,
  con `None` como nulo. Para fechas con zona usar dtype `datetime64` con zona.
  `object` vacío o totalmente `None` también se admite. Decimal viaja como texto
  exacto. Se conservan tipos lógicos de transporte; la inferencia SQL del loader
  y las capacidades de cada driver siguen aplicándose.
- Cero filas con columnas tipadas se admite. Se rechazan columnas duplicadas,
  no textuales o vacías, categorías, binarios, listas/dicts, objetos heterogéneos
  y dtypes fuera de esta lista. Convertir esas columnas explícitamente antes de
  cargar; no hay conversión automática a texto.

El codec no promete preservar el backend físico de strings (Python/Arrow), el
índice de Pandas ni categorías: el loader escribe con `index=False`. La muestra
pública usa la política JSON de previews; no se utiliza para reconstruir datos.

## Resultados inciertos y recuperación

El reporte devuelve **total de filas en la tabla destino** y una muestra sin orden
garantizado. En `append` incluye filas previas. La validación FK es previa a la
inserción; no crea restricciones ni ofrece atomicidad global frente a otros
escritores. `replace` puede eliminar índices/restricciones de la tabla.

Ante timeout/corte/error posterior a escribir o reporte inválido, la interfaz
conserva `unknown`: «No se pudo confirmar el resultado; revisa la tabla destino
antes de repetir». No hay fallback, reintento automático ni idempotencia durable.
Navegar conserva el intento; recargar un intento pendiente tampoco lo reenvía.

Mientras haya un comando pendiente no se encola otro para ese agente. Un timeout
conserva la exclusión hasta respuesta tardía o desconexión. Si pudo enviarse una
escritura y se perdió el socket, el backend conserva una cuarentena por ID incluso
al reconectar. Para resolverla manualmente:

1. Detener el agente anterior y comprobar que su trabajo SQL terminó; comprobar
   tabla/filas en destino antes de decidir si repetir.
2. Reiniciar el backend para limpiar la cuarentena en memoria y arrancar el agente
   con `--allow-load`. No cambiar de ID para eludir una operación aún en curso.
3. Probar otra vez el destino y efectuar una nueva carga solo tras la revisión
   explícita requerida por la interfaz.

Esta recuperación es operativa; no existe endpoint de consulta/cancelación de jobs.

## Verificación

```console
python -m pytest -c backend/pytest.ini backend/tests -m "not integration" -q
python -m pytest -c backend/pytest.ini backend/tests/integration -q
```

Integración PostgreSQL requiere las variables `ETL_TEST_DB_*` existentes o
`.env.local`, base cuyo nombre comience por `etl_test` y tablas descartables con
prefijo `etl_e2e_`. Incluye agente CLI como proceso y WebSocket real. MySQL/Oracle
siguen como motores objetivo del core; no inferir evidencia real de pruebas de
PostgreSQL, SQLite o compilación de dialectos. Las fixtures optativas de esos
motores usan `ETL_TEST_MYSQL_HOST/PORT/NAME/USER/PASSWORD` o las equivalentes
`ETL_TEST_ORACLE_*` más `ETL_TEST_ORACLE_SERVICE_NAME`. Sin configuración se
registran como omitidas; con configuración parcial fallan. Exigen base `etl_test`
y en Oracle también usuario/esquema `etl_test`. En frontend ejecutar
`npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build` y los E2E
pertinentes. Registrar resultados y motores no disponibles junto al cambio.
