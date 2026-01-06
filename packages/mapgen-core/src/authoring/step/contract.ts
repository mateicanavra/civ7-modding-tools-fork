import type { TSchema } from "typebox";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";

export type StepContract<Schema extends TSchema, Id extends string> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: Schema;
}>;

export function defineStepContract<const Schema extends TSchema, const Id extends string>(
  def: StepContract<Schema, Id>
): typeof def {
  return def;
}
