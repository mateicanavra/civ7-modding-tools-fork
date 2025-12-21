import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import { publishHeightfieldArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import type { MapInfo } from "@civ7/adapter";

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
    run: (context) => {
      const { width, height } = context.dimensions;
      const iTilesPerLake = Math.max(10, (runtime.mapInfo.LakeGenerationFrequency ?? 5) * 2);
      context.adapter.generateLakes(width, height, iTilesPerLake);
      syncHeightfield(context);
      publishHeightfieldArtifact(context);
    },
  };
}
