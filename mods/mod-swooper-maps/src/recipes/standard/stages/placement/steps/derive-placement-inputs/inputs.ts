import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { Static, StepRuntimeOps } from "@swooper/mapgen-core/authoring";
import type { PlacementInputsV1 } from "../../placement-inputs.js";
import { getBaseStarts, getStandardRuntime } from "../../../../runtime.js";

import DerivePlacementInputsContract from "./contract.js";

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsContract.schema>;
type DerivePlacementInputsOps = StepRuntimeOps<NonNullable<typeof DerivePlacementInputsContract.ops>>;

export function buildPlacementInputs(
  context: ExtendedMapContext,
  config: DerivePlacementInputsConfig,
  ops: DerivePlacementInputsOps
): PlacementInputsV1 {
  const runtime = getStandardRuntime(context);
  const baseStarts = getBaseStarts(context);
  const startsPlan = ops.starts({ baseStarts }, config.starts);
  const wondersPlan = ops.wonders({ mapInfo: runtime.mapInfo }, config.wonders);
  const floodplainsPlan = ops.floodplains({}, config.floodplains);

  return {
    mapInfo: runtime.mapInfo,
    starts: startsPlan,
    wonders: wondersPlan,
    floodplains: floodplainsPlan,
    placementConfig: config,
  };
}
