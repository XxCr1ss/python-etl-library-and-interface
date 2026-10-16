import type { StepType } from "@/types/etl";
import type { StepDefinition, StepRegistry } from "./types";
import { structure } from "./definitions/structure";
import { cleaning } from "./definitions/cleaning";
import { filters } from "./definitions/filters";
import { lists } from "./definitions/lists";
import { expressions } from "./definitions/expressions";
import { sources } from "./definitions/sources";

export const stepRegistry: StepRegistry = { ...structure, ...cleaning, ...filters, ...lists, ...expressions, ...sources };
export function getDefinition<K extends StepType>(type: K): StepDefinition<K> { return stepRegistry[type]; }
