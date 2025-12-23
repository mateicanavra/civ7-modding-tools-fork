import type { StageManifest } from "@mapgen/config/index.js";
import { DuplicateStepError, UnknownStepError } from "@mapgen/pipeline/errors.js";
import { validateDependencyTags } from "@mapgen/pipeline/tags.js";
import type { MapGenStep } from "@mapgen/pipeline/types.js";
import type { StepConfigView } from "@mapgen/pipeline/step-config.js";

export class StepRegistry<TContext, TConfig = StepConfigView> {
  private readonly steps = new Map<string, MapGenStep<TContext, TConfig>>();

  register(step: MapGenStep<TContext, TConfig>): void {
    if (this.steps.has(step.id)) {
      throw new DuplicateStepError(step.id);
    }
    validateDependencyTags(step.requires);
    validateDependencyTags(step.provides);
    this.steps.set(step.id, step);
  }

  get(stepId: string): MapGenStep<TContext, TConfig> {
    const step = this.steps.get(stepId);
    if (!step) throw new UnknownStepError(stepId);
    return step;
  }

  has(stepId: string): boolean {
    return this.steps.has(stepId);
  }

  /**
   * Standard recipe for M3: execute STAGE_ORDER filtered by the resolved stage manifest.
   * The recipe IDs must match stage ids (1:1 mapping).
   */
  getStandardRecipe(stageManifest: Readonly<StageManifest>): string[] {
    const order = Array.isArray(stageManifest.order) ? stageManifest.order : [];
    const stages = stageManifest.stages ?? {};
    const enabled = (id: string): boolean => stages[id]?.enabled !== false;
    return order.filter(enabled);
  }
}
