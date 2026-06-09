import sys
import os

# Forzar codificación UTF-8 en stdout/stderr para evitar errores de codificación con emojis en Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Configurar path para permitir la importación del paquete etl
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.append(root_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import extract, transform, load

app = FastAPI(
    title="ETL Flow API",
    description="API para la herramienta de integración de datos (ETL)",
    version="1.0.0",
)

# Configuración de CORS para permitir peticiones del frontend (Next.js)
cors_origins = [
    "http://localhost:3000", 
    "https://etl-flow.vercel.app",
    "https://etl-flow-frontend.vercel.app"
]
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    cors_origins.extend([origin.strip() for origin in env_origins.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Registrar routers
app.include_router(extract.router, prefix="/api/v1/extract", tags=["Extracción"])
app.include_router(transform.router, prefix="/api/v1/transform", tags=["Transformación"])
app.include_router(load.router, prefix="/api/v1/load", tags=["Carga"])

@app.get("/api/v1/health")
async def health_check():
    """Endpoint para verificar el estado de la API"""
    return {"status": "ok", "message": "ETL API is running"}
