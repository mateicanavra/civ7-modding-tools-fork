import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type * as placement from "@mapgen/domain/placement";
import type { PlacementInputsV1 } from "../../placement-inputs.js";
import { getBaseStarts, getStandardRuntime } from "../../../../runtime.js";

type PlanWondersConfig = Parameters<typeof placement.ops.planWonders.runValidated>[1];
type PlanFloodplainsConfig = Parameters<typeof placement.ops.planFloodplains.runValidated>[1];
type PlanStartsConfig = Parameters<typeof placement.ops.planStarts.runValidated>[1];

type PlacementRuntimeOps = {
  planStarts: Pick<typeof placement.ops.planStarts, "runValidated">;
  planWonders: Pick<typeof placement.ops.planWonders, "runValidated">;
  planFloodplains: Pick<typeof placement.ops.planFloodplains, "runValidated">;
};

export function buildPlacementInputs(
  context: ExtendedMapContext,
  config: {
    wonders: PlanWondersConfig;
    floodplains: PlanFloodplainsConfig;
    starts: PlanStartsConfig;
  },
  ops: PlacementRuntimeOps
): PlacementInputsV1 {
  const runtime = getStandardRuntime(context);
  const baseStarts = getBaseStarts(context);
  const startsPlan = ops.planStarts.runValidated({ baseStarts }, config.starts);
  const wondersPlan = ops.planWonders.runValidated({ mapInfo: runtime.mapInfo }, config.wonders);
  const floodplainsPlan = ops.planFloodplains.runValidated({}, config.floodplains);

  return {
    mapInfo: runtime.mapInfo,
    starts: startsPlan,
    wonders: wondersPlan,
    floodplains: floodplainsPlan,
    placementConfig: config,
  };
}
