import {
  MissingDependencyError,
  UnsatisfiedProvidesError,
} from "@mapgen/engine/errors.js";
import type { ExecutionPlan } from "@mapgen/engine/execution-plan.js";
import {
  computeInitialSatisfiedTags,
  isDependencyTagSatisfied,
  validateDependencyTags,
} from "@mapgen/engine/tags.js";
import type { EngineContext, MapGenStep } from "@mapgen/engine/types.js";
import type { StepRegistry } from "@mapgen/engine/StepRegistry.js";
import type { PipelineStepResult } from "@mapgen/engine/types.js";
import type { TraceSession } from "@mapgen/trace/index.js";
import { createNoopTraceSession } from "@mapgen/trace/index.js";

export interface PipelineExecutorOptions {
  logPrefix?: string;
  log?: (message: string) => void;
}

export interface PipelineExecutionOptions {
  trace?: TraceSession | null;
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

export class PipelineExecutor<TContext extends EngineContext, TConfig = unknown> {
  private readonly registry: StepRegistry<TContext>;
  private readonly log: (message: string) => void;
  private readonly logPrefix: string;

  constructor(registry: StepRegistry<TContext>, options: PipelineExecutorOptions = {}) {
    this.registry = registry;
    this.log = options.log ?? (() => undefined);
    this.logPrefix = options.logPrefix ?? "[PipelineExecutor]";
  }

  executePlan(
    context: TContext,
    plan: ExecutionPlan,
    options: PipelineExecutionOptions = {}
  ): { stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> } {
    const nodes = plan.nodes.map((node) => ({
      step: this.registry.get<TConfig>(node.stepId),
      config: node.config as TConfig,
    }));
    return this.executeNodes(context, nodes, options);
  }

  private executeNodes(
    context: TContext,
    nodes: Array<{ step: MapGenStep<TContext, TConfig>; config: TConfig }>,
    options: PipelineExecutionOptions = {}
  ): { stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> } {
    const stepResults: PipelineStepResult[] = [];
    const tagRegistry = this.registry.getTagRegistry();
    const satisfied = computeInitialSatisfiedTags(context);
    const satisfactionState = { satisfied };
    const trace = options.trace ?? createNoopTraceSession();
    const baseTrace = context.trace;

    const total = nodes.length;

    trace.emitRunStart();

    try {
      for (let index = 0; index < total; index++) {
        const node = nodes[index];
        const step = node.step;
        validateDependencyTags(step.requires, tagRegistry);
        validateDependencyTags(step.provides, tagRegistry);

        const missing = step.requires.filter(
          (tag) => !isDependencyTagSatisfied(tag, context, satisfactionState, tagRegistry)
        );
        if (missing.length > 0) {
          throw new MissingDependencyError({
            stepId: step.id,
            missing,
            satisfied: Array.from(satisfied).sort(),
          });
        }

        const stepMeta = { stepId: step.id, phase: step.phase };
        const previousTrace = context.trace;
        context.trace = trace.createStepScope(stepMeta);

        this.log(`${this.logPrefix} [${index + 1}/${total}] start ${step.id}`);
        trace.emitStepStart(stepMeta);
        const t0 = nowMs();
        try {
          const res = step.run(context, node.config);
          if (res && typeof (res as Promise<void>).then === "function") {
            throw new Error(
              `Step "${step.id}" returned a Promise in a sync executor call. Use executePlanAsync().`
            );
          }
          for (const tag of step.provides) satisfied.add(tag);

          const missingProvides = step.provides.filter(
            (tag) => !isDependencyTagSatisfied(tag, context, satisfactionState, tagRegistry)
          );
          if (missingProvides.length > 0) {
            throw new UnsatisfiedProvidesError(step.id, missingProvides);
          }

          const durationMs = nowMs() - t0;
          this.log(
            `${this.logPrefix} [${index + 1}/${total}] ok ${step.id} (${durationMs.toFixed(
              2
            )}ms)`
          );
          trace.emitStepFinish({ ...stepMeta, durationMs, success: true });
          stepResults.push({ stepId: step.id, success: true, durationMs });
        } catch (err) {
          const durationMs = nowMs() - t0;
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.log(
            `${this.logPrefix} [${index + 1}/${total}] fail ${step.id} (${durationMs.toFixed(
              2
            )}ms): ${errorMessage}`
          );
          trace.emitStepFinish({
            ...stepMeta,
            durationMs,
            success: false,
            error: errorMessage,
          });
          stepResults.push({
            stepId: step.id,
            success: false,
            durationMs,
            error: errorMessage,
          });
          break;
        } finally {
          context.trace = previousTrace;
        }
      }

      const success = stepResults.every((result) => result.success);
      const error = stepResults.find((result) => !result.success)?.error;
      trace.emitRunFinish({ success, error });
      return { stepResults, satisfied };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      trace.emitRunFinish({ success: false, error: errorMessage });
      throw err;
    } finally {
      context.trace = baseTrace;
    }
  }

