"""Exercise real uvicorn entrypoints over localhost, using synthetic files only."""
import argparse
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time

import httpx

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-dir", type=Path, required=True)
    evidence = parser.parse_args().evidence_dir.resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    results = []
    for entrypoint, cwd in [("backend.main:app", ROOT), ("main:app", ROOT / "backend"), ("api.index:app", ROOT)]:
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        with tempfile.TemporaryDirectory(prefix="etl-smoke-01a-") as temp:
            env = {**os.environ, "TEMP": temp, "TMP": temp, "PYTHONIOENCODING": "utf-8"}
            log_path = evidence / (entrypoint.replace(":", "-") + ".log")
            with log_path.open("w", encoding="utf-8") as log:
                process = subprocess.Popen([
                    sys.executable, "-m", "uvicorn", entrypoint, "--host", "127.0.0.1", "--port", str(port)
                ], cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
                try:
                    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=2) as client:
                        deadline = time.monotonic() + 20
                        while True:
                            try:
                                response = client.get("/api/v1/health")
                                response.raise_for_status()
                                assert response.json() == {"status": "ok", "message": "ETL API is running"}
                                break
                            except httpx.TransportError:
                                if process.poll() is not None or time.monotonic() > deadline:
                                    raise RuntimeError(f"Could not start {entrypoint}; see {log_path}")
                                time.sleep(0.1)
                        years = {"start_year": 2024, "end_year": 2024}
                        extracted = client.post("/api/v1/extract/date-dimension/preview", json=years)
                        extracted.raise_for_status()
                        transformed = client.post("/api/v1/transform/preview", json={
                            "source": {"type": "date_dimension", **years}, "steps": [], "limit": 366})
                        transformed.raise_for_status()
                        data = transformed.json()
                        assert extracted.json()["total_rows"] == data["total_rows"] == 366
                        assert data["preview_data"][0]["fecha"] == "2024-01-01"
                        assert data["preview_data"][-1]["fecha"] == "2024-12-31"
                        uploaded = client.post("/api/v1/extract/upload", files={"file": ("tags.CSV", b"tags\na;b\nc\n")})
                        uploaded.raise_for_status()
                        converted = client.post("/api/v1/transform/preview", json={
                            "source": {"type": "file", "filepath": uploaded.json()["filepath"]},
                            "steps": [{"type": "convert_column_to_list", "params": {"column": "tags"}}]})
                        converted.raise_for_status()
                        assert converted.json()["preview_data"] == [{"tags": ["a", "b"]}, {"tags": ["c"]}]
                        assert len(client.get("/api/v1/transform/operations").json()) == 42
                        results.append(f"{entrypoint}: health=200; date=366 (2024-01-01..2024-12-31); upload/list=200; catalog=42")
                finally:
                    process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)
    (evidence / "startup-summary.txt").write_text("\n".join(results) + "\n", encoding="utf-8")
    print("\n".join(results))


if __name__ == "__main__":
    main()
