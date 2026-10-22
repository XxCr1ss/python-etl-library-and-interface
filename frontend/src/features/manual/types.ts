import type { JsonRow, JsonValue, StepParamsByType, StepType } from "@/types/etl";

export interface ExampleTable { columns: string[]; rows: JsonRow[] }
export interface TransformationExample {
  params: Record<string, JsonValue>;
  before: ExampleTable;
  secondary?: ExampleTable;
  after: ExampleTable;
}
export interface ManualParameter {
  key: string; type: string; description: string; required: boolean; defaultLabel?: string;
}
type ParameterKey<K extends StepType> = K extends StepType ? keyof StepParamsByType[K] & string : never;
export interface TransformationDoc<K extends StepType = StepType> {
  type: K; name: string; family: string; description: string;
  parameters: (ManualParameter & { key: ParameterKey<K> })[];
  instructions: string[]; rules: string[]; troubleshooting: string;
  example: TransformationExample;
}
export interface ManualTopic {
  id: string; title: string; paragraphs: string[]; steps?: string[]; note?: string;
  links?: { href: string; label: string }[];
}
export interface ManualSection {
  id: string; title: string; summary: string; topics: ManualTopic[];
}
export interface ManualEntry { id: string; title: string; group: string; keywords: string }
