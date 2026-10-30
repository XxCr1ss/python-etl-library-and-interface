# Manual de usuario

La ruta `/manual` comparte el layout de la aplicación. La página y el contenido se renderizan en servidor; `ManualSidebar` es la isla cliente para búsqueda, foco, índice móvil y scrollspy. La documentación no llama a la API ETL ni importa formularios del editor.

`data/manualSections.ts` contiene las seis guías y sus enlaces. `data/transformationsCatalog.ts` es un mapa tipado por `StepType`: cada ficha incluye parámetros, límites, instrucciones, error frecuente y tablas sintéticas. Los valores predeterminados corresponden al servidor al omitir un parámetro, salvo notas explícitas. `data/joinExamples.ts` amplía casos de claves compuestas, repetidas, distintas y nulas.

`data/catalogBuilders.ts` construye la estructura común de las fichas: instrucciones, parámetros y tablas desde columnas. Las tablas reutilizadas se declaran una sola vez en el catálogo. Al editar ejemplos, todas las columnas deben tener la misma cantidad de valores; las tablas mantienen su orden de columnas y filas. Cada operación conserva sus parámetros específicos comprobados por TypeScript.

El índice filtra enlaces sin desmontar sus destinos. Los IDs de capítulos, temas y operaciones son enlaces públicos: conservarlos al editar títulos. Los enlaces usan hashes nativos para mantener Atrás/Adelante. El scrollspy no añade entradas al historial. Un `ResizeObserver` mide la cabecera compartida; CSS container queries muestran el índice lateral solo si queda espacio, también al ampliar texto. Sin soporte de container queries se conserva el índice mediante modal.

Al cambiar una operación, revisar su ficha contra el dispatcher y la función Python, incluyendo tipos, validación, defaults y efectos sobre nulos/columnas. No usar los fixtures como contenido importado en producción. Las pruebas de catálogo comparan los ejemplos estáticos con los contratos independientes; la suite backend verifica esos contratos contra el motor. La paridad no sustituye la revisión editorial.

Validación desde `frontend/`:

```text
npm run typecheck
npm run lint
npm run test:run
npm run test:e2e:mock -- manual.spec.ts
npm run build
```

Las pruebas E2E usan respuestas sintéticas, comprueban navegación y conservación de credenciales en memoria sin ejecutar cargas, y verifican accesibilidad con axe en tema claro, también ante una preferencia heredada oscura a 375, 768, 1024 y 1440 px. También revisan ampliación de texto al 200 %; no sustituyen todas las configuraciones de zoom o tecnologías de asistencia.
