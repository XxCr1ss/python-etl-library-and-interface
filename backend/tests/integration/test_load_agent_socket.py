"""Actual network disconnection after dispatch, with no SQL adapter required."""
import asyncio
import json

import httpx
import pytest
import websockets

import etl_agent
from .test_agent_integration import live_backend_server

pytestmark = pytest.mark.integration


def test_write_disconnect_quarantines_id_across_reconnection(live_backend_server):
    async def run():
        agent_id = "uncertain-load-socket"
        url = live_backend_server.replace("http://", "ws://") + "/api/v1/ws/agent/" + agent_id
        body = {"source": {"type": "date_dimension", "start_year": 2024, "end_year": 2024}, "recipe": [],
                "target_connection": {"db_type": "postgresql", "host": "local", "database": "local", "user": "etl",
                                      "password": "synthetic-secret", "use_agent": True, "agent_id": agent_id},
                "load_config": {"table_name": "synthetic", "table_type": "fact", "if_exists": "append"}}
        async with httpx.AsyncClient(base_url=live_backend_server, timeout=10) as client:
            async with websockets.connect(url, max_size=50 * 1024 * 1024) as socket:
                request = asyncio.create_task(client.post("/api/v1/load/execute", json=body))
                capability = json.loads(await socket.recv())
                assert capability["action"] == "get_capabilities" and capability["payload"] == {}
                await socket.send(json.dumps({"request_id": capability["request_id"], "status": "success", "data": etl_agent.load_capabilities(True)}))
                write = json.loads(await socket.recv())
                assert write["action"] == "execute_load" and write["payload"]["dataset"]["row_count"] == 366
                # No reply: a committed write with a lost response is possible.
                await socket.close()
                result = await request
                assert result.status_code == 500 and "synthetic-secret" not in result.text
            async with websockets.connect(url):
                result = await client.post("/api/v1/load/execute", json=body)
                assert result.status_code == 400 and "sin confirmar" in result.json()["detail"]
    asyncio.run(run())
