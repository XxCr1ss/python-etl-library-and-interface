import type { Metadata } from "next";
import { BookOpen, Layers, Route } from "lucide-react";
import { ManualContent } from "@/features/manual/components/ManualContent";
import { ManualSidebar } from "@/features/manual/components/ManualSidebar";
import { manualSections } from "@/features/manual/data/manualSections";
import { transformations } from "@/features/manual/data/transformationsCatalog";
import type { ManualEntry } from "@/features/manual/types";
import "./manual.css";

export const metadata: Metadata = { title: "Manual de usuario · ETL Flow", description: "Guía de extracción, transformación y carga, con ejemplos y referencia de operaciones." };

export default function ManualPage() {
  const entries: ManualEntry[] = [
    ...manualSections.flatMap(section => [
      { id: section.id, title: section.title, group: "Guías de uso", keywords: section.summary },
      ...section.topics.map(topic => ({ id: topic.id, title: topic.title, group: section.title, keywords: topic.paragraphs.join(" ") })),
    ]),
    { id: "catalogo", title: "Catálogo de transformaciones", group: "Referencia", keywords: "operaciones pasos receta" },
    ...transformations.map(operation => ({ id: operation.type, title: operation.name, group: operation.family, keywords: `${operation.description} ${operation.parameters.map(parameter => parameter.key).join(" ")}` })),
  ];
  return <div id="manual-document" className="mx-auto min-w-0 max-w-[96rem] text-content">
    <header className="mb-8 overflow-hidden rounded-2xl border border-line bg-surface p-5 sm:p-8">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-action"><BookOpen aria-hidden className="h-4 w-4" />Centro de ayuda · ETL Flow</div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Manual de usuario</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-content-muted">Entiende cada etapa. Prepara tus datos con confianza y revisa qué ocurrirá antes de escribir en el destino.</p>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-5 text-xs text-content-muted"><span className="inline-flex items-center gap-2"><Route aria-hidden className="h-4 w-4" />{manualSections.length} guías de uso</span><span className="inline-flex items-center gap-2"><Layers aria-hidden className="h-4 w-4" />{transformations.length} operaciones documentadas</span><span>Ejemplos antes y después</span></div>
    </header>
    <div className="manual-layout grid min-w-0 items-start gap-6">
      <ManualSidebar entries={entries} /><ManualContent />
    </div>
  </div>;
}
