import { DuplicateStepError, UnknownStepError } from "@mapgen/engine/errors.js";
import {
  TagRegistry,
  type DependencyTagDefinition,
  validateDependencyTags,
} from "@mapgen/engine/tags.js";
import type { MapGenStep } from "@mapgen/engine/types.js";

export class StepRegistry<TContext> {
  private readonly steps = new Map<string, MapGenStep<TContext, unknown>>();
  private readonly tags: TagRegistry<TContext>;

  constructor(options: { tags?: TagRegistry<TContext> } = {}) {
    this.tags = options.tags ?? new TagRegistry<TContext>();
  }

  registerTag(definition: DependencyTagDefinition<TContext>): void {
    this.tags.registerTag(definition);
  }

  registerTags(definitions: readonly DependencyTagDefinition<TContext>[]): void {
    this.tags.registerTags(definitions);
  }

  getTagRegistry(): TagRegistry<TContext> {
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

}
