"""Shared SQL preparation, verification, and cleanup harness for Phase 07 integration & E2E real tests.

Single source of truth used by both pytest (`backend/tests/integration/`) and Playwright (`frontend/e2e/real/`).
Never logs or prints database passwords. Enforces `etl_e2e_` table prefix and explicit table tracking.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping
from urllib.parse import quote_plus

import pandas as pd
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from etl.json_utils import clean_value

TABLE_NAME_RE = re.compile(r"^etl_e2e_[a-z0-9_]+$")
REQUIRED_ENV_KEYS = (
    "ETL_TEST_DB_TYPE",
    "ETL_TEST_DB_HOST",
    "ETL_TEST_DB_PORT",
    "ETL_TEST_DB_NAME",
    "ETL_TEST_DB_USER",
    "ETL_TEST_DB_PASSWORD",
)


def assert_e2e_table_name(table_name: str) -> str:
    if not isinstance(table_name, str) or not TABLE_NAME_RE.fullmatch(table_name):
        raise ValueError(
            f"Invalid integration table name '{table_name}'. Must match ^etl_e2e_[a-z0-9_]+$."
        )
    return table_name


def parse_dotenv_file(dotenv_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not dotenv_path.is_file():
        return values
    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
            val = val[1:-1]
        values[key] = val
    return values


@dataclass(frozen=True)
class TestDbConfig:
    db_type: str
    host: str
    port: int
    database: str
    user: str
    password: str = field(repr=False)

    def to_connection_dto(self) -> dict[str, Any]:
        return {
            "db_type": self.db_type,
            "host": self.host,
            "port": self.port,
            "database": self.database,
            "user": self.user,
            "password": self.password,
        }

    def to_public_summary(self) -> dict[str, Any]:
        return {
            "db_type": self.db_type,
            "host": self.host,
            "port": self.port,
            "database": self.database,
            "user": self.user,
        }

    def sqlalchemy_url(self) -> str:
        if self.db_type != "postgresql":
            raise ValueError(f"Only postgresql is supported by this harness, got '{self.db_type}'.")
        user_enc = quote_plus(self.user)
        pwd_enc = quote_plus(self.password)
        return f"postgresql+psycopg2://{user_enc}:{pwd_enc}@{self.host}:{self.port}/{self.database}"


def load_test_db_config(
    env: Mapping[str, str] | None = None,
    *,
    allow_dotenv: bool = True,
    dotenv_path: Path | None = None,
) -> TestDbConfig:
    source_env: dict[str, str] = {}
    actual_env = os.environ if env is None else env
    if allow_dotenv and actual_env.get("ETL_IGNORE_DOTENV") != "1":
        source_env.update(parse_dotenv_file(dotenv_path or (ROOT / ".env.local")))
    for key in REQUIRED_ENV_KEYS:
        if key in actual_env and actual_env[key] is not None:
            source_env[key] = str(actual_env[key])

    missing = [key for key in REQUIRED_ENV_KEYS if key not in source_env or (key != "ETL_TEST_DB_PASSWORD" and not source_env[key].strip())]
    if missing:
        raise RuntimeError(
            "Explicit test database configuration is required for real integration tests. "
            f"Missing variables: {', '.join(missing)}"
        )

    db_type = source_env["ETL_TEST_DB_TYPE"].strip().lower()
    database = source_env["ETL_TEST_DB_NAME"].strip()
    if not database.startswith("etl_test"):
        raise RuntimeError(
            f"Refusing to run destructive integration tests against database '{database}'. "
            "Database name must start with 'etl_test'."
        )

    try:
        port = int(source_env["ETL_TEST_DB_PORT"].strip())
    except ValueError as exc:
        raise RuntimeError("ETL_TEST_DB_PORT must be a valid integer.") from exc

    return TestDbConfig(
        db_type=db_type,
        host=source_env["ETL_TEST_DB_HOST"].strip(),
        port=port,
        database=database,
        user=source_env["ETL_TEST_DB_USER"].strip(),
        password=source_env["ETL_TEST_DB_PASSWORD"],
    )


@dataclass
class PostgresTestHarness:
    config: TestDbConfig
    tracked_tables: list[str] = field(default_factory=list)
    _engine: Engine | None = field(default=None, init=False, repr=False)

    @property
    def engine(self) -> Engine:
        if self._engine is None:
            self._engine = create_engine(
                self.config.sqlalchemy_url(),
                connect_args={"client_encoding": "utf8"},
            )
        return self._engine

    def register_table(self, table_name: str) -> str:
        validated = assert_e2e_table_name(table_name)
        if validated not in self.tracked_tables:
            self.tracked_tables.append(validated)
        return validated

    def check_connectivity(self) -> dict[str, Any]:
        with self.engine.connect() as conn:
            val = conn.execute(text("SELECT 1")).scalar()
            assert val == 1
        return {"status": "ok", **self.config.to_public_summary()}

    def seed_table(self, table_name: str, rows: list[dict[str, Any]], if_exists: str = "replace") -> None:
        validated = self.register_table(table_name)
        df = pd.DataFrame(rows)
        df.to_sql(validated, self.engine, if_exists=if_exists, index=False)

    def inspect_table(self, table_name: str) -> dict[str, Any]:
        validated = assert_e2e_table_name(table_name)
        with self.engine.connect() as conn:
            inspector = inspect(conn)
            exists = inspector.has_table(validated)
            if not exists:
                return {
                    "exists": False,
                    "table_name": validated,
                    "count": 0,
                    "columns": [],
                    "rows": [],
                    "min_fecha": None,
                    "max_fecha": None,
                }
            columns_info = inspector.get_columns(validated)
            columns = [col["name"] for col in columns_info]
            count = int(conn.execute(text(f"SELECT COUNT(*) FROM {validated}")).scalar() or 0)
            order_clause = f" ORDER BY {columns[0]}" if columns else ""
            df = pd.read_sql(text(f"SELECT * FROM {validated}{order_clause} LIMIT 50"), conn)
            rows = [
                {str(col): clean_value(val) for col, val in row.items()}
                for _, row in df.iterrows()
            ]
            min_fecha = None
            max_fecha = None
            if "fecha" in columns and count > 0:
                bounds = conn.execute(
                    text(f"SELECT MIN(CAST(fecha AS TEXT)), MAX(CAST(fecha AS TEXT)) FROM {validated}")
                ).one()
                min_fecha = str(bounds[0])[:10] if bounds[0] is not None else None
                max_fecha = str(bounds[1])[:10] if bounds[1] is not None else None

            return {
                "exists": True,
                "table_name": validated,
                "count": count,
                "columns": columns,
                "rows": rows,
                "min_fecha": min_fecha,
                "max_fecha": max_fecha,
            }

    def drop_tables(self, tables: list[str] | None = None) -> list[str]:
        targets = list(tables) if tables is not None else list(reversed(self.tracked_tables))
        dropped: list[str] = []
        if not targets:
            return dropped
        with self.engine.begin() as conn:
            for tbl in targets:
                validated = assert_e2e_table_name(tbl)
                conn.execute(text(f"DROP TABLE IF EXISTS {validated} CASCADE"))
                dropped.append(validated)
        return dropped

    def close(self) -> None:
        if self._engine is not None:
            self._engine.dispose()
            self._engine = None


def _main() -> int:
    parser = argparse.ArgumentParser(description="PostgreSQL integration test harness CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("check-config")

    seed_parser = sub.add_parser("seed-table")
    seed_parser.add_argument("--table", required=True)
    seed_parser.add_argument("--rows-json", required=True)

    inspect_parser = sub.add_parser("inspect-table")
    inspect_parser.add_argument("--table", required=True)

    drop_parser = sub.add_parser("drop-tables")
    drop_parser.add_argument("--tables", required=True, help="Comma-separated etl_e2e_* table names")

    args = parser.parse_args()
    config = load_test_db_config()
    harness = PostgresTestHarness(config)
    try:
        if args.command == "check-config":
            result = harness.check_connectivity()
            print(json.dumps(result))
        elif args.command == "seed-table":
            rows = json.loads(args.rows_json)
            harness.seed_table(args.table, rows)
            print(json.dumps({"status": "ok", "table": args.table, "seeded_rows": len(rows)}))
        elif args.command == "inspect-table":
            info = harness.inspect_table(args.table)
            print(json.dumps(info))
        elif args.command == "drop-tables":
            tables = [t.strip() for t in args.tables.split(",") if t.strip()]
            dropped = harness.drop_tables(tables)
            print(json.dumps({"status": "ok", "dropped": dropped}))
        return 0
    finally:
        harness.close()


if __name__ == "__main__":
    sys.exit(_main())
