"""Audit the public real-profile artifacts without opening a DB connection."""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path
from urllib.parse import quote_plus

try:
    from .sql_harness import load_test_db_config
except ImportError:  # Direct CLI execution from the repository root.
    from sql_harness import load_test_db_config


def audit_artifacts(directory: Path, password: str, extra_files: tuple[Path, ...] = ()) -> int:
    public = {"summary.json", "junit.xml", "index.html"}
    if not all((directory / name).is_file() for name in public):
        raise ValueError("Faltan reportes públicos de la ejecución real.")
    if any(not filename.is_file() for filename in extra_files):
        raise ValueError("Faltan reportes adicionales solicitados.")
    variants = {password, json.dumps(password)[1:-1], quote_plus(password),
                base64.b64encode(password.encode()).decode()} if password else set()
    count = 0
    for filename in [*directory.rglob("*"), *extra_files]:
        if filename.is_symlink():
            raise ValueError("Artefacto simbólico rechazado.")
        if not filename.is_file():
            continue
        if filename not in extra_files and filename.name not in public | {".last-run.json"}:
            raise ValueError("Artefacto crudo no permitido en el perfil real.")
        content = filename.read_text(encoding="utf-8")
        if any(value and value in content for value in variants):
            raise ValueError("Se detectó una credencial en los artefactos; publicación rechazada.")
        count += 1
    return count


if __name__ == "__main__":
    try:
        config = load_test_db_config()
        count = audit_artifacts(Path(sys.argv[1]), config.password, tuple(Path(name) for name in sys.argv[2:]))
        print(f"Auditoría de artefactos reales aprobada: {count} archivos; sin credenciales ni capturas crudas.")
    except Exception:
        print("Auditoría de artefactos reales fallida. No publicar estos archivos.", file=sys.stderr)
        sys.exit(1)
