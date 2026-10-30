"""Adapter contracts against the same disposable PostgreSQL harness as CI."""
import pandas as pd
import pytest

from etl.extractors.db_extractor import DB_Extractor
from etl.loaders.db_loader import DB_Loader

pytestmark = pytest.mark.integration


def test_adapter_queries_metadata_and_writes_can_be_read_back(pg_harness, run_prefix, capsys):
    table = pg_harness.register_table(run_prefix + "_adapter")
    config = pg_harness.config.to_connection_dto()
    with DB_Extractor(**config) as extractor:
        loader = DB_Loader(extractor.engine)
        loader.load_data(pd.DataFrame({"id": [1, 2], "amount": [10, 20]}), table, if_exists="replace")
        assert extractor.execute_query(f'SELECT SUM(amount) AS total FROM "{table}"').total.iloc[0] == 30
        assert extractor.get_table(table).id.tolist() == [1, 2]
        info = extractor.get_database_info()
        assert table in info["tables"] and info["database_name"] == config["database"]
        assert info["tables_count"] == len(info["tables"])
        schema = extractor.get_table_schema(table)
        assert schema["columns"] == ["id", "amount"]
        loader.check_connection()
        loader.verify_table_load(table, show_sample=1)
        assert table in capsys.readouterr().out
        loader.load_data(pd.DataFrame({"id": [3], "amount": [5]}), table, if_exists="append")
        assert sorted(extractor.get_table(table).id.tolist()) == [1, 2, 3]
        with pytest.raises(pd.errors.DatabaseError):
            extractor.execute_query('SELECT * FROM "' + run_prefix + '_absent"')
        assert extractor.check_connection_status()
