"""Ejecuta answers.ipynb en lectura y conserva exportaciones por ejecución.

--parametros recibe un JSON con los parámetros declarados en el cuaderno.
--no-guardar-cuaderno permite validar una selección adicional sin sustituir
las salidas guardadas de la selección principal.
"""
import argparse
import ast
import json
import os
from pathlib import Path
import sys

import nbformat
from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError
from jupyter_client import KernelManager


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--parametros', type=Path)
    parser.add_argument('--no-guardar-cuaderno', action='store_true')
    args = parser.parse_args()
    base = Path(__file__).resolve().parents[1]
    path = base / 'cuadernos/answers.ipynb'
    notebook = nbformat.read(path, as_version=4)
    nbformat.validate(notebook)
    for cell in notebook.cells:
        if cell.cell_type == 'code':
            ast.parse(cell.source)
    if args.parametros:
        parametros = args.parametros.resolve(strict=True)
        json.loads(parametros.read_text(encoding='utf8'))
        os.environ['COLOMBIA_SALUDABLE_RESPUESTAS_PARAMETROS'] = str(parametros)
    else:
        os.environ.pop('COLOMBIA_SALUDABLE_RESPUESTAS_PARAMETROS', None)
    manager = KernelManager(kernel_name='python3')
    manager.kernel_spec.argv = [sys.executable, '-m', 'ipykernel_launcher', '-f', '{connection_file}']
    try:
        NotebookClient(notebook, km=manager, timeout=180,
                       resources={'metadata': {'path': str(path.parent)}}).execute()
    except CellExecutionError:
        errores = [(i + 1, o.get('ename'), o.get('evalue', '')) for i, c in enumerate(notebook.cells)
                   if c.cell_type == 'code' for o in c.outputs if o.output_type == 'error']
        print('Ejecución detenida. No se reemplazó el cuaderno guardado.')
        if errores:
            i, tipo, _ = errores[-1]
            print(f'Celda: {i}; tipo de error: {tipo}.')
            folder = base / 'planes_y_evidencia/respuestas'
            folder.mkdir(exist_ok=True)
            # No guardar excepciones de drivers que puedan incluir datos/credenciales.
            (folder / 'ultima_ejecucion_detenida.json').write_text(
                json.dumps({'celda': i, 'tipo_error': tipo, 'estado': 'incompleto'}, indent=2), encoding='utf8')
            # Para errores de programación, registrar solo el mensaje si no proviene de SQLAlchemy.
            if tipo in ('KeyError', 'NameError', 'SyntaxError', 'AssertionError'):
                print('Revise la celda indicada y sus contratos de datos.')
        return 1
    else:
        if not args.no_guardar_cuaderno:
            nbformat.write(notebook, path)
        print('14 respuestas ejecutadas. Tablas, figuras y manifiesto en planes_y_evidencia/respuestas/.')
        return 0
    finally:
        if manager.has_kernel:
            manager.shutdown_kernel(now=True)


if __name__ == '__main__':
    raise SystemExit(main())
