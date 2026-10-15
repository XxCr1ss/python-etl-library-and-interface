"use client";
import { useState } from "react";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { requiredConnections } from "@/services/etlSerializers";
import { Button, Input, Modal } from "@/components/ui";
export function CredentialRecoveryDialog({ includeTarget = false }: { includeTarget?: boolean }) {
  const { state, credentials, recoverCredentials } = usePipelineSession();
  const missing = requiredConnections(state.source, state.recipe, includeTarget ? state.target : null).filter(c => !credentials.has(c.credentialRef));
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  if (!missing.length) return null;
  return <div className="p-4 border rounded-xl space-y-2" role="status">
    <p>Faltan contraseñas para continuar. La fuente y la receta se conservan.</p>
    <Button onClick={() => setOpen(true)} disabled={state.execution?.status === "running"}>Reingresar credenciales</Button>
    <Modal open={open} onClose={() => setOpen(false)} title="Recuperar conexiones">
      <form onSubmit={e => { e.preventDefault(); recoverCredentials(Object.fromEntries(missing.map(c => [c.credentialRef, values[c.credentialRef] ?? ""]))); setValues({}); setOpen(false); }} className="space-y-4">
        {missing.map(c => <Input key={c.credentialRef} label={`Contraseña · ${c.alias}`} type="password" value={values[c.credentialRef] ?? ""} onChange={e => setValues(v => ({ ...v, [c.credentialRef]: e.target.value }))} />)}
        <p>Guardar confirma también una contraseña vacía ingresada explícitamente.</p>
        <Button type="submit">Guardar contraseñas</Button>
        <Button type="button" onClick={() => { setValues({}); setOpen(false); }}>Cancelar</Button>
      </form>
    </Modal>
  </div>;
}
