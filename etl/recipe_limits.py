"""Predict expansion before materializing joins, unions and exploded lists."""
import pandas as pd
from .load_transport import LoadValidationError


def join_budget(left, right, on, how, maximum):
    if isinstance(on, tuple):
        left_keys, right_keys = [on[0]], [on[1]]
    else:
        left_keys = right_keys = [on] if isinstance(on, str) else on
    labels = [f"key_{i}" for i in range(len(left_keys))]
    def counts(frame, keys, label):
        values = frame[keys].copy()
        values.columns = labels
        return values.groupby(labels, dropna=False, observed=True).size().rename(label).reset_index()
    grouped = counts(left, left_keys, "left_n").merge(counts(right, right_keys, "right_n"), on=labels, how="outer")
    l, r = grouped["left_n"].fillna(0), grouped["right_n"].fillna(0)
    predicted = l * r if how == "inner" else l * r.clip(lower=1) if how == "left" else r * l.clip(lower=1) if how == "right" else (l * r).where((l > 0) & (r > 0), l + r)
    if int(predicted.sum()) > maximum:
        raise LoadValidationError("El cruce supera el presupuesto de filas antes de materializarse; revisa duplicados y claves.")


def expansion_budget(frame, step_type, params, maximum):
    if maximum is None:
        return
    if len(frame) > maximum:
        raise LoadValidationError("El resultado intermedio supera el presupuesto de filas.")
    if step_type == "explode_column_list":
        total = sum(max(1, len(v)) if isinstance(v, (list, tuple)) else 1 for v in frame[params["column"]])
    elif step_type in {"split_column_into_rows", "normalize_delimited_column", "convert_column_to_list"}:
        delimiter = params.get("delimiter", "," if step_type == "normalize_delimited_column" else ";")
        if not isinstance(delimiter, str) or not delimiter:
            raise LoadValidationError("La expansión requiere un delimitador no vacío.")
        total = sum(v.count(delimiter) + 1 if isinstance(v, str) else 1 for v in frame[params["column"]])
    else:
        return
    if total > maximum:
        raise LoadValidationError("La expansión supera el presupuesto de filas antes de materializarse.")
