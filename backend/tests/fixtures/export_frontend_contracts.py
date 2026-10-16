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
# Combination oracles shared by browser tests and HTTP contract tests.
left = pd.DataFrame({"id": [1, 2], "a": [10, 20]})
right = pd.DataFrame({"id": [2, 3], "b": [200, 300]})
for side, frame in (("left", left), ("right", right)):
    filename = f"combination-{side}.csv"
    frame.to_csv(directory / filename, index=False)
    fixture[f"combination{side.title()}Upload"] = {
        **fixture["uploadResponse"], "filename": filename,
        "filepath": f"/synthetic/etl_uploads/{filename}",
        "unique_filename": f"synthetic_{filename}",
        "total_rows": len(frame), "preview_data": clean_value(frame.to_dict("records")),
    }
fixture["combinations"] = {}
for kind in ("left_join", "right_join", "inner_join", "outer_join", "union"):
    result = pd.concat([left, right], ignore_index=True) if kind == "union" else pd.merge(left, right, how=kind.removesuffix("_join"), on="id")
    fixture["combinations"][kind] = {
        "status": "success", "total_rows": len(result), "columns": result.columns.tolist(),
        "dtypes": {column: str(dtype) for column, dtype in result.dtypes.items()},
        "preview_data": clean_value(result.to_dict("records")),
    }
(directory / "backend-contracts.json").write_text(
    json.dumps(fixture, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
