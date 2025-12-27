import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "@mapgen/base/tags.js";

export const M3_STAGE_DEPENDENCY_SPINE: Readonly<
  Record<string, { requires: readonly string[]; provides: readonly string[] }>
> = Object.freeze({
  foundation: {
    requires: [],
    provides: [
      M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
      M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
      M3_DEPENDENCY_TAGS.artifact.foundationSeedV1,
      M3_DEPENDENCY_TAGS.artifact.foundationDiagnosticsV1,
      M3_DEPENDENCY_TAGS.artifact.foundationConfigV1,
    ],
  },
  landmassPlates: {
    requires: [M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1],
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
    requires: [
      M4_EFFECT_TAGS.engine.coastlinesApplied,
      M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
    ],
    provides: [
      M3_DEPENDENCY_TAGS.artifact.storyOverlays,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
    ],
  },
  ruggedCoasts: {
    requires: [
      M4_EFFECT_TAGS.engine.coastlinesApplied,
      M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    ],
    provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  },
  storyOrogeny: {
    requires: [
      M4_EFFECT_TAGS.engine.coastlinesApplied,
      M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
      M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
    ],
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
    requires: [
      M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
    ],
    provides: [],
  },
  volcanoes: {
    requires: [
      M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
    ],
    provides: [],
  },
  lakes: {
    requires: [M4_EFFECT_TAGS.engine.landmassApplied],
    provides: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  },
  climateBaseline: {
    requires: [M3_DEPENDENCY_TAGS.artifact.heightfield],
    provides: [M3_DEPENDENCY_TAGS.artifact.heightfield, M3_DEPENDENCY_TAGS.artifact.climateField],
  },
  storySwatches: {
    requires: [
      M3_DEPENDENCY_TAGS.artifact.heightfield,
      M3_DEPENDENCY_TAGS.artifact.climateField,
      M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
    ],
    provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
  },
  rivers: {
    requires: [M3_DEPENDENCY_TAGS.artifact.heightfield],
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
      M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
      M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    ],
    provides: [
      M3_DEPENDENCY_TAGS.artifact.storyOverlays,
      M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
    ],
  },
  climateRefine: {
    requires: [
      M3_DEPENDENCY_TAGS.artifact.heightfield,
      M3_DEPENDENCY_TAGS.artifact.climateField,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
      M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
      M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
    ],
    provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
  },
  biomes: {
    requires: [
      M3_DEPENDENCY_TAGS.artifact.climateField,
      M3_DEPENDENCY_TAGS.artifact.heightfield,
      M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
      M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    ],
    provides: [M3_DEPENDENCY_TAGS.field.biomeId, M4_EFFECT_TAGS.engine.biomesApplied],
  },
  features: {
    requires: [
      M3_DEPENDENCY_TAGS.field.biomeId,
      M3_DEPENDENCY_TAGS.artifact.climateField,
      M3_DEPENDENCY_TAGS.artifact.heightfield,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
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

export function getStageDescriptor(
  stageId: string
): { requires: readonly string[]; provides: readonly string[] } {
  const desc = M3_STAGE_DEPENDENCY_SPINE[stageId] ?? { requires: [], provides: [] };
  const requires = Array.isArray(desc.requires) ? desc.requires : [];
  const provides = Array.isArray(desc.provides) ? desc.provides : [];
  return { requires, provides };
}
