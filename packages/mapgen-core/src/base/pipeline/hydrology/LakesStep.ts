import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import { publishHeightfieldArtifact } from "@mapgen/base/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import type { MapInfo } from "@civ7/adapter";
import { EmptyStepConfigSchema } from "@mapgen/pipeline/step-config.js";

export interface LakesStepRuntime {
  mapInfo: MapInfo;
}

export interface LakesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

export function createLakesStep(
  runtime: LakesStepRuntime,
  options: LakesStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "lakes",
    phase: M3_STANDARD_STAGE_PHASE.lakes,
    requires: options.requires,
    provides: options.provides,
    configSchema: EmptyStepConfigSchema,
    run: (context, _config) => {
      const { width, height } = context.dimensions;
      const iTilesPerLake = Math.max(10, (runtime.mapInfo.LakeGenerationFrequency ?? 5) * 2);
      context.adapter.generateLakes(width, height, iTilesPerLake);
      syncHeightfield(context);
      publishHeightfieldArtifact(context);
    },
  };
}
