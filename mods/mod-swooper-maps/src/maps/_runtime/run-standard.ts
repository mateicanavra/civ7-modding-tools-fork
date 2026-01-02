import { createExtendedMapContext, type ExtendedMapContext } from "@swooper/mapgen-core";
import { initDevFlags, resetDevFlags } from "@swooper/mapgen-core";
import type { MapGenConfig } from "@mapgen/config";
import type { RecipeModule } from "@swooper/mapgen-core/authoring";

import { initializeStandardRuntime } from "../../recipes/standard/runtime.js";
import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";
import type { MapInitResolution } from "./map-init.js";
import { createLayerAdapter } from "./helpers.js";
import type { MapRuntimeOptions } from "./types.js";
import {
  buildStandardRecipeConfig,
  buildStandardRunSettings,
  type StandardRecipeOverrides,
} from "./standard-config.js";

type StandardRunOptions = {
  recipe: RecipeModule<ExtendedMapContext, StandardRecipeConfig | null>;
  init: MapInitResolution;
  overrides?: StandardRecipeOverrides;
  options?: MapRuntimeOptions;
};

export function runStandardRecipe({
  recipe,
  init,
  overrides,
  options,
}: StandardRunOptions): void {
  const safeOverrides = overrides ?? {};
  const settings = buildStandardRunSettings(init, safeOverrides);
  const config = buildStandardRecipeConfig(safeOverrides);
  const adapter = createLayerAdapter(options ?? {}, init.params.width, init.params.height);
  const contextConfig = safeOverrides as MapGenConfig;
  const diagnosticsConfig = contextConfig.foundation?.diagnostics;
  if (diagnosticsConfig && typeof diagnosticsConfig === "object") {
    const resolvedDiagnostics = { ...diagnosticsConfig } as Record<string, boolean | undefined>;
    if (resolvedDiagnostics.enabled === undefined) {
      resolvedDiagnostics.enabled = Object.entries(resolvedDiagnostics).some(
        ([key, value]) => key !== "enabled" && value === true
      );
    }
    resetDevFlags();
    initDevFlags(resolvedDiagnostics);
  }
  const context = createExtendedMapContext(
    { width: init.params.width, height: init.params.height },
    adapter,
    contextConfig
  );

  initializeStandardRuntime(context, {
    logPrefix: options?.logPrefix,
    mapInfo: init.mapInfo,
    storyEnabled: true,
  });

  recipe.run(context, settings, config);
}
