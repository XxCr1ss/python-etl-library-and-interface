"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Input, Select, Tabs } from "@/components/ui";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { sourceDto, stepDto, targetDto } from "@/services/etlSerializers";
import { previewLoadSchema } from "@/services/loadApi";
import { LoadSchemaError, parseLoadSchema } from "@/types/loadSchemaValidation";
import type { LoadConfigDto, LoadSchemaSpec } from "@/types/etl";

import { OperationError } from "@/components/etl/OperationError";
import { LoadSchemaColumns } from "./LoadSchemaColumns";

export function LoadSchemaEditor({ config, columns, onChange }: { config: LoadConfigDto; columns: string[]; onChange: (c: LoadConfigDto) => void }) {
  const session = usePipelineSession();
  const [draft, setDraft] = useState<LoadSchemaSpec | null>(config.schema_spec || null);
  const [error, setError] = useState<string | Error>("");
  const [tab, setTab] = useState("columns");
  const editor = useRef<HTMLDivElement>(null);
  function focusField(id: string, selected: string) {
    setTab(selected);
    requestAnimationFrame(() => editor.current?.querySelector<HTMLElement>(`#${id}`)?.focus());
  }
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
    } catch (e) { if (current === generation.current) setError(e instanceof Error ? e : "No se pudo revisar el impacto."); }
    finally { if (current === generation.current) setBusy(false); }
  }
  function apply() {
    if (!draft) return;
    try {
      if (!draft.grain.trim()) throw new LoadSchemaError("table", "load-grain", "Completa el grano de la tabla para indicar qué representa una fila.");
      const schema_spec = parseLoadSchema(draft);
      setDraft(schema_spec);
      onChange({ ...config, schema_spec });
      setError("");
    } catch (issue) {
      if (issue instanceof LoadSchemaError) {
        setError(issue);
        focusField(issue.field, issue.tab);
      } else setError("Revisa las columnas y los límites del esquema.");
    }
  }
  function changeDraft(next: LoadSchemaSpec | null) {
    setDraft(next);
    setError("");
  }
  const pending = JSON.stringify(draft) !== JSON.stringify(config.schema_spec ?? null);
  const toolbar = draft && <div className="space-y-2 border-b border-line py-2">
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={apply}>Aplicar esquema</Button>
      {config.schema_spec && <Button variant="outline" disabled={busy || pending || !session.state.target || !session.state.source} onClick={() => void preview()}>
        {busy ? "Revisando impacto…" : "Revisar impacto sin escribir"}
      </Button>}
      <Button variant="ghost" onClick={() => {
        changeDraft(null);
        setTab("columns");
        onChange({ ...config, schema_spec: undefined, if_exists: ["reload", "schema_only"].includes(config.if_exists || "") ? "fail" : config.if_exists });
      }}>Usar carga tradicional</Button>
    </div>
    {pending && <p role="status" className="text-sm text-warning">Esquema pendiente de aplicar. La carga usa el último esquema aplicado.</p>}
    {!pending && config.schema_spec && session.state.preview.status !== "success" && <p role="status" className="text-sm text-content-muted">Actualiza la vista previa en Transformación antes de cargar.</p>}
    {error && <OperationError title="Revisa el esquema" error={error} />}
    {impact && <details className="rounded-lg border border-line px-3 py-2 text-sm" open>
      <summary className="cursor-pointer font-medium">{pending ? "Impacto del esquema aplicado" : "Impacto de la carga"}</summary>
      <p className="mt-1">{impact}</p>
    </details>}
  </div>;
  return <div ref={editor} className="space-y-4 border-t border-line pt-4">
    <h3 className="font-semibold">Esquema explícito y calidad</h3>
    <p className="text-sm text-content-muted">Define qué representa una fila y crea claves físicas para explorar relaciones. Disponible para PostgreSQL, Oracle y MySQL. Aplicar activa lectura exacta y requiere actualizar la vista previa. CSV conserva códigos y decimales como texto y lee los campos vacíos como nulos. Convierte explícitamente las columnas antes de agregarlas. Los cambios se aplican al ejecutar Carga.</p>
    {!draft ? <Button variant="outline" disabled={!columns.length} onClick={initialize}>Configurar tipos y claves</Button> : <SchemaTabs draft={draft} setDraft={changeDraft} columns={columns} tab={tab} setTab={setTab} toolbar={toolbar} error={error} focusField={focusField} />}
  </div>;
}

