import type { MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { PipelineModV1, StepRegistry } from "@mapgen/pipeline/index.js";
import type { StandardLibraryRuntime } from "@mapgen/pipeline/standard-library.js";
import { registerStandardLibrary } from "@mapgen/pipeline/standard-library.js";

import { baseDefaultRecipe } from "@mapgen/base/recipes/default.js";

export const baseMod: PipelineModV1<ExtendedMapContext, MapGenConfig, StandardLibraryRuntime> = {
  id: "core.base",
  recipes: { default: baseDefaultRecipe },
  register(registry: StepRegistry<ExtendedMapContext>, config: MapGenConfig, runtime: StandardLibraryRuntime) {
    registerStandardLibrary(registry, config, runtime);
  },
};
