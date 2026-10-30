from contextlib import nullcontext
from types import SimpleNamespace

import pytest

from etl.extractors import db_extractor as module


@pytest.mark.parametrize("method,args", [
    ("execute_query", ("SELECT 1",)), ("get_table", ("example",)),
    ("get_table_names", ()), ("get_table_schema", ("example",)),
    ("get_database_info", ()), ("execute_procedure", ("example",)),
])
def test_disconnected_adapter_reports_explicit_error(method, args):
    extractor = module.DB_Extractor(db_type="postgresql", host="localhost", database="synthetic", user="etl", password="")
    with pytest.raises(ValueError, match="conexión activa"):
        getattr(extractor, method)(*args)


@pytest.mark.parametrize("db_type,driver,timeout", [("mysql", "mysql+pymysql", "connect_timeout"), ("oracle", "oracle+oracledb", "tcp_connect_timeout")])
def test_driver_configuration_preserves_credentials_and_connection_timeout(monkeypatch, db_type, driver, timeout):
    seen, disposed = [], []
    engine = SimpleNamespace(connect=lambda: nullcontext(), dispose=lambda: disposed.append(True))
    def create(url, **kwargs):
        seen.append((url, kwargs))
        return engine
    monkeypatch.setattr(module, "create_engine", create)
    with module.DB_Extractor(db_type=db_type, host="localhost", database="synthetic", user="u@name", password="p/@ss", service_name="service", connect_timeout=3):
        pass
    url, options = seen[0]
    assert url.drivername == driver and url.username == "u@name" and url.password == "p/@ss"
    assert options["connect_args"][timeout] == 3
    assert disposed == [True]


@pytest.mark.parametrize("service", [None, "invalid/service"])
def test_oracle_requires_a_valid_service_before_connecting(service):
    extractor = module.DB_Extractor(db_type="oracle", database="synthetic", user="etl", password="", service_name=service)
    with pytest.raises(ValueError, match="[Ss]ervice"):
        extractor.connect()


@pytest.mark.parametrize("db_type,params,statement", [
    ("postgresql", {"amount": 7}, "CALL recalculate(:amount)"),
    ("mysql", {"amount": 7}, "CALL recalculate(%s)"),
    ("oracle", None, "BEGIN recalculate; END;"),
])
@pytest.mark.parametrize("returns_rows", [False, True])
def test_procedure_execution_binds_parameters_and_returns_only_result_rows(db_type, params, statement, returns_rows):
    calls = []
    result = SimpleNamespace(returns_rows=returns_rows, fetchall=lambda: [(7,)], keys=lambda: ["amount"])
    connection = SimpleNamespace(execute=lambda *args: calls.append(args) or result)
    extractor = module.DB_Extractor(db_type=db_type, database="synthetic", user="etl", password="", service_name="service")
    extractor.engine = SimpleNamespace(connect=lambda: nullcontext(connection))
    frame = extractor.execute_procedure("recalculate", params)
    assert str(calls[0][0]) == statement
    assert calls[0][1:] == ((params,) if params else ())
    assert frame.to_dict("records") == ([{"amount": 7}] if returns_rows else [])


def test_driver_decode_failure_is_readable_and_redacts_credentials(monkeypatch, capsys):
    raw = b"authentication password secret failed: \xf3"
    def fail(*args, **kwargs):
        raise UnicodeDecodeError("utf-8", raw, len(raw) - 1, len(raw), "invalid")
    monkeypatch.setattr(module, "create_engine", fail)
    extractor = module.DB_Extractor(db_type="postgresql", database="synthetic", user="etl", password="secret")
    with pytest.raises(ConnectionError) as exc:
        extractor.connect()
    assert "secret" not in str(exc.value) + capsys.readouterr().out
    assert "authentication" in str(exc.value)
