import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { Static, StepRuntimeOps } from "@swooper/mapgen-core/authoring";
import type { PlacementInputsV1 } from "../../placement-inputs.js";
import { getStandardRuntime } from "../../../../runtime.js";

import DerivePlacementInputsContract from "./contract.js";

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsContract.schema>;
type DerivePlacementInputsOps = StepRuntimeOps<NonNullable<typeof DerivePlacementInputsContract.ops>>;

/**
 * Builds placement inputs from runtime map info and authored placement configs.
 */
export function buildPlacementInputs(
  context: ExtendedMapContext,
  config: DerivePlacementInputsConfig,
  ops: DerivePlacementInputsOps
): PlacementInputsV1 {
  const runtime = getStandardRuntime(context);
  const baseStarts = {
    playersLandmass1: runtime.playersLandmass1,
    playersLandmass2: runtime.playersLandmass2,
    startSectorRows: runtime.startSectorRows,
    startSectorCols: runtime.startSectorCols,
    startSectors: runtime.startSectors,
  };
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
