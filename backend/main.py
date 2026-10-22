import sys
import os

# Forzar codificación UTF-8 en stdout/stderr para evitar errores de codificación con emojis en Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Configurar path para permitir la importación de los paquetes etl y backend
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.append(root_dir)

backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from etl.error_utils import public_error
from api.routes import extract, transform, load, warehouse
from services.agent_manager import agent_manager
from services.auth_service import optional_user
from api.routes import connections, monitoring, agents

app = FastAPI(
    title="ETL Flow API",
    description="API para la herramienta de integración de datos (ETL)",
    version="1.0.0",
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # Pydantic input/ctx can contain the full source, including nested passwords.
    detail = [{"loc": error["loc"], "type": error["type"],
               "msg": public_error(error["msg"], exc.body)} for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": detail})


@app.exception_handler(StarletteHTTPException)
async def public_http_error_handler(request: Request, exc: StarletteHTTPException):
    try:
        payload = await request.json()
    except (ValueError, RuntimeError):
        payload = None
    detail = public_error(exc.detail, payload) if isinstance(exc.detail, str) else exc.detail
    return JSONResponse(status_code=exc.status_code, content={"detail": detail}, headers=exc.headers)

# Configuración de CORS para permitir peticiones del frontend (Next.js)
cors_origins = [origin.strip().rstrip("/") for origin in
                os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
                if origin.strip() and origin.strip() != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# WebSocket Endpoint para el Agente Local Híbrido
@app.websocket("/api/v1/ws/agent/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str):
    origin = websocket.headers.get("origin")
    if origin and origin.rstrip("/") not in cors_origins:
        await websocket.close(code=1008, reason="Origen no autorizado.")
        return
    from services.agent_pairing import consume
    pair_code = websocket.headers.get("x-etl-pair-token")
    owner = consume(agent_id, pair_code) if pair_code else None
    if pair_code and owner is None:
        await websocket.close(code=1008, reason="Emparejamiento inválido o vencido.")
        return
    await websocket.accept()
    if not agent_manager.register_agent(agent_id, websocket):
        await websocket.close(code=1008, reason="Identificador de agente ya conectado.")
        return
    if owner:
        agent_manager.paired_owners[agent_id] = (*owner, agent_manager.connection_id(agent_id))
    try:
        while True:
            # Escuchar respuestas en formato JSON del agente
            data = await websocket.receive_json()
            request_id = data.get("request_id") if isinstance(data, dict) else None
            if isinstance(request_id, str):
                agent_manager.resolve_request(request_id, data, agent_id, websocket)
    except WebSocketDisconnect:
        agent_manager.unregister_agent(agent_id, websocket)
    except Exception as e:
        print("Error de transporte en canal del agente.")
        agent_manager.unregister_agent(agent_id, websocket)

# Registrar routers
app.include_router(extract.router, prefix="/api/v1/extract", tags=["Extracción"], dependencies=[Depends(optional_user)])
app.include_router(transform.router, prefix="/api/v1/transform", tags=["Transformación"], dependencies=[Depends(optional_user)])
app.include_router(load.router, prefix="/api/v1/load", tags=["Carga"], dependencies=[Depends(optional_user)])
app.include_router(warehouse.router, prefix="/api/v1/warehouse", tags=["Bodega de datos"], dependencies=[Depends(optional_user)])

app.include_router(connections.router, prefix="/api/v1/connections", tags=["Conexiones"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["Monitoreo"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agentes"])

@app.get("/api/v1/health")
async def health_check():
    """Endpoint para verificar el estado de la API"""
    return {"status": "ok", "message": "ETL API is running"}
