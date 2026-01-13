import { Type, type Static } from "@swooper/mapgen-core/authoring";
import { LandmassConfigSchema } from "../morphology/landmass/config.js";

/**
 * Seed configuration shared across the foundation pipeline.
 */
const FoundationSeedConfigSchema = Type.Object(
  {
    /**
     * Choose Civ engine RNG or a fixed deterministic seed.
     * Use `'fixed'` for reproducible worlds during testing/debugging.
     * @default "engine"
     */
    mode: Type.Optional(
      Type.Union([Type.Literal("engine"), Type.Literal("fixed")], {
        description: "Choose Civ engine RNG or a fixed deterministic seed for reproducible worlds.",
        default: "engine",
      })
    ),
    /** Explicit seed value used when mode is set to `'fixed'`. */
    fixedSeed: Type.Optional(
      Type.Number({
        description: "Explicit seed value used when mode is set to 'fixed'.",
      })
    ),
    /**
     * Global offset added before deriving per-subsystem seeds.
     * Decorrelates runs while preserving relative randomness.
     * @default 0
     */
    offset: Type.Optional(
      Type.Number({
        description: "Global offset added before deriving per-subsystem seeds to decorrelate runs.",
        default: 0,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Voronoi plate layout controls for the world foundation.
 */
const FoundationPlatesConfigSchema = Type.Object(
  {
    /**
     * Number of tectonic plates.
     * - Fewer plates (4-6) yield supercontinents
     * - More plates (12-20) fragment the map into many smaller landmasses
     * @default 8
     */
    count: Type.Optional(
      Type.Number({
        description: "Number of tectonic plates; fewer plates yield supercontinents, more plates fragment the map.",
        default: 8,
        minimum: 2,
        maximum: 32,
      })
    ),
    /**
     * Lloyd relaxation iterations to smooth plate boundaries.
     * Higher values create rounder, more regular plates.
     * @default 5
     */
    relaxationSteps: Type.Optional(
      Type.Number({
        description: "Lloyd relaxation iterations to smooth plate boundaries; higher values create rounder plates.",
        default: 5,
        minimum: 0,
        maximum: 50,
      })
    ),
    /**
     * Ratio of convergent to divergent boundaries (0..1).
     * Controls how much collision (mountains) vs. rifting (valleys) occurs.
     * @default 0.5
     */
    convergenceMix: Type.Optional(
      Type.Number({
        description: "Ratio of convergent to divergent boundaries (0..1) controlling how much collision vs. rifting occurs.",
        default: 0.5,
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Multiplier applied to plate rotation weighting along boundaries.
     * Higher values spin plates faster, creating more dramatic shear zones.
     * @default 1
     */
    plateRotationMultiple: Type.Optional(
      Type.Number({
        description: "Multiplier applied to plate rotation weighting along boundaries; higher values spin plates faster.",
        default: 1,
        minimum: 0,
        maximum: 5,
      })
    ),
    /**
     * Choose Civ engine RNG or a fixed seed specifically for plate layout.
     * @default "engine"
     */
    seedMode: Type.Optional(
      Type.Union([Type.Literal("engine"), Type.Literal("fixed")], {
        description: "Choose Civ engine RNG or a fixed seed specifically for plate layout.",
        default: "engine",
      })
    ),
    /** Explicit plate seed used when seedMode is `'fixed'` to lock plate positions. */
    fixedSeed: Type.Optional(
      Type.Number({
        description: "Explicit plate seed used when seedMode is 'fixed' to lock plate positions.",
      })
    ),
    /**
     * Offset applied to the plate seed.
     * Decorrelates from other subsystems while keeping reproducibility.
     * @default 0
     */
    seedOffset: Type.Optional(
      Type.Number({
        description: "Offset applied to the plate seed to decorrelate from other subsystems while keeping reproducibility.",
        default: 0,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Alignment and interplay controls for plates, winds, and currents.
 */
export const FoundationDirectionalityConfigSchema = Type.Object(
  {
    /**
     * Global alignment strength (0..1).
     * Higher values keep plates, winds, and currents pointing similarly.
     * @default 0
     */
    cohesion: Type.Optional(
      Type.Number({
        description: "Global alignment strength (0..1); higher values keep plates, winds, and currents pointing similarly.",
        default: 0,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Primary axis settings for plates, winds, and currents. */
    primaryAxes: Type.Optional(
      Type.Object(
        {
          /** Preferred plate motion heading in degrees (0° = east). */
          plateAxisDeg: Type.Optional(
            Type.Number({
              description: "Preferred plate motion heading in degrees (0° = east).",
              default: 0,
            })
          ),
          /** Bias for prevailing wind direction relative to zonal flow (degrees). */
          windBiasDeg: Type.Optional(
            Type.Number({
              description: "Bias for prevailing wind direction relative to zonal flow (degrees).",
              default: 0,
            })
          ),
          /** Bias for major ocean gyre rotation (degrees). */
          currentBiasDeg: Type.Optional(
            Type.Number({
              description: "Bias for major ocean gyre rotation (degrees).",
              default: 0,
            })
          ),
        },
        { additionalProperties: false }
      )
    ),
    /** Variability settings for directional jitter. */
    variability: Type.Optional(
      Type.Object(
        {
          /** Random angular deviation applied to preferred axes (degrees). */
          angleJitterDeg: Type.Optional(
            Type.Number({
              description: "Random angular deviation applied to preferred axes (degrees).",
              default: 0,
            })
          ),
          /** Variance multiplier controlling how strongly directionality is enforced across the map. */
          magnitudeVariance: Type.Optional(
            Type.Number({
              description: "Variance multiplier controlling how strongly directionality is enforced across the map.",
              default: 0,
            })
          ),
        },
        { additionalProperties: false }
      )
    ),
    /** Hemisphere-specific settings for Coriolis effects. */
    hemispheres: Type.Optional(
      Type.Object(
        {
          /** Flip directionality in the southern hemisphere for Coriolis-style mirroring. */
          southernFlip: Type.Optional(
            Type.Boolean({
              description: "Flip directionality in the southern hemisphere for Coriolis-style mirroring.",
              default: false,
            })
          ),
          /**
           * Band around the equator treated as neutral for hemisphere-driven adjustments (degrees).
           * @default 12
           */
          equatorBandDeg: Type.Optional(
            Type.Number({
              description:
                "Band around the equator treated as neutral for hemisphere-driven adjustments (degrees).",
              default: 12,
              minimum: 0,
              maximum: 45,
            })
          ),
          /**
           * Strength of monsoon hemisphere bias (0..1).
           * @default 0
           */
          monsoonBias: Type.Optional(
            Type.Number({
              description: "Strength of monsoon hemisphere bias (0..1).",
              default: 0,
              minimum: 0,
              maximum: 1,
            })
          ),
        },
        { additionalProperties: false }
      )
    ),
    /** Coupling between plates, winds, and currents. */
    interplay: Type.Optional(
      Type.Object(
        {
          /** How strongly prevailing winds align with plate motion (0..1). */
          windsFollowPlates: Type.Optional(
            Type.Number({
              description: "How strongly prevailing winds align with plate motion (0..1).",
              default: 0,
              minimum: 0,
              maximum: 1,
            })
          ),
          /** How strongly ocean currents align with wind direction (0..1). */
          currentsFollowWinds: Type.Optional(
            Type.Number({
              description: "How strongly ocean currents align with wind direction (0..1).",
              default: 0,
              minimum: 0,
              maximum: 1,
            })
          ),
          /** How strongly rift valley lines follow plate directionality (0..1). */
          riftsFollowPlates: Type.Optional(
            Type.Number({
              description: "How strongly rift valley lines follow plate directionality (0..1).",
              default: 0,
              minimum: 0,
              maximum: 1,
            })
          ),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

/**
 * Atmospheric, oceanic, and mantle drivers for the foundation tensors.
 */
const FoundationDynamicsConfigSchema = Type.Object(
  {
    /** Mantle plume configuration for deep-earth uplift sources. */
    mantle: Type.Optional(
      Type.Object(
        {
          /**
           * Number of mantle plume hotspots that feed uplift potential.
           * Creates volcanic island chains and continental hotspots.
           * @default 4
           */
          bumps: Type.Optional(
            Type.Number({
              description: "Number of mantle plume hotspots that feed uplift potential (integer).",
              default: 4,
              minimum: 1,
              maximum: 64,
            })
          ),
          /**
           * Strength of mantle pressure contributions.
           * Higher values increase uplift everywhere.
           * @default 0.6
           */
          amplitude: Type.Optional(
            Type.Number({
              description: "Strength of mantle pressure contributions; higher values increase uplift everywhere.",
              default: 0.6,
              minimum: 0.1,
              maximum: 5,
            })
          ),
          /**
           * Spatial scale of mantle effects.
           * Larger scales spread hotspots wider before decay.
           * @default 0.4
           */
          scale: Type.Optional(
            Type.Number({
              description: "Spatial scale of mantle effects; larger scales spread hotspots wider before decay.",
              default: 0.4,
              minimum: 0.1,
              maximum: 1,
            })
          ),
        },
        { additionalProperties: false }
      )
    ),
    /** Atmospheric wind configuration for rainfall patterns. */
    wind: Type.Optional(
      Type.Object(
        {
          /**
           * Number of jet stream bands influencing storm tracks (e.g., 2-5).
           * @default 3
           */
          jetStreaks: Type.Optional(
            Type.Number({
              description: "Number of jet stream bands influencing storm tracks (e.g., 2-5).",
              default: 3,
              minimum: 0,
              maximum: 12,
            })
          ),
          /**
           * Overall jet stream intensity multiplier affecting rainfall steering.
           * @default 1
           */
          jetStrength: Type.Optional(
            Type.Number({
              description: "Overall jet stream intensity multiplier affecting rainfall steering.",
              default: 1,
              minimum: 0,
              maximum: 5,
            })
          ),
          /**
           * Directional variance for winds.
           * Higher variance loosens strict banded flow.
           * @default 0.6
           */
          variance: Type.Optional(
            Type.Number({
              description: "Directional variance for winds; higher variance loosens strict banded flow.",
              default: 0.6,
              minimum: 0,
              maximum: 2,
            })
          ),
        },
        { additionalProperties: false }
      )
    ),
    /** Directionality controls for plates, winds, and currents alignment. */
    directionality: Type.Optional(FoundationDirectionalityConfigSchema),
  },
  { additionalProperties: false }
);

/**
 * Consolidated foundation configuration replacing the legacy worldModel split.
 */
export const FoundationConfigSchema = Type.Object(
  {
    /** Random seed configuration for reproducible generation. */
    seed: Type.Optional(FoundationSeedConfigSchema),
    /** Tectonic plate count and behavior settings. */
    plates: Type.Optional(FoundationPlatesConfigSchema),
    /** Wind, mantle convection, and directional coherence settings. */
    dynamics: FoundationDynamicsConfigSchema,
  },
  { additionalProperties: false }
);

export type FoundationConfig = Static<typeof FoundationConfigSchema>;
export type FoundationSeedConfig = Static<typeof FoundationConfigSchema["properties"]["seed"]>;
export type FoundationPlatesConfig = Static<typeof FoundationConfigSchema["properties"]["plates"]>;
export type FoundationDynamicsConfig =
  Static<typeof FoundationConfigSchema["properties"]["dynamics"]>;
export type FoundationDirectionalityConfig =
  Static<typeof FoundationConfigSchema["properties"]["dynamics"]["properties"]["directionality"]>;
