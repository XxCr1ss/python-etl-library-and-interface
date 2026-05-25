import os, tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from etl.extractors.xlsx_extractor import XLSXExtractor

router = APIRouter()

def _save_temp(file: UploadFile) -> str:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    tmp.write(file.file.read())
    tmp.close()
    return tmp.name

@router.post("/sheets")
async def xlsx_sheet_names(file: UploadFile = File(...)):
    path = _save_temp(file)
    try:
        extractor = XLSXExtractor(path)
        return JSONResponse({"sheets": extractor.get_sheet_names()})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        os.unlink(path)

@router.post("/preview")
async def xlsx_preview(
    file: UploadFile = File(...),
    sheet_name: str = Query(default=""),
    n: int = Query(default=10, ge=1, le=100)
):
    path = _save_temp(file)
    try:
        extractor = XLSXExtractor(path)
        sheet = sheet_name if sheet_name else None
        df = extractor.read_sheet(sheet_name=sheet)

        # Si devuelve dict de hojas, toma la primera
        if isinstance(df, dict):
            first_key = list(df.keys())[0]
            df = df[first_key]

        return JSONResponse({
            "columns": df.columns.tolist(),
            "rows": df.head(n).fillna("").astype(str).values.tolist(),
            "total_rows": len(df),
            "sheet_used": sheet or extractor.get_sheet_names()[0]
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        os.unlink(path)