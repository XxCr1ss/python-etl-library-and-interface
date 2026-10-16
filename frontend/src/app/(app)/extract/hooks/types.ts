import type { ExtractionPreview, RowCount, SourceDto } from "@/types/etl";

export interface ExtractResult {
  source: SourceDto & { filename?: string; unique_filename?: string; total_rows: number };
  data: ExtractionPreview;
  count: RowCount;
  label: string;
  columns?: string[];
}
