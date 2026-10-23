"use client";
import { Input, Select } from "@/components/ui";
import type { LoadConfigDto } from "@/types/etl";
import { simpleIdentifier, type ForeignKeyRow } from "@/state/loadValidation";
import ForeignKeyEditor from "./ForeignKeyEditor";
import { LoadSchemaEditor } from "./LoadSchemaEditor";

export default function LoadSettings({ config, onChange, availableColumns, rows, onRowsChange }: {
  config: LoadConfigDto; onChange: (config: LoadConfigDto) => void; availableColumns: string[];
  rows: ForeignKeyRow[]; onRowsChange: (rows: ForeignKeyRow[]) => void;
}) {
  return <section className="rounded-xl border border-line bg-surface p-5 space-y-4" aria-labelledby="settings-title">
    <h2 id="settings-title" className="text-lg font-bold">Tabla y modo de carga</h2>
    <Input label="Tabla destino" placeholder="ej. dim_medico o fact_consulta" value={config.table_name}
      hint="Nombre simple, sin esquema, espacios ni citas: letras, números y guion bajo; empieza por letra o guion bajo. La API no tiene campo de esquema."
      error={config.table_name && !simpleIdentifier(config.table_name) ? "Usa un nombre simple sin espacios exteriores." : undefined}
      onChange={e => onChange({ ...config, table_name: e.target.value })} required />
    <Select label="Tipo de tabla" value={config.table_type} onChange={e => {
      const table_type = e.target.value === "fact" ? "fact" : "dimension";
      onChange({ ...config, table_type, if_exists: table_type === "dimension" ? "replace" : "append" });
    }}><option value="dimension">Dimensión</option><option value="fact">Hechos</option></Select>
    <p className="text-sm text-content-muted">Cambiar el tipo aplica su modo predeterminado: dimensión reemplaza; hechos agrega.</p>
    <Select label="Modo de carga" value={config.if_exists || ""} onChange={e => onChange({ ...config, if_exists: e.target.value as LoadConfigDto["if_exists"] })}>
      <option value="" disabled>Selecciona un modo</option><option value="replace">Reemplazar (replace)</option><option value="append">Agregar (append)</option>
      <option value="fail">Crear solo si no existe (fail)</option><option value="reload" disabled={!config.schema_spec}>Recargar conservando estructura</option>
      <option value="schema_only" disabled={!config.schema_spec}>Preparar estructura sin cargar filas</option>
    </Select>
    <p className="text-sm text-content-muted">Replace reemplaza la tabla y sus datos. Append agrega filas y puede duplicarlas si repites la carga.</p>
    {config.table_type === "fact" && <ForeignKeyEditor rows={rows} columns={availableColumns} onChange={onRowsChange} />}
    <LoadSchemaEditor config={config} columns={availableColumns} onChange={onChange} />
  </section>;
}
