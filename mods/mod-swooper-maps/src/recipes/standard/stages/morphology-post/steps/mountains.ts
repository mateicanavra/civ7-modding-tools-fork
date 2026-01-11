import {
  assertFoundationPlates,
  devLogIf,
  logMountainSummary,
  logReliefAscii,
  type ExtendedMapContext,
} from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import type { MountainsConfig } from "@mapgen/domain/config";
import { layerAddMountainsPhysics } from "@mapgen/domain/morphology/mountains/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import MountainsStepContract from "./mountains.contract.js";
type MountainsStepConfig = Static<typeof MountainsStepContract.schema>;

export default createStep(MountainsStepContract, {
  run: (context: ExtendedMapContext, config: MountainsStepConfig) => {
    assertFoundationPlates(context, "mountains");
    const runtime = getStandardRuntime(context);
    const { width, height } = context.dimensions;
    const mountainOptions = config.mountains as MountainsConfig;

    devLogIf(
      context.trace,
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

    logMountainSummary(context.trace, context.adapter, width, height);
    logReliefAscii(context.trace, context.adapter, width, height);
  },
});
