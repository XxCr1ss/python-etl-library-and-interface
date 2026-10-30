"""Direct core contracts not exercised by the HTTP recipe dispatcher."""
import operator
from decimal import Decimal

import pandas as pd
import pytest
from pandas.testing import assert_frame_equal

from etl.transformer.advanced_data_transforms import TransformOperations as Advanced
from etl.transformer.basics_data_transformer import BasicsTransformOperations as Basic
from etl.transformer.convert import ConvertOperations as Convert
from etl.transformer.expresions import DataExpresion as Expression
from etl.transformer.selecs import DataSelect as Select


@pytest.fixture
def frame():
    return pd.DataFrame({"id": [1, 2, 3], "value": [3, 1, 2], "text": ["a.b", "alpha", None]})


def test_custom_column_and_ordering_contracts(frame):
    original = frame.copy(deep=True)
    changed = Advanced.apply_to_column(frame.copy(), "value", lambda value: value * 10)
    assert changed.value.tolist() == [30, 10, 20]
    sorted_frame = Advanced.sort_by(frame, ["value", "id"], [False, True])
    assert sorted_frame.id.tolist() == [1, 3, 2]
    assert_frame_equal(frame, original)
    assert Basic.sort_columns(frame, "value").id.tolist() == [2, 3, 1]


@pytest.mark.parametrize("method,args,expected", [
    (Select.filter_by_operation, ("value", 2, operator.ge), [1, 3]),
    (Select.filter_equal, ("value", [1, 3]), [1, 2]),
    (Select.filter_not_equal, ("value", [1, 3]), [3]),
    (Select.filter_contains, ("text", "."), [1]),
    (Select.filter_in_list, ("value", {1, 3}), [1, 2]),
    (Select.filter_is_null, ("text",), [3]),
    (Select.select_not_none, ("text",), [1, 2]),
])
@pytest.mark.parametrize("complement", [False, True])
def test_filters_return_expected_rows_without_mutating_input(frame, method, args, expected, complement):
    original = frame.copy(deep=True)
    result = method(frame, *args, complement=complement)
    assert result.id.tolist() == ([i for i in [1, 2, 3] if i not in expected] if complement else expected)
    assert_frame_equal(frame, original)


@pytest.mark.parametrize("complement,expected", [(False, ["text", "id"]), (True, ["value"])])
def test_column_selection_preserves_requested_order(frame, complement, expected):
    result = Select.select_columns(frame, "text", "id", complement=complement)
    assert result.columns.tolist() == expected
    result.iloc[0, 0] = 99 if complement else "changed"
    assert frame.text.iloc[0] == "a.b"
    assert frame.value.iloc[0] == 3


@pytest.mark.parametrize("method,args,error", [
    (Advanced.apply_to_column, (None, "x", str), TypeError),
    (Advanced.apply_to_column, (pd.DataFrame(), 1, str), TypeError),
    (Advanced.apply_to_column, (pd.DataFrame(), "x", None), TypeError),
    (Advanced.sort_by, (None, "x"), TypeError),
    (Advanced.sort_by, (pd.DataFrame(), 1), TypeError),
    (Advanced.sort_by, (pd.DataFrame(), "x", "ascending"), TypeError),
    (Advanced.sort_by, (pd.DataFrame(), "x", True, "all"), TypeError),
    (Convert.convert_column_type, (None, "x", "integer"), TypeError),
    (Convert.convert_column_type, (pd.DataFrame(), 1, "integer"), TypeError),
    (Convert.convert_column_type, (pd.DataFrame(), "x", 1), TypeError),
    (Convert.convert_column_type, (pd.DataFrame(), "missing", "integer"), ValueError),
    (Convert.convert_to_ordered_category, (pd.DataFrame(), 1, []), TypeError),
    (Convert.convert_to_ordered_category, (pd.DataFrame(), "x", "a"), TypeError),
    (Convert.convert_to_ordered_category, (pd.DataFrame(), "x", [], "yes"), TypeError),
    (Convert.split_string_column, (pd.DataFrame(), "x", 1), TypeError),
    (Convert.split_string_column, (pd.DataFrame(), "x", ";", "names"), TypeError),
    (Expression.search_in_column, (pd.DataFrame(), 1, "a"), TypeError),
    (Expression.search_in_column, (pd.DataFrame(), "x", 1), TypeError),
    (Expression.search_in_column, (pd.DataFrame(), "x", "a", -2), ValueError),
    (Expression.search_in_table, (pd.DataFrame(), 1), TypeError),
    (Expression.search_in_table, (pd.DataFrame(), "a", 0, "yes"), TypeError),
    (Expression.split_column_into_rows, (None, "x", ";"), TypeError),
    (Expression.split_column_into_rows, (pd.DataFrame(), "missing", ";"), ValueError),
    (Expression.filter_by_value, (pd.DataFrame({"x": [1]}), "x", 1, "invalid"), ValueError),
    (Select.filter_by_operation, (pd.DataFrame({"x": [1]}), "x", 1, None), TypeError),
    (Basic.add_new_column, (None, "x", lambda row: 1), ValueError),
    (Basic.add_new_column, (pd.DataFrame(), "x", "not callable"), ValueError),
    (Basic.sort_columns, (pd.DataFrame(), "missing"), ValueError),
    (Basic.explode_column_list, (pd.DataFrame({"x": [1]}), "x"), ValueError),
])
def test_public_core_rejects_invalid_arguments(method, args, error):
    with pytest.raises(error):
        method(*args)


