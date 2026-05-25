from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from etl.extractors.db_extractor import DB_Extractor

router = APIRouter()

class ConnectionParams(BaseModel):
    db_type: str
    host: str
    port: Optional[int] = None
    user: str
    password: str
    database: str
    service_name: Optional[str] = None

class QueryParams(ConnectionParams):
    query: str

class TableParams(ConnectionParams):
    table_name: str
    limit: int = 10

@router.post("/test")
async def test_connection(params: ConnectionParams):
    try:
        with DB_Extractor(**params.model_dump()) as ex:
            info = ex.get_database_info()
            return JSONResponse({"connected": True, "info": info})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/tables")
async def list_tables(params: ConnectionParams):
    try:
        with DB_Extractor(**params.model_dump()) as ex:
            return JSONResponse({"tables": ex.get_table_names()})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/schema")
async def table_schema(params: TableParams):
    try:
        with DB_Extractor(**params.model_dump(exclude={"table_name", "limit"})) as ex:
            schema = ex.get_table_schema(params.table_name)
            schema["types"] = [str(t) for t in schema["types"]]
            return JSONResponse(schema)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/query")
async def execute_query(params: QueryParams):
    try:
        with DB_Extractor(**params.model_dump(exclude={"query"})) as ex:
            df = ex.execute_query(params.query)
            return JSONResponse({
                "columns": df.columns.tolist(),
                "rows": df.head(100).fillna("").astype(str).values.tolist(),
                "total_rows": len(df)
            })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sample")
async def sample_table(params: TableParams):
    try:
        with DB_Extractor(**params.model_dump(exclude={"table_name", "limit"})) as ex:
            df = ex.sample_data(params.table_name, n=params.limit)
            return JSONResponse({
                "columns": df.columns.tolist(),
                "rows": df.fillna("").astype(str).values.tolist(),
                "total_rows": len(df)
            })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))