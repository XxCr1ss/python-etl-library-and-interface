from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import extract

app = FastAPI(
    title="ETL Flow API",
    description="API para la herramienta de integración de datos (ETL)",
    version="1.0.0",
)

# Configuración de CORS para permitir peticiones del frontend (Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://etl-flow.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(extract.router, prefix="/api/v1/extract", tags=["Extracción"])

@app.get("/api/v1/health")
async def health_check():
    """Endpoint para verificar el estado de la API"""
    return {"status": "ok", "message": "ETL API is running"}
