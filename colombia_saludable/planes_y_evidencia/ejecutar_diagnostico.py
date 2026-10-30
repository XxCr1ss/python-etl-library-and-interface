"""Ejecuta solo las celdas de diagnóstico; excluye la parte ETL del cuaderno."""
from pathlib import Path
import sys

import nbformat
from nbclient import NotebookClient
from jupyter_client import KernelManager


def main():
    base = Path(__file__).resolve().parents[1]
    path = base / "cuadernos" / "etl_core.ipynb"
    original = nbformat.read(path, as_version=4)
    notebook = nbformat.v4.new_notebook(
        cells=[c for c in original.cells if 'etl' not in c.metadata.get('tags', [])],
        metadata=original.metadata,
    )
    nbformat.validate(notebook)
    # Kernel del mismo intérprete; no depende de un registro global de .venv.
    manager = KernelManager(kernel_name="python3")
    manager.kernel_spec.argv = [sys.executable, "-m", "ipykernel_launcher", "-f", "{connection_file}"]
    try:
        NotebookClient(
            notebook, km=manager, timeout=120,
            resources={"metadata": {"path": str(path.parent)}},
        ).execute()
    finally:
        actualizadas = {c.id: c for c in notebook.cells}
        original.cells = [actualizadas.get(c.id, c) for c in original.cells]
        nbformat.write(original, path)
        if manager.has_kernel:
            manager.shutdown_kernel(now=True)
    print("Diagnóstico ejecutado y guardado; ETL pendiente.")


if __name__ == "__main__":
    main()
