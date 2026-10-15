"""JSON value policy shared by HTTP previews and the local agent."""
import datetime
import math
from typing import Any

import numpy as np
import pandas as pd


def clean_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): clean_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean_value(item) for item in value]
    if isinstance(value, np.ndarray):
        return clean_value(value.tolist())
    if value is None or value is pd.NA or value is pd.NaT:
        return None
    if isinstance(value, np.datetime64):
        return None if np.isnat(value) else pd.Timestamp(value).isoformat()
    if isinstance(value, np.floating):
        # longdouble.item() can remain a numpy scalar; avoid recursive item().
        return clean_value(float(value))
    if isinstance(value, np.generic):
        return clean_value(value.item())
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
        return value.isoformat()
    if pd.isna(value):
        return None
    return value
