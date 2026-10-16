import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "../..");
const nextBin = path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next");
const port = process.env.ETL_E2E_FRONTEND_PORT || "3100";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Build the current sources with the API URL used by this run. A BUILD_ID alone
// says nothing about source freshness or compile-time NEXT_PUBLIC_* variables.
const buildResult = spawnSync(process.execPath, [nextBin, "build", ...(process.env.ETL_E2E_PROFILE === "1" ? ["--profile"] : [])], {
    cwd: frontendRoot,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_API_URL: apiUrl },
  });
if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  cwd: frontendRoot,
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_API_URL: apiUrl },
});

const shutdown = () => {
  if (!child.killed) {
    child.kill("SIGTERM");
  }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
child.on("exit", (code) => process.exit(code ?? 0));
