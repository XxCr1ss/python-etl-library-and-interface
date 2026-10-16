import { parseSource } from "@/types/etlValidation";
import { SecondarySourceEditor } from "./SecondarySourceEditor";
import { ParameterForm } from "./ParameterForm";
import type { StepFormProps } from "../types";

export function MultiSourceForm<P>(props: StepFormProps<P>) {
  const field = props.fields.find(f => f.kind === "source");
  if (!field) return null;
  let source;
  try { source = parseSource(JSON.parse(props.value.changes[field.key] ?? field.format(props.value.base)), props.credentials); } catch { /* An unconfirmed source stays a draft. */ }
  return <fieldset disabled={props.disabled} className="space-y-4">
    <SecondarySourceEditor source={source} credentials={props.credentials} onChange={(next, columns) => {
      props.onChange({ ...props.value, changes: { ...props.value.changes, [field.key]: JSON.stringify(next ?? { type: "file", filepath: "" }), ...(props.fields.some(f => f.key === "on") ? { on: '""' } : {}) } });
      props.onSecondaryChange?.(next, columns);
    }} />
    {props.errors[field.key] && <p role="alert" className="text-sm text-danger">{props.errors[field.key]}</p>}
    <ParameterForm {...props} />
  </fieldset>;
}
