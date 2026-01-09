import { planFloodplains } from "./ops/plan-floodplains/index.js";
import { planStarts } from "./ops/plan-starts/index.js";
import { planWonders } from "./ops/plan-wonders/index.js";
import type { DomainOpCompileAny, DomainOpRuntime, OpsById } from "@swooper/mapgen-core/authoring";
import { runtimeOp } from "@swooper/mapgen-core/authoring";

export const ops = {
  planFloodplains,
  planStarts,
  planWonders,
} as const;

type PlacementOp = (typeof ops)[keyof typeof ops];

export const compileOpsById: OpsById<PlacementOp> = buildOpsById(ops);
export const runtimeOpsById: OpsById<DomainOpRuntime<PlacementOp>> = buildRuntimeOpsById(ops);

export { planFloodplains, planStarts, planWonders };

export { PlanFloodplainsContract } from "./ops/plan-floodplains/contract.js";
export { PlanStartsContract } from "./ops/plan-starts/contract.js";
export { PlanWondersContract } from "./ops/plan-wonders/contract.js";

function buildOpsById<const TOps extends Record<string, DomainOpCompileAny>>(
  input: TOps
): OpsById<TOps[keyof TOps]> {
  const out: Partial<OpsById<TOps[keyof TOps]>> = {};
  for (const op of Object.values(input) as Array<TOps[keyof TOps]>) {
    out[op.id as TOps[keyof TOps]["id"]] = op as OpsById<TOps[keyof TOps]>[TOps[keyof TOps]["id"]];
  }
  return out as OpsById<TOps[keyof TOps]>;
}

function buildRuntimeOpsById<const TOps extends Record<string, DomainOpCompileAny>>(
  input: TOps
): OpsById<DomainOpRuntime<TOps[keyof TOps]>> {
  const out: Partial<OpsById<DomainOpRuntime<TOps[keyof TOps]>>> = {};
  for (const op of Object.values(input) as Array<TOps[keyof TOps]>) {
    const runtime = runtimeOp(op);
    out[runtime.id as DomainOpRuntime<TOps[keyof TOps]>["id"]] =
      runtime as OpsById<DomainOpRuntime<TOps[keyof TOps]>>[DomainOpRuntime<TOps[keyof TOps]>["id"]];
  }
  return out as OpsById<DomainOpRuntime<TOps[keyof TOps]>>;
}
