# Extracción

`page.tsx` orquesta pestaña, confirmación y navegación; no accede a HTTP ni storage. Los hooks conservan borradores independientes. Cada resultado captura sus datos y origen; editar, cambiar pestaña o perder el agente invalida el resultado. Volver a una pestaña conserva sus campos, pero requiere otra consulta. Reclicar la pestaña activa conserva la muestra.

`useExtractRequest` controla estado, revisión, ID y AbortController. Impide envíos duplicados y descarta respuestas viejas incluso si el transporte ignora abort. La conexión BD y la muestra de tabla tienen solicitudes independientes. La selección A→B cancela A sin bloquear B.

Los componentes compartidos `SourceFilePicker`, `DatabaseConnectionFields`, `HybridAgentInstructions` y `SourceSummary`, y `useAgentStatus`, están disponibles para fuentes secundarias de 05. No importarlos desde las pestañas completas de Extract. DatabaseConnectionFields es controlado y no consulta/persiste; sus helpers puros validan campos y puertos. `useAgentStatus` recibe el ID estable que el provider obtiene mediante agentIdentity; no genera una identidad alternativa. Consulta serial cada 3 s después de finalizar, suspende en oculto y limpia timers/listeners/requests.

La contraseña es `undefined` hasta ingresarla o confirmar vacío explícito. Solo el borrador/resultado local y el CredentialStore la mantienen en memoria. La confirmación pasa por parseSource/confirmSource existentes: crea descriptor/referencia, reemplaza fuente y limpia receta, preview, configuración/FK y autorización de conexión destino en una transición. Conserva el descriptor de destino según el contrato de 02. Se pide confirmación siempre que hay fuente activa, incluso al seleccionarla de nuevo. Cancelar no muta el provider.

Conteos: archivo/fecha son dataset; BD es muestra, con total sin consultar. Se conservan columnas de metadata BD cuando están disponibles; una muestra vacía válida permite continuar sin inventar esquema. La tabla distingue NULL, texto vacío, 0, false y JSON recursivo. Archivos temporales pueden expirar; Transform ofrece volver a subir cuando falla la preview de archivo.

Verificación: `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`. Pruebas dedicadas: extract, extract-requests y agent-status. MSW verifica interacción/payloads, no motores reales. Registro y limitación de revisión visual de 04 en `Planes/evidencia-fase04/VERIFICACIONES.md`.
