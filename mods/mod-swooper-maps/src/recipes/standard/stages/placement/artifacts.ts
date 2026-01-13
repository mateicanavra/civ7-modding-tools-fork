import { defineArtifact } from "@swooper/mapgen-core/authoring";
import { PlacementInputsV1Schema } from "./placement-inputs.js";
import { PlacementOutputsV1Schema } from "./placement-outputs.js";

export const placementArtifacts = {
  placementInputs: defineArtifact({
    name: "placementInputs",
    id: "artifact:placementInputs",
    schema: PlacementInputsV1Schema,
  }),
  placementOutputs: defineArtifact({
    name: "placementOutputs",
    id: "artifact:placementOutputs",
    schema: PlacementOutputsV1Schema,
  }),
} as const;
