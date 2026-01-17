import { collectCompileOps, createRecipe, type CompiledRecipeConfigOf, type RecipeConfigInputOf } from "@swooper/mapgen-core/authoring";
import ecologyDomain from "@mapgen/domain/ecology/ops";
import foundationDomain from "@mapgen/domain/foundation/ops";
import hydrologyDomain from "@mapgen/domain/hydrology/ops";
import morphologyDomain from "@mapgen/domain/morphology/ops";
import placementDomain from "@mapgen/domain/placement/ops";

import ecology from "./stages/ecology/index.js";
import foundation from "./stages/foundation/index.js";
import hydrologyClimateBaseline from "./stages/hydrology-climate-baseline/index.js";
import hydrologyClimateRefine from "./stages/hydrology-climate-refine/index.js";
import hydrologyHydrography from "./stages/hydrology-hydrography/index.js";
import morphologyMid from "./stages/morphology-mid/index.js";
import morphologyPost from "./stages/morphology-post/index.js";
import morphologyPre from "./stages/morphology-pre/index.js";
import narrativeMid from "./stages/narrative-mid/index.js";
import narrativePost from "./stages/narrative-post/index.js";
import narrativePre from "./stages/narrative-pre/index.js";
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
  hydrologyClimateBaseline,
  hydrologyHydrography,
  narrativePost,
  hydrologyClimateRefine,
  ecology,
  placement,
] as const;

export type StandardRecipeConfig = RecipeConfigInputOf<typeof stages>;
export type StandardRecipeCompiledConfig = CompiledRecipeConfigOf<typeof stages>;

export const compileOpsById = collectCompileOps(
  foundationDomain,
  morphologyDomain,
  hydrologyDomain,
  ecologyDomain,
  placementDomain
);

export default createRecipe({
  id: "standard",
  namespace: NAMESPACE,
  tagDefinitions: STANDARD_TAG_DEFINITIONS,
  stages,
  compileOpsById,
} as const);
