import datetime as dt
from unittest.mock import Mock

import pytest
from sqlalchemy import DateTime, column, literal, select
from sqlalchemy.dialects import mysql, oracle
from sqlalchemy.exc import DBAPIError

from etl.warehouse.dialects import (calendar_source, completed_years, decimal_type, duration_seconds,
                                     set_analysis_timezone, week_start)
from etl.warehouse.settings import WarehouseError


@pytest.mark.parametrize(("dialect", "duration", "age", "week", "numeric"), [
    (mysql.dialect(), "timestampdiff(MICROSECOND", "timestampdiff(YEAR", "weekday(", "DECIMAL(65, 24)"),
    (oracle.dialect(), "EXTRACT(day FROM", "EXTRACT(year FROM", "trunc(", "NUMERIC"),
])
def test_advanced_sql_compiles_on_each_dialect(dialect, duration, age, week, numeric):
    start, end = column("started", DateTime()), column("ended", DateTime())
    sql = str(select(duration_seconds(start, end, "datetime", dialect.name), completed_years(start, end, dialect.name),
                     week_start(end, dialect.name), literal(1).cast(decimal_type(dialect.name))).compile(dialect=dialect))
    assert all(part in sql for part in (duration, age, week, numeric))
    calendar = calendar_source(["2020-12-28", "2021-01-04"], dialect.name)
    compiled = select(calendar.c.d0).compile(dialect=dialect)
    assert "UNION ALL" in str(compiled)
    assert "2020-12-28" in compiled.params.values()


@pytest.mark.parametrize("engine", ["mysql", "oracle"])
def test_unknown_database_timezone_has_actionable_error(engine):
    connection = Mock()
    connection.dialect.name = engine
    failure = DBAPIError(None, None, ValueError(), False)
    connection.execute.side_effect = failure
    connection.exec_driver_sql.side_effect = failure
    with pytest.raises(WarehouseError, match="zona horaria"):
        set_analysis_timezone(connection, "America/Bogota")
