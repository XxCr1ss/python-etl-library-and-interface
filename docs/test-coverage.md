# Cobertura de pruebas y SonarCloud

El análisis incluye `frontend/src`, `backend`, `etl`, `etl_agent.py` y `api/index.py`. Los auxiliares de `frontend/src/tests` se clasifican como pruebas, igual que `backend/tests`. No se excluyen módulos de producción para alcanzar el objetivo.

## Ejecución reproducible

Desde la raíz del repositorio, en un checkout limpio del commit que se quiere medir:

```bash
cd frontend
npm ci --ignore-scripts
npm run test:coverage
cd ..

COVERAGE_FILE=.coverage.unit .venv/bin/python -m pytest \
  -c backend/pytest.ini backend/tests -m "not integration" \
  --cov --cov-config=.coveragerc --cov-report= -q

# Requiere ETL_TEST_DB_* configuradas para un PostgreSQL desechable etl_test*.
ETL_IGNORE_DOTENV=1 COVERAGE_FILE=.coverage.integration .venv/bin/python -m pytest \
  -c backend/pytest.ini backend/tests/integration -m integration \
  --cov --cov-config=.coveragerc --cov-report= -q

.venv/bin/python -m coverage combine --keep .coverage.unit .coverage.integration
.venv/bin/python -m coverage xml
.venv/bin/python -m coverage report
```

En Windows se utiliza `.venv/Scripts/python.exe` y se establece `$env:COVERAGE_FILE` antes de cada suite. Quitar esa variable con `Remove-Item Env:COVERAGE_FILE` antes de combinar permite escribir el resultado en `.coverage`.

La suite de integración conserva sus cuatro omisiones opcionales de MySQL/Oracle cuando esos motores no están disponibles. Esas pruebas no se presentan como ejecutadas. No utilizar los scripts manuales `backend/test_api_*.py` para esta medición.

## Informes y procesos externos

- Vitest genera `frontend/coverage/lcov.info`, con líneas y condiciones de TypeScript.
- coverage.py genera `backend-coverage.xml`, consolidando líneas de Python. Las ramas de Python permanecen desactivadas para conservar la definición del indicador; activarlas requiere una nueva línea base.
- `.coveragerc` utiliza `source_dirs` para directorios y `source_pkgs` para el agente. El XML conserva rutas completas relativas al repositorio, como `backend/main.py` y `etl/extractors/db_extractor.py`; evita ambigüedades entre archivos llamados `__init__.py` o `models.py`.
- `patch = subprocess` instrumenta los intérpretes Python lanzados por las pruebas. `sigterm = True` permite guardar datos ante terminación en Linux, donde se ejecuta CI.
- En Windows, `Process.terminate()` puede terminar el intérprete sin guardar cobertura. No se atribuye cobertura de esos procesos terminados por la fuerza; el agente también tiene pruebas directas de su dispatcher y CLI.
- Las pruebas de navegador no contribuyen automáticamente al LCOV de Vitest. Se conservan como comprobación adicional de los recorridos visuales.

No combinar archivos de revisiones distintas ni reutilizar informes de una suite fallida. Los datos de las suites deben proceder del mismo checkout y de ejecuciones aprobadas.

## Protección en CI

El workflow `sonarcloud.yml` inicia su propio PostgreSQL desechable y ejecuta ambas suites Python secuencialmente, con archivos de cobertura separados. Combina los datos antes del escaneo y conserva XML y LCOV en un artefacto identificado por el SHA.

Se espera el Quality Gate de SonarCloud. En pushes a ramas admitidas se ejecuta además:

```bash
.venv/bin/python scripts/check_sonar_coverage.py \
  --branch "$GITHUB_REF_NAME" --revision "$GITHUB_SHA" --minimum 80
```

El script exige un análisis de esa rama y revisión y una métrica global válida de al menos 80 %. Rechaza análisis antiguos, valores ausentes y porcentajes no finitos o fuera de rango. Usa `SONAR_TOKEN` del workflow; no lo registra.

En pull requests se conserva el Quality Gate, incluyendo sus condiciones de código nuevo. La comprobación adicional de Overall Code se aplica a análisis de rama; no interpreta la cobertura del diff de un PR como cobertura global.

Los umbrales existentes de Vitest permanecen activos: 80 % de líneas y 75 % de ramas, más los límites específicos ya configurados. No equivalen al porcentaje combinado de SonarCloud.

## Validación de la implementación del 30 de octubre de 2026

La línea base local aprobó 322 pruebas aisladas Python y 482 de frontend. El frontend partía de 89.25 % de líneas y 78.17 % de ramas. El agente, antes no incluido en SonarCloud, tenía 42.8 % de líneas en la medición local inicial.

Las pruebas añadidas cubren contratos directos del core, adaptadores, persistencia en CSV/Excel, conexiones cifradas, manifiestos y reanudación, dispatcher/CLI del agente, controles de gráficos y lienzo, middleware y callback de autenticación. Se utilizan PostgreSQL desechable, archivos temporales y fronteras de red simuladas según corresponda.

Validación final local: **456 pruebas aisladas Python, 505 de frontend y 20 de integración aprobadas**, con cuatro omisiones opcionales. Python consolidado: **79.12 % de líneas**; frontend: **92.65 % de líneas y 81.12 % de ramas**. La combinación aritmética de los informes produce una estimación del **82.52 %**, incluyendo el agente; el valor publicado definitivo depende del análisis de SonarCloud.

Las pruebas de lectura posterior al guardado detectaron un fallo del loader Excel: se utilizaba `if_sheet_exists` en modo de creación, y append reemplazaba la hoja. La escritura ahora crea el libro, añade filas o reemplaza la hoja seleccionada conservando las demás. Las tres APIs públicas del loader tienen regresiones de estos comportamientos.

Los resultados locales y sus límites se registran en el plan dentro de `Planes/`. El porcentaje definitivo es el que publique SonarCloud después de analizar el commit final; una estimación combinada de los reportes locales no certifica ese resultado.
