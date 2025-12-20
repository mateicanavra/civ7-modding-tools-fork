import type { GenerationPhase } from "@mapgen/pipeline/types.js";
import { M3_DEPENDENCY_TAGS } from "@mapgen/pipeline/tags.js";

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
    provides: [M3_DEPENDENCY_TAGS.state.landmassApplied],
  },
  coastlines: {
    requires: [M3_DEPENDENCY_TAGS.state.landmassApplied],
    provides: [M3_DEPENDENCY_TAGS.state.coastlinesApplied],
  },
  storySeed: {
    requires: [M3_DEPENDENCY_TAGS.state.coastlinesApplied],
    provides: [M3_DEPENDENCY_TAGS.artifact.storyOverlays],
  },
  storyHotspots: {
    requires: [M3_DEPENDENCY_TAGS.state.coastlinesApplied],
    provides: [M3_DEPENDENCY_TAGS.artifact.storyOverlays],
  },
  storyRifts: {
    requires: [M3_DEPENDENCY_TAGS.state.coastlinesApplied],
    provides: [M3_DEPENDENCY_TAGS.artifact.storyOverlays],
  },
  ruggedCoasts: {
    requires: [M3_DEPENDENCY_TAGS.state.coastlinesApplied],
    provides: [M3_DEPENDENCY_TAGS.state.coastlinesApplied],
  },
  storyOrogeny: {
    requires: [M3_DEPENDENCY_TAGS.state.coastlinesApplied],
    provides: [M3_DEPENDENCY_TAGS.artifact.storyOverlays],
  },
  storyCorridorsPre: {
    requires: [M3_DEPENDENCY_TAGS.state.coastlinesApplied],
    provides: [M3_DEPENDENCY_TAGS.artifact.storyOverlays],
  },
  islands: {
    requires: [M3_DEPENDENCY_TAGS.state.coastlinesApplied],
    provides: [M3_DEPENDENCY_TAGS.state.landmassApplied],
  },
  mountains: {
    requires: [M3_DEPENDENCY_TAGS.artifact.foundation],
    provides: [M3_DEPENDENCY_TAGS.state.landmassApplied],
  },
  volcanoes: {
    requires: [M3_DEPENDENCY_TAGS.artifact.foundation],
    provides: [M3_DEPENDENCY_TAGS.state.landmassApplied],
  },
  lakes: {
    requires: [M3_DEPENDENCY_TAGS.state.landmassApplied],
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
      M3_DEPENDENCY_TAGS.state.riversModeled,
      M3_DEPENDENCY_TAGS.artifact.heightfield,
      M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    ],
  },
  storyCorridorsPost: {
    requires: [
      M3_DEPENDENCY_TAGS.state.coastlinesApplied,
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
    provides: [M3_DEPENDENCY_TAGS.state.biomesApplied],
  },
  features: {
    requires: [
      M3_DEPENDENCY_TAGS.state.biomesApplied,
      M3_DEPENDENCY_TAGS.artifact.climateField,
      M3_DEPENDENCY_TAGS.artifact.heightfield,
    ],
    provides: [M3_DEPENDENCY_TAGS.state.featuresApplied],
  },
  placement: {
    requires: [
      M3_DEPENDENCY_TAGS.state.coastlinesApplied,
      M3_DEPENDENCY_TAGS.state.riversModeled,
      M3_DEPENDENCY_TAGS.state.featuresApplied,
    ],
    provides: [M3_DEPENDENCY_TAGS.state.placementApplied],
  },
});
