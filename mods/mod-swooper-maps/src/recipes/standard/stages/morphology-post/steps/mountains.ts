import {
  devLogIf,
  logMountainSummary,
  logReliefAscii,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import type { MountainsConfig } from "@mapgen/domain/config";
import { layerAddMountainsPhysics } from "@mapgen/domain/morphology/mountains/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import MountainsStepContract from "./mountains.contract.js";

export default createStep(MountainsStepContract, {
  run: (context, config, _ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
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

    layerAddMountainsPhysics(context, plates, mountainOptions);

    logMountainSummary(context.trace, context.adapter, width, height);
    logReliefAscii(context.trace, context.adapter, width, height);
  },
});
