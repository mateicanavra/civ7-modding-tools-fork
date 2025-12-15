import type { ExtendedMapContext } from "../../../core/types.js";
import { assertFoundationContext } from "../../../core/assertions.js";
import { DEV, devLogIf, logMountainSummary, logReliefAscii } from "../../../dev/index.js";
import type { MountainsConfig } from "../../../bootstrap/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../../pipeline/index.js";
import { layerAddMountainsPhysics } from "../mountains.js";

export interface MountainsStepRuntime {
  logPrefix: string;
  mountainOptions: MountainsConfig;
}

export interface MountainsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createMountainsStep(
  runtime: MountainsStepRuntime,
  options: MountainsStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "mountains",
    phase: M3_STANDARD_STAGE_PHASE.mountains,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      assertFoundationContext(context, "mountains");
      const { width, height } = context.dimensions;

      devLogIf(
        "LOG_MOUNTAINS",
        `${runtime.logPrefix} [Mountains] thresholds ` +
          `mountain=${runtime.mountainOptions.mountainThreshold}, ` +
          `hill=${runtime.mountainOptions.hillThreshold}, ` +
          `tectonicIntensity=${runtime.mountainOptions.tectonicIntensity}, ` +
          `boundaryWeight=${runtime.mountainOptions.boundaryWeight}, ` +
          `boundaryExponent=${runtime.mountainOptions.boundaryExponent}, ` +
          `interiorPenaltyWeight=${runtime.mountainOptions.interiorPenaltyWeight}`
      );

      layerAddMountainsPhysics(context, runtime.mountainOptions);

      if (DEV.ENABLED && context?.adapter) {
        logMountainSummary(context.adapter, width, height);
        logReliefAscii(context.adapter, width, height);
      }
    },
  };
}
