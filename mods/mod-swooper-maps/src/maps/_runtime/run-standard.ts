import { createExtendedMapContext, type ExtendedMapContext } from "@swooper/mapgen-core";
import type { RecipeModule } from "@swooper/mapgen-core/authoring";
import type { RunSettings } from "@swooper/mapgen-core/engine";

import { initializeStandardRuntime } from "../../recipes/standard/runtime.js";
import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";
import type { MapInitResolution } from "./map-init.js";
import { createLayerAdapter } from "./helpers.js";
import type { MapRuntimeOptions } from "./types.js";

type StandardRunOptions = {
  recipe: RecipeModule<ExtendedMapContext, StandardRecipeConfig | null>;
  init: MapInitResolution;
  settings: RunSettings;
  config: StandardRecipeConfig | null;
  options?: MapRuntimeOptions;
};

export function runStandardRecipe({
  recipe,
  init,
  settings,
  config,
  options,
}: StandardRunOptions): void {
  const { width, height } = settings.dimensions;
  if (width !== init.params.width || height !== init.params.height) {
    throw new Error("[Standard] Settings dimensions must match map init dimensions.");
  }
  const adapter = createLayerAdapter(options ?? {}, width, height);
  const context = createExtendedMapContext(
    { width, height },
    adapter,
    settings
  );

  initializeStandardRuntime(context, {
    logPrefix: options?.logPrefix,
    mapInfo: init.mapInfo,
    storyEnabled: true,
  });

  recipe.run(context, settings, config, {
    trace: options?.traceSession ?? undefined,
    traceSink: options?.traceSink ?? undefined,
  });
}
