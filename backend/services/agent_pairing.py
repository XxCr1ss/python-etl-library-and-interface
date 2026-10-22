"""Short-lived single-use pairing, bound to an Auth session and socket generation."""
import hashlib
import hmac
import secrets
import time
from collections import OrderedDict
from contextvars import ContextVar

from fastapi import HTTPException

agent_bindings: ContextVar[dict[str, str]] = ContextVar("etl_agent_bindings", default={})
pending = OrderedDict()


def issue(agent_id, identity):
    from services.agent_manager import agent_manager
    if agent_manager.is_agent_connected(agent_id):
        raise HTTPException(409, "Detén el agente conectado antes de generar un emparejamiento nuevo.")
    now = time.monotonic()
    for key, value in list(pending.items()):
        if value[3] < now:
            pending.pop(key, None)
    code = secrets.token_urlsafe(32)
    pending[agent_id] = (hashlib.sha256(code.encode()).digest(), identity.user_id, identity.session_id, now+300)
    while len(pending) > 256:
        pending.popitem(last=False)
    return code


def consume(agent_id, code):
    value = pending.get(agent_id)
    if not value or value[3] < time.monotonic() or not hmac.compare_digest(value[0], hashlib.sha256(code.encode()).digest()):
        return None
    pending.pop(agent_id, None)
    return value[1], value[2]


def authorize(agent_id, identity):
    from services.agent_manager import agent_manager
    generation = agent_manager.connection_id(agent_id)
    if not generation or agent_manager.paired_owners.get(agent_id) != (identity.user_id, identity.session_id, generation):
        raise HTTPException(403, "Empareja este agente con la sesión actual antes de usar la conexión guardada.")
    agent_bindings.set({**agent_bindings.get(), agent_id: generation})
