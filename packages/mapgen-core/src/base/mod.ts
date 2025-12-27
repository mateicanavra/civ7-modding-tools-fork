import type { MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { PipelineModV1, StepRegistry } from "@mapgen/pipeline/index.js";

import { baseDefaultRecipe } from "@mapgen/base/recipes/default.js";
import type { BaseLibraryRuntime } from "@mapgen/base/library.js";
import { registerBaseLibrary } from "@mapgen/base/library.js";
import { registerBaseTags } from "@mapgen/base/tags.js";

export const baseMod: PipelineModV1<ExtendedMapContext, MapGenConfig, BaseLibraryRuntime> = {
  id: "core.base",
  recipes: { default: baseDefaultRecipe },
  register(registry: StepRegistry<ExtendedMapContext>, _config: MapGenConfig, runtime: BaseLibraryRuntime) {
    registerBaseTags(registry);
    registerBaseLibrary(registry, runtime);
  },
};
