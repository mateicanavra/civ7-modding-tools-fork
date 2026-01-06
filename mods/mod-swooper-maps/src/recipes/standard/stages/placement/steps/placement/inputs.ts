import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type {
  PlanFloodplainsOutput,
  PlanStartsOutput,
  PlanWondersOutput,
} from "@mapgen/domain/placement";

import { getPublishedPlacementInputs } from "../../../../artifacts.js";
import type { PlacementInputsV1 } from "../../placement-inputs.js";

export type PlacementPlanBundle = {
  artifact: PlacementInputsV1;
  starts: PlanStartsOutput;
  wonders: PlanWondersOutput;
  floodplains: PlanFloodplainsOutput;
};

export function buildPlacementPlanInput(context: ExtendedMapContext): PlacementPlanBundle {
  const derivedInputs = getPublishedPlacementInputs(context);
  if (!derivedInputs) {
    throw new Error("Missing required artifact: placementInputs@v1");
  }

  return {
    artifact: derivedInputs,
    starts: derivedInputs.starts,
    wonders: derivedInputs.wonders,
    floodplains: derivedInputs.floodplains,
  };
}
