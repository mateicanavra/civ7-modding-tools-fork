import placement from "@mapgen/domain/placement";
import type { Static } from "@swooper/mapgen-core/authoring";

import type { PlacementInputsV1 } from "../../placement-inputs.js";

type PlanFloodplainsOutput = Static<typeof placement.ops.planFloodplains["output"]>;
type PlanStartsOutput = Static<typeof placement.ops.planStarts["output"]>;
type PlanWondersOutput = Static<typeof placement.ops.planWonders["output"]>;

export type PlacementPlanBundle = {
  artifact: PlacementInputsV1;
  starts: PlanStartsOutput;
  wonders: PlanWondersOutput;
  floodplains: PlanFloodplainsOutput;
};

export function buildPlacementPlanInput(derivedInputs: PlacementInputsV1): PlacementPlanBundle {
  return {
    artifact: derivedInputs,
    starts: derivedInputs.starts,
    wonders: derivedInputs.wonders,
    floodplains: derivedInputs.floodplains,
  };
}
