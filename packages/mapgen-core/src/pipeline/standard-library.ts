import type { MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import { registerBaseLibrary, type BaseLibraryRuntime } from "@mapgen/base/library.js";

export type StandardLibraryRuntime = BaseLibraryRuntime;

export function registerStandardLibrary(
  registry: StepRegistry<ExtendedMapContext>,
  _config: MapGenConfig,
  runtime: StandardLibraryRuntime
): void {
  registerBaseLibrary(registry, runtime);
}
