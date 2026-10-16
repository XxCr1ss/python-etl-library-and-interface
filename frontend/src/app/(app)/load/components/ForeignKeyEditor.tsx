"use client";
import { Button, Input, Select } from "@/components/ui";
import { newId } from "@/state/credentialStore";
import { foreignKeyError, type ForeignKeyRow } from "@/state/loadValidation";

export default function ForeignKeyEditor({ rows, columns, onChange }: {
  rows: ForeignKeyRow[]; columns: string[]; onChange: (rows: ForeignKeyRow[]) => void;
}) {
  const patch = (id: string, values: Partial<ForeignKeyRow>) => onChange(rows.map(row => row.id === id ? { ...row, ...values } : row));
  return <div className="space-y-4">
    <h3 className="font-semibold">Claves foráneas</h3>
    <p className="text-sm text-content-muted">Opcionales para hechos. Cada fila se valida; elimina las filas que no necesites.</p>
    {rows.map((row, index) => <fieldset key={row.id} className="space-y-3 rounded-lg border border-line p-3">
      <legend className="px-1 text-sm">FK {index + 1}</legend>
      <Select label={`Columna origen FK ${index + 1}`} value={row.column} onChange={e => patch(row.id, { column: e.target.value })}>
        <option value="">Selecciona una columna</option>
        {row.column && !columns.includes(row.column) && <option value={row.column}>{row.column} (ya no existe)</option>}
        {columns.map(column => <option key={column} value={column}>{column}</option>)}
      </Select>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={`Tabla dimensión FK ${index + 1}`} value={row.table} onChange={e => patch(row.id, { table: e.target.value })} />
        <Input label={`PK destino FK ${index + 1}`} value={row.primaryKey} onChange={e => patch(row.id, { primaryKey: e.target.value })} />
      </div>
      {foreignKeyError(row, rows, columns) && <p role="alert" className="text-sm text-danger">{foreignKeyError(row, rows, columns)}</p>}
      <Button variant="outline" onClick={() => onChange(rows.filter(other => other.id !== row.id))}>Eliminar FK {index + 1}</Button>
    </fieldset>)}
    <Button variant="outline" onClick={() => onChange([...rows, { id: newId(), column: "", table: "", primaryKey: "" }])}>Agregar FK</Button>
  </div>;
}
