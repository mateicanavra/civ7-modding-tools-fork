import { Type, type Static } from "@swooper/mapgen-core/authoring";

/**
 * Bounding box for a continent band when seeding player starts.
 * All values are inclusive tile coordinates in the Civ engine grid.
 */
const ContinentBoundsSchema = Type.Object(
  {
    /** Westernmost tile column (inclusive) for the continent window. */
    west: Type.Number({
      description: "Westernmost tile column (inclusive) for the continent window.",
    }),
    /** Easternmost tile column (inclusive) for the continent window. */
    east: Type.Number({
      description: "Easternmost tile column (inclusive) for the continent window.",
    }),
    /** Southernmost tile row (inclusive) for the continent window. */
    south: Type.Number({
      description: "Southernmost tile row (inclusive) for the continent window.",
    }),
    /** Northernmost tile row (inclusive) for the continent window. */
    north: Type.Number({
      description: "Northernmost tile row (inclusive) for the continent window.",
    }),
    /** Optional continent index used when mirroring legacy continent tagging. */
    continent: Type.Optional(
      Type.Number({
        description: "Optional continent index used when mirroring legacy continent tagging.",
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Tectonic weighting used while scoring candidate land tiles.
 */
const LandmassTectonicsConfigSchema = Type.Object(
  {
    /**
     * Blend factor for plate-interior fractal noise.
     * Higher values create thicker/thinner sections inside plates.
     * @example 0.6 produces varied continental thickness; 0.2 yields uniform interiors.
     */
    interiorNoiseWeight: Type.Optional(
      Type.Number({
        description:
          "Blend factor for plate-interior fractal noise; higher values create thicker/thinner sections inside plates.",
      })
    ),
    /**
     * Multiplier for convergent boundary uplift arcs.
     * Higher weights favor dramatic coastal arcs like the Andes.
     * @example 0.35 creates subtle arcs; 0.8 creates dominant coastal mountain walls.
     */
    boundaryArcWeight: Type.Optional(
      Type.Number({
        description:
          "Multiplier for convergent boundary uplift arcs; higher weights favor dramatic coastal arcs like the Andes.",
      })
    ),
    /**
     * Raggedness injected into boundary arcs.
     * Increases coastline roughness along active margins.
     */
    boundaryArcNoiseWeight: Type.Optional(
      Type.Number({
        description:
          "Raggedness injected into boundary arcs; increases coastline roughness along active margins.",
      })
    ),
    /**
     * Grain of tectonic fractal noise.
     * Larger values yield finer variation in land scoring.
     */
    fractalGrain: Type.Optional(
      Type.Number({
        description: "Grain of tectonic fractal noise; larger values yield finer variation in land scoring.",
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Post-processing adjustments applied to landmass windows after plate layout.
 */
const LandmassGeometryPostSchema = Type.Object(
  {
    /** Uniform horizontal expansion (tiles) applied to every landmass before individual offsets. */
    expandTiles: Type.Optional(
      Type.Number({
        description: "Uniform horizontal expansion (tiles) applied to every landmass before individual offsets.",
      })
    ),
    /** Extra west-side padding (tiles) added on top of the shared expansion value. */
    expandWestTiles: Type.Optional(
      Type.Number({
        description: "Extra west-side padding (tiles) added on top of the shared expansion value.",
      })
    ),
    /** Extra east-side padding (tiles) added on top of the shared expansion value. */
    expandEastTiles: Type.Optional(
      Type.Number({
        description: "Extra east-side padding (tiles) added on top of the shared expansion value.",
      })
    ),
    /** Minimum allowed west boundary (tile index) to prevent over-expansion off the map. */
    clampWestMin: Type.Optional(
      Type.Number({
        description: "Minimum allowed west boundary (tile index) to prevent over-expansion off the map.",
      })
    ),
    /** Maximum allowed east boundary (tile index) to keep landmasses within the map. */
    clampEastMax: Type.Optional(
      Type.Number({
        description: "Maximum allowed east boundary (tile index) to keep landmasses within the map.",
      })
    ),
    /** Fixed south boundary (tile row) for all landmasses; useful for curated presets. */
    overrideSouth: Type.Optional(
      Type.Number({
        description: "Fixed south boundary (tile row) for all landmasses; useful for curated presets.",
      })
    ),
    /** Fixed north boundary (tile row) for all landmasses; pairs with overrideSouth for custom bands. */
    overrideNorth: Type.Optional(
      Type.Number({
        description: "Fixed north boundary (tile row) for all landmasses; pairs with overrideSouth for custom bands.",
      })
    ),
    /** Enforces a minimum horizontal span (tiles) to avoid razor-thin continents after clamping. */
    minWidthTiles: Type.Optional(
      Type.Number({
        description: "Enforces a minimum horizontal span (tiles) to avoid razor-thin continents after clamping.",
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Landmass geometry wrapper for future knobs beyond post-processing.
 */
const LandmassGeometrySchema = Type.Object(
  {
    post: Type.Optional(LandmassGeometryPostSchema),
  },
  { additionalProperties: false }
);

/**
 * Controls overall land/water mix and how plates bias the landmask.
 */
export const LandmassConfigSchema = Type.Object(
  {
    /**
     * Target global water coverage (0-100).
     * - 55-65 mimics Earth
     * - 70-75 drifts toward archipelago worlds
     * - 50-55 yields Pangaea-style supercontinents
     * @default 60
     */
    baseWaterPercent: Type.Optional(
      Type.Number({
        description:
          "Target global water coverage (0-100). Clamped in landmass scoring; 55-65 mimics Earth,"
          + " 70-75 drifts toward archipelago worlds, and 50-55 yields Pangaea-style supercontinents.",
        default: 60,
        minimum: 0,
        maximum: 100,
      })
    ),
    /**
     * Multiplier applied after baseWaterPercent (typically 0.75-1.25).
     * Clamped to 0.25-1.75 so nudging water for huge/tiny maps cannot wipe out land entirely.
     * @default 1
     * @min 0.25
     * @max 1.75
     */
    waterScalar: Type.Optional(
      Type.Number({
        description:
          "Multiplier applied after baseWaterPercent (typically 0.75-1.25). Values are clamped to a 0.25-1.75"
          + " band so nudging water for huge/tiny maps cannot wipe out land entirely.",
        default: 1,
        minimum: 0.25,
        maximum: 1.75,
      })
    ),
    /**
     * Closeness bonus favoring tiles near plate boundaries (clamped to ~0.4).
     * Higher values pull continents toward active margins to guarantee coastal mountain arcs
     * while still keeping interior cores.
     */
    boundaryBias: Type.Optional(
      Type.Number({
        description:
          "Closeness bonus favoring tiles near plate boundaries (clamped to ~0.4). Higher values pull continents"
          + " toward active margins to guarantee coastal mountain arcs while still keeping interior cores.",
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Soft backstop on the share of land inside the boundary closeness band (0..1).
     * The solver lowers threshold in 5-point steps until boundary share meets this target.
     * Ensures some land hugs convergent margins for dramatic coasts.
     */
    boundaryShareTarget: Type.Optional(
      Type.Number({
        description:
          "Soft backstop on the share of land that should fall inside the boundary closeness band (0..1)."
          + " After picking an initial threshold, the solver lowers it in 5-point steps until the boundary"
          + " share meets this target (default ~0.15) or land exceeds ~150% of the goal. Use this to ensure"
          + " some land hugs convergent margins for dramatic coasts without drowning interiors.",
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Desired share of continental crust when balancing land vs. ocean plates (0..1). */
    continentalFraction: Type.Optional(
      Type.Number({
        description: "Desired share of continental crust when balancing land vs. ocean plates (0..1).",
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Bias that clusters continental plates together.
     * Higher values encourage supercontinents rather than scattered shards.
     */
    clusteringBias: Type.Optional(
      Type.Number({
        description:
          "Bias that clusters continental plates together; higher values encourage supercontinents rather than scattered shards.",
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Probability of spawning small continental shards.
     * Increases detached microcontinents for naval play.
     */
    microcontinentChance: Type.Optional(
      Type.Number({
        description:
          "Probability of spawning small continental shards; increases detached microcontinents for naval play.",
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Blend factor softening crust transitions at edges.
     * Higher values smooth abrupt height changes at plate seams.
     * @default 0.45
     */
    crustEdgeBlend: Type.Optional(
      Type.Number({
        description:
          "Blend factor softening crust transitions at edges; higher values smooth abrupt height changes at plate seams.",
        default: 0.45,
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Amplitude of crust noise injected into the landmask.
     * Avoids uniform thickness across continents.
     * @default 0.1
     */
    crustNoiseAmplitude: Type.Optional(
      Type.Number({
        description:
          "Amplitude of crust noise injected into the landmask to avoid uniform thickness across continents.",
        default: 0.1,
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Base elevation assigned to continental crust before mountains/hills are applied.
     * @default 0.32
     */
    continentalHeight: Type.Optional(
      Type.Number({
        description: "Base elevation assigned to continental crust before mountains/hills are applied.",
        default: 0.32,
        minimum: -2,
        maximum: 2,
      })
    ),
    /**
     * Base elevation assigned to oceanic crust.
     * Deeper negatives create deeper basins.
     * @default -0.55
     */
    oceanicHeight: Type.Optional(
      Type.Number({
        description: "Base elevation assigned to oceanic crust; deeper negatives create deeper basins.",
        default: -0.55,
        minimum: -2,
        maximum: 0,
      })
    ),
    /** Tectonic weighting configuration for land scoring. */
    tectonics: Type.Optional(LandmassTectonicsConfigSchema),
    /** Geometry post-processing adjustments. */
    geometry: Type.Optional(LandmassGeometrySchema),
  },
  { additionalProperties: false }
);

export type LandmassConfig = Static<typeof LandmassConfigSchema>;
export type LandmassTectonicsConfig =
  Static<typeof LandmassConfigSchema["properties"]["tectonics"]>;
export type LandmassGeometry = Static<typeof LandmassConfigSchema["properties"]["geometry"]>;
export type LandmassGeometryPost =
  Static<typeof LandmassConfigSchema["properties"]["geometry"]["properties"]["post"]>;

/**
 * Seed configuration shared across the foundation pipeline.
 */
