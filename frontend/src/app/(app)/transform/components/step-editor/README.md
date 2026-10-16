# Editor de transformaciones

`StepRegistry` exige una definición tipada por cada clave de `StepParamsByType`. Las familias A–F conservan los 42 identificadores y sus payloads. `getDefinition(type)` mantiene la relación entre el tipo de operación y sus parámetros; no hay registro abierto ni fallback al modal anterior.

Cada definición ofrece defaults, `fromParams`, validación por campo/columnas, `toParams`, `toStep`, resumen y formulario. El borrador contiene una copia de los parámetros y únicamente los campos editados. Guardar sin cambios conserva tipos, orden, null y opcionales ausentes. Los codecs rechazan valores no finitos y enteros inválidos; inicio y períodos admiten cero. El control de valores distingue texto/número/booleano/null/JSON: `"001"` no se reinterpreta al editar.

`ParameterForm` compone controles de columnas ordenadas, mapas, valores tipados y parámetros simples. `MultiSourceForm` confirma el origen secundario por separado. Reutiliza hooks/componentes públicos de `components/etl`, sin importar internos de Extract. Los exports anteriores de los hooks se mantienen para sus consumidores. Expresiones/regex Python se conservan como texto: el servidor valida la sintaxis y evalúa durante preview.

El host controla el borrador y sus credenciales temporales; al cancelar/cambiar tipo/desmontar se limpian y las peticiones se abortan. El callback de la fachada `AddStepModal` conserva las cuatro props originales. Para añadir, el provider adopta la entrada compatible y asigna ID/referencias nuevos; para editar recibe ID/descriptor/credenciales mediante `editStep(step, temporaryCredentials)`. El provider transfiere secretos junto a la mutación que invalida la preview. Ninguna contraseña se persiste ni se incluye en resúmenes.

`useStepEditor` consulta el prefijo anterior a la posición editada con `limit: 1`, revisión y request ID independientes de la preview final. Cancelar/reintentar no modifica la receta ni habilita Load. El último cambio puede deshacerse en memoria, conservando IDs y las credenciales necesarias mediante `restoreRecipe`; una nueva mutación, cambio de revisión o desmontaje libera la copia anterior.

`useTransformPreview` consulta inicialmente y agrupa mutaciones confirmadas durante 250 ms; refrescar consulta inmediatamente. El provider asigna IDs incrementales y solo acepta ID/revisión vigentes; el aborto también protege el desmontaje. La tabla conserva el resultado anterior como desactualizado, nunca como autorización para Load. Se solicitan 10 filas; el servidor recalcula todo el dataset.

Paridad y roundtrip: `transform-registry.test.ts` contrasta los fixtures backend de 01A y catálogo. `transform-forms.test.tsx` recorre los 42 formularios; los tests por familia, preview, tabla y workflow cubren interacción, fuentes secundarias, carreras, prefijos, edición/reordenación/deshacer y errores. La revisión real usa únicamente fuentes sintéticas; no certifica motores/agente reales.
