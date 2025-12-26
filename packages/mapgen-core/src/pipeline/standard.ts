import type { GenerationPhase } from "@mapgen/pipeline/types.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "@mapgen/pipeline/tags.js";

export const M3_STANDARD_STAGE_PHASE: Readonly<Record<string, GenerationPhase>> =
  Object.freeze({
    foundation: "foundation",
    landmassPlates: "morphology",
    coastlines: "morphology",
    storySeed: "morphology",
    storyHotspots: "morphology",
    storyRifts: "morphology",
    ruggedCoasts: "morphology",
    storyOrogeny: "morphology",
    storyCorridorsPre: "morphology",
    islands: "morphology",
    mountains: "morphology",
    volcanoes: "morphology",
    lakes: "hydrology",
    climateBaseline: "hydrology",
    storySwatches: "hydrology",
    rivers: "hydrology",
    storyCorridorsPost: "hydrology",
    climateRefine: "hydrology",
    biomes: "ecology",
    features: "ecology",
    derivePlacementInputs: "placement",
    placement: "placement",
  });

export const M3_STAGE_DEPENDENCY_SPINE: Readonly<
  Record<string, { requires: readonly string[]; provides: readonly string[] }>
> = Object.freeze({
  foundation: {
    requires: [],
    provides: [M3_DEPENDENCY_TAGS.artifact.foundation],
  },
  landmassPlates: {
    requires: [M3_DEPENDENCY_TAGS.artifact.foundation],
    provides: [M4_EFFECT_TAGS.engine.landmassApplied],
  },
  coastlines: {
    requires: [M4_EFFECT_TAGS.engine.landmassApplied],
    provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  },
  storySeed: {
    requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
    provides: [
      M3_DEPENDENCY_TAGS.artifact.storyOverlays,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    ],
  },
  storyHotspots: {
    requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
    provides: [
      M3_DEPENDENCY_TAGS.artifact.storyOverlays,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    ],
  },
  storyRifts: {
    requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
    provides: [
      M3_DEPENDENCY_TAGS.artifact.storyOverlays,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
    ],
  },
  ruggedCoasts: {
    requires: [
      M4_EFFECT_TAGS.engine.coastlinesApplied,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    ],
    provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  },
  storyOrogeny: {
    requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
    provides: [
      M3_DEPENDENCY_TAGS.artifact.storyOverlays,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1,
    ],
  },
  storyCorridorsPre: {
    requires: [
      M4_EFFECT_TAGS.engine.coastlinesApplied,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
    ],
    provides: [
      M3_DEPENDENCY_TAGS.artifact.storyOverlays,
      M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
    ],
  },
  islands: {
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
  },
  mountains: {
    requires: [M3_DEPENDENCY_TAGS.artifact.foundation],
    provides: [M4_EFFECT_TAGS.engine.landmassApplied],
  },
  volcanoes: {
    requires: [M3_DEPENDENCY_TAGS.artifact.foundation],
    provides: [M4_EFFECT_TAGS.engine.landmassApplied],
  },
  lakes: {
    requires: [M4_EFFECT_TAGS.engine.landmassApplied],
    provides: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  },
  climateBaseline: {
    requires: [M3_DEPENDENCY_TAGS.artifact.foundation],
    provides: [M3_DEPENDENCY_TAGS.artifact.heightfield, M3_DEPENDENCY_TAGS.artifact.climateField],
  },
  storySwatches: {
    requires: [M3_DEPENDENCY_TAGS.artifact.climateField],
    provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
  },
  rivers: {
    requires: [M3_DEPENDENCY_TAGS.artifact.foundation, M3_DEPENDENCY_TAGS.artifact.heightfield],
    provides: [
      M4_EFFECT_TAGS.engine.riversModeled,
      M3_DEPENDENCY_TAGS.artifact.heightfield,
      M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    ],
  },
  storyCorridorsPost: {
    requires: [
      M4_EFFECT_TAGS.engine.coastlinesApplied,
      M3_DEPENDENCY_TAGS.artifact.climateField,
      M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    ],
    provides: [M3_DEPENDENCY_TAGS.artifact.storyOverlays],
  },
  climateRefine: {
    requires: [
      M3_DEPENDENCY_TAGS.artifact.foundation,
      M3_DEPENDENCY_TAGS.artifact.heightfield,
      M3_DEPENDENCY_TAGS.artifact.climateField,
      M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    ],
    provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
  },
  biomes: {
    requires: [
      M3_DEPENDENCY_TAGS.artifact.climateField,
      M3_DEPENDENCY_TAGS.artifact.heightfield,
      M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    ],
    provides: [M3_DEPENDENCY_TAGS.field.biomeId, M4_EFFECT_TAGS.engine.biomesApplied],
  },
  features: {
    requires: [
      M3_DEPENDENCY_TAGS.field.biomeId,
      M3_DEPENDENCY_TAGS.artifact.climateField,
      M3_DEPENDENCY_TAGS.artifact.heightfield,
    ],
    provides: [M3_DEPENDENCY_TAGS.field.featureType, M4_EFFECT_TAGS.engine.featuresApplied],
  },
  derivePlacementInputs: {
    requires: [
      M4_EFFECT_TAGS.engine.coastlinesApplied,
      M4_EFFECT_TAGS.engine.riversModeled,
      M4_EFFECT_TAGS.engine.featuresApplied,
    ],
    provides: [M3_DEPENDENCY_TAGS.artifact.placementInputsV1],
  },
  placement: {
    requires: [M3_DEPENDENCY_TAGS.artifact.placementInputsV1],
    provides: [
      M3_DEPENDENCY_TAGS.artifact.placementOutputsV1,
      M4_EFFECT_TAGS.engine.placementApplied,
    ],
  },
});
