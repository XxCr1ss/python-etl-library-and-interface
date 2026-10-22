import type { ExtractionPreview, RowCount, SourceDto, SourceDescriptor, SavedConnectionReference } from "@/types/etl";

export interface ExtractResult {
  source: (SourceDto | (Omit<Extract<SourceDescriptor, { type: "database" }>, "credentialRef"> & { savedConnection: SavedConnectionReference })) & { filename?: string; unique_filename?: string; total_rows: number };
  data: ExtractionPreview;
  count: RowCount;
  label: string;
  columns?: string[];
}
