import { execFileSync } from "node:child_process";
import path from "node:path";
import { REPO_ROOT, requireRealTestDbConfig, resolvePythonExecutable } from "./env";

export interface InspectedTable {
  exists: boolean;
  table_name: string;
  count: number;
  columns: string[];
  rows: Record<string, unknown>[];
  min_fecha: string | null;
  max_fecha: string | null;
}

const HARNESS_SCRIPT = path.join(REPO_ROOT, "backend", "tests", "integration", "sql_harness.py");

function runSqlHarness(args: string[]): string {
  const cfg = requireRealTestDbConfig();
  const pythonExe = resolvePythonExecutable();
  const output = execFileSync(pythonExe, [HARNESS_SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    env: {
      ...process.env,
      PYTHONUTF8: "1",
      ETL_TEST_DB_TYPE: cfg.db_type,
      ETL_TEST_DB_HOST: cfg.host,
      ETL_TEST_DB_PORT: String(cfg.port),
      ETL_TEST_DB_NAME: cfg.database,
      ETL_TEST_DB_USER: cfg.user,
      ETL_TEST_DB_PASSWORD: cfg.password,
    },
  });
  return output.trim();
}

export function checkDbConnectivity(): Record<string, unknown> {
  return JSON.parse(runSqlHarness(["check-config"])) as Record<string, unknown>;
}

export function seedTable(tableName: string, rows: Record<string, unknown>[]): void {
  runSqlHarness(["seed-table", "--table", tableName, "--rows-json", JSON.stringify(rows)]);
}

export function seedDiagram(prefix: string): { parent: string; child: string } {
  return JSON.parse(runSqlHarness(["seed-diagram", "--prefix", prefix]));
}

export function inspectTable(tableName: string): InspectedTable {
  return JSON.parse(runSqlHarness(["inspect-table", "--table", tableName])) as InspectedTable;
}

export function dropTables(tables: string[]): void {
  if (tables.length === 0) return;
  runSqlHarness(["drop-tables", "--tables", tables.join(",")]);
}
