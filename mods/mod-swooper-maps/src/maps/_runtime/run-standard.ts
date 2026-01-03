import type { EngineAdapter } from "@civ7/adapter";
import { Civ7Adapter } from "@civ7/adapter/civ7";
import { createExtendedMapContext, type ExtendedMapContext } from "@swooper/mapgen-core";
import type { RecipeModule } from "@swooper/mapgen-core/authoring";
import type { RunSettings } from "@swooper/mapgen-core/engine";

import { getStandardRuntime, initializeStandardRuntime } from "../../recipes/standard/runtime.js";
import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";
import type { MapInitResolution } from "./map-init.js";
import type { MapRuntimeOptions } from "./types.js";

type StandardRunOptions = {
  recipe: RecipeModule<ExtendedMapContext, StandardRecipeConfig | null>;
  init: MapInitResolution;
  settings: RunSettings;
  config: StandardRecipeConfig | null;
  options?: MapRuntimeOptions;
};

function createLayerAdapter(
  options: MapRuntimeOptions,
  width: number,
  height: number
): EngineAdapter {
  if (options.adapter) return options.adapter;
  if (options.createAdapter) return options.createAdapter(width, height);
  return new Civ7Adapter(width, height);
}

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
    log: (message) => console.log(message),
  });

  const runtime = getStandardRuntime(context);
  const assignedStarts = runtime.startPositions.filter((pos) => Number.isFinite(pos) && pos >= 0).length;
  if (assignedStarts === 0) {
    throw new Error(
      `${options?.logPrefix ?? "[SWOOPER_MOD]"} Map generation produced zero starting positions. ` +
        `Check output.log for the failing step (PipelineExecutor logs).`
    );
  }
}
