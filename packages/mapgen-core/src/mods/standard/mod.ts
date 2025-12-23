import { registry } from "@mapgen/mods/standard/registry/index.js";
import { defaultRecipe } from "@mapgen/mods/standard/recipes/default.js";

export const mod = {
  id: "core.standard",
  registry,
  recipes: {
    default: defaultRecipe,
  },
} as const;
