"""Public egress policy for saved credentials; pin the checked DNS result."""
import ipaddress
import os
import socket
import threading
import time
from collections import OrderedDict, deque

from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool


def public_address(host: str, port: int) -> str:
    allowed = {h.strip().lower() for h in os.getenv("ETL_DIRECT_HOST_ALLOWLIST", "").split(",") if h.strip()}
    if allowed and host.lower() not in allowed:
        raise HTTPException(400, "El destino no está autorizado para conexiones directas.")
    try:
        addresses = sorted({result[4][0] for result in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)},
                           key=lambda address: (ipaddress.ip_address(address).version, address))
        if not addresses or any(not ipaddress.ip_address(ip).is_global for ip in addresses):
            raise ValueError("private destination")
        return addresses[0]
    except (ValueError, OSError):
        raise HTTPException(400, "Usa un destino público autorizado o el agente local para redes privadas.") from None


async def pin_connection(config: dict) -> dict:
    if config.get("use_agent"):
        # Deliberate gate: the existing UUID-only channel cannot receive saved secrets.
        raise HTTPException(409, "Las conexiones guardadas requieren conexión directa; usa credenciales manuales con el agente hasta habilitar su emparejamiento.")
    port = config.get("port") or {"postgresql": 5432, "mysql": 3306, "oracle": 1521}[config["db_type"]]
    address = await run_in_threadpool(public_address, config["host"], port)
    return {**config, "host": address, "port": port}


class OperationLimits:
    """Bounded per-process limiter; matches the current one-process broker."""
    def __init__(self):
        self.lock = threading.Lock()
        self.windows = OrderedDict()
        self.running = set()

    def check(self, key: str, limit=30):
        with self.lock:
            now = time.monotonic()
            bucket = self.windows.setdefault(key, deque())
            self.windows.move_to_end(key)
            while bucket and bucket[0] < now - 60:
                bucket.popleft()
            if len(bucket) >= limit:
                raise HTTPException(429, "Demasiadas solicitudes; espera un minuto.", headers={"Retry-After": "60"})
            bucket.append(now)
            while len(self.windows) > 4096:
                self.windows.popitem(last=False)

    def acquire(self, key):
        with self.lock:
            if key in self.running or len(self.running) >= 8:
                raise HTTPException(429, "Ya hay una operación en curso; espera su resultado.")
            self.running.add(key)

    def release(self, key):
        with self.lock:
            self.running.discard(key)


limits = OperationLimits()
