import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

export interface RealTestDbConfig {
  db_type: "postgresql";
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

const REQUIRED_KEYS = [
  "ETL_TEST_DB_TYPE",
  "ETL_TEST_DB_HOST",
  "ETL_TEST_DB_PORT",
  "ETL_TEST_DB_NAME",
  "ETL_TEST_DB_USER",
  "ETL_TEST_DB_PASSWORD",
] as const;

export const REPO_ROOT = path.resolve(__dirname, "../../..");
export const FRONTEND_ROOT = path.resolve(__dirname, "../..");
export const E2E_UPLOAD_DIR =
  process.env.ETL_E2E_RUN_UPLOAD_DIR ??= path.join(os.tmpdir(), `etl-e2e-${randomUUID()}`);

export function parseDotEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      val.length >= 2 &&
      ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

export function requireRealTestDbConfig(): RealTestDbConfig {
  const allowDotEnv = process.env.ETL_IGNORE_DOTENV !== "1";
  const fileEnv = allowDotEnv ? parseDotEnvFile(path.join(REPO_ROOT, ".env.local")) : {};
  const merged: Record<string, string | undefined> = { ...fileEnv };
  for (const key of REQUIRED_KEYS) {
    if (process.env[key] !== undefined) {
      merged[key] = process.env[key];
    }
  }

  const missing = REQUIRED_KEYS.filter((key) => {
    const val = merged[key];
    if (val === undefined) return true;
    if (key !== "ETL_TEST_DB_PASSWORD" && val.trim() === "") return true;
    return false;
  });

  if (missing.length > 0) {
    throw new Error(
      `Configuración explícita de base de datos de pruebas requerida para test:e2e:real. Faltan variables: ${missing.join(", ")}`,
    );
  }

  const dbType = merged.ETL_TEST_DB_TYPE!.trim().toLowerCase();
  if (dbType !== "postgresql") {
    throw new Error(`Solo se admite postgresql en la suite real base; recibido: ${dbType}`);
  }

  const database = merged.ETL_TEST_DB_NAME!.trim();
  if (!database.startsWith("etl_test")) {
    throw new Error(
      `Base de datos '${database}' rechazada por seguridad. El nombre debe iniciar con 'etl_test'.`,
    );
  }

  const port = Number(merged.ETL_TEST_DB_PORT!.trim());
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("ETL_TEST_DB_PORT debe ser un entero entre 1 y 65535.");
  }

  return {
    db_type: "postgresql",
    host: merged.ETL_TEST_DB_HOST!.trim(),
    port,
    database,
    user: merged.ETL_TEST_DB_USER!.trim(),
    password: merged.ETL_TEST_DB_PASSWORD!,
  };
}

export function resolvePythonExecutable(): string {
  if (process.env.PYTHON_EXECUTABLE && fs.existsSync(process.env.PYTHON_EXECUTABLE)) {
    return process.env.PYTHON_EXECUTABLE;
  }
  const candidates = [
    path.join(REPO_ROOT, ".venv", "phase01a-replay", "Scripts", "python.exe"),
    path.join(REPO_ROOT, ".venv", "Scripts", "python.exe"),
    path.join(REPO_ROOT, "backend", "venv", "Scripts", "python.exe"),
    path.join(REPO_ROOT, ".venv", "bin", "python"),
    path.join(REPO_ROOT, "backend", "venv", "bin", "python"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "python";
}
