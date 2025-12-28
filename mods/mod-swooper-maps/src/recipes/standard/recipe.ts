import { createRecipe } from "@swooper/mapgen-core/authoring";
import type { RecipeConfigOf } from "@swooper/mapgen-core/authoring";

import ecology from "./stages/ecology/index.js";
import foundation from "./stages/foundation/index.js";
import hydrologyCore from "./stages/hydrology-core/index.js";
import hydrologyPost from "./stages/hydrology-post/index.js";
import hydrologyPre from "./stages/hydrology-pre/index.js";
import morphologyMid from "./stages/morphology-mid/index.js";
import morphologyPost from "./stages/morphology-post/index.js";
import morphologyPre from "./stages/morphology-pre/index.js";
import narrativeMid from "./stages/narrative-mid/index.js";
import narrativePost from "./stages/narrative-post/index.js";
import narrativePre from "./stages/narrative-pre/index.js";
import narrativeSwatches from "./stages/narrative-swatches/index.js";
import placement from "./stages/placement/index.js";
import { STANDARD_TAG_DEFINITIONS } from "./tags.js";

const NAMESPACE = "mod-swooper-maps";
const stages = [
  foundation,
  morphologyPre,
  narrativePre,
  morphologyMid,
  narrativeMid,
  morphologyPost,
  hydrologyPre,
  narrativeSwatches,
  hydrologyCore,
  narrativePost,
  hydrologyPost,
  ecology,
  placement,
] as const;

export type StandardRecipeConfig = RecipeConfigOf<typeof stages>;

export default createRecipe({
  id: "standard",
  namespace: NAMESPACE,
  tagDefinitions: STANDARD_TAG_DEFINITIONS,
  stages,
} as const);
