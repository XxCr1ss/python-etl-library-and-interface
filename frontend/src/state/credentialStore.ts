export class MissingCredentialError extends Error {
  constructor(public reference: string) { super("Reingresa la contraseña de la conexión para continuar."); }
}
/** Provider-owned, never a module singleton or persisted object. Empty is a supplied password. */
export class CredentialStore {
  private values = new Map<string, string>();
  has(ref: string) { return this.values.has(ref); }
  get(ref: string) { if (!this.values.has(ref)) throw new MissingCredentialError(ref); return this.values.get(ref)!; }
  set(ref: string, password: string) { this.values.set(ref, password); }
  delete(ref: string) { this.values.delete(ref); }
  retain(refs: string[]) { for (const ref of Array.from(this.values.keys())) if (!refs.includes(ref)) this.values.delete(ref); }
  clear() { this.values.clear(); }
}
export const newId = () => crypto.randomUUID();
