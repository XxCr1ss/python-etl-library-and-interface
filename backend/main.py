import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import csv_router, xlsx_router, db_router

app = FastAPI(title="ETL Tool API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # En prod reemplaza con tu dominio Vercel
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(csv_router.router,  prefix="/api/csv",  tags=["CSV"])
app.include_router(xlsx_router.router, prefix="/api/xlsx", tags=["Excel"])
app.include_router(db_router.router,   prefix="/api/db",   tags=["Database"])

@app.get("/")
def health():
    return {"status": "ok", "service": "ETL Tool API"}