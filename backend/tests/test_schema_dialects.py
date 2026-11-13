from unittest.mock import Mock

import pandas as pd
import pytest
import sqlalchemy as sa
from sqlalchemy.dialects import mysql, oracle

from etl.load_transport import LoadReconciliationRequired, LoadValidationError
from etl.schema import ColumnSpec, LoadSchemaSpec, coerce_frame
from etl.schema_dialects import column_matches, physical_type, publication_names, publish, storage_values, verify_column_size


@pytest.mark.parametrize("dialect", [mysql.dialect(), oracle.dialect()])
def test_structured_contract_preserves_nullable_boolean_and_rejects_loss(dialect):
    spec = LoadSchemaSpec(grain="una fila", columns=[ColumnSpec(name="active", type="boolean"),
        ColumnSpec(name="label", type="string")])
    data = coerce_frame(pd.DataFrame({"active": [True, None], "label": ["001", "á"]}), spec)
    assert storage_values(data, spec, dialect.name, {"label"})["active"].tolist() == [1, None]
    assert column_matches(physical_type(spec.columns[0], dialect.name), spec.columns[0], dialect.name)
    data.loc[0, "label"] = "x" * 192
    with pytest.raises(LoadValidationError, match="191"):
        storage_values(data, spec, dialect.name, {"label"})
    destination = sa.Table("target", sa.MetaData(), sa.Column("active", sa.Boolean), sa.Column("label", sa.String(8)))
    with pytest.raises(LoadValidationError, match="tamaño"):
        verify_column_size(destination, spec, data)
    if dialect.name == "oracle":
        data.loc[0, "label"] = ""
        with pytest.raises(LoadValidationError, match="NULL"):
            storage_values(data, spec, dialect.name, set())


@pytest.mark.parametrize("known_state", [True, False])
def test_interrupted_oracle_publication_restores_only_when_state_is_known(monkeypatch, known_state):
    stage, backup = publication_names("target")
    metadata = sa.MetaData()
    staged = sa.Table(stage, metadata, sa.Column("id", sa.Integer))
    old = sa.Table("target", metadata, sa.Column("id", sa.Integer))
    connection = Mock(dialect=oracle.dialect())
    inspector = Mock()
    inspector.has_table.side_effect = lambda name: name == backup if known_state else name == "target"
    monkeypatch.setattr("etl.schema_dialects.publication_available", lambda *args: None)
    monkeypatch.setattr("etl.schema_dialects.verify_replace_dependencies", lambda *args: None)
    monkeypatch.setattr(sa, "inspect", lambda _: inspector)
    connection.exec_driver_sql.side_effect = [None, RuntimeError("disconnect"), None]

    if known_state:
        with pytest.raises(LoadValidationError, match="restauró"):
            publish(connection, staged, "target", old, lambda _: {"total_rows": 1})
        assert connection.exec_driver_sql.call_args.args == (f"RENAME {backup} TO target",)
    else:
        with pytest.raises(LoadReconciliationRequired, match=backup):
            publish(connection, staged, "target", old, lambda _: {"total_rows": 1})
        assert connection.exec_driver_sql.call_count == 2
