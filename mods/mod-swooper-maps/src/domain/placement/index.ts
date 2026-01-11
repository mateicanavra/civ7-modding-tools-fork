import { planFloodplains } from "./ops/plan-floodplains/index.js";
import { planStarts } from "./ops/plan-starts/index.js";
import { planWonders } from "./ops/plan-wonders/index.js";
import type { DomainOpCompileAny, DomainOpRuntimeAny } from "@swooper/mapgen-core/authoring";
import { runtimeOp } from "@swooper/mapgen-core/authoring";

export const ops = {
  planFloodplains,
  planStarts,
  planWonders,
} as const;

export const compileOpsById = buildOpsById(ops);
export const runtimeOpsById = buildRuntimeOpsById(compileOpsById);

export { planFloodplains, planStarts, planWonders };

export { PlanFloodplainsContract } from "./ops/plan-floodplains/contract.js";
export { PlanStartsContract } from "./ops/plan-starts/contract.js";
export { PlanWondersContract } from "./ops/plan-wonders/contract.js";

function buildOpsById<const TOps extends Record<string, DomainOpCompileAny>>(
  input: TOps
): Readonly<Record<string, DomainOpCompileAny>> {
  const out: Record<string, DomainOpCompileAny> = {};
  for (const op of Object.values(input)) out[op.id] = op;
  return out;
}

function buildRuntimeOpsById(
  input: Readonly<Record<string, DomainOpCompileAny>>
): Readonly<Record<string, DomainOpRuntimeAny>> {
  const out: Record<string, DomainOpRuntimeAny> = {};
  for (const [id, op] of Object.entries(input)) out[id] = runtimeOp(op);
  return out;
}
