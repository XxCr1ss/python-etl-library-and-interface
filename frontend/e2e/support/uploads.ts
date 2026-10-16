import fs from "node:fs";
import path from "node:path";

/** Delete only a server-returned upload owned by this run, never by extension. */
export function removeOwnedUpload(directory: string, filename: string): void {
  const root = fs.realpathSync(directory);
  const resolved = path.resolve(filename);
  if (path.dirname(resolved) !== root || !/^[a-f0-9]{32}_[^/\\]+$/.test(path.basename(resolved))) {
    throw new Error("Se rechazó eliminar un archivo ajeno a esta ejecución.");
  }
  if (fs.existsSync(resolved)) {
    if (fs.lstatSync(resolved).isSymbolicLink()) throw new Error("No se eliminan enlaces simbólicos.");
    fs.unlinkSync(resolved);
  }
}
