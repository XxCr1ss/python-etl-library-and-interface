import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") {
  console.error("Las referencias visuales revisadas pertenecen a Windows. Ejecute test:e2e:mock para axe/reflow; una referencia de otra plataforma requiere revisión explícita.");
  process.exit(1);
}
const cli = fileURLToPath(new URL("../../node_modules/@playwright/test/cli.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, "test", "--project=mock", "final-audit.spec.ts", "diagram.spec.ts", ...process.argv.slice(2)], {
  stdio: "inherit", env: { ...process.env, ETL_E2E_VISUAL: "1" },
});
process.exit(result.status ?? 1);