function SchemaTabs({ draft, setDraft, columns, tab, setTab, toolbar, error, focusField }: {
  draft: LoadSchemaSpec; setDraft: (draft: LoadSchemaSpec) => void; columns: string[]; tab: string;
  setTab: (tab: string) => void; toolbar: React.ReactNode; error: string | Error;
  focusField: (field: string, tab: string) => void;
}) {
  const errorFor = (id: string) => error instanceof LoadSchemaError && error.field === id ? error.message : undefined;
  const keyGroups = (key: "unique_keys" | "indexes") => {
    const label = key === "unique_keys" ? "clave única" : "índice";
    return <div className="space-y-2">
      <h4 className="text-sm font-semibold">{key === "unique_keys" ? "Claves UNIQUE (simples o compuestas)" : "Índices adicionales"}</h4>
      {draft[key].map((group, i) => {
        const id = `load-${key}-${i}`;
        return <div key={i} className="flex flex-wrap items-start gap-2">
          <Input id={id} error={errorFor(id)} label={`Columnas de ${label} ${i + 1}`} hint="Columnas separadas por coma" value={group.join(",")}
            onChange={event => {
              const names = event.target.value.split(",").map(name => name.trim());
              setDraft({ ...draft, [key]: draft[key].map((value, index) => index === i ? names : value) });
            }} />
          <Button variant="ghost" onClick={() => setDraft({ ...draft, [key]: draft[key].filter((_, index) => index !== i) })}>Quitar {label} {i + 1}</Button>
        </div>;
      })}
      <Button id={`load-add-${key}`} variant="outline" onClick={() => setDraft({ ...draft, [key]: [...draft[key], [columns[0]]] })}>Agregar {label}</Button>
    </div>;
  };
  const items = [
    { id: "columns", label: "Columnas", content: <LoadSchemaColumns draft={draft} onChange={setDraft} errorFor={errorFor} /> },
    { id: "table", label: "Tabla", content: <div className="space-y-3">
      <Input id="load-grain" error={errorFor("load-grain")} label="Grano de la tabla" value={draft.grain} hint="Ejemplo: una fila por línea de pedido. No incluyas datos personales." onChange={e => setDraft({ ...draft, grain: e.target.value })} />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.allow_add_constraints || false} onChange={e => setDraft({ ...draft, allow_add_constraints: e.target.checked })} />Permitir agregar restricciones verificadas a una tabla existente. No elimina claves ni cambia tipos.</label>
    </div> },
    { id: "keys", label: "Claves", content: <div className="space-y-4">
      <div id="load-primary-key" tabIndex={-1} className="space-y-2">
        <h4 className="text-sm font-semibold">Clave primaria</h4>
        {draft.primary_key.length ? <div className="flex flex-wrap gap-2">{draft.primary_key.map(name => <Button key={name} variant="outline" size="sm" onClick={() => focusField(`load-column-pk-${draft.columns.findIndex(column => column.name === name)}`, "columns")}>{name}</Button>)}</div> : <p className="text-sm text-content-muted">Selecciona la PK en la pestaña Columnas.</p>}
      </div>
      {keyGroups("unique_keys")}
      <div className="space-y-2"><h4 className="text-sm font-semibold">FK físicas</h4>{draft.foreign_keys.map((fk, i) => <div key={i} className="grid gap-2 sm:grid-cols-3"><Input id={`load-fk-columns-${i}`} error={errorFor(`load-fk-columns-${i}`)} label={`Columnas FK ${i + 1}`} value={fk.columns.join(",")} onChange={e => setDraft({ ...draft, foreign_keys: draft.foreign_keys.map((v, j) => i === j ? { ...v, columns: e.target.value.split(",").map(s => s.trim()) } : v) })} /><Input id={`load-fk-table-${i}`} error={errorFor(`load-fk-table-${i}`)} label={`Tabla referenciada ${i + 1}`} value={fk.target_table} onChange={e => setDraft({ ...draft, foreign_keys: draft.foreign_keys.map((v, j) => i === j ? { ...v, target_table: e.target.value } : v) })} /><Input id={`load-fk-target-${i}`} error={errorFor(`load-fk-target-${i}`)} label={`Clave referenciada ${i + 1}`} value={fk.target_columns.join(",")} onChange={e => setDraft({ ...draft, foreign_keys: draft.foreign_keys.map((v, j) => i === j ? { ...v, target_columns: e.target.value.split(",").map(s => s.trim()) } : v) })} /><Button variant="ghost" onClick={() => setDraft({ ...draft, foreign_keys: draft.foreign_keys.filter((_, j) => i !== j) })}>Quitar FK física {i + 1}</Button></div>)}<Button id="load-add-fk" variant="outline" onClick={() => setDraft({ ...draft, foreign_keys: [...draft.foreign_keys, { columns: [columns[0]], target_table: "", target_columns: ["id"] }] })}>Agregar FK física</Button></div>
    </div> },
    { id: "indexes", label: "Índices", content: keyGroups("indexes") },
    { id: "quality", label: "Calidad", content: <div className="space-y-2"><h4 className="text-sm font-semibold">Comprobaciones antes de escribir</h4>{draft.checks.map((check, i) => <div key={i} className="grid gap-2 sm:grid-cols-3"><Select id={`load-check-${i}`} error={errorFor(`load-check-${i}`)} label={`Columna de comprobación ${i + 1}`} value={check.column} onChange={e => setDraft({ ...draft, checks: draft.checks.map((v, j) => i === j ? { ...v, column: e.target.value } : v) })}>{columns.map(n => <option key={n}>{n}</option>)}</Select><Select label={`Regla ${i + 1}`} value={check.kind} onChange={e => setDraft({ ...draft, checks: draft.checks.map((v, j) => i === j ? { ...v, kind: e.target.value as typeof check.kind } : v) })}>{["not_null", "unique", "range", "sum"].map(n => <option key={n}>{n}</option>)}</Select><Select label={`Severidad ${i + 1}`} value={check.severity} onChange={e => setDraft({ ...draft, checks: draft.checks.map((v, j) => i === j ? { ...v, severity: e.target.value as "error" | "warning" } : v) })}><option value="error">Bloquear</option><option value="warning">Advertir</option></Select>{["minimum", "maximum"].map(bound => <Input key={bound} label={`${bound} ${i + 1}`} value={check[bound as "minimum" | "maximum"] || ""} onChange={e => setDraft({ ...draft, checks: draft.checks.map((v, j) => i === j ? { ...v, [bound]: e.target.value || null } : v) })} />)}<Button variant="ghost" onClick={() => setDraft({ ...draft, checks: draft.checks.filter((_, j) => i !== j) })}>Quitar comprobación {i + 1}</Button></div>)}<Button id="load-add-check" variant="outline" onClick={() => setDraft({ ...draft, checks: [...draft.checks, { column: columns[0], kind: "not_null", severity: "error" }] })}>Agregar comprobación</Button></div> },
  ];
  return <Tabs label="Configuración del esquema" items={items} selectedId={tab} onChange={setTab} toolbar={toolbar} />;
}
