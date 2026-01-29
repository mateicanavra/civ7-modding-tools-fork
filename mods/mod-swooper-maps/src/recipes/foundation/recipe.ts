import { collectCompileOps, createRecipe, type CompiledRecipeConfigOf, type RecipeConfigInputOf } from "@swooper/mapgen-core/authoring";
import foundationDomain from "@mapgen/domain/foundation/ops";

import foundation from "../standard/stages/foundation/index.js";
import { STANDARD_TAG_DEFINITIONS } from "../standard/tags.js";

const NAMESPACE = "mod-swooper-maps";
const stages = [foundation] as const;

export type FoundationRecipeConfig = RecipeConfigInputOf<typeof stages>;
export type FoundationRecipeCompiledConfig = CompiledRecipeConfigOf<typeof stages>;

export const compileOpsById = collectCompileOps(foundationDomain);

export default createRecipe({
  id: "foundation",
  namespace: NAMESPACE,
  tagDefinitions: STANDARD_TAG_DEFINITIONS,
  stages,
  compileOpsById,
} as const);

