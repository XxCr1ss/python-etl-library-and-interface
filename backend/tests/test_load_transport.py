"""Lossless write transport: values and dtypes, malformed input, real byte limits."""
import copy
import datetime as dt
import json
from decimal import Decimal

import numpy as np
import pandas as pd
import pytest
from pandas.testing import assert_frame_equal

from etl.load_transport import LoadValidationError, decode_dataset, encode_dataset, serialize_command


@pytest.mark.parametrize("series", [
    pd.Series([2**63 - 1, None], dtype="Int64"),
    pd.Series([2**64 - 1, 0], dtype="uint64"),
    pd.Series([0, -12], dtype="int8"),
    pd.Series([1.25, np.nan], dtype="float32"),
    pd.Series([1.25, None], dtype="Float64"),
    pd.Series([True, None], dtype="boolean"),
    pd.Series([True, False], dtype="bool"),
    pd.Series(["Bogotá", None], dtype="string"),
    pd.Series(["Bogotá", None], dtype="str"),
    pd.Series([None, None], dtype="object"),
    pd.Series([pd.NA, pd.NA], dtype="Int64"),
    pd.Series([Decimal("1234567890.1234567890123"), None], dtype="object"),
    pd.Series([dt.date(2026, 10, 21), None], dtype="object"),
    pd.Series([dt.time(13, 20, 15, 123456), None], dtype="object"),
    pd.Series([dt.datetime(2026, 10, 21, 13, 20), None], dtype="object"),
    pd.Series([42, None], dtype="object"),
    pd.Series([True, None], dtype="object"),
    pd.Series(["2026-01-01", None], dtype="object"),
    pd.Series(pd.to_datetime(["2026-10-21T12:13:14.123456789", None])).astype("datetime64[ns]"),
    pd.Series(pd.to_datetime(["2026-10-21T12:00:00Z", None], utc=True)).dt.tz_convert("America/Bogota"),
    pd.Series([], dtype="Int64"),
    pd.Series([], dtype="object"),
])
def test_json_roundtrip_preserves_loader_input(series):
    frame = pd.DataFrame({"col": series})
    decoded = decode_dataset(json.loads(serialize_command(encode_dataset(frame))))
    assert_frame_equal(frame, decoded)


@pytest.mark.parametrize("frame", [
    pd.DataFrame({"a": [[1, 2]]}), pd.DataFrame({"a": [{"secret": "value"}]}),
    pd.DataFrame({"a": pd.Series([1, "x"], dtype="object")}),
    pd.DataFrame({"a": [np.inf]}), pd.DataFrame({"a": [Decimal("Infinity")]}),
    pd.DataFrame({"a": pd.Series([dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)], dtype="object")}),
    pd.DataFrame({"a": pd.Categorical(["x"])}), pd.DataFrame([[1, 2]], columns=["a", "a"]),
    pd.DataFrame({1: [2]}), pd.DataFrame(),
])
def test_unsupported_values_fail_without_coercion(frame):
    with pytest.raises(LoadValidationError):
        encode_dataset(frame)


def test_byte_and_row_limits_include_unicode_and_envelope():
    frame = pd.DataFrame({"nombre": ["Bogotá"]})
    data = encode_dataset(frame)
    size = len(serialize_command(data).encode("utf-8"))
    assert encode_dataset(frame, size) == data
    with pytest.raises(LoadValidationError):
        encode_dataset(frame, size - 1)
    with pytest.raises(LoadValidationError):
        encode_dataset(pd.concat([frame, frame]), max_rows=1)
    with pytest.raises(LoadValidationError):
        serialize_command({"request_id": "a" * 32, "payload": data}, size)


@pytest.mark.parametrize("mutate", [
    lambda d: d.update(row_count=True), lambda d: d.update(row_count=2),
    lambda d: d["rows"].append(["1"]), lambda d: d["rows"][0].append("extra"),
    lambda d: d["columns"][0].update(pandas_dtype="category"),
    lambda d: d["columns"][0].update(logical_type="__import__"),
    lambda d: d["columns"].append(d["columns"][0]),
    lambda d: d["rows"][0].__setitem__(0, True),
    lambda d: d["rows"][0].__setitem__(0, "9999999999999999999999999999999"),
    lambda d: d["rows"][0].__setitem__(0, None),
])
def test_untrusted_lot_rejected(mutate):
    data = copy.deepcopy(encode_dataset(pd.DataFrame({"id": [1]})))
    mutate(data)
    with pytest.raises(LoadValidationError):
        decode_dataset(data)
