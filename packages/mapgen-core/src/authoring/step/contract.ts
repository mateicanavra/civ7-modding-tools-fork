import type { TSchema } from "typebox";

import { applySchemaConventions } from "../schema.js";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";

export type StepContract<Schema extends TSchema, Id extends string> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: Schema;
}>;

const STEP_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function defineStepContract<const Schema extends TSchema, const Id extends string>(
  def: StepContract<Schema, Id>
): typeof def {
  if (!STEP_ID_RE.test(def.id)) {
    throw new Error(`step id "${def.id}" must be kebab-case (e.g. "plot-vegetation")`);
  }
  applySchemaConventions(def.schema, `step:${def.id}.schema`);
  return def;
}
