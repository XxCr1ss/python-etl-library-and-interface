import { ArrowRight, Database, FileInput, ListChecks, Network } from "lucide-react";
import { joinExamples } from "../data/joinExamples";
import { DataDiffTable } from "./DataDiffTable";

export function JoinExamples() {
  return <div className="mt-5 space-y-5">{joinExamples.map(example => <figure key={example.title} className="min-w-0 rounded-xl border border-line p-4">
    <figcaption className="font-semibold">{example.title}</figcaption>
    <p className="my-3 text-sm leading-7 text-content-muted">{example.explanation}</p>
    <p className="mb-3 break-words font-mono text-xs">left_join · on = {JSON.stringify(example.params.on)}</p>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2"><DataDiffTable data={example.before} caption={`Izquierda · ${example.title}`} />{example.secondary && <DataDiffTable data={example.secondary} caption={`Derecha · ${example.title}`} />}
      <div className="min-w-0 sm:col-span-2"><DataDiffTable data={example.after} caption={`Resultado · ${example.title}`} result /></div>
    </div>
  </figure>)}</div>;
}

export function PipelineDiagram() {
  const stages = [{ name: "Extraer", text: "Archivo, tabla o calendario", Icon: FileInput }, { name: "Transformar", text: "Receta y preview vigente", Icon: ListChecks }, { name: "Cargar", text: "Destino probado y confirmado", Icon: Database }];
  return <figure className="my-6 rounded-xl border border-line bg-surface-muted p-4 sm:p-6">
    <figcaption className="mb-4 text-sm font-semibold">El recorrido de tus datos</figcaption>
    <ol className="grid gap-3 lg:grid-cols-3">{stages.map(({ name, text, Icon }, index) => <li key={name} className="relative rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-action"><Icon aria-hidden className="h-5 w-5" /><span className="text-xs font-bold">0{index + 1}</span>{index < 2 && <ArrowRight aria-hidden className="ml-auto h-4 w-4" />}</div>
      <p className="mt-3 font-semibold">{name}</p><p className="mt-1 text-sm text-content-muted">{text}</p>
    </li>)}</ol>
    <p className="mt-4 text-xs leading-6 text-content-muted">Una receta puede estar vacía o repetir operaciones. El reporte confirma el total de filas del destino; si el resultado es desconocido, comprueba la tabla antes de repetir.</p>
  </figure>;
}

export function SessionDiagram() {
  return <figure className="my-5 rounded-xl border border-line p-4">
    <figcaption className="flex items-center gap-2 font-semibold"><Network aria-hidden className="h-4 w-4 text-action" /> Dos pestañas, un origen confirmado</figcaption>
    <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
      <li className="rounded-lg bg-surface-muted p-3"><strong>1. Pestaña ETL</strong><p className="mt-1 text-content-muted">Abre el diagrama desde Extracción y vuelve a Transformación.</p></li>
      <li className="rounded-lg bg-surface-muted p-3"><strong>2. Diagrama E-R</strong><p className="mt-1 text-content-muted">Selecciona una tabla, revisa su muestra y solicita usarla.</p></li>
      <li className="rounded-lg bg-surface-muted p-3"><strong>3. Confirmación en ETL</strong><p className="mt-1 text-content-muted">Acepta la sustitución. Cancelar conserva el origen anterior.</p></li>
    </ol>
  </figure>;
}

export function DimensionalDiagram() {
  return <figure className="my-5 rounded-xl border border-line p-4">
    <figcaption className="font-semibold">Modelo dimensional de ejemplo</figcaption>
    <div className="mt-4 grid items-center gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-line bg-surface-muted p-3 text-sm"><p className="font-bold">dim_cliente</p><p className="mt-2 font-mono text-xs">id · PK<br />nombre<br />ciudad</p></div>
      <div className="text-center text-sm text-content-muted"><span aria-hidden>← </span>fact_venta.id_cliente referencia dim_cliente.id</div>
      <div className="rounded-lg border border-line bg-surface-muted p-3 text-sm"><p className="font-bold">fact_venta</p><p className="mt-2 font-mono text-xs">id_cliente · FK<br />fecha<br />importe</p></div>
    </div>
    <p className="mt-4 text-xs leading-6 text-content-muted">La dimensión describe al cliente; los hechos contienen medidas. Configurar esta relación en el formulario no certifica la integridad referencial ni crea automáticamente un modelo completo.</p>
  </figure>;
}
