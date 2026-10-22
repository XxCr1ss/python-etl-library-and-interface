"use client";
import Link from "next/link";
import { useAuth } from "@/auth/AuthProvider";
import { useSavedConnections } from "@/hooks/useSavedConnections";
import { Button, Select } from "@/components/ui";
import type { SavedConnection } from "@/services/connectionsApi";
export function SavedConnectionsSelector({ type, selected, onSelect, disabled }: {
  type: "source" | "target"; selected?: string; onSelect: (row: SavedConnection | null) => void; disabled?: boolean;
}) {
  const auth = useAuth(), saved = useSavedConnections(type);
  if (!auth.configured) return null;
  if (!auth.user) return <p className="text-sm text-content-muted"><Link href="/register" className="text-action underline">Crea una cuenta</Link> para reutilizar conexiones. Puedes continuar manualmente.</p>;
  return <div className="space-y-2 rounded-lg border border-line bg-surface-muted p-3">
    <Select label="Conexión guardada" disabled={disabled || saved.loading} value={selected || ""} onChange={e => onSelect(saved.items.find(row => row.id === e.target.value) ?? null)}>
      <option value="">Ingresar conexión manual</option>{saved.items.map(row => <option key={row.id} value={row.id}>{row.name} · {row.db_type}</option>)}
    </Select>
    {saved.loading && <p role="status" className="text-sm">Consultando conexiones…</p>}
    {saved.error && <p role="alert" className="text-sm text-danger">{saved.error}</p>}
    {saved.error && <Button size="sm" variant="outline" onClick={saved.refresh}>Reintentar conexiones</Button>}
    {saved.more && <Button size="sm" variant="outline" onClick={saved.loadMore}>Ver más conexiones</Button>}
    <Link href="/settings/connections" className="text-xs text-action underline">Administrar conexiones</Link>
  </div>;
}
