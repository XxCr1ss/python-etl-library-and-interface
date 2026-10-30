"""Persist real temporary files and read them back with independent readers."""
import pandas as pd
import pytest

from etl.loaders.csv_loader import CSV_Loader
from etl.loaders.xlsx_loader import Excel_Loader


def test_csv_replace_append_merge_and_validation(tmp_path):
    loader = CSV_Loader(str(tmp_path / "csv"))
    first = pd.DataFrame({"id": [1], "value": ["a"]})
    second = pd.DataFrame({"id": [2], "value": ["b"]})
    loader.load_dimension(first, "part_one.csv")
    loader.load_fact(second, "part_one.csv", foreign_keys=["id"])
    assert pd.read_csv(tmp_path / "csv/part_one.csv").to_dict("list") == {"id": [1, 2], "value": ["a", "b"]}
    loader.save_csv(second, "part_two.csv")
    merged = loader.merge_csvs("part_", "merged.csv")
    assert sorted(merged.id.tolist()) == [1, 2, 2]
    assert loader.load_csv("merged.csv").shape == (3, 2)
    assert loader.validate_csv("merged.csv", required_columns=["id"], min_rows=3)[0]
    assert not loader.validate_csv("merged.csv", required_columns=["missing"])[0]
    assert not loader.validate_csv("merged.csv", min_rows=4)[0]
    assert not loader.validate_csv("absent.csv")[0]
    info = loader.get_file_info("merged.csv")
    assert info["rows"] == 3 and info["column_names"] == ["id", "value"] and info["file_size"] > 0
    assert sorted(loader.list_csv_files()) == ["merged.csv", "part_one.csv", "part_two.csv"]
    loader.load_fact(first, "part_one.csv", mode="replace")
    assert pd.read_csv(tmp_path / "csv/part_one.csv").id.tolist() == [1]
    with pytest.raises(ValueError, match="clave foránea"):
        loader.load_fact(first, "part_one.csv", foreign_keys=["missing"])
    assert pd.read_csv(tmp_path / "csv/part_one.csv").id.tolist() == [1]


@pytest.mark.parametrize("method", ["load_dimension", "load_fact", "load_data"])
def test_excel_create_append_replace_preserves_other_sheets(tmp_path, method):
    path = tmp_path / "warehouse.xlsx"
    loader = Excel_Loader(str(path))
    write = getattr(loader, method)
    write(pd.DataFrame({"id": [1]}), "data", if_exists="replace")
    loader.load_data(pd.DataFrame({"label": ["keep"]}), "other", if_exists="replace")
    write(pd.DataFrame({"id": [2]}), "data", if_exists="append")
    assert pd.read_excel(path, sheet_name="data").id.tolist() == [1, 2]
    assert pd.read_excel(path, sheet_name="other").label.tolist() == ["keep"]
    write(pd.DataFrame({"id": [3]}), "data", if_exists="replace")
    assert pd.read_excel(path, sheet_name="data").id.tolist() == [3]
    assert loader.sheet_exists("other")
    assert loader.get_sheet_info()["data"] == {"rows": 1, "columns": 1, "column_names": ["id"]}
    loader.duplicate_sheet("data", "copy")
    assert loader.read_sheet("copy").id.tolist() == [3]
    loader.clear_sheet("data")
    assert loader.read_sheet("data").empty
    assert loader.read_sheet("copy").id.tolist() == [3]


def test_file_errors_do_not_create_invalid_outputs(tmp_path):
    excel = Excel_Loader(str(tmp_path / "missing.xlsx"))
    assert not excel.sheet_exists("x")
    with pytest.raises(ValueError, match="clave foránea"):
        excel.load_fact(pd.DataFrame({"id": [1]}), "facts", foreign_keys=["absent"])
    assert not (tmp_path / "missing.xlsx").exists()
    with pytest.raises(ValueError, match="ruta"):
        Excel_Loader().get_sheet_names()
    with pytest.raises(FileNotFoundError):
        CSV_Loader(str(tmp_path)).merge_csvs("absent", "out.csv")
    with pytest.raises(ValueError, match="base_path"):
        CSV_Loader().merge_csvs("x", "out.csv")
    with pytest.raises(ValueError, match="append o replace"):
        excel.load_data(pd.DataFrame({"id": [1]}), if_exists="unknown")
    assert not (tmp_path / "missing.xlsx").exists()


def test_excel_default_append_creates_a_new_workbook_with_headers(tmp_path):
    path = tmp_path / "new.xlsx"
    Excel_Loader(str(path)).load_data(pd.DataFrame({"id": [1]}))
    assert pd.read_excel(path).to_dict("records") == [{"id": 1}]
