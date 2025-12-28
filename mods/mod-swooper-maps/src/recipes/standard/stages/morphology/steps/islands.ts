import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  HotspotTunablesSchema,
  IslandsConfigSchema,
  SeaCorridorPolicySchema,
} from "@swooper/mapgen-core/config";
import { addIslandChains } from "@mapgen/domain/morphology/islands/index.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const IslandsStepConfigSchema = Type.Object(
  {
    islands: IslandsConfigSchema,
    story: Type.Object(
      {
        hotspot: HotspotTunablesSchema,
      },
      { additionalProperties: false, default: {} }
    ),
    corridors: Type.Object(
      {
        sea: SeaCorridorPolicySchema,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { islands: {}, story: {}, corridors: {} } }
);

type IslandsStepConfig = Static<typeof IslandsStepConfigSchema>;

export default createStep({
  id: "islands",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
  ],
  provides: [
    M4_EFFECT_TAGS.engine.landmassApplied,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
  ],
  schema: IslandsStepConfigSchema,
  run: (context: ExtendedMapContext, config: IslandsStepConfig) => {
    const { width, height } = context.dimensions;
    addIslandChains(width, height, context, config);
  },
} as const);
