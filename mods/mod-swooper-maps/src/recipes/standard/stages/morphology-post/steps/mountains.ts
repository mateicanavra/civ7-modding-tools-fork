import { Type, type Static } from "typebox";
import {
  DEV,
  assertFoundationPlates,
  devLogIf,
  logMountainSummary,
  logReliefAscii,
  type ExtendedMapContext,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import type { MountainsConfig } from "@mapgen/config";
import { MountainsConfigSchema } from "@mapgen/config";
import { layerAddMountainsPhysics } from "@mapgen/domain/morphology/mountains/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const MountainsStepConfigSchema = Type.Object(
  {
    mountains: MountainsConfigSchema,
  },
  { additionalProperties: false, default: { mountains: {} } }
);

type MountainsStepConfig = Static<typeof MountainsStepConfigSchema>;

export default createStep({
  id: "mountains",
  phase: "morphology",
  requires: [M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1],
  provides: [],
  schema: MountainsStepConfigSchema,
  run: (context: ExtendedMapContext, config: MountainsStepConfig) => {
    assertFoundationPlates(context, "mountains");
    const runtime = getStandardRuntime(context);
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
} as const);
