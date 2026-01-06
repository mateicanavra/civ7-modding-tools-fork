import type { ExtendedMapContext } from "@swooper/mapgen-core";
import * as placement from "@mapgen/domain/placement";
import type { PlacementInputsV1 } from "../../placement-inputs.js";
import { getBaseStarts, getStandardRuntime } from "../../../../runtime.js";

export function buildPlacementInputs(
  context: ExtendedMapContext,
  config: {
    wonders: placement.PlanWondersConfig;
    floodplains: placement.PlanFloodplainsConfig;
    starts: placement.PlanStartsConfig;
  }
): PlacementInputsV1 {
  const runtime = getStandardRuntime(context);
  const baseStarts = getBaseStarts(context);
  const startsPlan = placement.ops.planStarts.runValidated(
    { baseStarts },
    config.starts
  );
  const wondersPlan = placement.ops.planWonders.runValidated(
    { mapInfo: runtime.mapInfo },
    config.wonders
  );
  const floodplainsPlan = placement.ops.planFloodplains.runValidated({}, config.floodplains);

  return {
    mapInfo: runtime.mapInfo,
    starts: startsPlan,
    wonders: wondersPlan,
    floodplains: floodplainsPlan,
    placementConfig: config,
  };
}
