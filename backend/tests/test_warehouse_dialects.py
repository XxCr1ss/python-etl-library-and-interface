from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from sqlalchemy import DateTime, column, literal, select
from sqlalchemy.dialects import mysql, oracle
from sqlalchemy.exc import DBAPIError

from etl.warehouse.dialects import (calendar_source, completed_years, decimal_type, duration_seconds,
                                     set_analysis_timezone, week_start)
from etl.warehouse.execution import retry_catalog_read
from etl.warehouse.settings import WarehouseError


@pytest.mark.parametrize(("dialect", "duration", "age", "week", "numeric"), [
    (mysql.dialect(), "timestampdiff(MICROSECOND", "timestampdiff(YEAR", "weekday(", "DECIMAL(65, 24)"),
    (oracle.dialect(), "EXTRACT(day FROM", "EXTRACT(year FROM", "trunc(", " AS NUMBER)"),
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


def test_mysql_timestamp_duration_uses_absolute_instants():
    start, end = column("started", mysql.TIMESTAMP()), column("ended", mysql.TIMESTAMP())
    assert "unix_timestamp(ended) - unix_timestamp(started)" in str(duration_seconds(start, end, "datetime", "mysql"))
    with pytest.raises(WarehouseError, match="dos instantes"):
        duration_seconds(start, column("local_time", mysql.DATETIME()), "datetime", "mysql")


@pytest.mark.parametrize("fails", [False, True])
def test_oracle_snapshot_restarts_after_ddl(monkeypatch, fails):
    @contextmanager
    def snapshot(*args):
        yield object(), {}

    monkeypatch.setattr("etl.warehouse.execution.read_session", snapshot)
    pause = Mock()
    monkeypatch.setattr("etl.warehouse.execution.time.sleep", pause)
    error = DBAPIError(None, None, ValueError(SimpleNamespace(code=1466)), False)
    query = Mock(side_effect=error if fails else [error, "fresh snapshot"])
    engine = Mock(dialect=oracle.dialect())
    budget = Mock()
    budget.remaining_ms.return_value = 250
    if fails:
        with pytest.raises(WarehouseError) as exc:
            retry_catalog_read(engine, budget, query)
        assert exc.value.code == "catalog_changed"
        assert query.call_count == 5
    else:
        assert retry_catalog_read(engine, budget, query) == "fresh snapshot"
        pause.assert_called_once_with(0.25)
