"""Prepara el modelo; --cargar ejecuta la carga inicial del cuaderno con Core.

La bodega debe estar vacía. No reemplaza tablas ni reintenta una carga parcial.
"""
import argparse
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
    parser.add_argument('--cargar', action='store_true', help='Activa la carga inicial a colombia_saludable_dw_core')
    args = parser.parse_args()
    base = Path(__file__).resolve().parents[1]
    path = base / 'cuadernos/etl_core.ipynb'
    notebook = nbformat.read(path, as_version=4)
    nbformat.validate(notebook)
    # La opción de CLI prevalece sobre variables heredadas del proceso padre.
    os.environ['COLOMBIA_SALUDABLE_CARGAR'] = '1' if args.cargar else '0'
    manager = KernelManager(kernel_name='python3')
    manager.kernel_spec.argv = [sys.executable, '-m', 'ipykernel_launcher', '-f', '{connection_file}']
    try:
        NotebookClient(notebook, km=manager, timeout=180,
                       resources={'metadata': {'path': str(path.parent)}}).execute()
    except CellExecutionError:
        # Mensaje del cuaderno, sin volcar traceback del driver ni filas del origen.
        errores = [(i, o.get('ename'), o.get('evalue', '')) for i, c in enumerate(notebook.cells)
                   if c.cell_type == 'code' for o in c.outputs if o.output_type == 'error']
        if errores:
            i, tipo, mensaje = errores[-1]
            print(f'No se completó el cuaderno. Celda {i + 1}; tipo: {tipo}.')
            if tipo in ('ValueError', 'RuntimeError', 'AssertionError', 'KeyError', 'TypeError', 'NameError'):
                # Estos mensajes propios contienen únicamente nombres de campos/contratos.
                # El archivo de diagnóstico local conserva solo la clase y celda.
                print('Revise los contratos de esa celda y carga_core/intentos/.')
            registro = {'estado': 'ejecucion_detenida', 'celda': i + 1, 'tipo_error': tipo, 'modo_carga': args.cargar}
            (base / 'planes_y_evidencia/carga_core/ultima_ejecucion_detenida.json').write_text(
                json.dumps(registro, indent=2), encoding='utf8')
        return 1
    else:
        # Un intento bloqueado no sustituye la evidencia del último cuaderno exitoso.
        nbformat.write(notebook, path)
        print('Carga y conciliación completadas.' if args.cargar else 'Preparación validada; sin escrituras en la bodega.')
        return 0
    finally:
        if manager.has_kernel:
            manager.shutdown_kernel(now=True)


if __name__ == '__main__':
    raise SystemExit(main())
