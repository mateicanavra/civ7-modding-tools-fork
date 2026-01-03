import type { MapInitParams } from "@civ7/adapter";
import type { RecipeModule } from "@swooper/mapgen-core/authoring";
import type { RunSettings } from "@swooper/mapgen-core/engine";
import type { ExtendedMapContext } from "@swooper/mapgen-core";

import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";
import { applyMapInitData, resolveMapInitData } from "./map-init.js";
import type { MapRuntimeOptions } from "./types.js";
import { runStandardRecipe } from "./run-standard.js";

type CivEngine = {
  on: (event: string, handler: (...args: any[]) => void) => void;
};

type StandardMapEntry = {
  engine: CivEngine;
  recipe: RecipeModule<ExtendedMapContext, StandardRecipeConfig | null>;
  config: StandardRecipeConfig | null;
  directionality: Record<string, unknown>;
  options: MapRuntimeOptions;
  seed?: number;
};

export function wireStandardMapEntry({
  engine,
  recipe,
  config,
  directionality,
  options,
  seed = 0,
}: StandardMapEntry): void {
  let mapInitData: ReturnType<typeof resolveMapInitData> | null = null;

  engine.on("RequestMapInitData", (initParams) => {
    mapInitData = applyMapInitData(options, initParams as Partial<MapInitParams>);
  });

  engine.on("GenerateMap", () => {
    const init = mapInitData ?? resolveMapInitData(options);
    const { width, height, topLatitude, bottomLatitude, wrapX, wrapY } = init.params;
    if (
      width == null ||
      height == null ||
      topLatitude == null ||
      bottomLatitude == null ||
      wrapX == null ||
      wrapY == null
    ) {
      const prefix = options.logPrefix || "[SWOOPER_MOD]";
      throw new Error(`${prefix} Missing required map init params.`);
    }

    const settings: RunSettings = {
      seed,
      dimensions: { width, height },
      latitudeBounds: {
        topLatitude,
        bottomLatitude,
      },
      wrap: {
        wrapX,
        wrapY,
      },
      directionality,
    };

    runStandardRecipe({ recipe, init, settings, config, options });
  });
}
