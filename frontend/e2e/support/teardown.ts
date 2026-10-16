import fs from "node:fs";
import { E2E_UPLOAD_DIR } from "./env";

export default function teardown() {
  if (!fs.existsSync(E2E_UPLOAD_DIR)) return;
  if (fs.readdirSync(E2E_UPLOAD_DIR).length) throw new Error("La ejecución dejó uploads sin registrar; se conservaron para evitar borrar archivos ajenos.");
  fs.rmdirSync(E2E_UPLOAD_DIR);
}
