import type { MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import { registerStandardLibrary, type StandardLibraryRuntime } from "@mapgen/pipeline/standard-library.js";

export interface StandardModRegistry {
  register: (
    registry: StepRegistry<ExtendedMapContext>,
    config: MapGenConfig,
    runtime: StandardLibraryRuntime
  ) => void;
}

export const registry: StandardModRegistry = {
  register(registry, config, runtime) {
    registerStandardLibrary(registry, config, runtime);
  },
};
