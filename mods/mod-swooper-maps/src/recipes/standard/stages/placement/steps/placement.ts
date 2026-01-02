import { Type } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { getPublishedPlacementInputs, publishPlacementOutputsArtifact } from "../../../artifacts.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";
import { runPlacement } from "@mapgen/domain/placement/index.js";
import { resolveNaturalWonderCount } from "@mapgen/domain/placement/wonders.js";

const EmptySchema = Type.Object({}, { additionalProperties: false, default: {} });

export default createStep({
  id: "placement",
  phase: "placement",
  requires: [M3_DEPENDENCY_TAGS.artifact.placementInputsV1],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.placementOutputsV1,
    M4_EFFECT_TAGS.engine.placementApplied,
  ],
  schema: EmptySchema,
  run: (context: ExtendedMapContext) => {
    const runtime = getStandardRuntime(context);
    const derivedInputs = getPublishedPlacementInputs(context);
    if (!derivedInputs) {
      throw new Error("Missing required artifact: placementInputs@v1");
    }
    const placementConfig = derivedInputs.placementConfig ?? {};
    const starts = derivedInputs.starts;
    const { width, height } = context.dimensions;

    const startPositions = runPlacement(context.adapter, width, height, {
      mapInfo: derivedInputs.mapInfo as { NumNaturalWonders?: number },
      starts,
      placementConfig,
      trace: context.trace,
    });

    runtime.startPositions.push(...startPositions);

    const wondersPlusOne =
      typeof placementConfig.wondersPlusOne === "boolean" ? placementConfig.wondersPlusOne : true;
    const naturalWondersCount = resolveNaturalWonderCount(derivedInputs.mapInfo, wondersPlusOne);
    const startsAssigned = startPositions.filter((pos) => Number.isFinite(pos) && pos >= 0).length;

    publishPlacementOutputsArtifact(context, {
      naturalWondersCount,
      floodplainsCount: 0,
      snowTilesCount: 0,
      resourcesCount: 0,
      startsAssigned,
      discoveriesCount: 0,
    });
  },
} as const);
