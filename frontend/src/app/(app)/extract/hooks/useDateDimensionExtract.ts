"use client";
import { useState } from "react";
import { previewDateDimension } from "@/services/extractApi";
import { useExtractRequest } from "./useExtractRequest";
import type { ExtractResult } from "./types";

export function useDateDimensionExtract(active: boolean) {
  const [draft, setDraft] = useState({ start_year: String(new Date().getFullYear() - 5), end_year: String(new Date().getFullYear()) });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof draft, string>>>({});
  const request = useExtractRequest<ExtractResult>(active);
  function edit(patch: Partial<typeof draft>) { request.invalidate(); setErrors({}); setDraft(current => ({ ...current, ...patch })); }
  function submit() {
    const invalid: typeof errors = {};
    for (const key of ["start_year", "end_year"] as const) {
      if (!/^\d+$/.test(draft[key]) || Number(draft[key]) < 100 || Number(draft[key]) > 9999) invalid[key] = "Usa un año entero entre 100 y 9999.";
    }
    if (!Object.keys(invalid).length && Number(draft.start_year) > Number(draft.end_year)) invalid.end_year = "El año final debe ser igual o posterior al inicial.";
    setErrors(invalid); if (Object.keys(invalid).length) return;
    const years = { start_year: Number(draft.start_year), end_year: Number(draft.end_year) };
    void request.run(async signal => {
      const data = await previewDateDimension(years, signal);
      return { data, label: `Dimensión fecha ${years.start_year}–${years.end_year}`, count: { kind: "dataset", value: data.total_rows },
        source: { type: "date_dimension", ...years, total_rows: data.total_rows } };
    });
  }
  return { ...request, draft, errors, edit, submit };
}
