"""Small HTTPS gateway. User reads and privileged RPCs never share auth state."""
import os
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException


def require_feature(name: str):
    if os.getenv(name, "true").lower() != "true":
        raise HTTPException(503, "Esta función está deshabilitada temporalmente.")


@dataclass(frozen=True)
class SupabaseSettings:
    url: str
    publishable_key: str
    secret_key: str
    issuer: str
    audience: str

    @classmethod
    def load(cls):
        url = os.getenv("SUPABASE_URL", "").rstrip("/")
        return cls(url, os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
                   os.getenv("SUPABASE_SECRET_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")),
                   os.getenv("SUPABASE_JWT_ISSUER") or url + "/auth/v1",
                   os.getenv("SUPABASE_JWT_AUDIENCE") or "authenticated")


class SupabaseGateway:
    def __init__(self, token: str | None = None):
        self.settings = SupabaseSettings.load()
        self.token = token

    async def call(self, method: str, path: str, *, internal=False, params=None, body=None,
                   prefer: str | None = None) -> Any:
        cfg = self.settings
        key = cfg.secret_key if internal else cfg.publishable_key
        if not cfg.url or not key:
            raise HTTPException(503, "La persistencia no está configurada en el backend.")
        # Configuration is operator-controlled, never taken from a token/request.
        if not cfg.url.startswith("https://") and not cfg.url.startswith(("http://127.0.0.1:", "http://localhost:")):
            raise HTTPException(503, "La configuración de Supabase requiere HTTPS.")
        headers = {"apikey": key, "Accept": "application/json"}
        if self.token and not internal:
            headers["Authorization"] = f"Bearer {self.token}"
        elif internal and key.count(".") == 2:  # legacy service_role only
            headers["Authorization"] = f"Bearer {key}"
        if prefer:
            headers["Prefer"] = prefer
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
                response = await client.request(method, cfg.url + path, headers=headers, params=params, json=body)
        except httpx.HTTPError:
            raise HTTPException(503, "No se pudo contactar con la persistencia.") from None
        if response.is_error:
            # Never propagate PostgREST/driver bodies (they can include values).
            code = ""
            try:
                code = response.json().get("code", "")
            except (ValueError, AttributeError):
                pass
            if response.status_code == 401:
                raise HTTPException(401, "La sesión no es válida o ha caducado.")
            if code == "PT404":
                raise HTTPException(404, "Conexión no disponible.")
            if code in ("PT409", "23505"):
                raise HTTPException(409, "La configuración cambió; actualiza e inténtalo de nuevo.")
            raise HTTPException(503, "La persistencia no está disponible; comprueba configuración y migraciones.")
        if not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            raise HTTPException(503, "Respuesta de persistencia inválida.") from None

    async def rpc(self, name: str, body: dict):
        return await self.call("POST", "/rest/v1/rpc/" + name, internal=True, body=body)

    async def read(self, table: str, params: dict):
        return await self.call("GET", "/rest/v1/" + table, params=params)


def gateway(token: str | None = None):
    return SupabaseGateway(token)
