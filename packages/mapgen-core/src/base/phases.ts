import type { GenerationPhase } from "@mapgen/engine/types.js";

export const M3_STANDARD_STAGE_PHASE: Readonly<Record<string, GenerationPhase>> = Object.freeze({
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

