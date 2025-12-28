import { createRecipe } from "@swooper/mapgen-core/authoring";
import type { RecipeConfigOf } from "@swooper/mapgen-core/authoring";

import ecology from "./stages/ecology/index.js";
import foundation from "./stages/foundation/index.js";
import hydrology from "./stages/hydrology/index.js";
import morphology from "./stages/morphology/index.js";
import narrative from "./stages/narrative/index.js";
import placement from "./stages/placement/index.js";

const NAMESPACE = "mod-swooper-maps";
const stages = [foundation, morphology, hydrology, narrative, ecology, placement] as const;

export type StandardRecipeConfig = RecipeConfigOf<typeof stages>;

export default createRecipe({
  id: "standard",
  namespace: NAMESPACE,
  tagDefinitions: [],
  stages,
} as const);
