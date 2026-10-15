"""Regenerate synthetic responses; test_environment checks these against real HTTP handlers."""
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from etl.json_utils import clean_value

directory = ROOT / "frontend/src/tests/fixtures"
df = pd.read_csv(directory / "sample_sales.csv")
sales = clean_value(df.to_dict("records"))
fixture = {
    "sales": sales,
    "uploadResponse": {
        "status": "success", "filename": "sample_sales.csv",
        "filepath": "/synthetic/etl_uploads/sample_sales.csv",
        "unique_filename": "synthetic_sample_sales.csv",
        "message": "Archivo recibido y procesado para vista previa",
        "preview_data": sales[:5], "total_rows": len(df),
    },
    "previewResponse": {
        "status": "success", "total_rows": len(df), "columns": df.columns.tolist(),
        "dtypes": {column: str(dtype) for column, dtype in df.dtypes.items()},
        "preview_data": sales[:10],
    },
}
(directory / "backend-contracts.json").write_text(
    json.dumps(fixture, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
