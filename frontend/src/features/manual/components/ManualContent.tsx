import Link from "next/link";
import { manualSections } from "../data/manualSections";
import { transformations } from "../data/transformationsCatalog";
import { TransformationCard } from "./TransformationCard";
import { DimensionalDiagram, JoinExamples, PipelineDiagram, SessionDiagram } from "./VisualDiagrams";

export function ManualContent() {
  const families = Array.from(new Set(transformations.map(operation => operation.family)));
  return <div className="min-w-0 space-y-10">
    {manualSections.map((section, index) => <section key={section.id} aria-labelledby={section.id} className="min-w-0">
      <div className="mb-5 border-b border-line pb-5"><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-action">Guía {String(index + 1).padStart(2, "0")}</p>
        <h2 id={section.id} data-manual-anchor tabIndex={-1} className="manual-anchor text-2xl font-bold tracking-tight">{section.title}</h2>
        <p className="mt-2 text-sm leading-7 text-content-muted">{section.summary}</p>
      </div>
      {section.id === "introduccion" && <PipelineDiagram />}
      <div className="space-y-7">{section.topics.map(topic => <div key={topic.id}>
        <h3 id={topic.id} data-manual-anchor tabIndex={-1} className="manual-anchor mb-3 text-lg font-semibold">{topic.title}</h3>
        <div className="space-y-3 text-sm leading-7 text-content-muted">{topic.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
        {topic.steps && <ol className="mt-4 list-decimal space-y-2 rounded-lg bg-surface-muted p-5 pl-10 text-sm leading-7">{topic.steps.map(step => <li key={step}>{step}</li>)}</ol>}
        {topic.note && <p className="mt-4 border-l-2 border-action bg-surface-muted p-4 text-sm leading-7">{topic.note}</p>}
        {topic.id === "diagrama-er" && <SessionDiagram />}
        {topic.id === "modelo-dimensional" && <DimensionalDiagram />}
        {topic.id === "fuentes-secundarias" && <JoinExamples />}
        {topic.links && <div className="mt-3 flex flex-wrap gap-4">{topic.links.map(link => <Link key={link.href} href={link.href} className="text-sm font-semibold text-action underline underline-offset-4">{link.label}</Link>)}</div>}
      </div>)}</div>
    </section>)}
    <section aria-labelledby="catalogo" className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-action">Referencia de operaciones</p>
      <h2 id="catalogo" data-manual-anchor tabIndex={-1} className="manual-anchor mt-2 text-2xl font-bold">Catálogo de transformaciones</h2>
      <p className="mt-3 text-sm leading-7 text-content-muted">{transformations.length} operaciones en {families.length} familias. Los ejemplos son datos sintéticos de consulta y no ejecutan acciones. Las claves técnicas ayudan a encontrar el mismo paso en una receta.</p>
      <div className="mt-5 rounded-lg bg-surface-muted p-4 text-sm leading-7 text-content-muted">En las tablas: NULL indica ausencia, &quot;&quot; indica texto vacío, 0 es un número y false es un booleano. Los valores predeterminados son los del servidor cuando se omite el campo; el formulario puede proponer otro valor, como id para el índice.</div>
      {families.map(family => <div key={family} className="mt-10 space-y-5">
        <h3 className="text-lg font-semibold">{family} <span className="text-sm font-normal text-content-muted">· {transformations.filter(operation => operation.family === family).length}</span></h3>
        {transformations.filter(operation => operation.family === family).map(operation => <TransformationCard key={operation.type} operation={operation} />)}
      </div>)}
    </section>
    <p className="border-t border-line pt-5 text-xs leading-6 text-content-muted">Revisión editorial: 22 de octubre de 2026. Los ejemplos describen el motor disponible en esta versión. Ante diferencias, revisa la preview del proceso actual antes de cargar.</p>
  </div>;
}