  async executePlanAsync(
    context: TContext,
    plan: ExecutionPlan,
    options: PipelineExecutionOptions = {}
  ): Promise<{ stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> }> {
    const nodes = plan.nodes.map((node) => ({
      step: this.registry.get<TConfig>(node.stepId),
      config: node.config as TConfig,
    }));
    return this.executeNodesAsync(context, nodes, options);
  }

  private async executeNodesAsync(
    context: TContext,
    nodes: Array<{ step: MapGenStep<TContext, TConfig>; config: TConfig }>,
    options: PipelineExecutionOptions = {}
  ): Promise<{ stepResults: PipelineStepResult[]; satisfied: ReadonlySet<string> }> {
    const stepResults: PipelineStepResult[] = [];
    const tagRegistry = this.registry.getTagRegistry();
    const satisfied = computeInitialSatisfiedTags(context);
    const satisfactionState = { satisfied };
    const trace = options.trace ?? createNoopTraceSession();
    const baseTrace = context.trace;

    const total = nodes.length;

    trace.emitRunStart();

    try {
      for (let index = 0; index < total; index++) {
        const node = nodes[index];
        const step = node.step;
        validateDependencyTags(step.requires, tagRegistry);
        validateDependencyTags(step.provides, tagRegistry);

        const missing = step.requires.filter(
          (tag) => !isDependencyTagSatisfied(tag, context, satisfactionState, tagRegistry)
        );
        if (missing.length > 0) {
          throw new MissingDependencyError({
            stepId: step.id,
            missing,
            satisfied: Array.from(satisfied).sort(),
          });
        }

        const stepMeta = { stepId: step.id, phase: step.phase };
        const previousTrace = context.trace;
        context.trace = trace.createStepScope(stepMeta);

        this.log(`${this.logPrefix} [${index + 1}/${total}] start ${step.id}`);
        trace.emitStepStart(stepMeta);
        const t0 = nowMs();
        try {
          await step.run(context, node.config);
          for (const tag of step.provides) satisfied.add(tag);

          const missingProvides = step.provides.filter(
            (tag) => !isDependencyTagSatisfied(tag, context, satisfactionState, tagRegistry)
          );
          if (missingProvides.length > 0) {
            throw new UnsatisfiedProvidesError(step.id, missingProvides);
          }

          const durationMs = nowMs() - t0;
          this.log(
            `${this.logPrefix} [${index + 1}/${total}] ok ${step.id} (${durationMs.toFixed(
              2
            )}ms)`
          );
          trace.emitStepFinish({ ...stepMeta, durationMs, success: true });
          stepResults.push({ stepId: step.id, success: true, durationMs });
        } catch (err) {
          const durationMs = nowMs() - t0;
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.log(
            `${this.logPrefix} [${index + 1}/${total}] fail ${step.id} (${durationMs.toFixed(
              2
            )}ms): ${errorMessage}`
          );
          trace.emitStepFinish({
            ...stepMeta,
            durationMs,
            success: false,
            error: errorMessage,
          });
          stepResults.push({
            stepId: step.id,
            success: false,
            durationMs,
            error: errorMessage,
          });
          break;
        } finally {
          context.trace = previousTrace;
        }
      }

      const success = stepResults.every((result) => result.success);
      const error = stepResults.find((result) => !result.success)?.error;
      trace.emitRunFinish({ success, error });
      return { stepResults, satisfied };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      trace.emitRunFinish({ success: false, error: errorMessage });
      throw err;
    } finally {
      context.trace = baseTrace;
    }
  }
}
