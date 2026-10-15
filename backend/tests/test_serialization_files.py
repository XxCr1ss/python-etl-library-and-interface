import datetime
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from services.extract_service import clean_records, clean_value


@pytest.mark.parametrize("agent", [False, True])
def test_recursive_json(agent):
    if agent:
        from etl_agent import clean_value as serialize
    else:
        serialize = clean_value
    value = {"items": [[], [np.int64(0), np.bool_(False)], (np.float32(1.5),),
                       np.array([1, 2]), {"missing": pd.NA, "nat": pd.NaT}],
             "scalars": [0, False, "", None, float("nan"), float("inf"), -float("inf")],
             "date": datetime.date(2024, 1, 1), "time": datetime.time(12, 30),
             "stamp": np.datetime64("2024-01-02")}
    result = serialize(value)
    assert result == {"items": [[], [0, False], [1.5], [1, 2], {"missing": None, "nat": None}],
        "scalars": [0, False, "", None, None, None, None], "date": "2024-01-01",
        "time": "12:30:00", "stamp": "2024-01-02T00:00:00"}
    json.dumps(result, allow_nan=False)
    assert serialize(np.longdouble(1.5)) == 1.5
    assert serialize(np.float64("inf")) is None
    assert clean_records(pd.DataFrame({"value": [value]}))[0]["value"] == result


def test_convert_list_http(client, tmp_path):
    path = tmp_path / "lists.csv"
    path.write_text('tags\n"a;b"\n"c"\n', encoding="utf-8")
    response = client.post("/api/v1/transform/preview", json={
        "source": {"type": "file", "filepath": str(path)}, "steps": [{
            "type": "convert_column_to_list", "params": {"column": "tags", "new_column": "parts"}}]})
    assert response.status_code == 200, response.text
    assert response.json()["preview_data"] == [
        {"tags": "a;b", "parts": ["a", "b"]}, {"tags": "c", "parts": ["c"]}]


@pytest.mark.parametrize("name", ["sample_sales.csv", "two_sheets.xlsx", "sales.xls"])
def test_upload_and_reload_real_files(client, name):
    fixtures = Path(__file__).parent / "fixtures"
    path = fixtures / name if name == "sales.xls" else Path(__file__).resolve().parents[2] / "frontend/src/tests/fixtures" / name
    response = client.post("/api/v1/extract/upload", files={"file": (name.upper(), path.read_bytes())})
    assert response.status_code == 200, response.text
    uploaded = response.json()
    assert uploaded["total_rows"] == 12 and len(uploaded["preview_data"]) == 5
    preview = client.post("/api/v1/transform/preview", json={
        "source": {"type": "file", "filepath": uploaded["filepath"]}, "steps": [], "limit": 5})
    assert preview.status_code == 200, preview.text
    assert preview.json()["total_rows"] == 12
    assert preview.json()["preview_data"] == uploaded["preview_data"]
    if name == "two_sheets.xlsx":
        other = client.post("/api/v1/transform/preview", json={
            "source": {"type": "file", "filepath": uploaded["filepath"], "sheet_name": "segunda"}, "steps": []})
        assert other.status_code == 200, other.text
        assert other.json()["preview_data"] == [{"marker": "second-sheet"}]


@pytest.mark.parametrize("name,content", [("bad.xlsx", b"corrupt"), ("empty.csv", b""),
    ("bad.xls", b"corrupt"), ("data.parquet", b"x")])
def test_invalid_upload(client, tmp_path, name, content):
    response = client.post("/api/v1/extract/upload", files={"file": (name, content)})
    assert response.status_code == 400, response.text
    assert response.json()["detail"]
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize("name", ["../../escape.csv", "..\\..\\escape.csv", "C:\\outside\\escape.CSV"])
def test_upload_basename_stays_under_directory(client, tmp_path, name):
    response = client.post("/api/v1/extract/upload", files={"file": (name, b"id\n1\n")})
    assert response.status_code == 200, response.text
    result = response.json()
    assert Path(result["filepath"]).resolve().parent == tmp_path.resolve()
    assert result["filename"].lower() == "escape.csv"
    assert "/" not in result["unique_filename"] and "\\" not in result["unique_filename"]


def test_empty_table_and_missing_file(client, tmp_path):
    path = tmp_path / "empty.csv"
    path.write_text("id,amount\n", encoding="utf-8")
    response = client.post("/api/v1/transform/preview", json={
        "source": {"type": "file", "filepath": str(path)}, "steps": []})
    assert response.status_code == 200
    assert response.json()["columns"] == ["id", "amount"]
    assert response.json()["total_rows"] == 0 and response.json()["preview_data"] == []
    path.unlink()
    assert client.post("/api/v1/transform/preview", json={
        "source": {"type": "file", "filepath": str(path)}, "steps": []}).status_code == 404
