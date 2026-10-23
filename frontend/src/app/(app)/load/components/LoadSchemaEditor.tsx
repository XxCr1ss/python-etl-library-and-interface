"use client";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Select } from "@/components/ui";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { sourceDto, stepDto, targetDto } from "@/services/etlSerializers";
import { previewLoadSchema } from "@/services/loadApi";
import { parseLoadSchema } from "@/types/loadSchemaValidation";
import type { LoadColumnSpec, LoadConfigDto, LoadSchemaSpec } from "@/types/etl";

export function LoadSchemaEditor({ config, columns, onChange }: { config: LoadConfigDto; columns: string[]; onChange: (c: LoadConfigDto) => void }) {
  const session = usePipelineSession();
  const [draft, setDraft] = useState<LoadSchemaSpec | null>(config.schema_spec || null);
  const [error, setError] = useState("");
  const [impact, setImpact] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const fingerprint = JSON.stringify([config, session.state.revision, session.state.targetVersion]);
  useEffect(() => { generation.current++; setImpact(""); setBusy(false); }, [fingerprint]);
  useEffect(() => () => { generation.current++; }, []);
  function initialize() {
    const dtypes = session.state.preview.data?.dtypes || {};
    setDraft({ version: 1, grain: "", columns: columns.map(name => ({ name, type: /bool/i.test(dtypes[name]) ? "boolean" : /int/i.test(dtypes[name]) ? "integer" : /float/i.test(dtypes[name]) ? "float" : /datetime/i.test(dtypes[name]) ? "datetime" : "string", nullable: true })), primary_key: [], unique_keys: [], foreign_keys: [], indexes: [], checks: [] });
  }
  const updateColumn = (index: number, patch: Partial<LoadColumnSpec>) => { if (draft) setDraft({ ...draft, columns: draft.columns.map((c, i) => i === index ? { ...c, ...patch } : c) }); };
  async function preview() {
    const { state, credentials } = session;
    if (!state.source || !state.target || !config.schema_spec) return;
    const current = ++generation.current;
    setBusy(true); setError(""); setImpact("");
    try {
      const response = await previewLoadSchema({ source: sourceDto(state.source, credentials), recipe: state.recipe.map(s => stepDto(s, credentials)), target_connection: targetDto(state.target, credentials), load_config: config });
      if (current === generation.current) {
        const result = response as typeof response & { schema_actions: string[]; previous_rows: number; submitted_rows: number };
        setImpact(`Acciones: ${result.schema_actions.join(", ")}. Destino actual: ${result.previous_rows} filas. Resultado a enviar: ${result.submitted_rows} filas. No se escribió ningún dato. La ejecución volverá a validar el destino.`);
      }
    } catch (e) { if (current === generation.current) setError(e instanceof Error ? e.message : "No se pudo revisar el impacto."); }
    finally { if (current === generation.current) setBusy(false); }
  }
  return <div className="space-y-4 border-t border-line pt-4">
    <h3 className="font-semibold">Esquema explícito y calidad</h3>
    <p className="text-sm text-content-muted">Define qué representa una fila y crea claves físicas para explorar relaciones. Disponible para PostgreSQL. Aplicar activa lectura exacta y requiere actualizar la vista previa: CSV conserva códigos y decimales como texto, y los campos vacíos se leen como nulos. Convierte explícitamente las columnas antes de agregarlas. No cambia la base hasta ejecutar Carga.</p>
    {!draft ? <Button variant="outline" disabled={!columns.length} onClick={initialize}>Configurar tipos y claves</Button> : <>
      <Input label="Grano de la tabla" value={draft.grain} hint="Ejemplo: una fila por línea de pedido. No incluyas datos personales." onChange={e => setDraft({ ...draft, grain: e.target.value })} />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.allow_add_constraints || false} onChange={e => setDraft({ ...draft, allow_add_constraints: e.target.checked })} />Permitir agregar restricciones verificadas a una tabla existente. No elimina claves ni cambia tipos.</label>
      <div className="space-y-3">{draft.columns.map((c, i) => <div key={c.name} className="grid items-end gap-3 rounded-lg border border-line p-3 sm:grid-cols-3">
        <span className="break-all font-mono text-sm">{c.name}</span>
        <Select label={`Tipo de ${c.name}`} value={c.type} onChange={e => updateColumn(i, { type: e.target.value as LoadColumnSpec["type"] })}>{["string", "integer", "decimal", "float", "boolean", "date", "datetime"].map(t => <option key={t}>{t}</option>)}</Select>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={c.nullable} onChange={e => updateColumn(i, { nullable: e.target.checked })} />Permitir nulos en {c.name}</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.primary_key.includes(c.name)} onChange={e => setDraft({ ...draft, primary_key: e.target.checked ? [...draft.primary_key, c.name] : draft.primary_key.filter(n => n !== c.name) })} />Parte de PK: {c.name}</label>
        <Input label={`Unidad de ${c.name}`} value={c.unit || ""} onChange={e => updateColumn(i, { unit: e.target.value || null })} />
        {c.type === "decimal" && <><Input type="number" label={`Precisión de ${c.name}`} min={1} max={38} value={c.precision ?? 30} onChange={e => updateColumn(i, { precision: Number(e.target.value) })} /><Input type="number" label={`Escala de ${c.name}`} min={0} max={38} value={c.scale ?? 8} onChange={e => updateColumn(i, { scale: Number(e.target.value) })} /></>}
        {c.type === "datetime" && <label className="flex gap-2 text-sm"><input type="checkbox" checked={c.timezone || false} onChange={e => updateColumn(i, { timezone: e.target.checked })} />Instante con zona horaria</label>}
      </div>)}</div>
      {(["unique_keys", "indexes"] as const).map(key => <div key={key} className="space-y-2"><h4 className="text-sm font-semibold">{key === "unique_keys" ? "Claves UNIQUE (simples o compuestas)" : "Índices adicionales"}</h4>{draft[key].map((group, i) => <div key={i} className="flex items-end gap-2"><Input label={`${key} ${i + 1}`} hint="Columnas separadas por coma" value={group.join(",")} onChange={e => setDraft({ ...draft, [key]: draft[key].map((v, j) => j === i ? e.target.value.split(",").map(s => s.trim()) : v) })} /><Button variant="ghost" onClick={() => setDraft({ ...draft, [key]: draft[key].filter((_, j) => i !== j) })}>Quitar {key} {i + 1}</Button></div>)}<Button variant="outline" onClick={() => setDraft({ ...draft, [key]: [...draft[key], [columns[0]]] })}>Agregar {key === "unique_keys" ? "clave única" : "índice"}</Button></div>)}
      <div className="space-y-2"><h4 className="text-sm font-semibold">FK físicas</h4>{draft.foreign_keys.map((fk, i) => <div key={i} className="grid gap-2 sm:grid-cols-3"><Input label={`Columnas FK ${i + 1}`} value={fk.columns.join(",")} onChange={e => setDraft({ ...draft, foreign_keys: draft.foreign_keys.map((v, j) => i === j ? { ...v, columns: e.target.value.split(",").map(s => s.trim()) } : v) })} /><Input label={`Tabla referenciada ${i + 1}`} value={fk.target_table} onChange={e => setDraft({ ...draft, foreign_keys: draft.foreign_keys.map((v, j) => i === j ? { ...v, target_table: e.target.value } : v) })} /><Input label={`Clave referenciada ${i + 1}`} value={fk.target_columns.join(",")} onChange={e => setDraft({ ...draft, foreign_keys: draft.foreign_keys.map((v, j) => i === j ? { ...v, target_columns: e.target.value.split(",").map(s => s.trim()) } : v) })} /><Button variant="ghost" onClick={() => setDraft({ ...draft, foreign_keys: draft.foreign_keys.filter((_, j) => i !== j) })}>Quitar FK física {i + 1}</Button></div>)}<Button variant="outline" onClick={() => setDraft({ ...draft, foreign_keys: [...draft.foreign_keys, { columns: [columns[0]], target_table: "", target_columns: ["id"] }] })}>Agregar FK física</Button></div>
      <div className="space-y-2"><h4 className="text-sm font-semibold">Comprobaciones antes de escribir</h4>{draft.checks.map((check, i) => <div key={i} className="grid gap-2 sm:grid-cols-3"><Select label={`Columna de comprobación ${i + 1}`} value={check.column} onChange={e => setDraft({ ...draft, checks: draft.checks.map((v, j) => i === j ? { ...v, column: e.target.value } : v) })}>{columns.map(n => <option key={n}>{n}</option>)}</Select><Select label={`Regla ${i + 1}`} value={check.kind} onChange={e => setDraft({ ...draft, checks: draft.checks.map((v, j) => i === j ? { ...v, kind: e.target.value as typeof check.kind } : v) })}>{["not_null", "unique", "range", "sum"].map(n => <option key={n}>{n}</option>)}</Select><Select label={`Severidad ${i + 1}`} value={check.severity} onChange={e => setDraft({ ...draft, checks: draft.checks.map((v, j) => i === j ? { ...v, severity: e.target.value as "error" | "warning" } : v) })}><option value="error">Bloquear</option><option value="warning">Advertir</option></Select>{["minimum", "maximum"].map(bound => <Input key={bound} label={`${bound} ${i + 1}`} value={check[bound as "minimum" | "maximum"] || ""} onChange={e => setDraft({ ...draft, checks: draft.checks.map((v, j) => i === j ? { ...v, [bound]: e.target.value || null } : v) })} />)}<Button variant="ghost" onClick={() => setDraft({ ...draft, checks: draft.checks.filter((_, j) => i !== j) })}>Quitar comprobación {i + 1}</Button></div>)}<Button variant="outline" onClick={() => setDraft({ ...draft, checks: [...draft.checks, { column: columns[0], kind: "not_null", severity: "error" }] })}>Agregar comprobación</Button></div>
      {JSON.stringify(draft) !== JSON.stringify(config.schema_spec) && <Alert tone="warning" title="Esquema pendiente de aplicar">La carga usa la última configuración aplicada. Aplica este esquema para incluir los cambios.</Alert>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { try { const schema_spec = parseLoadSchema(draft); if (!schema_spec.grain.trim()) throw new Error(); onChange({ ...config, schema_spec }); setError(""); } catch { setError("Revisa grano, tipos, columnas y claves del esquema."); } }}>Aplicar esquema</Button><Button variant="ghost" onClick={() => { setDraft(null); onChange({ ...config, schema_spec: undefined, if_exists: ["reload", "schema_only"].includes(config.if_exists || "") ? "fail" : config.if_exists }); }}>Usar carga tradicional</Button></div>
    </>}
    {config.schema_spec && <Button variant="outline" disabled={busy || !session.state.target || !session.state.source} onClick={() => void preview()}>{busy ? "Revisando impacto…" : "Revisar impacto sin escribir"}</Button>}
    {impact && <Alert title="Impacto de la carga">{impact}</Alert>}{error && <Alert tone="error" title="Revisa el esquema">{error}</Alert>}
  </div>;
}
