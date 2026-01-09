import type { Env } from "@mapgen/core/env.js";
import type { ExecutionPlan } from "@mapgen/engine/execution-plan.js";
import type { TraceSink, TraceSession } from "@mapgen/trace/index.js";
import { createTraceSession, sha256Hex, stableStringify } from "@mapgen/trace/index.js";

interface PlanFingerprintInput {
  version: number;
  recipeSchemaVersion: number;
  recipeId: string | null;
  env: Env;
  nodes: Array<{ stepId: string; config: unknown }>;
}

function stripTraceEnv(env: Env): Env {
  const { trace: _trace, ...rest } = env as Env & { trace?: unknown };
  return rest as Env;
}

export function computePlanFingerprint(plan: ExecutionPlan): string {
  const fingerprintInput: PlanFingerprintInput = {
    version: 1,
    recipeSchemaVersion: plan.recipeSchemaVersion,
    recipeId: plan.recipeId ?? null,
    env: stripTraceEnv(plan.env),
    nodes: plan.nodes.map((node) => ({
      stepId: node.stepId,
      config: node.config ?? {},
    })),
  };

  return sha256Hex(stableStringify(fingerprintInput));
}

export function deriveRunId(plan: ExecutionPlan): string {
  return computePlanFingerprint(plan);
}

export function createTraceSessionFromPlan(
  plan: ExecutionPlan,
  sink: TraceSink | null | undefined
): TraceSession {
  return createTraceSession({
    runId: deriveRunId(plan),
    planFingerprint: computePlanFingerprint(plan),
    config: plan.env.trace ?? null,
    sink,
  });
}
