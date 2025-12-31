import type { StageModule } from "./types.js";

function assertSchema(value: unknown, stepId?: string, stageId?: string): void {
  if (value == null) {
    const label = stepId ? `step "${stepId}"` : "step";
    const scope = stageId ? ` in stage "${stageId}"` : "";
    throw new Error(`createStage requires an explicit schema for ${label}${scope}`);
  }
}

export function createStage<const TStage extends StageModule>(stage: TStage): TStage {
  for (const step of stage.steps) {
    assertSchema(step.schema, step.id, stage.id);
  }
  return stage;
}
