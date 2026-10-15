# Pruebas aisladas de compatibilidad backend (01A)

Entorno comprobado: Python 3.14.0 / Windows. El manifiesto raíz conserva las versiones
de runtime medidas en 00, completa drivers/lectores y fija la resolución transitiva
en `backend/constraints.txt`. `backend/requirements.txt` incluye el mismo runtime;
`requirements-dev.txt` añade pytest, httpx y xlwt para regenerar el fixture XLS.
No se certifican otros intérpretes, sistemas ni motores por esta instalación.

Desde la raíz, en un entorno nuevo:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
.venv/Scripts/python.exe -m pip check
.venv/Scripts/python.exe -m pytest -c backend/pytest.ini backend/tests -m "not integration" -q
```

No ejecutar pytest sin la configuración/ruta indicadas: los scripts históricos
`backend/test_api_*.py` son manuales y pueden escribir en una base de datos. La marca
`integration` queda registrada; esta suite no añade pruebas contra motores reales.
`conftest.py` bloquea los adaptadores BD por defecto. Cada test que los necesita
instala su doble explícito. Uploads y archivos utilizan `tmp_path`; agente/pendientes
se restablecen por test. El cliente usa `httpx.ASGITransport`, atraviesa Pydantic y
los handlers, y no abre sockets. La aplicación actual no tiene hooks lifespan.

## Contratos y fixtures

- `fixtures/operations.json`: entrada, parámetros y resultado esperado independiente
  de los 42 tipos. La suite compara conjuntos exactos y duplicados del catálogo,
  dispatcher y `StepType`, y verifica los parámetros públicos contra sus ramas.
- Joins: dos nombres presentes en **ambos** datasets significan una llave compuesta.
  En caso contrario `[izquierda, derecha]` identifica llaves diferentes. Se verifican
  los cuatro joins con llaves comunes, distintas, compuestas y duplicados.
- Fechas: `100 <= start_year <= end_year <= 9999` en el pandas 3 fijado. Los años
  1..99 se rechazan porque el generador actual los interpreta como otros años.
  Se conservan 1600 y 2263, válidos con su resolución actual. El caso 100 produce
  seis avisos existentes de inferencia de formato; no se filtran ni desactivan.
- JSON: listas/tuplas/arrays y objetos se recorren antes de evaluar nulos escalares.
  Numpy pasa a escalares nativos, fechas/horas a ISO, NaN/NaT/NA/inf a null.
  `0`, `false`, `""`, `null` son distintos. Texto vacío convertido a lista conserva
  `[""]`, la semántica del core; una lista vacía real se serializa como `[]`.
- XLS: `fixtures/sales.xls` es BIFF8/OLE real, generado con xlwt a partir de las
  12 ventas sintéticas. CSV y XLSX se reutilizan de los fixtures frontend de 01.
- `frontend/src/tests/fixtures/backend-contracts.json` se contrasta con upload y
  preview HTTP reales. Solo ruta/nombre UUID se normalizan. El CSV transforma
  celdas vacías en null; los valores vacíos en memoria se prueban por separado.
- Carga: el loader y consultas posteriores se interceptan. Se verifica el dataset
  de 366 días y un `total_rows=999` simulado de destino, que nunca representa filas
  insertadas. FK real, transacciones y modos contra PostgreSQL/MySQL/Oracle quedan en 07.

Regeneración explícita (los tests no reescriben fixtures):

```powershell
python backend/tests/fixtures/generate_xls.py
python backend/tests/fixtures/export_frontend_contracts.py
```

## Arranque por socket, sin BD

```powershell
python backend/tests/smoke_startup.py --evidence-dir Planes/evidencia-fase01a
```

Verifica `backend.main:app` desde raíz, `main:app` desde backend y `api.index:app`
desde raíz, con tres servidores secuenciales en puertos libres de localhost.
Comprueba health, fecha 2024, upload CSV/listas y catálogo, guarda logs y detiene
los procesos en finally. Usa un directorio temporal nuevo por proceso.
Esto prueba la entrada de despliegue localmente; no implica haber desplegado en Vercel.

Evidencia y límites de la ejecución: `Planes/SEGUIMIENTO.md` y
`Planes/evidencia-fase01a/` (ignorados por Git en este repositorio).
