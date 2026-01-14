import type { MapInitParams } from "@civ7/adapter";
import type { RecipeModule } from "@swooper/mapgen-core/authoring";
import type { Env } from "@swooper/mapgen-core/engine";
import type { ExtendedMapContext } from "@swooper/mapgen-core";

import type { StandardRecipeCompiledConfig, StandardRecipeConfig } from "../../recipes/standard/recipe.js";
import { applyMapInitData, resolveMapInitData } from "./map-init.js";
import type { MapRuntimeOptions } from "./types.js";
import { runStandardRecipe } from "./run-standard.js";

type CivEngine = {
  on: (event: string, handler: (...args: any[]) => void) => void;
};

type StandardMapEntry = {
  engine: CivEngine;
  recipe: RecipeModule<
    ExtendedMapContext,
    StandardRecipeConfig | null,
    StandardRecipeCompiledConfig
  >;
  config: StandardRecipeConfig | null;
  options: MapRuntimeOptions;
  seed?: number;
};

export function wireStandardMapEntry({
  engine,
  recipe,
  config,
  options,
  seed = 0,
}: StandardMapEntry): void {
  let mapInitData: ReturnType<typeof resolveMapInitData> | null = null;

  engine.on("RequestMapInitData", (initParams) => {
    mapInitData = applyMapInitData(options, initParams as Partial<MapInitParams>);
  });

  engine.on("GenerateMap", () => {
    try {
      const init = mapInitData ?? resolveMapInitData(options);
      const { width, height, topLatitude, bottomLatitude } = init.params;
      if (
        width == null ||
        height == null ||
        topLatitude == null ||
        bottomLatitude == null
      ) {
        const prefix = options.logPrefix || "[SWOOPER_MOD]";
        throw new Error(`${prefix} Missing required map init params.`);
      }

      const env: Env = {
        seed,
        dimensions: { width, height },
        latitudeBounds: {
          topLatitude,
          bottomLatitude,
        },
      };

      runStandardRecipe({ recipe, init, env, config, options });
    } catch (err) {
      const prefix = options.logPrefix || "[SWOOPER_MOD]";
      console.error(prefix, "Map generation failed:", err);
      throw err;
    }
  });
}
