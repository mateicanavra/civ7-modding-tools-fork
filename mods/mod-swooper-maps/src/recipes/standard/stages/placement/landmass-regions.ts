import type { ContinentBounds } from "@civ7/adapter";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { Type, type DeepReadonly, type Static } from "@swooper/mapgen-core/authoring";
import type { MorphologyLandmassesArtifact } from "../morphology-pre/artifacts.js";

const ERROR_PREFIX = "[Placement landmass regions]";

const LandmassRegionStrategySchema = Type.Union([Type.Literal("largest")], {
  description:
    "Select the largest landmass as WEST and assign all remaining landmasses to EAST.",
});

export const LandmassRegionPolicySchema = Type.Object(
  {
    strategy: LandmassRegionStrategySchema,
  },
  {
    additionalProperties: false,
    description: "Policy for mapping landmasses to LandmassRegionId slots.",
    default: { strategy: "largest" },
  }
);

export type LandmassRegionPolicy = Static<typeof LandmassRegionPolicySchema>;

type LandmassesView = DeepReadonly<MorphologyLandmassesArtifact>;
type LandmassSummary = LandmassesView["landmasses"][number];

type LandmassRegionSelection = Readonly<{
  primaryId: number;
}>;

type BoundsAccumulator = {
  west: number;
  east: number;
  south: number;
  north: number;
  count: number;
};

function selectPrimaryLandmass(landmasses: readonly LandmassSummary[]): LandmassSummary {
  if (landmasses.length === 0) {
    throw new Error(`${ERROR_PREFIX} missing landmass summaries.`);
  }
  let primary = landmasses[0]!;
  for (const landmass of landmasses.slice(1)) {
    if (landmass.tiles > primary.tiles) {
      primary = landmass;
      continue;
    }
    if (landmass.tiles === primary.tiles && landmass.id < primary.id) {
      primary = landmass;
    }
  }
  return primary;
}

export function selectLandmassRegions(
  landmasses: LandmassesView,
  policy: LandmassRegionPolicy
): LandmassRegionSelection {
  if (policy.strategy !== "largest") {
    throw new Error(`${ERROR_PREFIX} unknown selection strategy: ${policy.strategy}`);
  }
  const primary = selectPrimaryLandmass(landmasses.landmasses);
  return { primaryId: primary.id };
}

function createBoundsAccumulator(width: number, height: number): BoundsAccumulator {
  return {
    west: width,
    east: -1,
    south: height,
    north: -1,
    count: 0,
  };
}

function updateBounds(bounds: BoundsAccumulator, x: number, y: number): void {
  bounds.count += 1;
  if (x < bounds.west) bounds.west = x;
  if (x > bounds.east) bounds.east = x;
  if (y < bounds.south) bounds.south = y;
  if (y > bounds.north) bounds.north = y;
}

function finalizeBounds(
  bounds: BoundsAccumulator,
  fallback: BoundsAccumulator,
  continent: number
): ContinentBounds {
  if (bounds.count === 0) {
    return {
      west: fallback.west,
      east: fallback.east,
      south: fallback.south,
      north: fallback.north,
      continent,
    };
  }

  return {
    west: bounds.west,
    east: bounds.east,
    south: bounds.south,
    north: bounds.north,
    continent,
  };
}

/**
 * DEPRECATED: ContinentBounds are a temporary projection for Civ7 start placement.
 * Remove once assignStartPositions no longer requires west/east windows (Slice 6).
 */
export function deriveContinentBounds(
  width: number,
  height: number,
  landmasses: LandmassesView,
  selection: LandmassRegionSelection
): { west: ContinentBounds; east: ContinentBounds } {
  const size = Math.max(0, width * height);
  if (landmasses.tileToLandmass.length !== size) {
    throw new Error(
      `${ERROR_PREFIX} expected landmass label length ${size} (received ${landmasses.tileToLandmass.length}).`
    );
  }

  const westBounds = createBoundsAccumulator(width, height);
  const eastBounds = createBoundsAccumulator(width, height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const landmassId = landmasses.tileToLandmass[idx];
      if (landmassId === 0) continue;
      if (landmassId === selection.primaryId) {
        updateBounds(westBounds, x, y);
      } else {
        updateBounds(eastBounds, x, y);
      }
    }
  }

  if (westBounds.count === 0) {
    throw new Error(`${ERROR_PREFIX} could not derive bounds for primary landmass.`);
  }

  return {
    west: finalizeBounds(westBounds, westBounds, 0),
    east: finalizeBounds(eastBounds, westBounds, 1),
  };
}

/**
 * Apply the LandmassRegionId projection using adapter constants and return
 * deprecated ContinentBounds for start placement.
 */
export function applyLandmassRegionIds(
  context: ExtendedMapContext,
  landmasses: LandmassesView,
  policy: LandmassRegionPolicy
): { selection: LandmassRegionSelection; bounds: { west: ContinentBounds; east: ContinentBounds } } {
  const { width, height } = context.dimensions;
  const size = Math.max(0, width * height);
  if (landmasses.tileToLandmass.length !== size) {
    throw new Error(
      `${ERROR_PREFIX} expected landmass label length ${size} (received ${landmasses.tileToLandmass.length}).`
    );
  }

  const selection = selectLandmassRegions(landmasses, policy);
  const westRegionId = context.adapter.getLandmassId("WEST");
  const eastRegionId = context.adapter.getLandmassId("EAST");

  const westBounds = createBoundsAccumulator(width, height);
  const eastBounds = createBoundsAccumulator(width, height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const landmassId = landmasses.tileToLandmass[idx];
      if (landmassId === 0) continue;

      if (landmassId === selection.primaryId) {
        context.adapter.setLandmassRegionId(x, y, westRegionId);
        updateBounds(westBounds, x, y);
      } else {
        context.adapter.setLandmassRegionId(x, y, eastRegionId);
        updateBounds(eastBounds, x, y);
      }
    }
  }

  if (westBounds.count === 0) {
    throw new Error(`${ERROR_PREFIX} could not label primary landmass region.`);
  }

  const bounds = {
    west: finalizeBounds(westBounds, westBounds, 0),
    east: finalizeBounds(eastBounds, westBounds, 1),
  };

  return { selection, bounds };
}
