import type { SourceDescriptor, StepParamsByType } from "@/types/etl";
import { parseSource } from "@/types/etlValidation";
import { CredentialStore } from "@/state/credentialStore";
import { sourceLabel } from "@/state/pipelineLabels";
import { defineStep, fieldsFor } from "./factory";
import * as c from "./codecs";
import { MultiSourceForm } from "../forms/MultiSourceForm";
import type { FieldErrors, StepContext } from "../types";

const source: c.Codec<SourceDescriptor> = { format: JSON.stringify, parse: raw => parseSource(JSON.parse(raw), new CredentialStore()) };
const union = fieldsFor<StepParamsByType["union"]>();
const join = fieldsFor<StepParamsByType["left_join"]>();
const group = "Cruces y combinación";
const joinSummary = (params: StepParamsByType["left_join"]) => `${sourceLabel(params.right_source)} · Claves: ${JSON.stringify(params.on)}`;
const unconfirmed: SourceDescriptor = { type: "file", filepath: "" };
function validateJoin(p: StepParamsByType["left_join"], ctx: StepContext): FieldErrors {
  const keys = typeof p.on === "string" ? [p.on] : p.on;
  if (!keys.length) return { on: "Selecciona al menos una clave." };
  const right = ctx.secondaryColumns;
  if (keys.length === 2 && !keys.every(key => ctx.columns.includes(key) && (!right || right.includes(key)))) {
    if (!ctx.columns.includes(keys[0]) || (right && !right.includes(keys[1]))) return { on: "Usa [clave_izquierda, clave_derecha] existentes en sus fuentes." };
  } else if (keys.some(key => !ctx.columns.includes(key) || (right && !right.includes(key)))) return { on: "Las claves compartidas deben existir en ambas fuentes." };
  return {};
}
const joinFields = [join("right_source", "Fuente derecha", "source", source), join("on", "Claves de cruce (texto o lista JSON)", "json", c.columns,
  'Ejemplo: "id", ["id", "region"] o ["id", "customer_id"]. Dos nombres comunes a ambas fuentes son una clave compuesta; en otro caso representan izquierda/derecha. No se admiten pares múltiples con nombres distintos.')];
export const sources = {
  union: { ...defineStep("union", "Unión Vertical", group, "Apilar filas de otro origen con secondary_source.", { secondary_source: unconfirmed }, [union("secondary_source", "Fuente secundaria", "source", source)]), Form: MultiSourceForm, summary: (params: StepParamsByType["union"]) => `Apilar filas de ${sourceLabel(params.secondary_source)}` },
  left_join: { ...defineStep("left_join", "Unión Horizontal · Left", group, "Conservar todas las filas izquierdas.", { right_source: unconfirmed, on: "" }, joinFields, validateJoin), Form: MultiSourceForm, summary: joinSummary },
  right_join: { ...defineStep("right_join", "Unión Horizontal · Right", group, "Conservar todas las filas derechas.", { right_source: unconfirmed, on: "" }, joinFields, validateJoin), Form: MultiSourceForm, summary: joinSummary },
  inner_join: { ...defineStep("inner_join", "Unión Horizontal · Inner", group, "Conservar solo coincidencias.", { right_source: unconfirmed, on: "" }, joinFields, validateJoin), Form: MultiSourceForm, summary: joinSummary },
  outer_join: { ...defineStep("outer_join", "Unión Horizontal · Outer", group, "Conservar filas de ambas fuentes.", { right_source: unconfirmed, on: "" }, joinFields, validateJoin), Form: MultiSourceForm, summary: joinSummary },
};
