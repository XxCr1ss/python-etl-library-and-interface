import os, tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from etl.extractors.csv_extractor import CSVExtractor

router = APIRouter()

def _save_temp(file: UploadFile) -> str:
    suffix = os.path.splitext(file.filename)[1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(file.file.read())
    tmp.close()
    return tmp.name

@router.post("/stats")
async def csv_stats(file: UploadFile = File(...)):
    path = _save_temp(file)
    try:
        extractor = CSVExtractor(path)
        stats = extractor.get_basic_stats()
        stats["data_types"] = {k: str(v) for k, v in stats["data_types"].items()}
        return JSONResponse(stats)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        os.unlink(path)

@router.post("/preview")
async def csv_preview(
    file: UploadFile = File(...),
    n: int = Query(default=10, ge=1, le=100)
):
    path = _save_temp(file)
    try:
        extractor = CSVExtractor(path)
        df = extractor.read_csv()
        return JSONResponse({
            "columns": df.columns.tolist(),
            "rows": df.head(n).fillna("").astype(str).values.tolist(),
            "total_rows": len(df),
            "dtypes": df.dtypes.astype(str).to_dict()
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        os.unlink(path)

@router.post("/validate")
async def csv_validate(
    file: UploadFile = File(...),
    required_columns: str = Query(default=""),
    min_rows: int = Query(default=1)
):
    path = _save_temp(file)
    try:
        extractor = CSVExtractor(path)
        cols = [c.strip() for c in required_columns.split(",") if c.strip()] or None
        valid, message = extractor.validate_csv_structure(
            required_columns=cols, min_rows=min_rows
        )
        return JSONResponse({"valid": valid, "message": message})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        os.unlink(path)