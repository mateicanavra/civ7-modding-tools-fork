import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { TSchema } from "typebox";
import { Value } from "typebox/value";
import {
  MissingDependencyError,
  UnsatisfiedProvidesError,
} from "@mapgen/pipeline/errors.js";
import type { ExecutionPlan } from "@mapgen/pipeline/execution-plan.js";
import {
  computeInitialSatisfiedTags,
  isDependencyTagSatisfied,
  validateDependencyTags,
} from "@mapgen/pipeline/tags.js";
import type { MapGenStep } from "@mapgen/pipeline/types.js";
import type { StepRegistry } from "@mapgen/pipeline/StepRegistry.js";
import type { PipelineStepResult } from "@mapgen/pipeline/types.js";

export interface PipelineExecutorOptions {
  logPrefix?: string;
  log?: (message: string) => void;
}

function nowMs(): number {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
  } catch {
    // ignore
  }
  return Date.now();
}

function resolveStepConfig(schema: TSchema | undefined): unknown {
  if (!schema) return {};
  const defaulted = Value.Default(schema, {});
  const converted = Value.Convert(schema, defaulted);
  return Value.Clean(schema, converted);
}

export class PipelineExecutor<TContext extends ExtendedMapContext, TConfig = unknown> {
  private readonly registry: StepRegistry<TContext>;
  private readonly log: (message: string) => void;
  private readonly logPrefix: string;

  constructor(registry: StepRegistry<TContext>, options: PipelineExecutorOptions = {}) {
    this.registry = registry;
    this.log = options.log ?? console.log;
    this.logPrefix = options.logPrefix ?? "[PipelineExecutor]";
  }

  execute(
    context: TContext,
    recipe: readonly string[]
  ): { stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> } {
    const nodes = recipe.map((id) => {
      const step = this.registry.get<TConfig>(id);
      return {
        step,
        config: resolveStepConfig(step.configSchema) as TConfig,
        label: id,
      };
    });
    return this.executeNodes(context, nodes);
  }

  executePlan(
    context: TContext,
    plan: ExecutionPlan
  ): { stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> } {
    const nodes = plan.nodes.map((node) => ({
      step: this.registry.get<TConfig>(node.stepId),
      config: node.config as TConfig,
      label: node.nodeId ?? node.stepId,
    }));
    return this.executeNodes(context, nodes);
  }

  private executeNodes(
    context: TContext,
    nodes: Array<{ step: MapGenStep<TContext, TConfig>; config: TConfig; label: string }>
  ): { stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> } {
    const stepResults: PipelineStepResult[] = [];
    const satisfied = computeInitialSatisfiedTags(context);
    const satisfactionState = { satisfied };

    const total = nodes.length;

    for (let index = 0; index < total; index++) {
      const node = nodes[index];
      const step = node.step;
      validateDependencyTags(step.requires);
      validateDependencyTags(step.provides);

      const missing = step.requires.filter(
        (tag) => !isDependencyTagSatisfied(tag, context, satisfactionState)
      );
      if (missing.length > 0) {
        throw new MissingDependencyError({
          stepId: step.id,
          missing,
          satisfied: Array.from(satisfied).sort(),
        });
      }

      this.log(`${this.logPrefix} [${index + 1}/${total}] start ${node.label}`);
      const t0 = nowMs();
      try {
        const res = step.run(context, node.config);
        if (res && typeof (res as Promise<void>).then === "function") {
          throw new Error(
            `Step "${step.id}" returned a Promise in a sync executor call. Use executeAsync().`
          );
        }
        for (const tag of step.provides) satisfied.add(tag);

        const missingProvides = step.provides.filter((tag) => {
          // Only verify tags that have concrete satisfaction checks.
          if (
            tag === "artifact:foundation" ||
            tag === "artifact:heightfield" ||
            tag === "artifact:climateField" ||
            tag === "artifact:storyOverlays" ||
            tag === "artifact:riverAdjacency" ||
            tag.startsWith("field:")
          ) {
            return !isDependencyTagSatisfied(tag, context, satisfactionState);
          }
          return false;
        });
        if (missingProvides.length > 0) {
          throw new UnsatisfiedProvidesError(step.id, missingProvides);
        }

        const durationMs = nowMs() - t0;
        this.log(
          `${this.logPrefix} [${index + 1}/${total}] ok ${node.label} (${durationMs.toFixed(2)}ms)`
        );
        stepResults.push({ stepId: step.id, success: true, durationMs });
      } catch (err) {
        const durationMs = nowMs() - t0;
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.log(
          `${this.logPrefix} [${index + 1}/${total}] fail ${node.label} (${durationMs.toFixed(
            2
          )}ms): ${errorMessage}`
        );
        stepResults.push({
          stepId: step.id,
          success: false,
          durationMs,
          error: errorMessage,
        });
        break;
      }
    }

    return { stepResults, satisfied };
  }

