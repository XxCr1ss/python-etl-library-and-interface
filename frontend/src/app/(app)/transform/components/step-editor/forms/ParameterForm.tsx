import { Input, Select } from "@/components/ui";
import type { StepFormProps } from "../types";
import { ColumnsField } from "../fields/ColumnsField";
import { MapField } from "../fields/MapField";
import { ValueField } from "../fields/ValueField";

export function ParameterForm<P>({ value, onChange, errors, fields, context, disabled }: StepFormProps<P>) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-4">{fields.filter(f => f.kind !== "source").map(field => {
    const raw = value.changes[field.key] ?? field.format(value.base);
    const change = (next: string) => onChange({ ...value, changes: { ...value.changes, [field.key]: next } });
    return <div key={field.key} className="space-y-1">
      {field.kind === "column" ? <ColumnsField single label={field.label} raw={raw} columns={context.columns} onChange={change} />
        : field.kind === "columns" ? <ColumnsField label={field.label} raw={raw} columns={context.columns} onChange={change} />
        : field.kind === "map" ? <MapField raw={raw} columns={context.columns} onChange={change} />
        : field.kind === "value" ? <ValueField label={field.label} raw={raw} onChange={change} />
        : field.kind === "boolean" ? <Select label={field.label} value={raw} onChange={e => change(e.target.value)}>
          <option value="">Predeterminado del servidor</option><option value="true">Sí</option><option value="false">No</option>
        </Select>
        : <Input label={field.label} value={raw} error={errors[field.key]} inputMode={field.kind === "number" ? "decimal" : undefined} onChange={e => change(e.target.value)} />}
      {field.hint && <p className="text-sm text-content-muted">{field.hint}</p>}
      {errors[field.key] && !["text", "number", "json"].includes(field.kind) && <p role="alert" className="text-sm text-danger">{field.label}: {errors[field.key]}</p>}
    </div>;
  })}</fieldset>;
}
