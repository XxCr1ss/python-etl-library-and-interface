# Extracción

`page.tsx` orquesta pestaña, confirmación y navegación; no accede a HTTP ni storage. Los hooks conservan borradores independientes. Cada resultado captura sus datos y origen; editar, cambiar pestaña o perder el agente invalida el resultado. Volver a una pestaña conserva sus campos, pero requiere otra consulta. Reclicar la pestaña activa conserva la muestra.

`useExtractRequest` controla estado, revisión, ID y AbortController. Impide envíos duplicados y descarta respuestas viejas incluso si el transporte ignora abort. La conexión BD y la muestra de tabla tienen solicitudes independientes. La selección A→B cancela A sin bloquear B.

Los componentes compartidos `SourceFilePicker`, `DatabaseConnectionFields`, `HybridAgentInstructions` y `SourceSummary`, y `useAgentStatus`, están disponibles para fuentes secundarias de 05. No importarlos desde las pestañas completas de Extract. DatabaseConnectionFields es controlado y no consulta/persiste; sus helpers puros validan campos y puertos. `useAgentStatus` recibe el ID estable que el provider obtiene mediante agentIdentity; no genera una identidad alternativa. Consulta serial cada 3 s después de finalizar, suspende en oculto y limpia timers/listeners/requests.

La contraseña es `undefined` hasta ingresarla o confirmar vacío explícito. Solo el borrador/resultado local y el CredentialStore la mantienen en memoria. La confirmación pasa por parseSource/confirmSource existentes: crea descriptor/referencia, reemplaza fuente y limpia receta, preview, configuración/FK y autorización de conexión destino en una transición. Conserva el descriptor de destino según el contrato de 02. Se pide confirmación siempre que hay fuente activa, incluso al seleccionarla de nuevo. Cancelar no muta el provider.

Conteos: archivo/fecha son dataset; BD es muestra, con total sin consultar. Se conservan columnas de metadata BD cuando están disponibles; una muestra vacía válida permite continuar sin inventar esquema. La tabla distingue NULL, texto vacío, 0, false y JSON recursivo. Archivos temporales pueden expirar; Transform ofrece volver a subir cuando falla la preview de archivo.

Verificación: `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`. Pruebas dedicadas: extract, extract-requests y agent-status. MSW verifica interacción/payloads, no motores reales. Registro y limitación de revisión visual de 04 en `Planes/evidencia-fase04/VERIFICACIONES.md`.

## Diagrama entidad-relación

Tras comprobar una conexión, «Abrir diagrama E-R en otra pestaña» abre `/extract/diagram` y conserva el proceso ETL. Incluye columnas/PK/FK, conexiones por columna, zoom, búsqueda, reorganización y alternativa textual. Las relaciones provienen de restricciones SQL reales, incluidas FK compuestas, claves únicas y autorrelaciones; las referencias externas no pueden seleccionarse como origen.

Seleccionar una tabla consulta hasta diez filas en el panel inferior, con resize por ratón/táctil/teclado, scroll y colapso sin otra consulta. La muestra no es el total de la tabla. `/extract/database/preview` conserva cinco filas por defecto y añade `limit` (1..10), `columns`, `dtypes` y `sample_rows`.

Para usar una tabla como origen, abre Transformación en la pestaña ETL y pulsa «Usar como origen en Transformación» desde el diagrama. El receptor vuelve a validar ruta, revisión y disponibilidad antes de confirmar. Sustituir el origen reinicia receta/preview/configuración de carga/FK y exige comprobar destino otra vez; cancelar conserva todo. No se crea automáticamente un join.

Las credenciales quedan en memoria en la pestaña ETL: `features/diagram/DiagramCoordinator` conserva la conexión al navegar y actúa como intermediario HTTP. El diagrama recibe metadatos/muestras por BroadcastChannel aislado. Editar conexión, resetear o perder agente invalida el vínculo. F5 del diagrama puede renegociarlo; F5/cierre de ETL exige volver a conectar y abrir. Sin BroadcastChannel se muestra incompatibilidad; storage restringido conserva funcionamiento en memoria y explica recuperación.

El agente necesita `get_schema_graph`: actualizar/reiniciar `etl_agent.py` al usar modo híbrido. La primera entrega consulta el esquema predeterminado. PostgreSQL tiene tests reales HTTP, agente CLI y navegador; MySQL/Oracle conservan adaptador, sin certificación con motores reales en esta entrega.
