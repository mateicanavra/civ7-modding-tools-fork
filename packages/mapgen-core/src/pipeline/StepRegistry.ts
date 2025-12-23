import type { StageManifest } from "@mapgen/config/index.js";
import { DuplicateStepError, UnknownStepError } from "@mapgen/pipeline/errors.js";
import {
  createDefaultTagRegistry,
  type DependencyTagDefinition,
  type TagRegistry,
  validateDependencyTags,
} from "@mapgen/pipeline/tags.js";
import type { MapGenStep } from "@mapgen/pipeline/types.js";

export class StepRegistry<TContext> {
  private readonly steps = new Map<string, MapGenStep<TContext, unknown>>();
  private readonly tags: TagRegistry;

  constructor(options: { tags?: TagRegistry } = {}) {
    this.tags = options.tags ?? createDefaultTagRegistry();
  }

  registerTag(definition: DependencyTagDefinition): void {
    this.tags.registerTag(definition);
  }

  registerTags(definitions: readonly DependencyTagDefinition[]): void {
    this.tags.registerTags(definitions);
  }

  getTagRegistry(): TagRegistry {
    return this.tags;
  }

  register<TConfig>(step: MapGenStep<TContext, TConfig>): void {
    if (this.steps.has(step.id)) {
      throw new DuplicateStepError(step.id);
    }
    validateDependencyTags(step.requires, this.tags);
    validateDependencyTags(step.provides, this.tags);
    this.steps.set(step.id, step as MapGenStep<TContext, unknown>);
  }

  get<TConfig = unknown>(stepId: string): MapGenStep<TContext, TConfig> {
    const step = this.steps.get(stepId);
    if (!step) throw new UnknownStepError(stepId);
    return step as MapGenStep<TContext, TConfig>;
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
