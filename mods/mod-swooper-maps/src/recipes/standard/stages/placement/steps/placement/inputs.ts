import type { ExtendedMapContext } from "@swooper/mapgen-core";
import {
  PlanFloodplainsSchema,
  PlanStartsSchema,
  PlanWondersSchema,
} from "@mapgen/domain/placement";
import type { Static } from "@swooper/mapgen-core/authoring";

import { getPublishedPlacementInputs } from "../../../../artifacts.js";
import type { PlacementInputsV1 } from "../../placement-inputs.js";

type PlanFloodplainsOutput = Static<typeof PlanFloodplainsSchema["properties"]["output"]>;
type PlanStartsOutput = Static<typeof PlanStartsSchema["properties"]["output"]>;
type PlanWondersOutput = Static<typeof PlanWondersSchema["properties"]["output"]>;

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
