import { Badge } from "@/components/ui";
import type { TransformationDoc } from "../types";
import { DataDiffTable } from "./DataDiffTable";

export function TransformationCard({ operation }: { operation: TransformationDoc }) {
  return <article className="min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Badge>{operation.family}</Badge><code className="break-all text-xs text-content-muted">{operation.type}</code>
    </div>
    <h4 id={operation.type} data-manual-anchor tabIndex={-1} className="manual-anchor mt-3 text-xl font-bold">
      <a href={`#${operation.type}`} className="decoration-action underline-offset-4 hover:underline">{operation.name}</a>
    </h4>
    <p className="mt-2 text-sm leading-7 text-content-muted">{operation.description}</p>
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6">{operation.instructions.map(instruction => <li key={instruction}>{instruction}</li>)}</ol>
    <div role="region" aria-label={`Parámetros de ${operation.name}`} tabIndex={0} className="mt-5 overflow-x-auto rounded-lg border border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
      <table className="w-full text-left text-sm">
        <caption className="p-3 text-left font-semibold">Parámetros · {operation.name}</caption>
        <thead className="bg-surface-muted"><tr>{["Campo y tipo", "Obligatorio", "Uso y valor predeterminado"].map(label => <th scope="col" key={label} className="px-3 py-2 text-xs">{label}</th>)}</tr></thead>
        <tbody>{operation.parameters.map(parameter => <tr key={parameter.key} className="border-t border-line align-top">
          <th scope="row" className="px-3 py-3 font-normal"><code className="break-all font-semibold">{parameter.key}</code><span className="mt-1 block break-words text-xs text-content-muted">{parameter.type}</span></th>
          <td className="px-3 py-3">{parameter.required ? "Sí" : "No"}</td>
          <td className="min-w-40 px-3 py-3 text-content-muted">{parameter.description}{parameter.defaultLabel && <span className="mt-1 block text-xs">Si se omite: <code>{parameter.defaultLabel}</code></span>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="mt-4 space-y-2 border-l-2 border-action pl-4 text-sm leading-6">{operation.rules.map(rule => <p key={rule}>{rule}</p>)}</div>
    <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-content-muted">Ejemplo con datos sintéticos</p>
    <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs leading-6" tabIndex={0} aria-label={`Configuración de ejemplo: ${operation.name}`}><code>{JSON.stringify(operation.example.params, null, 2)}</code></pre>
    <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
      <DataDiffTable data={operation.example.before} caption={`Antes · ${operation.name}`} />
      {operation.example.secondary && <DataDiffTable data={operation.example.secondary} caption={`Fuente secundaria · ${operation.name}`} />}
      <div className={operation.example.secondary ? "min-w-0 sm:col-span-2" : "min-w-0"}><DataDiffTable data={operation.example.after} caption={`Después · ${operation.name}`} result /></div>
    </div>
    <p className="mt-4 rounded-lg bg-warning-surface p-3 text-sm leading-6 text-warning"><strong>Si el resultado no es el esperado: </strong>{operation.troubleshooting}</p>
  </article>;
}
