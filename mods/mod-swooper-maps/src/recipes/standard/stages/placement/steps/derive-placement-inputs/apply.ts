import type { ExtendedMapContext } from "@swooper/mapgen-core";

import { publishPlacementInputsArtifact } from "../../../../artifacts.js";
import type { PlacementInputsV1 } from "../../placement-inputs.js";

export function publishPlacementInputs(
  context: ExtendedMapContext,
  inputs: PlacementInputsV1
): PlacementInputsV1 {
  return publishPlacementInputsArtifact(context, inputs);
}
