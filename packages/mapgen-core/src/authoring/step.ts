import type { StepModule } from "./types.js";

function assertSchema(value: unknown, stepId?: string): void {
  if (value == null) {
    const label = stepId ? `step "${stepId}"` : "step";
    throw new Error(`createStep requires an explicit schema for ${label}`);
  }
}

export function createStep<const TStep extends StepModule>(step: TStep): TStep {
  assertSchema(step.schema, step.id);
  return step;
}
