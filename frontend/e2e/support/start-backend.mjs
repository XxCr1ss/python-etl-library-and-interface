import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(frontendRoot, "..");

function parseDotEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const raw of fs.readFileSync(filePath, "utf-8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const requiredKeys = [
  "ETL_TEST_DB_TYPE",
  "ETL_TEST_DB_HOST",
  "ETL_TEST_DB_PORT",
  "ETL_TEST_DB_NAME",
  "ETL_TEST_DB_USER",
  "ETL_TEST_DB_PASSWORD",
];

const fileEnv = process.env.ETL_IGNORE_DOTENV === "1" ? {} : parseDotEnv(path.join(repoRoot, ".env.local"));
const mergedEnv = { ...fileEnv, ...process.env };

const missing = requiredKeys.filter((k) => {
  const v = mergedEnv[k];
  if (v === undefined) return true;
  if (k !== "ETL_TEST_DB_PASSWORD" && String(v).trim() === "") return true;
  return false;
});

if (missing.length > 0) {
  console.error(
    `[start-backend] Error: Configuración explícita de base de datos de pruebas requerida para test:e2e:real. Faltan: ${missing.join(", ")}`,
  );
  process.exit(1);
}

if (!String(mergedEnv.ETL_TEST_DB_NAME).trim().startsWith("etl_test")) {
  console.error(
    `[start-backend] Error: Base de datos '${mergedEnv.ETL_TEST_DB_NAME}' rechazada; debe iniciar con 'etl_test'.`,
  );
  process.exit(1);
}

const candidates = [
  process.env.PYTHON_EXECUTABLE,
  path.join(repoRoot, ".venv", "phase01a-replay", "Scripts", "python.exe"),
  path.join(repoRoot, ".venv", "Scripts", "python.exe"),
  path.join(repoRoot, "backend", "venv", "Scripts", "python.exe"),
  path.join(repoRoot, ".venv", "bin", "python"),
  path.join(repoRoot, "backend", "venv", "bin", "python"),
].filter(Boolean);

const pythonExe = candidates.find((p) => fs.existsSync(p)) || "python";
const uploadDir =
  process.env.ETL_E2E_RUN_UPLOAD_DIR;
if (!uploadDir || !path.basename(uploadDir).startsWith("etl-e2e-")) {
  throw new Error("Se requiere un directorio temporal propio de esta ejecución E2E.");
}
fs.mkdirSync(uploadDir, { recursive: true });

const child = spawn(
  pythonExe,
  ["-m", "uvicorn", "main:app", "--app-dir", path.join(repoRoot, "backend"), "--host", "127.0.0.1", "--port", "8000"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...mergedEnv,
      PYTHONUTF8: "1",
      ETL_UPLOAD_DIR: uploadDir,
      CORS_ORIGINS:
        `http://localhost:${process.env.ETL_E2E_FRONTEND_PORT || "3100"},http://127.0.0.1:${process.env.ETL_E2E_FRONTEND_PORT || "3100"}`,
    },
  },
);

const shutdown = () => {
  if (!child.killed) {
    child.kill("SIGTERM");
  }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
child.on("exit", (code) => process.exit(code ?? 0));
