"use client";
import { useState } from "react";
import { uploadFile } from "@/services/extractApi";
import { useExtractRequest } from "./useExtractRequest";
import type { ExtractResult } from "./types";

export function useFileExtract(active: boolean) {
  const [file, setFile] = useState<File | null>(null);
  const request = useExtractRequest<ExtractResult>(active);
  function select(files: File[]) {
    request.invalidate(); setFile(null);
    if (!files.length) return;
    if (files.length !== 1) { request.invalidate("Selecciona un solo archivo por vez."); return; }
    if (!/\.(csv|xlsx|xls)$/i.test(files[0].name)) { request.invalidate("Formato no soportado. Usa .csv, .xlsx o .xls."); return; }
    setFile(files[0]);
  }
  function submit() {
    if (!file) return;
    void request.run(async signal => {
      const data = await uploadFile(file, signal);
      return { data, label: data.filename, count: { kind: "dataset", value: data.total_rows },
        source: { type: "file", filepath: data.filepath, filename: data.filename, unique_filename: data.unique_filename, total_rows: data.total_rows } };
    });
  }
  return { ...request, file, select, submit };
}
