import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { DEV, devLogIf, logMountainSummary, logReliefAscii } from "@mapgen/dev/index.js";
import type { MountainsConfig } from "@mapgen/bootstrap/types.js";
import { MountainsConfigSchema } from "@mapgen/config/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { layerAddMountainsPhysics } from "@mapgen/domain/morphology/mountains/index.js";

export interface MountainsStepRuntime {
  logPrefix: string;
}

export interface MountainsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const MountainsStepConfigSchema = Type.Object(
  {
    mountains: MountainsConfigSchema,
  },
  { additionalProperties: false, default: { mountains: {} } }
);

type MountainsStepConfig = Static<typeof MountainsStepConfigSchema>;

export function createMountainsStep(
  runtime: MountainsStepRuntime,
  options: MountainsStepOptions
): MapGenStep<ExtendedMapContext, MountainsStepConfig> {
  return {
    id: "mountains",
    phase: M3_STANDARD_STAGE_PHASE.mountains,
    requires: options.requires,
    provides: options.provides,
    configSchema: MountainsStepConfigSchema,
    run: (context, config) => {
      assertFoundationContext(context, "mountains");
      const { width, height } = context.dimensions;
      const mountainOptions = (config.mountains ?? {}) as MountainsConfig;

      devLogIf(
        "LOG_MOUNTAINS",
        `${runtime.logPrefix} [Mountains] thresholds ` +
          `mountain=${mountainOptions.mountainThreshold}, ` +
          `hill=${mountainOptions.hillThreshold}, ` +
          `tectonicIntensity=${mountainOptions.tectonicIntensity}, ` +
          `boundaryWeight=${mountainOptions.boundaryWeight}, ` +
          `boundaryExponent=${mountainOptions.boundaryExponent}, ` +
          `interiorPenaltyWeight=${mountainOptions.interiorPenaltyWeight}`
      );

      layerAddMountainsPhysics(context, mountainOptions);

      if (DEV.ENABLED && context?.adapter) {
        logMountainSummary(context.adapter, width, height);
        logReliefAscii(context.adapter, width, height);
      }
    },
  };
}
