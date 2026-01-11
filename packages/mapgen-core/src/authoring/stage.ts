import type { StageModule } from "./types.js";

function assertSchema(value: unknown, stepId?: string, stageId?: string): void {
  if (value == null) {
    const label = stepId ? `step "${stepId}"` : "step";
    const scope = stageId ? ` in stage "${stageId}"` : "";
    throw new Error(`createStage requires an explicit schema for ${label}${scope}`);
  }
}

const STEP_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertKebabCaseStepId(stepId: string, stageId?: string): void {
  if (!STEP_ID_RE.test(stepId)) {
    const scope = stageId ? `stage "${stageId}" step id "${stepId}"` : `step id "${stepId}"`;
    throw new Error(`${scope} must be kebab-case (e.g. "plot-vegetation")`);
  }
}

export function createStage<const TStage extends StageModule>(stage: TStage): TStage {
  for (const step of stage.steps) {
    assertKebabCaseStepId(step.id, stage.id);
    assertSchema(step.schema, step.id, stage.id);
  }
  return stage;
}
