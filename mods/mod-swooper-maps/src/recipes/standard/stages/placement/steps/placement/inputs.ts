import type { ExtendedMapContext } from "@swooper/mapgen-core";
import {
  PlanFloodplainsContract,
  PlanStartsContract,
  PlanWondersContract,
} from "@mapgen/domain/placement/contracts";
import type { Static } from "@swooper/mapgen-core/authoring";

import { getPublishedPlacementInputs } from "../../../../artifacts.js";
import type { PlacementInputsV1 } from "../../placement-inputs.js";

type PlanFloodplainsOutput = Static<typeof PlanFloodplainsContract["output"]>;
type PlanStartsOutput = Static<typeof PlanStartsContract["output"]>;
type PlanWondersOutput = Static<typeof PlanWondersContract["output"]>;

export type PlacementPlanBundle = {
  artifact: PlacementInputsV1;
  starts: PlanStartsOutput;
  wonders: PlanWondersOutput;
  floodplains: PlanFloodplainsOutput;
};

export function buildPlacementPlanInput(context: ExtendedMapContext): PlacementPlanBundle {
  const derivedInputs = getPublishedPlacementInputs(context);

  return {
    artifact: derivedInputs,
    starts: derivedInputs.starts,
    wonders: derivedInputs.wonders,
    floodplains: derivedInputs.floodplains,
  };
}
