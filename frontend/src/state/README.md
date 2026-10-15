# Sesión del pipeline · Fase 02

`app/(app)/layout.tsx` conserva un único `PipelineProvider` cliente bajo el layout servidor. Los consumidores usan `usePipelineSession`; `usePipelinePreview(limit)` ejecuta una preview al entrar/cambiar revisión y aborta al desmontarse. El provider también descarta resultados por revisión e ID, aunque el servidor continúe trabajando.

Dirección de dependencias: páginas/componentes → hooks/contexto → servicios/reducer → DTO. Solo `services/apiClient.ts` contiene fetch. `NEXT_PUBLIC_API_URL` se lee una vez y debe configurarse **antes del build**. Los servicios no importan React, no reintentan y validan JSON desconocido al recibirlo.

`types/etl.ts` separa DTO, descriptores, los 42 parámetros de pasos y resúmenes locales. `etlValidation.ts` valida storage/formularios confirmados y actúa como lista permitida. `services/etlSerializers.ts` construye únicamente campos HTTP; IDs, conteos y referencias internas no salen al backend. La muestra BD es `sample`; fecha/archivo/transform son `dataset`; `LoadResponse.total_rows` es el total final del destino.

Las contraseñas viven en un `CredentialStore` **por provider**, con referencias independientes para principal, secundarios y destino. `has(ref)` distingue ausencia de `""`. Para modificar contraseñas usar `recoverCredentials`/`setTarget`, que invalidan comprobaciones; no escribir directamente en el store. Al quitar consumidores se retiran referencias; reset limpia todos los secretos y conserva historial e identidad del agente. Los formularios de destino incompletos permanecen locales e invalidan la comprobación anterior.

`pipelineStorage.ts` es el único adaptador de sessionStorage. Guarda `etl_pipeline_session_v1` por lista permitida, hasta 50 resúmenes, sin preview/dataset, autorizaciones, DTOs, mensajes externos o passwords. Al migrar recoge contraseñas heredadas solo en memoria, escribe la sesión limpia y elimina exclusivamente las dos claves heredadas, también si falla la escritura. Advierte si no puede confirmar su eliminación. Una sesión incompatible/corrupta bloquea envío y ofrece restablecer; no se sobrescribe automáticamente. No hay escritura dual. `agentIdentity.ts` conserva `localStorage.etl_agent_id` y tolera storage restringido; no es autenticación ni sesión compartida entre pestañas.

La revisión cambia al confirmar fuente, modificar receta, recuperar credenciales de origen y reset. IDs se conservan al editar/mover. Una receta vacía y una preview de cero filas son válidas. `canVisitLoad` permite acceso recuperable; `isReadyForLoad` exige éxito vigente y credenciales. `canExecuteLoad` exige además destino probado para su versión, tabla/FK completas y ausencia de ejecución. El contrato de tipos de FK sigue siendo `[tabla_dimension, pk]`; no se certifica compatibilidad de esquemas ni integridad referencial real.

`runLoad` construye el snapshot, registra/persiste `running` antes de enviar cuando es posible y bloquea cambios hasta terminar. Finaliza una sola vez por ID; la pérdida de red, respuesta no interpretable o HTTP 5xx deja `unknown`, sin reintento automático. Una recarga transforma intentos `running` en `unknown`. Fechas y duración son del navegador; no sumar totales finales para inventar filas insertadas.

Para 03 están disponibles sesión/selectores e historial; esa fase debe retirar demos y adaptar el shell. Las vistas/formularios conservan su organización: extracción por features (04), registry/edición/reordenación visible (05), validación completa de carga y reporte (06), motores/E2E (07) siguen separados.

Reversión por grupos: servicios/tipos, estado/adaptadores y consumidores. Volver a un frontend antiguo requiere reiniciar la sesión; nunca restaurar persistencia de contraseñas.