@pytest.mark.parametrize("method,args", [
    (Select.filter_equal, (1,)), (Select.filter_not_equal, (1,)),
    (Select.filter_contains, ("x",)), (Select.filter_in_list, ([1],)),
    (Select.filter_is_null, ()), (Select.select_not_none, ()),
    (Select.select_columns, ()), (Convert.clean_numeric_columns, ()),
    (Convert.boolean_to_binary, ()), (Convert.fill_nulls, (0,)),
    (Convert.clean_date_format, ()), (Convert.convert_to_ordered_category, (["a"],)),
    (Convert.split_string_column, (";",)),
    (Basic.get_column_metrics, ()),
])
def test_missing_column_is_explicit_and_does_not_alter_input(frame, method, args):
    original = frame.copy(deep=True)
    with pytest.raises((ValueError, KeyError)):
        method(frame, "missing", *args)
    assert_frame_equal(frame, original)


def test_typed_conversion_preserves_nullable_values_and_precision():
    result = Convert.convert_column_type(pd.DataFrame({"number": ["12.30", None], "flag": ["true", None], "code": ["001", None]}),
                                         ["number", "flag", "code"], {"number": "decimal", "flag": "boolean", "code": "text"})
    assert result.number.iloc[0] == Decimal("12.30")
    assert bool(result.flag.iloc[0]) is True
    assert result.code.iloc[0] == "001"
    assert result.iloc[1].isna().all()
    with pytest.raises(ValueError, match="precisión"):
        Convert.convert_column_type(pd.DataFrame({"v": ["1.5"]}), "v", "integer")


def test_clean_split_and_category_contracts():
    numeric = Convert.clean_numeric_columns(pd.DataFrame({"v": ["$12.50", "-2", "n/a"]}), "v")
    assert numeric.v.iloc[:2].tolist() == [12.5, -2]
    assert pd.isna(numeric.v.iloc[2])
    with pytest.warns(pd.errors.Pandas4Warning, match="Categorical"):
        category = Convert.convert_to_ordered_category(pd.DataFrame({"v": ["high", "low", "unknown"]}), "v", ["low", "high"])
    assert category.v.cat.categories.tolist() == ["low", "high"]
    assert category.v.cat.ordered and pd.isna(category.v.iloc[2])
    source = pd.DataFrame({"v": ["a;b", "c;d"]})
    result = Convert.split_string_column(source, "v", ";", ["first", "second"])
    assert result[["first", "second"]].to_dict("list") == {"first": ["a", "c"], "second": ["b", "d"]}
    assert source.columns.tolist() == ["v"]
    with pytest.raises(ValueError, match="número de nombres"):
        Convert.split_string_column(source, "v", ";", ["only"])


def test_summary_and_custom_operations_have_independent_oracles(frame):
    summary = Basic.quick_summary_report(frame, "value", "sales")
    assert summary.to_dict("records") == [{"tipo_analisis": "sales", "promedio_costo": 2.0, "total_servicios": 3, "costo_total": 6}]
    assert Basic.add_new_column(frame.copy(), "double", lambda row: row.value * 2).double.tolist() == [6, 2, 4]
    assert Basic.transform_column(frame.copy(), "value", lambda value: value + 1).value.tolist() == [4, 2, 3]
    assert Basic.filter_by_condition(frame, lambda row: row.value > 1).id.tolist() == [1, 3]


@pytest.mark.parametrize("include_all", [False, True])
def test_data_profiling_returns_statistics_counts_missing_values_and_types(include_all):
    frame = pd.DataFrame({"amount": [1.0, 3.0, None], "category": ["a", "a", "b"]})
    description = Expression.describe_data(frame, include_all=include_all)
    assert description.loc["count", "amount"] == 2
    assert description.loc["mean", "amount"] == 2
    assert Expression.value_counts_table(frame, "category", show=1).to_dict() == {"a": 2}
    assert Expression.value_counts_table(frame, "category", normalize=True).loc["a"] == pytest.approx(2 / 3)
    assert Expression.show_missing_data(frame, show_table=include_all).to_dict() == {"amount": 1, "category": 0}
    assert Expression.get_column_types(frame).to_dict() == frame.dtypes.to_dict()
    with pytest.raises(ValueError, match="no existe"):
        Expression.value_counts_table(frame, "missing")


@pytest.mark.parametrize("method,args", [
    (Advanced.left_join, (pd.DataFrame(), "id")),
    (Advanced.right_join, (pd.DataFrame(), "id")),
    (Advanced.inner_join, (pd.DataFrame(), "id")),
    (Advanced.outer_join, (pd.DataFrame(), "id")),
    (Advanced.drop_duplicates, ()), (Advanced.replace_values, ("value", {1: 2})),
    (Advanced.union_all, (pd.DataFrame(),)),
    (Advanced.group_by_sum, ("id", "value")),
    (Advanced.group_by_count, ("id",)),
    (Advanced.group_by_mean, ("id", "value")),
    (Advanced.group_by_shift, ("id", "value", "lag")),
    (Advanced.filter_by_list_length, ("value", 1)),
])
def test_advanced_operations_reject_invalid_dataframes(method, args):
    with pytest.raises(TypeError):
        method(None, *args)


@pytest.mark.parametrize("args", [(1, "value", "lag"), ("id", 1, "lag"), ("id", "value", 1), ("id", "value", "lag", "one")])
def test_group_shift_rejects_invalid_key_column_and_period_types(frame, args):
    with pytest.raises(TypeError):
        Advanced.group_by_shift(frame, *args)


@pytest.mark.parametrize("length,error", [(None, ValueError), ("one", TypeError)])
def test_list_length_filter_requires_explicit_lengths(length, error):
    with pytest.raises(error):
        Advanced.filter_by_list_length(pd.DataFrame({"items": [[1], []]}), "items", length)
