import asyncio

import pandas as pd
import pytest

from services.transform_service import apply_transformation_steps
from services.extract_service import clean_records


def apply(data, kind, params):
    return asyncio.run(apply_transformation_steps(pd.DataFrame(data), [{"type": kind, "params": params}]))


@pytest.mark.parametrize("operator,expected", [("eq", [1]), ("ne", [0, 2]), ("gt", [2]),
    ("ge", [1, 2]), ("lt", [0]), ("le", [0, 1])])
def test_comparison_operators(operator, expected):
    result = apply({"v": [0, 1, 2]}, "filter_value", {"column": "v", "value": 1, "operator": operator})
    assert result["v"].tolist() == expected


def test_false_filter_and_zero_fill():
    result = apply({"v": [False, True]}, "filter_value", {"column": "v", "value": False})
    assert result["v"].tolist() == [False]
    result = apply({"v": [None, 1]}, "fill_nulls", {"column": "v", "value": 0})
    assert result["v"].tolist() == [0, 1]


def test_conversion_map_and_invalid_numeric():
    result = apply({"a": ["1", "bad"], "b": ["2", "3"]}, "convert_types",
                   {"columns": ["a", "b"], "dtype": {"a": "integer", "b": "float"}})
    assert clean_records(result) == [{"a": 1, "b": 2}, {"a": None, "b": 3}]


def test_existing_uuid_conversion_and_invalid_value():
    value = "A4B86DC8-BE35-4108-B86B-B9B520420BA3"
    result = apply({"id": [value, None]}, "convert_types", {"columns": "id", "dtype": "uuid"})
    assert clean_records(result) == [{"id": value.lower()}, {"id": None}]
    with pytest.raises(ValueError):
        apply({"id": ["invalid"]}, "convert_types", {"columns": "id", "dtype": "uuid"})


@pytest.mark.parametrize("kind,params", [
    ("add_sequential_index", {"column_name": "v", "start": 0}),
    ("replace_all_headers", {"new_headers": ["duplicate", "duplicate"]}),
    ("replace_all_headers", {"new_headers": ["only_one"]}),
    ("filter_by_list_length", {"column": "v", "length": [float("nan")]}),
    ("filter_by_list_length", {"column": "v", "length": [-1]}),
    ("filter_by_list_length", {"column": "v", "length": [1.5]}),
    ("convert_column_to_list", {"column": "missing"}),
    ("filter_in_range", {"column": "v", "min_value": 2, "max_value": 1}),
])
def test_invalid_parameters_are_errors(kind, params):
    with pytest.raises(ValueError):
        apply({"v": [1, 2], "b": [3, 4]}, kind, params)


@pytest.mark.parametrize("keep_original", [True, False])
def test_normalize_original_column(keep_original):
    result = apply({"s": ["a,b"]}, "normalize_delimited_column", {"column": "s", "keep_original": keep_original})
    assert result["s_lista"].tolist() == ["a", "b"]
    assert ("s" in result.columns) is keep_original


@pytest.mark.parametrize("drop_original", [True, False])
def test_split_rows_original_column(drop_original):
    result = apply({"s": ["a;b"]}, "split_column_into_rows", {
        "column": "s", "delimiter": ";", "new_column_name": "part", "drop_original": drop_original})
    assert result["part"].tolist() == ["a", "b"]
    assert ("s" in result.columns) is not drop_original


def test_split_columns_default_and_duplicates_subset():
    result = apply({"s": ["a:b"]}, "split_column", {"column": "s", "delimiter": ":"})
    assert result.to_dict("list") == {"s": ["a:b"], "s_1": ["a"], "s_2": ["b"]}
    result = apply({"a": [1, 1, 2], "b": ["x", "y", "z"]}, "drop_duplicates", {"subset": ["a"]})
    assert result.to_dict("list") == {"a": [1, 2], "b": ["x", "z"]}


@pytest.mark.parametrize("kind", ["search_in_column", "search_in_table"])
def test_regex_case_and_complement(kind):
    params = {"pattern": "^Al", "case_sensitive": True, "complement": True}
    if kind == "search_in_column":
        params["column"] = "s"
    result = apply({"s": ["Alpha", "ALTO", "beta"]}, kind, params)
    assert result["s"].tolist() == ["ALTO", "beta"]


def test_list_length_complement_and_shift_default():
    result = apply({"v": [[], [1], [1, 2]]}, "filter_by_list_length", {"column": "v", "length": [0, 2], "keep_in": False})
    assert result["v"].tolist() == [[1]]
    result = apply({"g": ["a", "a"], "v": [2, 4]}, "group_by_shift", {"by": "g", "column": "v", "new_column_name": "prev"})
    assert clean_records(result) == [{"g": "a", "v": 2, "prev": None}, {"g": "a", "v": 4, "prev": 2}]


def test_http_order_and_visible_operation_errors(client, csv_source):
    body = {"source": csv_source, "steps": [
        {"type": "rename_columns", "params": {"columns": {"amount": "total"}}},
        {"type": "filter_value", "params": {"column": "total", "value": 0, "operator": "gt"}}]}
    response = client.post("/api/v1/transform/preview", json=body)
    assert response.status_code == 200 and response.json()["preview_data"] == [{"id": 2, "total": 20}]
    for steps in [
        [{"type": "join_sources", "params": {}}],
        [{"type": "add_new_column", "params": {"new_column_name": "x", "expression": "amount +"}}],
        [{"type": "remove_columns", "params": {"columns": "amount"}},
         {"type": "filter_value", "params": {"column": "amount", "value": 0}}],
    ]:
        response = client.post("/api/v1/transform/preview", json={"source": csv_source, "steps": steps})
        assert response.status_code == 400 and response.json()["detail"]