  async executeAsync(
    context: TContext,
    recipe: readonly string[]
  ): Promise<{ stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> }> {
    const nodes = recipe.map((id) => {
      const step = this.registry.get<TConfig>(id);
      return {
        step,
        config: resolveStepConfig(step.configSchema) as TConfig,
        label: id,
      };
    });
    return this.executeNodesAsync(context, nodes);
  }

  async executePlanAsync(
    context: TContext,
    plan: ExecutionPlan
  ): Promise<{ stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> }> {
    const nodes = plan.nodes.map((node) => ({
      step: this.registry.get<TConfig>(node.stepId),
      config: node.config as TConfig,
      label: node.nodeId ?? node.stepId,
    }));
    return this.executeNodesAsync(context, nodes);
  }

  private async executeNodesAsync(
    context: TContext,
    nodes: Array<{ step: MapGenStep<TContext, TConfig>; config: TConfig; label: string }>
  ): Promise<{ stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> }> {
    const stepResults: PipelineStepResult[] = [];
    const satisfied = computeInitialSatisfiedTags(context);
    const satisfactionState = { satisfied };

    const total = nodes.length;

    for (let index = 0; index < total; index++) {
      const node = nodes[index];
      const step = node.step;
      validateDependencyTags(step.requires);
      validateDependencyTags(step.provides);

      const missing = step.requires.filter(
        (tag) => !isDependencyTagSatisfied(tag, context, satisfactionState)
      );
      if (missing.length > 0) {
        throw new MissingDependencyError({
          stepId: step.id,
          missing,
          satisfied: Array.from(satisfied).sort(),
        });
      }

      this.log(`${this.logPrefix} [${index + 1}/${total}] start ${node.label}`);
      const t0 = nowMs();
      try {
        await step.run(context, node.config);
        for (const tag of step.provides) satisfied.add(tag);

        const missingProvides = step.provides.filter((tag) => {
          if (
            tag === "artifact:foundation" ||
            tag === "artifact:heightfield" ||
            tag === "artifact:climateField" ||
            tag === "artifact:storyOverlays" ||
            tag === "artifact:riverAdjacency" ||
            tag.startsWith("field:")
          ) {
            return !isDependencyTagSatisfied(tag, context, satisfactionState);
          }
          return false;
        });
        if (missingProvides.length > 0) {
          throw new UnsatisfiedProvidesError(step.id, missingProvides);
        }

        const durationMs = nowMs() - t0;
        this.log(
          `${this.logPrefix} [${index + 1}/${total}] ok ${node.label} (${durationMs.toFixed(2)}ms)`
        );
        stepResults.push({ stepId: step.id, success: true, durationMs });
      } catch (err) {
        const durationMs = nowMs() - t0;
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.log(
          `${this.logPrefix} [${index + 1}/${total}] fail ${node.label} (${durationMs.toFixed(
            2
          )}ms): ${errorMessage}`
        );
        stepResults.push({
          stepId: step.id,
          success: false,
          durationMs,
          error: errorMessage,
        });
        break;
      }
    }

    return { stepResults, satisfied };
  }
}
