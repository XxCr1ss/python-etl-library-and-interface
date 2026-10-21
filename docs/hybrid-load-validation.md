# Evidencia de Load mediante agente — 21 de octubre de 2026

Implementado el transporte opcional del destino, core compartido de persistencia,
codec tipado versión 1, capacidades/habilitación local, límites, exclusión de
comandos, correlación por socket e interfaz Load con prueba de destino vigente.
Se conserva el contrato público de éxito y la clasificación `unknown` de Fase 06.

## Comprobaciones ejecutadas

Entorno Windows, Python 3.14 del entorno `.venv`, Pandas 3.0.3, SQLAlchemy 2.0.50
y dependencias fijadas en el repositorio. Base PostgreSQL de pruebas explícita
según el harness existente; tablas propias `etl_e2e_*` eliminadas en teardown.
Ninguna credencial, fila ni URL de conexión privada se incluye en esta evidencia.

| Comprobación | Resultado |
|---|---|
| `python -m pytest -c backend/pytest.ini backend/tests -q --disable-warnings` | 251 pasan; 2 omitidas (MySQL/Oracle sin instancia). Incluye contratos e integración real. |
| En `frontend`: `npm run test:run -- --reporter=dot` | 371 pruebas, 34 archivos, todas pasan. |
| `npm run typecheck` | Correcto. |
| `npm run lint` | Sin errores ni advertencias ESLint. |
| `npm run build` | Compilación de producción correcta; los E2E también reconstruyen fuentes actuales. |
| `npm run test:e2e:real` | 6 escenarios pasan, incluido nuevo Load mediante proceso agente real. |
| `npm run test:e2e:mock -- session-security-and-load-states.spec.ts pipeline-happy-and-empty.spec.ts transform-and-concurrency.spec.ts` | 8 escenarios pasan. No se ejecutó toda la auditoría visual en esta revisión. |

Hay avisos preexistentes de inferencia de fechas para el año 100 y un aviso de
`act(...)` en una prueba de extracción; no impiden el resultado. Las pruebas
optativas MySQL/Oracle se omiten porque no hay instancias configuradas.

## Casos relevantes cubiertos

- Roundtrip JSON de enteros grandes, nullable, bool, strings, Decimal, temporales
  y vacíos con esquema. Rechazo de infinitos, categorías, objetos heterogéneos,
  metadatos incompatibles y columnas duplicadas; límite exacto UTF-8 y sobre.
- Agente deshabilitado/antiguo, ID faltante, timeout durante envío, socket ajeno,
  duplicado, reconexión y respuesta tardía. Escritura incierta conserva exclusión.
- PostgreSQL con proceso `etl_agent.py --allow-load`: misma instancia como origen
  y destino, dimensión, hechos, FK válidas/inválidas, encabezado FK con espacios,
  append con total previo, fail, replace vacío y transferencia superior a 1 MiB
  (6.000 filas con texto UTF-8) sin truncamiento.
- Corte de WebSocket tras enviar una escritura: HTTP falla y el ID queda en
  cuarentena al reconectar. No se interpreta como rollback ni se reenvía.
- Navegador con backend y agente reales: carga y append verificados por SQL
  independiente. Se elimina la respuesta HTTP de una escritura ya completada;
  la interfaz muestra `unknown`, no reenvía y exige revisión para repetir.
- Formulario y provider: cambio de transporte, respuestas tardías, reconexión,
  recarga sin secretos, nueva carga solicitando credenciales y pérdida de
  presencia durante un intento sin borrar su estado ni su reporte final.
- Regresión de modo directo, Extract, receta vacía, fechas, reportes e historial.

## Medición del codec

```console
python backend/tests/benchmark_load_transport.py --rows 240000 --text-width 180
```

| Medida | Resultado local |
|---|---|
| Filas | 240.000 |
| Mensaje completo | 46.449.389 bytes, aproximadamente 44,3 MiB |
| Codificación y serialización | 7,079 s |
| Ida/vuelta y comprobación de equivalencia | 10,788 s |
| Pico de heap Python observado con tracemalloc | 261.076.424 bytes, aproximadamente 249 MiB |

La medición incluye codec/JSON con instrumentación y comprobación, no escritura
SQL ni latencia de red. Comienza después de crear el DataFrame de entrada y no
representa RSS completo del proceso. El límite de 50 MiB no garantiza caber en
memoria de cualquier despliegue; ajustar por capacidad disponible.

## Verificaciones externas pendientes

- Ejecución contra MySQL y Oracle reales con las fixtures optativas de
  `backend/tests/integration/test_load_other_engines.py`; no se certificaron aquí.
- Proxy/hosting remoto con WSS, presupuesto HTTP completo y backend sin acceso
  TCP al destino. La integración ejecutada fue local y comprobó explícitamente
  la delegación por WebSocket, sin simular aislamiento físico de redes.
- Emparejamiento/autorización multiusuario y registro distribuido siguen fuera
  del alcance del MVP. Esta versión requiere un entorno controlado y un proceso
  backend. Recuperación de cuarentena documentada en `hybrid-load.md`.
