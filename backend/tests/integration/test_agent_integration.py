"""WebSocket protocol and real etl_agent.py CLI subprocess integration tests against PostgreSQL (Phase 07)."""
from __future__ import annotations

import asyncio
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
import httpx
import pytest
import websockets

from tests.integration.sql_harness import PostgresTestHarness

pytestmark = pytest.mark.integration

ROOT = Path(__file__).resolve().parents[3]


def _reserve_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _wait_for_health(base_url: str, timeout: float = 15.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            res = httpx.get(f"{base_url}/api/v1/health", timeout=1.0)
            if res.status_code == 200:
                return
        except Exception:
            pass
        time.sleep(0.15)
    raise TimeoutError(f"Backend server at {base_url} did not become healthy in time")


def _wait_for_agent_status(base_url: str, agent_id: str, expected: bool, timeout: float = 15.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            res = httpx.get(f"{base_url}/api/v1/extract/agent/status/{agent_id}", timeout=1.0)
            if res.status_code == 200 and res.json().get("connected") is expected:
                return
        except Exception:
            pass
        time.sleep(0.15)
    raise TimeoutError(f"Agent '{agent_id}' did not reach connected={expected} in time")


@pytest.fixture
def live_backend_server(tmp_path: Path):
    port = _reserve_port()
    base_url = f"http://127.0.0.1:{port}"
    env = os.environ.copy()
    env["ETL_UPLOAD_DIR"] = str(tmp_path / "uploads")
    env["PYTHONUTF8"] = "1"
    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "backend.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        cwd=str(ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
    )
    try:
        _wait_for_health(base_url)
        yield base_url
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)


def test_agent_websocket_protocol_and_disconnection(live_backend_server: str):
    agent_id = "ws-protocol-test-agent"
    ws_url = f"{live_backend_server.replace('http://', 'ws://')}/api/v1/ws/agent/{agent_id}"  # NOSONAR

    status_before = httpx.get(f"{live_backend_server}/api/v1/extract/agent/status/{agent_id}")
    assert status_before.json() == {"agent_id": agent_id, "connected": False}

    async def run_protocol():
        async with websockets.connect(ws_url) as ws:
            async def responder():
                for _ in range(3):
                    raw = await ws.recv()
                    msg = json.loads(raw)
                    req_id = msg["request_id"]
                    action = msg["action"]
                    if action == "get_metadata":
                        data = {
                            "status": "success",
                            "message": "OK",
                            "tables": ["t_agent"],
                            "schema_preview": {"t_agent": ["id", "valor"]},
                        }
                    elif action == "get_preview":
                        data = {
                            "status": "success",
                            "table_name": "t_agent",
                            "preview_data": [{"id": 1, "valor": 42}],
                            "total_rows": 1,
                        }
                    elif action == "get_table":
                        data = {
                            "status": "success",
                            "table_name": "t_agent",
                            "records": [{"id": 1, "valor": 42}, {"id": 2, "valor": 84}],
                            "total_rows": 2,
                        }
                    else:
                        raise AssertionError(f"Unexpected action {action}")
                    await ws.send(json.dumps({"request_id": req_id, "status": "success", "data": data}))

            responder_task = asyncio.create_task(responder())
            async with httpx.AsyncClient(base_url=live_backend_server, timeout=10.0) as http_client:
                st = await http_client.get(f"/api/v1/extract/agent/status/{agent_id}")
                assert st.json() == {"agent_id": agent_id, "connected": True}

                conn_body = {
                    "db_type": "postgresql",
                    "host": "localhost",
                    "port": 5432,
                    "database": "synthetic",
                    "user": "tester",
                    "password": "",
                    "use_agent": True,
                    "agent_id": agent_id,
                }
                meta = await http_client.post("/api/v1/extract/database", json=conn_body)
                assert meta.status_code == 200
                assert meta.json()["tables"] == ["t_agent"]

                prev = await http_client.post(
                    "/api/v1/extract/database/preview",
                    json={**conn_body, "table_name": "t_agent"},
                )
                assert prev.status_code == 200
                assert prev.json()["preview_data"] == [{"id": 1, "valor": 42}]

                tx = await http_client.post(
                    "/api/v1/transform/preview",
                    json={
                        "source": {"type": "database", **conn_body, "table_name": "t_agent"},
                        "steps": [{"type": "rename_columns", "params": {"columns": {"valor": "monto"}}}],
                        "limit": 10,
                    },
                )
                assert tx.status_code == 200
                assert tx.json()["total_rows"] == 2
                assert tx.json()["preview_data"] == [{"id": 1, "monto": 42}, {"id": 2, "monto": 84}]

            await responder_task

    asyncio.run(run_protocol())
    _wait_for_agent_status(live_backend_server, agent_id, expected=False, timeout=5.0)


def test_real_etl_agent_cli_against_postgresql(
    live_backend_server: str, pg_harness: PostgresTestHarness, run_prefix: str
):
    src_table = pg_harness.register_table(f"{run_prefix}_agent_src")
    dst_table = pg_harness.register_table(f"{run_prefix}_agent_dst")
    pg_harness.seed_table(
        src_table,
        [
            {"id": 10, "monto": 150, "activo": True},
            {"id": 20, "monto": 250, "activo": False},
            {"id": 30, "monto": 350, "activo": True},
        ],
    )

    agent_id = f"{run_prefix}_cli_agent"
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    agent_proc = subprocess.Popen(
        [sys.executable, "etl_agent.py"],
        cwd=str(ROOT),
        env=env,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
    )
    try:
        assert agent_proc.stdin is not None
        agent_proc.stdin.write(f"{live_backend_server}\n{agent_id}\n")
        agent_proc.stdin.flush()

        _wait_for_agent_status(live_backend_server, agent_id, expected=True, timeout=15.0)

        conn_dto = pg_harness.config.to_connection_dto()
        agent_conn = {**conn_dto, "use_agent": True, "agent_id": agent_id}

        meta_res = httpx.post(f"{live_backend_server}/api/v1/extract/database", json=agent_conn, timeout=10.0)
        assert meta_res.status_code == 200, meta_res.text
        assert src_table in meta_res.json()["tables"]

        preview_res = httpx.post(
            f"{live_backend_server}/api/v1/extract/database/preview",
            json={**agent_conn, "table_name": src_table},
            timeout=10.0,
        )
        assert preview_res.status_code == 200, preview_res.text
        assert preview_res.json()["total_rows"] == 3

        load_res = httpx.post(
            f"{live_backend_server}/api/v1/load/execute",
            json={
                "source": {"type": "database", **agent_conn, "table_name": src_table},
                "target_connection": conn_dto,
                "load_config": {
                    "table_name": dst_table,
                    "table_type": "dimension",
                    "if_exists": "replace",
                },
                "recipe": [{"type": "rename_columns", "params": {"columns": {"monto": "ingreso_agente"}}}],
            },
            timeout=15.0,
        )
        assert load_res.status_code == 200, load_res.text
        assert load_res.json()["total_rows"] == 3

        inspected = pg_harness.inspect_table(dst_table)
        assert inspected["exists"] is True
        assert inspected["count"] == 3
        assert inspected["columns"] == ["id", "ingreso_agente", "activo"]
        assert [r["ingreso_agente"] for r in inspected["rows"]] == [150, 250, 350]
    finally:
        agent_proc.terminate()
        try:
            agent_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            agent_proc.kill()
            agent_proc.wait(timeout=5)
