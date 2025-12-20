import type { OceanSeparationPolicy } from "@mapgen/domain/morphology/landmass/ocean-separation/types.js";

export const DEFAULT_OCEAN_SEPARATION: OceanSeparationPolicy = {
  enabled: true,
  bandPairs: [
    [0, 1],
    [1, 2],
  ],
  baseSeparationTiles: 0,
  boundaryClosenessMultiplier: 1.0,
  maxPerRowDelta: 3,
};

