import type { ExecutionPlan, RunSettings } from "@mapgen/pipeline/execution-plan.js";
import type { TraceSink, TraceSession } from "@mapgen/trace/index.js";
import { createTraceSession, sha256Hex, stableStringify } from "@mapgen/trace/index.js";

interface PlanFingerprintInput {
  version: number;
  recipeSchemaVersion: number;
  recipeId: string | null;
  settings: RunSettings;
  nodes: Array<{ nodeId: string; stepId: string; config: unknown }>;
}

function stripTraceSettings(settings: RunSettings): RunSettings {
  const { trace: _trace, ...rest } = settings as RunSettings & { trace?: unknown };
  return rest;
}

export function computePlanFingerprint(plan: ExecutionPlan): string {
  const fingerprintInput: PlanFingerprintInput = {
    version: 1,
    recipeSchemaVersion: plan.recipeSchemaVersion,
    recipeId: plan.recipeId ?? null,
    settings: stripTraceSettings(plan.settings),
    nodes: plan.nodes.map((node) => ({
      nodeId: node.nodeId,
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
    config: plan.settings.trace ?? null,
    sink,
  });
}
