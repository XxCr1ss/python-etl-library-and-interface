import { Input, Select } from "@/components/ui";
import type { LoadColumnSpec, LoadSchemaSpec } from "@/types/etl";

export function LoadSchemaColumns({ draft, onChange, errorFor }: { draft: LoadSchemaSpec; onChange: (draft: LoadSchemaSpec) => void; errorFor: (field: string) => string | undefined }) {
  function updateColumn(name: string, patch: Partial<LoadColumnSpec>) {
    onChange({ ...draft, columns: draft.columns.map(column => column.name === name ? { ...column, ...patch } : column) });
  }

  return <div className="space-y-3">
    {draft.columns.map((column, index) => {
      const { name, type } = column;
      const inKey = draft.primary_key.includes(name);
      return <div key={name} id={`load-column-${index}`} className="grid gap-3 rounded-lg border border-line p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <h4 className="break-all font-mono text-sm font-semibold">{name}</h4>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <Select id={`load-column-type-${index}`} error={errorFor(`load-column-type-${index}`)} label={`Tipo de ${name}`} value={type} onChange={e => updateColumn(name, { type: e.target.value as LoadColumnSpec["type"] })}>
            {["string", "integer", "decimal", "float", "boolean", "date", "datetime"].map(value => <option key={value}>{value}</option>)}
          </Select>
          <Input id={`load-column-unit-${index}`} error={errorFor(`load-column-unit-${index}`)} label={`Unidad de ${name}`} value={column.unit || ""} onChange={e => updateColumn(name, { unit: e.target.value || null })} />
          {type === "decimal" && <>
            <Input id={`load-column-precision-${index}`} error={errorFor(`load-column-precision-${index}`)} type="number" label={`Precisión de ${name}`} min={1} max={38} value={column.precision ?? 30} onChange={e => updateColumn(name, { precision: Number(e.target.value) })} />
            <Input id={`load-column-scale-${index}`} error={errorFor(`load-column-scale-${index}`)} type="number" label={`Escala de ${name}`} min={0} max={38} value={column.scale ?? 8} onChange={e => updateColumn(name, { scale: Number(e.target.value) })} />
          </>}
          {type === "datetime" && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={column.timezone || false} onChange={e => updateColumn(name, { timezone: e.target.checked })} />Instante con zona horaria</label>}
        </div>
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm"><input id={`load-column-pk-${index}`} type="checkbox" aria-label={`Parte de PK: ${name}`} checked={inKey} onChange={e => {
            const checked = e.target.checked;
            onChange({ ...draft, primary_key: checked ? [...draft.primary_key, name] : draft.primary_key.filter(key => key !== name),
              columns: checked ? draft.columns.map(item => item.name === name ? { ...item, nullable: false } : item) : draft.columns });
          }} />Parte de PK</label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" aria-label={`Permitir nulos en ${name}`} disabled={inKey} checked={!inKey && column.nullable} onChange={e => updateColumn(name, { nullable: e.target.checked })} />Permitir nulos</label>
          {inKey && <p className="text-xs text-content-muted">Las columnas de la PK son obligatorias.</p>}
        </div>
      </div>;
    })}
  </div>;
}
