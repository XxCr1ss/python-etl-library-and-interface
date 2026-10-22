"""JWT identity; absent authentication is a guest, bad authentication never is."""
import functools
from dataclasses import dataclass
from uuid import UUID

import jwt
from fastapi import HTTPException, Request
from starlette.concurrency import run_in_threadpool

from services.supabase_service import SupabaseSettings, gateway


@dataclass(frozen=True)
class Identity:
    user_id: str
    token: str
    session_id: str


@functools.lru_cache(maxsize=8)
def jwks_client(url):
    return jwt.PyJWKClient(url + "/auth/v1/.well-known/jwks.json", lifespan=300, timeout=10)


async def verify_token(token: str) -> Identity:
    cfg = SupabaseSettings.load()
    if not cfg.url or not cfg.publishable_key:
        raise HTTPException(503, "La autenticación no está configurada en el backend.")
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if algorithm not in {"ES256", "RS256", "EdDSA", "HS256"}:
            raise ValueError("algorithm")
        options = {"require": ["exp", "iat", "iss", "aud", "sub", "session_id"],
                   "verify_exp": True, "verify_iat": True, "verify_nbf": True,
                   "verify_aud": True, "verify_iss": True}
        if algorithm == "HS256":
            # Auth verifies the signature; no signing secret is copied to Render.
            user = await gateway(token).call("GET", "/auth/v1/user")
            claims = jwt.decode(token, options={**options, "verify_signature": False},
                                issuer=cfg.issuer, audience=cfg.audience)
            if user.get("id") != claims["sub"]:
                raise ValueError("identity")
        else:
            key = await run_in_threadpool(jwks_client(cfg.url).get_signing_key_from_jwt, token)
            claims = jwt.decode(token, key.key, algorithms=[algorithm], options=options,
                                issuer=cfg.issuer, audience=cfg.audience)
        if claims.get("role") != "authenticated" or claims.get("is_anonymous"):
            raise ValueError("role")
        return Identity(str(UUID(claims["sub"])), token, str(UUID(claims["session_id"])))
    except HTTPException:
        raise
    except jwt.PyJWKClientConnectionError:
        raise HTTPException(503, "No se pudo comprobar la firma de la sesión.") from None
    except (jwt.PyJWTError, ValueError, TypeError, KeyError, AttributeError):
        raise HTTPException(401, "La sesión no es válida o ha caducado.", headers={"WWW-Authenticate": "Bearer"}) from None


async def optional_user(request: Request) -> Identity | None:
    if hasattr(request.state, "identity"):
        return request.state.identity
    from services.agent_pairing import agent_bindings
    agent_bindings.set({})
    import os
    if os.getenv("ETL_PUBLIC_EGRESS_ONLY", os.getenv("RENDER", "false")).lower() == "true":
        from services.connection_security import limits
        limits.check("entry:" + (request.client.host if request.client else "unknown"), 120)
    header = request.headers.get("authorization")
    if header is None:
        request.state.identity = None
        return None
    parts = header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer" or len(parts[1]) > 16384:
        raise HTTPException(401, "Cabecera de autenticación inválida.")
    request.state.identity = await verify_token(parts[1])
    return request.state.identity


async def require_user(request: Request) -> Identity:
    identity = await optional_user(request)
    if identity is None:
        raise HTTPException(401, "Inicia sesión para continuar.", headers={"WWW-Authenticate": "Bearer"})
    return identity


async def active_user(request: Request) -> Identity:
    identity = await require_user(request)
    # Server-only RPC checks session revocation/account state, not JWT freshness.
    active = await gateway().rpc("etl_session_active", {
        "p_user_id": identity.user_id, "p_session_id": identity.session_id})
    if active is not True:
        raise HTTPException(401, "La sesión terminó; vuelve a iniciar sesión.")
    return identity
