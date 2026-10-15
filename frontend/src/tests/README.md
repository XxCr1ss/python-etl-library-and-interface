# Pruebas frontend · Fase 01

Desde `frontend/`: `npm ci`, `npm run test:run`, `npm run test:coverage`, `npm run typecheck`, `npm run lint`, `npm run build`. `npm test` activa watch, exclusivamente para desarrollo. No se deshabilitan reglas ni verificaciones.

## Runtime y dependencias

Comprobado con Node 24.11.0 / npm 11.6.1 / React 18.3.1. Las dependencias nuevas están fijadas; Vitest y coverage-v8 usan 4.1.11. Engines consultados antes de instalar: Vitest 4 admite Node 20/22/24; plugin-react 4.7 admite Vite 4–7; jsdom 26 y MSW 2 requieren Node >=18; RTL 16 admite React 18/19. Vite 7.3.7 resuelto exige Node >=20.19 o >=22.12: usar el Node 24 comprobado.

Referencias de la versión: [Vitest 4](https://v4.vitest.dev/guide/), [cobertura](https://vitest.dev/guide/coverage.html), [MSW Node](https://mswjs.io/guides/integrations/node). Se comprobó también el metadata `engines`/`peerDependencies` de npm. No se cambian las versiones mayores de Next, React o Tailwind.

## Aislamiento y peticiones

- `setup.ts` limpia DOM, handlers, storage, mocks, globals, variables de entorno y timers. Los efectos se desmontan antes de restaurar timers. No hay mocks globales de navegación, media queries ni ResizeObserver.
- Para navegación: `vi.mock("next/navigation", () => navigation)` y `beforeEach(() => resetNavigation("/extract", ""))`. `router` expone spies estables. Cada archivo que lo utiliza debe optar explícitamente por el mock y resetearlo.
- `render.tsx` reexporta RTL sin inicializar storage ni providers ficticios. La caracterización de 02 monta explícitamente `PipelineProvider` real; las primitivas siguen aisladas.
- `environment.ts` usa jsdom y conserva Blob/File/FormData nativos del proceso junto a su fetch/Request. jsdom 26 mezcla tipos incompatibles con el encoder multipart de Node 24 y podía dejar `request.formData()` pendiente. Se leen y comparan los bytes reales del CSV; fetch nunca se mockea en paralelo a MSW.
- MSW arranca con `onUnhandledRequest: "error"`; `smoke.test.tsx` prueba explícitamente el rechazo. Además, un registro de request:start/request:match hace fallar el afterEach si un componente captura el rechazo de una petición no declarada o si el handler falla. Solo el smoke negativo consume su infracción esperada. Los errores HTTP y la espera controlada se declaran mediante `server.use(http.post(...))` por test. Un handler nuevo exige la ruta exacta del anexo. No existen handlers comodín de éxito ni un `/load/execute` exitoso global.
- `dialog.ts` adapta showModal/close solo en los tests de Modal y restaura sus descriptores. El DOM simulado no demuestra top layer, inertness, geometría o contención real de foco: la galería permite comprobarlos en navegador.

## Fixtures y límites

`sample_sales.csv` tiene 12 filas y el filtro `col_monto > 50` conserva ids 7–12. `customers.csv` tiene ids 2,3; el lado izquierdo mínimo para los oráculos de joins es 1,2. `empty.csv` conserva cabeceras sin filas. `api.ts` separa 0/false/""/null y valores recursivos en memoria; un CSV vacío no distingue cadena vacía de ausente en pandas. `two_sheets.xlsx` se regenera con `fixtures/generate_xlsx.py`, usando openpyxl del entorno backend; primera hoja ventas, segunda marker=second-sheet.

Los handlers devuelven datos **sintéticos**, no ejecutan transformaciones Python ni acceden a motores. Las pruebas caracterizan requests, presentación y navegación de los componentes reales; no certifican cargas ni el backend. Load sin fuente sigue guiando por Transform → Extract. En 01A, `api.ts` pasó a importar `backend-contracts.json`, contrastado por la suite backend contra upload y preview HTTP reales; solo se normalizan ruta/nombre UUID. Se regenera con `backend/tests/fixtures/export_frontend_contracts.py`. Los defectos backend de años/listas y joins con llaves distintas se corrigieron en 01A. En 02 se implementaron sesión/credenciales. Las conversiones de cero/menú/edición visible del frontend siguen en 05, según `Planes/SEGUIMIENTO.md`.

## Contratos y sesión · Fase 02

`core-contracts.test.ts` reutiliza los 42 casos independientes de `backend/tests/fixtures/operations.json`, valida serialización de todas las operaciones y prueba cada servicio/payload, multipart, errores y respuestas inválidas. `operations-catalog.json` se capturó de GET `/api/v1/transform/operations` en la API local; la prueba backend de paridad exige igualdad exacta con el catálogo vivo, sin motores de BD. La lista de parámetros del validador frontend también debe coincidir con esa captura. `api-url.test.ts` prueba configuración antes del import y normalización de barras.

`core-state.test.ts` cubre migración/allowlists/corrupción/cuota/storage restringido, transiciones, IDs, límite de 50 y ejecución interrumpida. `pipeline-session.test.tsx` monta consumidores reales bajo el provider/layout: sincronización, ciclo de navegación, carreras, snapshot de carga, secretos principal/secundario/destino después de recarga, cancelación/contraseña vacía explícita y carga bloqueada si falla preview. Los delays de red se liberan explícitamente; no hay sleeps ni retries para conseguir tests verdes. Se conserva la intención de la caracterización de 01 cambiando únicamente las expectativas de storage/DTO y la confirmación explícita de password vacío.

Cobertura V8: texto, HTML y lcov en `frontend/coverage/`; `coverage.include` enumera todo `src/**/*.{ts,tsx}` aunque no se importe. Se excluyen tests, fixtures/helpers/galería y declaraciones. Los layouts y dashboard sin probar aparecen con 0%; no hay umbrales arbitrarios ni exclusiones para inflar resultados.

## Revisión en navegador

Ejecutar `npm exec --no -- vite --config src/tests/preview/vite.config.ts` y visitar `http://127.0.0.1:4173/`. Es una galería de desarrollo fuera de App Router; no añade rutas al producto ni conecta al backend.

Verificar: abrir modal y foco en Nombre del origen; Tab/Shift+Tab cíclicos; Escape/cierre/backdrop y foco restaurado al disparador; clic interior no cierra; operación no cancelable ignora Escape/backdrop y termina desde Guardar. Pestañas: flechas, Home/End, selección/panel coherentes. Revisar ancho móvil, contenido desplazable, tema de sistema y ausencia de errores de consola. Los tokens se comprueban además numéricamente con WCAG AA 4.5:1 para texto y 3:1 para bordes/foco en ambos temas. Esto no certifica accesibilidad integral de las pantallas antiguas.
