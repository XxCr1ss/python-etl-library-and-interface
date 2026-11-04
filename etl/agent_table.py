"""Temporal metadata for the agent's backward-compatible inferred table response."""
from datetime import date, time

import pandas as pd


def temporal_columns(frame):
    columns = {}
    for name, series in frame.items():
        if pd.api.types.is_datetime64_any_dtype(series.dtype):
            columns[name] = str(series.dtype)
        elif series.dtype == "object":
            kinds = {type(value) for value in series.dropna()}
            if kinds == {date}:
                columns[name] = "date"
            elif kinds == {time}:
                columns[name] = "time"
    return columns


def table_from_agent(data):
    records = data.get("records", [])
    frame = pd.DataFrame(records, columns=data.get("columns"))
    for name, kind in data.get("temporal_columns", {}).items():
        values = [row.get(name) for row in records]
        if kind in {"date", "time"}:
            parse = date.fromisoformat if kind == "date" else time.fromisoformat
            frame[name] = pd.Series([parse(value) if value is not None else None for value in values], dtype="object")
        elif kind.startswith("datetime64["):
            parsed = pd.to_datetime(values, format="ISO8601", utc=", " in kind)
            frame[name] = parsed.astype(kind) if parsed.tz is None else parsed.tz_convert(kind.split(", ", 1)[1][:-1]).astype(kind)
    return frame
