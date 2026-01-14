import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { DeepReadonly, Static, StepRuntimeOps } from "@swooper/mapgen-core/authoring";
import type { PlacementInputsV1 } from "../../placement-inputs.js";
import type { MorphologyLandmassesArtifact } from "../../../morphology-pre/artifacts.js";
import { getStandardRuntime } from "../../../../runtime.js";
import { deriveContinentBounds, selectLandmassRegions } from "../../landmass-regions.js";

import DerivePlacementInputsContract from "./contract.js";

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsContract.schema>;
type DerivePlacementInputsOps = StepRuntimeOps<NonNullable<typeof DerivePlacementInputsContract.ops>>;

export function buildPlacementInputs(
  context: ExtendedMapContext,
  config: DerivePlacementInputsConfig,
  ops: DerivePlacementInputsOps,
  landmasses: DeepReadonly<MorphologyLandmassesArtifact>
): PlacementInputsV1 {
  const runtime = getStandardRuntime(context);
  const selection = selectLandmassRegions(landmasses, config.landmassRegions);
  const { west, east } = deriveContinentBounds(
    context.dimensions.width,
    context.dimensions.height,
    landmasses,
    selection
  );
  const baseStarts = {
    playersLandmass1: runtime.playersLandmass1,
    playersLandmass2: runtime.playersLandmass2,
    westContinent: west,
    eastContinent: east,
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
