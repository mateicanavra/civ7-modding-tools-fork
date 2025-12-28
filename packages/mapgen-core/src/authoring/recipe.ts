import type { RecipeModule } from "./types.js";

function assertTagDefinitions(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("createRecipe requires tagDefinitions (may be an empty array)");
  }
}

function assertUniqueInstanceIds(recipe: RecipeModule): void {
  const seen = new Set<string>();
  for (const stage of recipe.stages) {
    for (const step of stage.steps) {
      if (!step.instanceId) continue;
      if (seen.has(step.instanceId)) {
        throw new Error(`createRecipe requires unique instanceId values (dup: "${step.instanceId}")`);
      }
      seen.add(step.instanceId);
    }
  }
}

export function createRecipe<const TRecipe extends RecipeModule>(recipe: TRecipe): TRecipe {
  assertTagDefinitions(recipe.tagDefinitions);
  assertUniqueInstanceIds(recipe);
  return recipe;
}
