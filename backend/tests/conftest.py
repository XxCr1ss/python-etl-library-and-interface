"""Match backend.main imports; never collect or execute legacy database scripts."""
import sys
import asyncio
from pathlib import Path

import pytest
import httpx

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.main import app
from services import extract_service, transform_service, load_service
from services.agent_manager import agent_manager
from etl.warehouse import execution as warehouse_execution


@pytest.fixture(autouse=True)
def isolated_adapters(monkeypatch, tmp_path):
    monkeypatch.setattr(extract_service, "UPLOAD_DIR", str(tmp_path))

    def forbidden(*args, **kwargs):
        pytest.fail("External database adapter must be replaced explicitly in this test")

    for module in (extract_service, transform_service, load_service):
        monkeypatch.setattr(module, "DB_Extractor", forbidden)
    monkeypatch.setattr(load_service, "DB_Loader", forbidden)
    monkeypatch.setattr(warehouse_execution, "engine_for", forbidden)
    monkeypatch.setattr(agent_manager, "active_agents", {})
    monkeypatch.setattr(agent_manager, "pending_requests", {})
    monkeypatch.setattr(agent_manager, "generations", {})
    monkeypatch.setattr(agent_manager, "uncertain_writes", set())


@pytest.fixture
def client():
    # In-process ASGI, with no TestClient worker thread or listening socket.
    # The app has no lifespan hooks; each request runs in its own event loop.
    class ASGIClient:
        def request(self, method, url, **kwargs):
            async def send():
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as session:
                    return await session.request(method, url, **kwargs)
            return asyncio.run(send())

        def get(self, url, **kwargs):
            return self.request("GET", url, **kwargs)

        def post(self, url, **kwargs):
            return self.request("POST", url, **kwargs)

    return ASGIClient()


@pytest.fixture
def csv_source(tmp_path):
    path = tmp_path / "source.csv"
    path.write_text("id,amount\n1,0\n2,20\n", encoding="utf-8")
    return {"type": "file", "filepath": str(path)}
