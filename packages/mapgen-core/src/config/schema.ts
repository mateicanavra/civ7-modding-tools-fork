import { Type, type Static } from "typebox";

// ────────────────────────────────────────────────────────────────────────────
// Schema metadata constants
// ────────────────────────────────────────────────────────────────────────────

/**
 * Metadata key marking schema nodes as engine-internal (not part of the public
 * mod-facing API). Used by getPublicJsonSchema() to filter the exported schema.
 */
export const INTERNAL_METADATA_KEY = "xInternal" as const;

/**
 * Open-ended record used for layers that still consume untyped knobs.
 * These survive while we gradually migrate layer-specific structures into
 * strongly typed schemas.
 */
const UnknownRecord = Type.Record(Type.String(), Type.Unknown(), {
  default: {},
  description:
    "String-keyed bag for layer-specific knobs that have not yet been formalized in the schema.",
});

/**
 * Bounding box for a continent band when seeding player starts.
 * All values are inclusive tile coordinates in the Civ engine grid.
 */
export const ContinentBoundsSchema = Type.Object(
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
  { additionalProperties: true }
);

/**
 * Stage enablement overrides keyed by stage name.
 * Values are boolean switches consumed by the stage resolver.
 *
 * @internal Engine plumbing for stage resolution; not part of the public mod API.
 */
export const StageConfigSchema = Type.Record(Type.String(), Type.Boolean(), {
  default: {},
  description: "[internal] Per-stage enablement overrides keyed by manifest stage id.",
  [INTERNAL_METADATA_KEY]: true,
});

/**
 * Descriptor for a stage in the orchestrated manifest.
 * Captures dependencies, provided tags, and legacy toggle aliases.
 *
 * @internal Engine plumbing for stage resolution; not part of the public mod API.
 */
export const StageDescriptorSchema = Type.Object(
  {
    enabled: Type.Optional(
      Type.Boolean({
        description: "Explicit enable/disable switch applied before dependency resolution.",
      })
    ),
    requires: Type.Optional(
      Type.Array(Type.String(), {
        default: [],
        description:
          "Canonical dependency tags that must be satisfied before this stage executes (artifact:*, field:*, state:engine.*). Stage-id dependencies are not supported in M3; use tags only.",
      })
    ),
    provides: Type.Optional(
      Type.Array(Type.String(), {
        default: [],
        description:
          "Dependency tags this stage makes available to dependents (data artifacts, fields, and/or engine-state guarantees). Note: state:engine.* tags are treated as trusted assertions in M3 and are not runtime-verified.",
      })
    ),
    legacyToggles: Type.Optional(
      Type.Array(Type.String(), {
        default: [],
        description: "Legacy boolean toggles that map to this stage for backward compatibility.",
      })
    ),
    blockedBy: Type.Optional(
      Type.String({
        description: "Optional stage name that disables this stage when present.",
      })
    ),
  },
  { additionalProperties: true, default: {}, [INTERNAL_METADATA_KEY]: true }
);

/**
 * Ordered list of stages plus metadata consumed by the bootstrap resolver.
 *
 * @internal Engine plumbing for stage resolution; not part of the public mod API.
 */
export const StageManifestSchema = Type.Object(
  {
    order: Type.Array(Type.String(), {
      default: [],
      description: "Execution order for stages after dependency expansion.",
    }),
    stages: Type.Record(Type.String(), StageDescriptorSchema, {
      default: {},
      description: "Descriptors keyed by stage id controlling gating and dependencies.",
    }),
  },
  {
    default: {},
    description: "[internal] Stage manifest for orchestrated pipeline execution.",
    [INTERNAL_METADATA_KEY]: true,
  }
);

/**
 * High-level toggles that mirror the legacy STORY_ENABLE_* flags.
 */
export const TogglesSchema = Type.Object(
  {
    /**
     * Whether volcanic/paradise hotspots are allowed to generate story overlays.
     * When enabled, creates Hawaii-style island chains and lush paradise archipelagos.
     * @default true
     */
    STORY_ENABLE_HOTSPOTS: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Whether volcanic/paradise hotspots are allowed to generate story overlays.",
      })
    ),
    /**
     * Whether continental rift valleys and shoulders should be created.
     * Produces East-African-style rift features with elevated shoulders and lowland troughs.
     * @default true
     */
    STORY_ENABLE_RIFTS: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Whether continental rift valleys and shoulders should be created.",
      })
    ),
    /**
     * Controls whether orogenic mountain belts are simulated along convergent margins.
     * Creates Andes/Himalayas-style ranges where plates collide.
     * @default true
     */
    STORY_ENABLE_OROGENY: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Controls whether orogenic mountain belts are simulated along convergent margins.",
      })
    ),
    /**
     * Enables macro swatch overrides that recolor large climate regions.
     * Creates coherent biome patches (e.g., Sahara-sized deserts or Amazon-style rainforests).
     * @default true
     */
    STORY_ENABLE_SWATCHES: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Enables macro swatch overrides that recolor large climate regions.",
      })
    ),
    /**
     * Enables paleo-hydrology artifacts such as fossil channels and oxbows.
     * Adds dry riverbeds and ancient lake basins for terrain variety.
     * @default true
     */
    STORY_ENABLE_PALEO: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Enables paleo-hydrology artifacts such as fossil channels and oxbows.",
      })
    ),
    /**
     * Controls whether strategic corridor protection is applied.
     * Preserves navigable sea lanes and land bridges for gameplay connectivity.
     * @default true
     */
    STORY_ENABLE_CORRIDORS: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Controls whether strategic corridor protection is applied.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Tectonic weighting used while scoring candidate land tiles.
 */
export const LandmassTectonicsConfigSchema = Type.Object(
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
  { additionalProperties: true, default: {} }
);

/**
 * Post-processing adjustments applied to landmass windows after plate layout.
 */
export const LandmassGeometryPostSchema = Type.Object(
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
  { additionalProperties: true, default: {} }
);

/**
 * Landmass geometry wrapper for future knobs beyond post-processing.
 */
export const LandmassGeometrySchema = Type.Object(
  {
    post: Type.Optional(LandmassGeometryPostSchema),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Controls overall land/water mix and how plates bias the landmask.
 */
export const LandmassConfigSchema = Type.Object(
  {
    /**
     * Legacy landmask mode selector.
     * `'legacy'` preserves historical behavior; `'area'` uses area-weighted windows.
     * @default "legacy"
     */
    crustMode: Type.Optional(
      Type.Union([Type.Literal("legacy"), Type.Literal("area")], {
        description:
          "Legacy landmask mode selector: 'legacy' preserves historical behavior, 'area' uses area-weighted windows.",
        default: "legacy",
      })
    ),
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
    /** Legacy fallback for continentalFraction kept for backward compatibility. */
    crustContinentalFraction: Type.Optional(
      Type.Number({
        description: "Legacy fallback for continentalFraction kept for backward compatibility.",
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Bias that clusters continental plates together.
     * Higher values encourage supercontinents rather than scattered shards.
     */
    crustClusteringBias: Type.Optional(
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
  { additionalProperties: true, default: {} }
);

/**
 * Seed configuration shared across the foundation pipeline.
 */
export const FoundationSeedConfigSchema = Type.Object(
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
  { additionalProperties: true, default: {} }
);

/**
 * Voronoi plate layout controls for the world foundation.
 */
export const FoundationPlatesConfigSchema = Type.Object(
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
  { additionalProperties: true, default: {} }
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
            })
          ),
          /** Bias for prevailing wind direction relative to zonal flow (degrees). */
          windBiasDeg: Type.Optional(
            Type.Number({
              description: "Bias for prevailing wind direction relative to zonal flow (degrees).",
            })
          ),
          /** Bias for major ocean gyre rotation (degrees). */
          currentBiasDeg: Type.Optional(
            Type.Number({
              description: "Bias for major ocean gyre rotation (degrees).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
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
            })
          ),
          /** Variance multiplier controlling how strongly directionality is enforced across the map. */
          magnitudeVariance: Type.Optional(
            Type.Number({
              description: "Variance multiplier controlling how strongly directionality is enforced across the map.",
            })
          ),
        },
        { additionalProperties: true, default: {} }
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
            })
          ),
        },
        { additionalProperties: true, default: {} }
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
            })
          ),
          /** How strongly ocean currents align with wind direction (0..1). */
          currentsFollowWinds: Type.Optional(
            Type.Number({
              description: "How strongly ocean currents align with wind direction (0..1).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Atmospheric, oceanic, and mantle drivers for the foundation tensors.
 */
export const FoundationDynamicsConfigSchema = Type.Object(
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
        { additionalProperties: true, default: {} }
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
        { additionalProperties: true, default: {} }
      )
    ),
    /** Directionality controls for plates, winds, and currents alignment. */
    directionality: Type.Optional(FoundationDirectionalityConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Placeholder for plate-aware ocean separation inputs stored during foundation.
 *
 * @internal Engine plumbing; use top-level oceanSeparation for mod configs.
 */
export const FoundationOceanSeparationConfigSchema = Type.Object(
  {},
  {
    additionalProperties: true,
    default: {},
    description: "[internal] Foundation-level ocean separation alias; prefer top-level oceanSeparation.",
    [INTERNAL_METADATA_KEY]: true,
  }
);

/**
 * Surface targets derived from the world foundation seed.
 *
 * @internal Engine plumbing; surface config is derived from other fields.
 */
export const FoundationSurfaceConfigSchema = Type.Object(
  {
    landmass: Type.Optional(LandmassConfigSchema),
    oceanSeparation: Type.Optional(FoundationOceanSeparationConfigSchema),
    crustMode: Type.Optional(
      Type.Union([Type.Literal("legacy"), Type.Literal("area")], {
        description: "Forwarded crust mode so surface consumers can mirror legacy vs. area-weighted behavior.",
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "[internal] Surface targets derived from foundation; prefer top-level landmass/oceanSeparation.",
    [INTERNAL_METADATA_KEY]: true,
  }
);

/**
 * Policy multipliers exposed to downstream stages (coastlines, story overlays, etc.).
 *
 * @internal Engine plumbing for policy propagation.
 */
export const FoundationPolicyConfigSchema = Type.Object(
  {
    oceanSeparation: Type.Optional(FoundationOceanSeparationConfigSchema),
  },
  {
    additionalProperties: true,
    default: {},
    description: "[internal] Policy multipliers for downstream stages.",
    [INTERNAL_METADATA_KEY]: true,
  }
);

/**
 * Diagnostics and logging toggles for the stable-slice (M2) pipeline.
 *
 * This block is the canonical supported diagnostics surface for M2 and is
 * consumed by MapOrchestrator via initDevFlags().
 *
 * Keys are camelCase and match DevLogConfig in dev/flags.ts.
 */
export const FoundationDiagnosticsConfigSchema = Type.Object(
  {
    /**
     * Master diagnostics switch.
     *
     * If omitted, MapOrchestrator will auto-enable diagnostics when any other
     * diagnostics flag is explicitly set to true.
     */
    enabled: Type.Optional(
      Type.Boolean({
        description:
          "Master diagnostics switch. If omitted, diagnostics auto-enable when any other diagnostics flag is true.",
      })
    ),
    /** Log per-stage timings and section durations. */
    logTiming: Type.Optional(
      Type.Boolean({ default: false, description: "Log per-stage timings and section durations." })
    ),
    /** Log foundation seed configuration. */
    logFoundationSeed: Type.Optional(
      Type.Boolean({ default: false, description: "Log foundation seed configuration." })
    ),
    /** Log foundation plates configuration. */
    logFoundationPlates: Type.Optional(
      Type.Boolean({ default: false, description: "Log foundation plates configuration." })
    ),
    /** Log foundation dynamics configuration. */
    logFoundationDynamics: Type.Optional(
      Type.Boolean({ default: false, description: "Log foundation dynamics configuration." })
    ),
    /** Log foundation surface configuration. */
    logFoundationSurface: Type.Optional(
      Type.Boolean({ default: false, description: "Log foundation surface configuration." })
    ),
    /** Print compact foundation summary. */
    logFoundationSummary: Type.Optional(
      Type.Boolean({ default: false, description: "Print compact foundation summary." })
    ),
    /** ASCII visualization of plate boundaries and masks. */
    logFoundationAscii: Type.Optional(
      Type.Boolean({
        default: false,
        description: "Emit ASCII visualizations for foundation plates and boundaries.",
      })
    ),
    /** ASCII snapshot of land vs. ocean. */
    logLandmassAscii: Type.Optional(
      Type.Boolean({ default: false, description: "Emit ASCII snapshot of land vs. ocean." })
    ),
    /** Log landmass window bounding boxes. */
    logLandmassWindows: Type.Optional(
      Type.Boolean({ default: false, description: "Log landmass window bounding boxes." })
    ),
    /** ASCII visualization of terrain relief. */
    logReliefAscii: Type.Optional(
      Type.Boolean({ default: false, description: "Emit ASCII visualization of terrain relief." })
    ),
    /** ASCII heatmap for rainfall. */
    logRainfallAscii: Type.Optional(
      Type.Boolean({ default: false, description: "Emit ASCII heatmap for rainfall buckets." })
    ),
    /** Log rainfall min/max/avg statistics. */
    logRainfallSummary: Type.Optional(
      Type.Boolean({ default: false, description: "Log rainfall min/max/avg statistics." })
    ),
    /** ASCII biome classification overlay. */
    logBiomeAscii: Type.Optional(
      Type.Boolean({ default: false, description: "Emit ASCII biome classification overlay." })
    ),
    /** Log biome tile counts. */
    logBiomeSummary: Type.Optional(
      Type.Boolean({ default: false, description: "Log biome tile counts and distribution." })
    ),
    /** Log StoryTags summary counts. */
    logStoryTags: Type.Optional(
      Type.Boolean({ default: false, description: "Log StoryTags summary counts." })
    ),
    /** ASCII corridor overlay. */
    logCorridorAscii: Type.Optional(
      Type.Boolean({ default: false, description: "Emit ASCII corridor overlay." })
    ),
    /** Quantitative boundary coverage metrics. */
    logBoundaryMetrics: Type.Optional(
      Type.Boolean({ default: false, description: "Log boundary coverage metrics." })
    ),
    /** Detailed mountain placement summaries. */
    logMountains: Type.Optional(
      Type.Boolean({ default: false, description: "Log detailed mountain placement summaries." })
    ),
    /** Detailed volcano placement summaries. */
    logVolcanoes: Type.Optional(
      Type.Boolean({ default: false, description: "Log detailed volcano placement summaries." })
    ),
    /** Print histograms for uplift/rift distributions. */
    foundationHistograms: Type.Optional(
      Type.Boolean({
        default: false,
        description: "Print histograms for uplift/rift distributions.",
      })
    ),
    /** Layer-specific counters and tile counts. */
    layerCounts: Type.Optional(
      Type.Boolean({ default: false, description: "Log layer-specific counters and tile counts." })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description:
      "Stable-slice diagnostics toggles consumed by MapOrchestrator. Keys match DevLogConfig and are camelCase.",
  }
);

/**
 * Edge override policy for the ocean separation pass.
 */
export const OceanSeparationEdgePolicySchema = Type.Object(
  {
    /** Enable edge-specific override for this map border (west or east). */
    enabled: Type.Optional(
      Type.Boolean({
        description: "Enable edge-specific override for this map border (west or east).",
      })
    ),
    /** Baseline separation enforced at the map edge in tiles (before boundary multipliers). */
    baseTiles: Type.Optional(
      Type.Number({
        description: "Baseline separation enforced at the map edge in tiles (before boundary multipliers).",
      })
    ),
    /** Multiplier applied near active margins when widening oceans at the edge. */
    boundaryClosenessMultiplier: Type.Optional(
      Type.Number({
        description: "Multiplier applied near active margins when widening oceans at the edge.",
      })
    ),
    /** Maximum allowed per-latitude separation delta for this edge to avoid extreme zig-zags. */
    maxPerRowDelta: Type.Optional(
      Type.Number({
        description: "Maximum allowed per-latitude separation delta for this edge to avoid extreme zig-zags.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Plate-aware ocean separation policy controlling continental drift spacing.
 */
export const OceanSeparationConfigSchema = Type.Object(
  {
    /** Master switch for plate-aware ocean widening between continent bands. */
    enabled: Type.Optional(
      Type.Boolean({
        description: "Master switch for plate-aware ocean widening between continent bands.",
      })
    ),
    /**
     * Pairs of continent indices to separate.
     * @example [[0,1],[1,2]] separates band 0 from 1, and band 1 from 2.
     */
    bandPairs: Type.Optional(
      Type.Array(Type.Tuple([Type.Number(), Type.Number()]), {
        default: [],
        description: "Pairs of continent indices to separate (e.g., [[0,1],[1,2]]).",
      })
    ),
    /** Baseline widening between continents in tiles before modifiers are applied. */
    baseSeparationTiles: Type.Optional(
      Type.Number({
        description: "Baseline widening between continents in tiles before modifiers are applied.",
      })
    ),
    /** Extra separation applied when plates are close to active boundaries (multiplier 0..2). */
    boundaryClosenessMultiplier: Type.Optional(
      Type.Number({
        description: "Extra separation applied when plates are close to active boundaries (multiplier 0..2).",
      })
    ),
    /** Maximum per-latitude variation in separation (tiles) to keep oceans smooth north-south. */
    maxPerRowDelta: Type.Optional(
      Type.Number({
        description: "Maximum per-latitude variation in separation (tiles) to keep oceans smooth north-south.",
      })
    ),
    /** Minimum navigable channel width to preserve while widening seas (tiles). */
    minChannelWidth: Type.Optional(
      Type.Number({
        description: "Minimum navigable channel width to preserve while widening seas (tiles).",
      })
    ),
    /** Random jitter applied to channel widths to avoid uniform straight lines. */
    channelJitter: Type.Optional(
      Type.Number({
        description: "Random jitter applied to channel widths to avoid uniform straight lines.",
      })
    ),
    /** Whether strategic sea corridors should be preserved when enforcing separation. */
    respectSeaLanes: Type.Optional(
      Type.Boolean({
        description: "Whether strategic sea corridors should be preserved when enforcing separation.",
      })
    ),
    /** West edge-specific override policy. */
    edgeWest: Type.Optional(OceanSeparationEdgePolicySchema),
    /** East edge-specific override policy. */
    edgeEast: Type.Optional(OceanSeparationEdgePolicySchema),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Plate-aware weighting for bay/fjord odds based on boundary closeness.
 */
export const CoastlinePlateBiasConfigSchema = Type.Object(
  {
    /** Normalized closeness where coastline edits begin to respond to plate boundaries (0..1). */
    threshold: Type.Optional(
      Type.Number({
        description: "Normalized closeness where coastline edits begin to respond to plate boundaries (0..1).",
      })
    ),
    /**
     * Exponent shaping how quickly bias ramps after the threshold.
     * Values >1 concentrate effects near boundaries; <1 spreads them wider.
     */
    power: Type.Optional(
      Type.Number({
        description: "Exponent shaping how quickly bias ramps after the threshold; >1 concentrates effects near boundaries.",
      })
    ),
    /** Bias multiplier for convergent boundaries; positive values encourage dramatic coasts and fjords. */
    convergent: Type.Optional(
      Type.Number({
        description: "Bias multiplier for convergent boundaries; positive values encourage dramatic coasts and fjords.",
      })
    ),
    /** Bias multiplier for transform boundaries; lower values soften edits along shear zones. */
    transform: Type.Optional(
      Type.Number({
        description: "Bias multiplier for transform boundaries; lower values soften edits along shear zones.",
      })
    ),
    /** Bias multiplier for divergent boundaries; negative values discourage ruggedization along rifts. */
    divergent: Type.Optional(
      Type.Number({
        description: "Bias multiplier for divergent boundaries; negative values discourage ruggedization along rifts.",
      })
    ),
    /** Residual bias for interior coasts away from boundaries; typically near zero. */
    interior: Type.Optional(
      Type.Number({
        description: "Residual bias for interior coasts away from boundaries; typically near zero.",
      })
    ),
    /** Strength applied to bay denominators; higher values increase bay carving where bias is positive. */
    bayWeight: Type.Optional(
      Type.Number({
        description: "Strength applied to bay denominators; higher values increase bay carving where bias is positive.",
      })
    ),
    /** Extra noise gate reduction when bias is positive, allowing smaller bays near active margins. */
    bayNoiseBonus: Type.Optional(
      Type.Number({
        description: "Extra noise gate reduction when bias is positive, allowing smaller bays near active margins.",
      })
    ),
    /** Strength applied to fjord denominators; higher values create more fjords along favored coasts. */
    fjordWeight: Type.Optional(
      Type.Number({
        description: "Strength applied to fjord denominators; higher values create more fjords along favored coasts.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Bay configuration (gentle coastal indentations).
 */
export const CoastlineBayConfigSchema = Type.Object(
  {
    /** Extra noise threshold on larger maps; higher values reduce bay frequency while keeping size larger. */
    noiseGateAdd: Type.Optional(
      Type.Number({
        description: "Extra noise threshold on larger maps; higher values reduce bay frequency while keeping size larger.",
      })
    ),
    /** Bay frequency on active margins; lower denominators produce more bays along energetic coasts. */
    rollDenActive: Type.Optional(
      Type.Number({
        description: "Bay frequency on active margins; lower denominators produce more bays along energetic coasts.",
      })
    ),
    /** Bay frequency on passive margins; lower denominators carve more bays in calm regions. */
    rollDenDefault: Type.Optional(
      Type.Number({
        description: "Bay frequency on passive margins; lower denominators carve more bays in calm regions.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Fjord configuration (deep, narrow inlets along steep margins).
 */
export const CoastlineFjordConfigSchema = Type.Object(
  {
    /** Base fjord frequency; smaller values increase fjord count across the map. */
    baseDenom: Type.Optional(
      Type.Number({
        description: "Base fjord frequency; smaller values increase fjord count across the map.",
      })
    ),
    /** Bonus applied on active convergent margins; subtracts from baseDenom to amplify fjord density. */
    activeBonus: Type.Optional(
      Type.Number({
        description: "Bonus applied on active convergent margins; subtracts from baseDenom to amplify fjord density.",
      })
    ),
    /** Bonus applied on passive shelves; subtracts from baseDenom for gentler fjords. */
    passiveBonus: Type.Optional(
      Type.Number({
        description: "Bonus applied on passive shelves; subtracts from baseDenom for gentler fjords.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Coastline ruggedization settings that transform smooth coasts into bays and fjords.
 */
export const CoastlinesConfigSchema = Type.Object(
  {
    /** Bay (gentle coastal indentation) configuration. */
    bay: Type.Optional(CoastlineBayConfigSchema),
    /** Fjord (deep, narrow inlet) configuration. */
    fjord: Type.Optional(CoastlineFjordConfigSchema),
    /** Plate-aware bias for bay/fjord odds based on boundary closeness. */
    plateBias: Type.Optional(CoastlinePlateBiasConfigSchema),
    /** Minimum channel width preserved for naval passage when carving bays and fjords (tiles). */
    minSeaLaneWidth: Type.Optional(
      Type.Number({
        description: "Minimum channel width preserved for naval passage when carving bays and fjords (tiles).",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Island chain placement using fractal noise and hotspot trails.
 */
export const IslandsConfigSchema = Type.Object(
  {
    /** Noise cutoff for island seeds (percent). Higher values mean fewer, larger island groups. */
    fractalThresholdPercent: Type.Optional(
      Type.Number({
        description: "Noise cutoff for island seeds (percent). Higher values mean fewer, larger island groups.",
      })
    ),
    /** Minimum spacing from continental landmasses (tiles) to prevent coastal clutter. */
    minDistFromLandRadius: Type.Optional(
      Type.Number({
        description: "Minimum spacing from continental landmasses (tiles) to prevent coastal clutter.",
      })
    ),
    /**
     * Island frequency near active margins.
     * Lower denominators spawn more volcanic arcs like Japan.
     */
    baseIslandDenNearActive: Type.Optional(
      Type.Number({
        description: "Island frequency near active margins; lower denominators spawn more volcanic arcs like Japan.",
      })
    ),
    /** Island frequency away from active margins; controls passive-shelf archipelagos. */
    baseIslandDenElse: Type.Optional(
      Type.Number({
        description: "Island frequency away from active margins; controls passive-shelf archipelagos.",
      })
    ),
    /**
     * Island seed frequency along hotspot trails.
     * Smaller values create Hawaii-style chains.
     */
    hotspotSeedDenom: Type.Optional(
      Type.Number({
        description: "Island seed frequency along hotspot trails; smaller values create Hawaii-style chains.",
      })
    ),
    /** Maximum tiles per island cluster to cap archipelago size (tiles). */
    clusterMax: Type.Optional(
      Type.Number({
        description: "Maximum tiles per island cluster to cap archipelago size (tiles).",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Mountain and hill placement tuning driven by WorldModel physics.
 */
export const MountainsConfigSchema = Type.Object(
  {
    /**
     * Global scale for tectonic effects.
     * Primary dial for overall mountain prevalence across the map.
     */
    tectonicIntensity: Type.Optional(
      Type.Number({
        description: "Global scale for tectonic effects; primary dial for overall mountain prevalence.",
      })
    ),
    /** Score threshold for promoting a tile to a mountain; lower values allow more peaks. */
    mountainThreshold: Type.Optional(
      Type.Number({
        description: "Score threshold for promoting a tile to a mountain; lower values allow more peaks.",
      })
    ),
    /** Score threshold for assigning hills; lower values increase hill coverage. */
    hillThreshold: Type.Optional(
      Type.Number({
        description: "Score threshold for assigning hills; lower values increase hill coverage.",
      })
    ),
    /** Weight applied to uplift potential; keeps mountains aligned with convergent zones. */
    upliftWeight: Type.Optional(
      Type.Number({
        description: "Weight applied to uplift potential; keeps mountains aligned with convergent zones.",
      })
    ),
    /** Weight applied to fractal noise to introduce natural variation in ranges. */
    fractalWeight: Type.Optional(
      Type.Number({
        description: "Weight applied to fractal noise to introduce natural variation in ranges.",
      })
    ),
    /** Depression severity along divergent boundaries (0..1); higher values carve deeper rifts. */
    riftDepth: Type.Optional(
      Type.Number({
        description: "Depression severity along divergent boundaries (0..1); higher values carve deeper rifts.",
      })
    ),
    /** Additional weight from plate-boundary closeness that pulls mountains toward margins. */
    boundaryWeight: Type.Optional(
      Type.Number({
        description: "Additional weight from plate-boundary closeness that pulls mountains toward margins.",
      })
    ),
    /** Exponent controlling how quickly boundary influence decays with distance (>=0.25). */
    boundaryExponent: Type.Optional(
      Type.Number({
        description: "Exponent controlling how quickly boundary influence decays with distance (>=0.25).",
      })
    ),
    /** Penalty applied to deep interior tiles to keep high terrain near tectonic action. */
    interiorPenaltyWeight: Type.Optional(
      Type.Number({
        description: "Penalty applied to deep interior tiles to keep high terrain near tectonic action.",
      })
    ),
    /** Extra additive weight for convergent tiles, creating dominant orogeny ridges. */
    convergenceBonus: Type.Optional(
      Type.Number({
        description: "Extra additive weight for convergent tiles, creating dominant orogeny ridges.",
      })
    ),
    /** Penalty multiplier for transform boundaries to soften shearing ridges. */
    transformPenalty: Type.Optional(
      Type.Number({
        description: "Penalty multiplier for transform boundaries to soften shearing ridges.",
      })
    ),
    /** Penalty multiplier applied along divergent boundaries before riftDepth is carved. */
    riftPenalty: Type.Optional(
      Type.Number({
        description: "Penalty multiplier applied along divergent boundaries before riftDepth is carved.",
      })
    ),
    /** Hill weight contributed by boundary closeness, forming foothill skirts near margins. */
    hillBoundaryWeight: Type.Optional(
      Type.Number({
        description: "Hill weight contributed by boundary closeness, forming foothill skirts near margins.",
      })
    ),
    /** Hill bonus added beside rift valleys, creating uplifted shoulders. */
    hillRiftBonus: Type.Optional(
      Type.Number({
        description: "Hill bonus added beside rift valleys, creating uplifted shoulders.",
      })
    ),
    /** Extra foothill weight on convergent tiles to smooth transitions into mountain ranges. */
    hillConvergentFoothill: Type.Optional(
      Type.Number({
        description: "Extra foothill weight on convergent tiles to smooth transitions into mountain ranges.",
      })
    ),
    /** Penalty for hills deep inside plates; higher values keep hills near tectonic features. */
    hillInteriorFalloff: Type.Optional(
      Type.Number({
        description: "Penalty for hills deep inside plates; higher values keep hills near tectonic features.",
      })
    ),
    /** Residual uplift contribution applied to hills so basins and foothills stay balanced. */
    hillUpliftWeight: Type.Optional(
      Type.Number({
        description: "Residual uplift contribution applied to hills so basins and foothills stay balanced.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Volcano placement controls combining plate-aware arcs and hotspot trails.
 */
export const VolcanoesConfigSchema = Type.Object(
  {
    /** Master toggle for volcano placement. */
    enabled: Type.Optional(
      Type.Boolean({
        description: "Master toggle for volcano placement.",
      })
    ),
    /** Baseline volcanoes per land tile; higher density spawns more vents overall. */
    baseDensity: Type.Optional(
      Type.Number({
        description: "Baseline volcanoes per land tile; higher density spawns more vents overall.",
      })
    ),
    /** Minimum Euclidean distance between volcanoes in tiles to avoid clusters merging. */
    minSpacing: Type.Optional(
      Type.Number({
        description: "Minimum Euclidean distance between volcanoes in tiles to avoid clusters merging.",
      })
    ),
    /** Plate-boundary closeness threshold (0..1) for treating a tile as margin-adjacent. */
    boundaryThreshold: Type.Optional(
      Type.Number({
        description: "Plate-boundary closeness threshold (0..1) for treating a tile as margin-adjacent.",
      })
    ),
    /** Base weight applied to tiles within the boundary band, biasing arcs over interiors. */
    boundaryWeight: Type.Optional(
      Type.Number({
        description: "Base weight applied to tiles within the boundary band, biasing arcs over interiors.",
      })
    ),
    /** Weight multiplier for convergent boundaries; raises classic arc volcano density. */
    convergentMultiplier: Type.Optional(
      Type.Number({
        description: "Weight multiplier for convergent boundaries; raises classic arc volcano density.",
      })
    ),
    /** Weight multiplier for transform boundaries; typically lower to avoid shear volcanism. */
    transformMultiplier: Type.Optional(
      Type.Number({
        description: "Weight multiplier for transform boundaries; typically lower to avoid shear volcanism.",
      })
    ),
    /** Weight multiplier for divergent boundaries; keep small to prevent rift volcanism dominating. */
    divergentMultiplier: Type.Optional(
      Type.Number({
        description: "Weight multiplier for divergent boundaries; keep small to prevent rift volcanism dominating.",
      })
    ),
    /** Weight contribution for interior hotspots; increases inland/shield volcano presence. */
    hotspotWeight: Type.Optional(
      Type.Number({
        description: "Weight contribution for interior hotspots; increases inland/shield volcano presence.",
      })
    ),
    /** Penalty applied using shield stability; higher values suppress volcanoes on ancient cratons. */
    shieldPenalty: Type.Optional(
      Type.Number({
        description: "Penalty applied using shield stability; higher values suppress volcanoes on ancient cratons.",
      })
    ),
    /** Random additive jitter per tile to break up deterministic patterns. */
    randomJitter: Type.Optional(
      Type.Number({
        description: "Random additive jitter per tile to break up deterministic patterns.",
      })
    ),
    /** Minimum volcano count target to guarantee a few vents even on sparse maps. */
    minVolcanoes: Type.Optional(
      Type.Number({
        description: "Minimum volcano count target to guarantee a few vents even on sparse maps.",
      })
    ),
    /** Maximum volcano count cap; set <=0 to disable the cap and allow density-driven totals. */
    maxVolcanoes: Type.Optional(
      Type.Number({
        description: "Maximum volcano count cap; set <=0 to disable the cap and allow density-driven totals.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Hotspot tuning used by story overlays.
 */
export const HotspotTunablesSchema = Type.Object(
  {
    /** Bias applied to paradise hotspots when selecting overlays (unitless multiplier). */
    paradiseBias: Type.Optional(
      Type.Number({
        description: "Bias applied to paradise hotspots when selecting overlays (unitless multiplier).",
      })
    ),
    /** Bias applied to volcanic hotspots when selecting overlays (unitless multiplier). */
    volcanicBias: Type.Optional(
      Type.Number({
        description: "Bias applied to volcanic hotspots when selecting overlays (unitless multiplier).",
      })
    ),
    /** Chance that a volcanic hotspot contains a high peak suitable for story placement (0..1). */
    volcanicPeakChance: Type.Optional(
      Type.Number({
        description: "Chance that a volcanic hotspot contains a high peak suitable for story placement (0..1).",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Localized feature bonuses around story elements.
 */
export const FeaturesConfigSchema = Type.Object(
  {
    /** Extra coral reef probability near paradise islands (0..1 expressed as a fraction). */
    paradiseReefChance: Type.Optional(
      Type.Number({
        description: "Extra coral reef probability near paradise islands (0..1 expressed as a fraction).",
      })
    ),
    /** Extra temperate forest chance on volcanic slopes in warm climates (0..1 fraction). */
    volcanicForestChance: Type.Optional(
      Type.Number({
        description: "Extra temperate forest chance on volcanic slopes in warm climates (0..1 fraction).",
      })
    ),
    /** Extra coniferous forest chance on volcano-adjacent tiles in cold climates (0..1 fraction). */
    volcanicTaigaChance: Type.Optional(
      Type.Number({
        description: "Extra coniferous forest chance on volcano-adjacent tiles in cold climates (0..1 fraction).",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Aggregated story configuration controlling hotspots and localized features.
 */
export const StoryConfigSchema = Type.Object(
  {
    /** Hotspot tuning for volcanic/paradise overlays. */
    hotspot: Type.Optional(HotspotTunablesSchema),
    /** Localized feature bonuses around story elements. */
    features: Type.Optional(FeaturesConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Policy governing how strategic sea corridors are protected or softened.
 */
export const SeaCorridorPolicySchema = Type.Object(
  {
    /**
     * Protection mode for sea corridors.
     * - `'hard'` blocks all edits in corridors
     * - `'soft'` allows limited carving with penalties
     */
    protection: Type.Optional(
      Type.Union([Type.Literal("hard"), Type.Literal("soft")], {
        description: "Hard protection blocks edits in corridors; soft allows limited carving with penalties.",
      })
    ),
    /** Probability multiplier applied when protection is soft to keep lanes mostly open. */
    softChanceMultiplier: Type.Optional(
      Type.Number({
        description: "Probability multiplier applied when protection is soft to keep lanes mostly open.",
      })
    ),
    /** Radius in tiles to avoid placing blocking features inside a sea corridor. */
    avoidRadius: Type.Optional(
      Type.Number({
        description: "Radius in tiles to avoid placing blocking features inside a sea corridor.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Strategic corridor configuration currently scoped to sea lanes.
 */
export const CorridorsConfigSchema = Type.Object(
  {
    /** Sea corridor protection policy for naval passage. */
    sea: Type.Optional(SeaCorridorPolicySchema),
  },
  { additionalProperties: true, default: {} }
);

// ────────────────────────────────────────────────────────────────────────────
// Climate sub-schemas (typed replacements for UnknownRecord)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Rainfall targets by latitude zone for the climate engine.
 * Values are rainfall units (0-200 typical range).
 */
export const ClimateBaselineBandsSchema = Type.Object(
  {
    /** Equatorial zone (0-10°) rainfall target (rainforests, monsoons; typically 110-130). */
    deg0to10: Type.Optional(
      Type.Number({
        description: "Equatorial zone rainfall target (rainforests, monsoons; typically 110-130).",
      })
    ),
    /** Tropical zone (10-20°) rainfall target (wet but variable; typically 90-110). */
    deg10to20: Type.Optional(
      Type.Number({
        description: "Tropical zone rainfall target (wet but variable; typically 90-110).",
      })
    ),
    /** Subtropical zone (20-35°) rainfall target (deserts, Mediterranean; typically 60-80). */
    deg20to35: Type.Optional(
      Type.Number({
        description: "Subtropical zone rainfall target (deserts, Mediterranean; typically 60-80).",
      })
    ),
    /** Temperate zone (35-55°) rainfall target (moderate rainfall; typically 70-90). */
    deg35to55: Type.Optional(
      Type.Number({
        description: "Temperate zone rainfall target (moderate rainfall; typically 70-90).",
      })
    ),
    /** Subpolar zone (55-70°) rainfall target (cool, moderate moisture; typically 55-70). */
    deg55to70: Type.Optional(
      Type.Number({
        description: "Subpolar zone rainfall target (cool, moderate moisture; typically 55-70).",
      })
    ),
    /** Polar zone (70°+) rainfall target (cold deserts, ice; typically 40-50). */
    deg70plus: Type.Optional(
      Type.Number({
        description: "Polar zone rainfall target (cold deserts, ice; typically 40-50).",
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "Rainfall targets by latitude zone.",
  }
);

/**
 * Blend weights for mixing engine rainfall with latitude-based targets.
 */
export const ClimateBaselineBlendSchema = Type.Object(
  {
    /** Weight for engine's base rainfall (0..1; typically 0.5-0.7). */
    baseWeight: Type.Optional(
      Type.Number({
        description: "Weight for engine's base rainfall (0..1; typically 0.5-0.7).",
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Weight for latitude band targets (0..1; typically 0.3-0.5). */
    bandWeight: Type.Optional(
      Type.Number({
        description: "Weight for latitude band targets (0..1; typically 0.3-0.5).",
        minimum: 0,
        maximum: 1,
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "Blend weights for rainfall mixing.",
  }
);

/**
 * Orographic lift bonuses (mountains force air upward, causing condensation and rain).
 */
export const ClimateBaselineOrographicSchema = Type.Object(
  {
    /** Elevation for modest rain increase (hills get some extra moisture). */
    hi1Threshold: Type.Optional(
      Type.Number({
        description: "Elevation for modest rain increase (hills get some extra moisture).",
      })
    ),
    /** Rainfall bonus at first threshold (typically 5-15 units). */
    hi1Bonus: Type.Optional(
      Type.Number({
        description: "Rainfall bonus at first threshold (typically 5-15 units).",
      })
    ),
    /** Elevation for strong rain increase (mountains get significant moisture). */
    hi2Threshold: Type.Optional(
      Type.Number({
        description: "Elevation for strong rain increase (mountains get significant moisture).",
      })
    ),
    /** Rainfall bonus at second threshold (typically 10-25 units). */
    hi2Bonus: Type.Optional(
      Type.Number({
        description: "Rainfall bonus at second threshold (typically 10-25 units).",
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "Orographic lift rainfall bonuses by elevation.",
  }
);

/**
 * Coastal rainfall bonuses for the climate engine.
 */
export const ClimateBaselineCoastalSchema = Type.Object(
  {
    /** Bonus rainfall on coastal land tiles (rainfall units). */
    coastalLandBonus: Type.Optional(
      Type.Number({
        description: "Bonus rainfall on coastal land tiles (rainfall units).",
      })
    ),
    /** How far inland the coastal bonus spreads (in tiles). Default: 4. */
    spread: Type.Optional(
      Type.Number({
        description: "How far inland the coastal bonus spreads (in tiles).",
        default: 4,
        minimum: 1,
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "Coastal proximity rainfall bonuses.",
  }
);

/**
 * Rainfall noise/jitter parameters for climate variation.
 */
export const ClimateBaselineNoiseSchema = Type.Object(
  {
    /** Base +/- jitter span used on smaller maps (rainfall units). */
    baseSpanSmall: Type.Optional(
      Type.Number({
        description: "Base +/- jitter span used on smaller maps (rainfall units).",
      })
    ),
    /** Extra jitter span applied on larger maps (scalar via sqrt(area)). */
    spanLargeScaleFactor: Type.Optional(
      Type.Number({
        description: "Extra jitter span applied on larger maps (scalar via sqrt(area)).",
      })
    ),
    /** Frequency scale for Perlin noise (lower = larger blobs). Default: 0.15. */
    scale: Type.Optional(
      Type.Number({
        description: "Frequency scale for Perlin noise (lower = larger blobs).",
        default: 0.15,
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "Rainfall noise parameters for variation.",
  }
);

/**
 * Baseline rainfall and local bonuses used by the climate engine.
 */
export const ClimateBaselineSchema = Type.Object(
  {
    /** Rainfall targets by latitude zone. */
    bands: Type.Optional(ClimateBaselineBandsSchema),
    /** Blend weights for mixing engine rainfall with latitude-based targets. */
    blend: Type.Optional(ClimateBaselineBlendSchema),
    /** Orographic lift bonuses (mountains cause rain). */
    orographic: Type.Optional(ClimateBaselineOrographicSchema),
    /** Coastal proximity rainfall bonuses. */
    coastal: Type.Optional(ClimateBaselineCoastalSchema),
    /** Rainfall noise/jitter parameters. */
    noise: Type.Optional(ClimateBaselineNoiseSchema),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Continental effect (distance from ocean impacts humidity).
 */
export const ClimateRefineWaterGradientSchema = Type.Object(
  {
    /** How far inland to measure water proximity (typically 8-15 tiles). */
    radius: Type.Optional(
      Type.Number({
        description: "How far inland to measure water proximity (typically 8-15 tiles).",
      })
    ),
    /** Humidity per tile closer to water; creates coastal-to-interior gradient (typically 1-3 units/tile). */
    perRingBonus: Type.Optional(
      Type.Number({
        description: "Humidity per tile closer to water; creates coastal-to-interior gradient (typically 1-3 units/tile).",
      })
    ),
    /** Extra humidity in low-elevation areas near water (typically 5-12 units). */
    lowlandBonus: Type.Optional(
      Type.Number({
        description: "Extra humidity in low-elevation areas near water (typically 5-12 units).",
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "Water proximity gradient settings.",
  }
);

/**
 * Orographic rain shadow simulation (leeward drying effect).
 */
export const ClimateRefineOrographicSchema = Type.Object(
  {
    /** How far upwind to scan for blocking mountains (typically 4-8 tiles). */
    steps: Type.Optional(
      Type.Number({
        description: "How far upwind to scan for blocking mountains (typically 4-8 tiles).",
      })
    ),
    /** Base rainfall loss in rain shadow (typically 8-20 units). */
    reductionBase: Type.Optional(
      Type.Number({
        description: "Base rainfall loss in rain shadow (typically 8-20 units).",
      })
    ),
    /** Extra drying per tile closer to mountain barrier (typically 1-3 units/tile). */
    reductionPerStep: Type.Optional(
      Type.Number({
        description: "Extra drying per tile closer to mountain barrier (typically 1-3 units/tile).",
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "Rain shadow simulation settings.",
  }
);

/**
 * River valley humidity (water channels transport moisture inland).
 */
export const ClimateRefineRiverCorridorSchema = Type.Object(
  {
    /** Humidity bonus next to rivers in lowlands (typically 8-18 units). */
    lowlandAdjacencyBonus: Type.Optional(
      Type.Number({
        description: "Humidity bonus next to rivers in lowlands (typically 8-18 units).",
      })
    ),
    /** Humidity bonus next to rivers in highlands; less than lowlands (typically 3-8 units). */
    highlandAdjacencyBonus: Type.Optional(
      Type.Number({
        description: "Humidity bonus next to rivers in highlands; less than lowlands (typically 3-8 units).",
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "River corridor humidity settings.",
  }
);

/**
 * Enclosed basin humidity retention (valleys trap moisture).
 */
export const ClimateRefineLowBasinSchema = Type.Object(
  {
    /** Search radius to detect if a lowland is surrounded by higher ground (typically 3-6 tiles). */
    radius: Type.Optional(
      Type.Number({
        description: "Search radius to detect if a lowland is surrounded by higher ground (typically 3-6 tiles).",
      })
    ),
    /** Humidity bonus in enclosed lowland basins like oases (typically 10-25 units). */
    delta: Type.Optional(
      Type.Number({
        description: "Humidity bonus in enclosed lowland basins like oases (typically 10-25 units).",
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description: "Enclosed basin humidity settings.",
  }
);

/**
 * Earthlike refinement parameters layered on top of baseline climate.
 */
export const ClimateRefineSchema = Type.Object(
  {
    /** Continental effect (distance from ocean impacts humidity). */
    waterGradient: Type.Optional(ClimateRefineWaterGradientSchema),
    /** Orographic rain shadow simulation (leeward drying effect). */
    orographic: Type.Optional(ClimateRefineOrographicSchema),
    /** River valley humidity (water channels transport moisture inland). */
    riverCorridor: Type.Optional(ClimateRefineRiverCorridorSchema),
    /** Enclosed basin humidity retention (valleys trap moisture). */
    lowBasin: Type.Optional(ClimateRefineLowBasinSchema),
    /** Pressure system effects (untyped placeholder). */
    pressure: Type.Optional(UnknownRecord),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Aggregated climate configuration grouping baseline, refinement, and swatch knobs.
 */
export const ClimateStoryRainfallSchema = Type.Object(
  {
    /**
     * Radius around rift line tiles that receives a humidity boost.
     * @default 2
     */
    riftRadius: Type.Optional(
      Type.Number({
        default: 2,
        description:
          "Radius around rift line tiles that receives a humidity boost (tiles). Typically 2–5.",
      })
    ),
    /**
     * Base rainfall bonus applied near rift shoulders, reduced by elevation.
     * @default 8
     */
    riftBoost: Type.Optional(
      Type.Number({
        default: 8,
        description:
          "Base rainfall bonus applied near rifts before elevation penalties (rainfall units). Typically 15–30.",
      })
    ),
    /**
     * Rainfall bonus applied within hotspot paradise neighborhoods.
     * @default 6
     */
    paradiseDelta: Type.Optional(
      Type.Number({
        default: 6,
        description:
          "Rainfall bonus applied near paradise hotspots (rainfall units). Typically 10–20.",
      })
    ),
    /**
     * Rainfall bonus applied within hotspot volcanic neighborhoods.
     * @default 8
     */
    volcanicDelta: Type.Optional(
      Type.Number({
        default: 8,
        description:
          "Rainfall bonus applied near volcanic hotspots (rainfall units). Typically 8–15.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

export const ClimateStorySchema = Type.Object(
  {
    /** Story-driven rainfall modifiers keyed off narrative tags. */
    rainfall: Type.Optional(ClimateStoryRainfallSchema),
  },
  { additionalProperties: true, default: {} }
);

export const ClimateConfigSchema = Type.Object(
  {
    /** Baseline rainfall and local bonuses. */
    baseline: Type.Optional(ClimateBaselineSchema),
    /** Earthlike refinement parameters (rain shadow, river corridors, etc.). */
    refine: Type.Optional(ClimateRefineSchema),
    /** Story-driven climate modifiers reacting to narrative overlays. */
    story: Type.Optional(ClimateStorySchema),
    /** Swatch overrides for macro climate regions (untyped placeholder). */
    swatches: Type.Optional(UnknownRecord),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Biome nudge thresholds that fine-tune terrain assignment.
 */
export const BiomeConfigSchema = Type.Object(
  {
    /** Tundra biome thresholds. */
    tundra: Type.Optional(
      Type.Object(
        {
          /** Minimum latitude for tundra to prevent low-latitude cold deserts (degrees). */
          latMin: Type.Optional(
            Type.Number({
              description: "Minimum latitude for tundra to prevent low-latitude cold deserts (degrees).",
            })
          ),
          /** Minimum elevation for tundra; lowlands below this stay as taiga or grassland. */
          elevMin: Type.Optional(
            Type.Number({
              description: "Minimum elevation for tundra; lowlands below this stay as taiga or grassland.",
            })
          ),
          /** Maximum rainfall tolerated before tundra flips to wetter biomes (rainfall units). */
          rainMax: Type.Optional(
            Type.Number({
              description: "Maximum rainfall tolerated before tundra flips to wetter biomes (rainfall units).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** Tropical coast biome thresholds. */
    tropicalCoast: Type.Optional(
      Type.Object(
        {
          /** Latitude limit for tropical coasts; nearer the equator keeps coasts lush (degrees). */
          latMax: Type.Optional(
            Type.Number({
              description: "Latitude limit for tropical coasts; nearer the equator keeps coasts lush (degrees).",
            })
          ),
          /** Minimum rainfall needed to classify a warm coastline as tropical (rainfall units). */
          rainMin: Type.Optional(
            Type.Number({
              description: "Minimum rainfall needed to classify a warm coastline as tropical (rainfall units).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** River valley grassland biome thresholds. */
    riverValleyGrassland: Type.Optional(
      Type.Object(
        {
          /** Latitude limit for temperate river grasslands; beyond this prefer taiga or tundra. */
          latMax: Type.Optional(
            Type.Number({
              description: "Latitude limit for temperate river grasslands; beyond this prefer taiga or tundra.",
            })
          ),
          /** Minimum humidity needed for river valley grasslands (rainfall units). */
          rainMin: Type.Optional(
            Type.Number({
              description: "Minimum humidity needed for river valley grasslands (rainfall units).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** Rift shoulder biome thresholds (along divergent boundaries). */
    riftShoulder: Type.Optional(
      Type.Object(
        {
          /** Latitude ceiling for grassland on rift shoulders (degrees). */
          grasslandLatMax: Type.Optional(
            Type.Number({
              description: "Latitude ceiling for grassland on rift shoulders (degrees).",
            })
          ),
          /** Minimum rainfall for grassland shoulders along rifts (rainfall units). */
          grasslandRainMin: Type.Optional(
            Type.Number({
              description: "Minimum rainfall for grassland shoulders along rifts (rainfall units).",
            })
          ),
          /** Latitude ceiling for tropical rift shoulders (degrees). */
          tropicalLatMax: Type.Optional(
            Type.Number({
              description: "Latitude ceiling for tropical rift shoulders (degrees).",
            })
          ),
          /** Minimum rainfall for tropical vegetation on rift shoulders (rainfall units). */
          tropicalRainMin: Type.Optional(
            Type.Number({
              description: "Minimum rainfall for tropical vegetation on rift shoulders (rainfall units).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Feature density controls for vegetation and reef prevalence.
 */
export const FeaturesDensityConfigSchema = Type.Object(
  {
    /**
     * Coral reef density multiplier on passive continental shelves.
     * - Values > 1 increase reef prevalence along shelf edges
     * - Values < 1 reduce reef spawning
     * @default 1.0
     */
    shelfReefMultiplier: Type.Optional(
      Type.Number({
        description: "Coral reef density multiplier on passive continental shelves (scalar).",
      })
    ),
    /**
     * Bonus jungle/rainforest probability in wet tropics.
     * Adds to base chance when humidity and latitude criteria are met.
     * Example: 10 adds 10% extra chance for rainforest tiles.
     */
    rainforestExtraChance: Type.Optional(
      Type.Number({
        description: "Bonus jungle/rainforest probability in wet tropics (0..1 fraction or percent).",
      })
    ),
    /**
     * Bonus temperate forest probability in moderate rainfall zones.
     * Adds to base chance in mid-latitude humid regions.
     * Example: 10 adds 10% extra chance for forest tiles.
     */
    forestExtraChance: Type.Optional(
      Type.Number({
        description: "Bonus temperate forest probability in moderate rainfall zones (0..1 fraction or percent).",
      })
    ),
    /**
     * Bonus coniferous forest (taiga) probability in cold regions.
     * Adds to base chance near polar latitudes.
     * Example: 5 adds 5% extra chance for taiga tiles.
     */
    taigaExtraChance: Type.Optional(
      Type.Number({
        description: "Bonus coniferous forest probability in cold regions (0..1 fraction or percent).",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Floodplain generation along rivers.
 */
export const FloodplainsConfigSchema = Type.Object(
  {
    /**
     * Minimum river segment length that can host floodplains.
     * Rivers shorter than this won't generate floodplain terrain.
     * @default 4
     */
    minLength: Type.Optional(
      Type.Number({
        description: "Minimum river segment length that can host floodplains (tiles).",
      })
    ),
    /**
     * Maximum contiguous river length converted to floodplains.
     * Prevents endless floodplain strips along long rivers.
     * @default 10
     */
    maxLength: Type.Optional(
      Type.Number({
        description: "Maximum contiguous river length converted to floodplains to avoid endless strips (tiles).",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Player start placement configuration.
 * Required when starts config is provided - no default empty object to avoid validation errors.
 */
export const StartsConfigSchema = Type.Object(
  {
    /**
     * Player count allocated to the primary (western) landmass band.
     * The vanilla engine splits players between two major regions.
     */
    playersLandmass1: Type.Number({
      description: "Player count allocated to the primary landmass band.",
    }),
    /**
     * Player count allocated to the secondary (eastern) landmass band.
     * Set to 0 for single-continent maps.
     */
    playersLandmass2: Type.Number({
      description: "Player count allocated to the secondary landmass band (if present).",
    }),
    /** Bounding box for the western continent used by start placement. */
    westContinent: ContinentBoundsSchema,
    /** Bounding box for the eastern continent used by start placement. */
    eastContinent: ContinentBoundsSchema,
    /**
     * Number of sector rows when partitioning the map for starts.
     * Higher values create a finer placement grid.
     */
    startSectorRows: Type.Number({
      description: "Number of sector rows used when partitioning the map for starts.",
    }),
    /**
     * Number of sector columns when partitioning the map for starts.
     * Higher values create a finer placement grid.
     */
    startSectorCols: Type.Number({
      description: "Number of sector columns used when partitioning the map for starts.",
    }),
    /**
     * Explicit start sector descriptors passed to placement logic.
     * Each element describes a candidate region for civilization spawns.
     * @default []
     */
    startSectors: Type.Array(Type.Unknown(), {
      default: [],
      description: "Explicit start sector descriptors passed directly to placement logic.",
    }),
  },
  { additionalProperties: true }
);

/**
 * Late-stage placement controls for wonders, floodplains, and start metadata.
 */
export const PlacementConfigSchema = Type.Object(
  {
    /**
     * Whether to add one extra natural wonder beyond map-size defaults.
     * Diversifies layouts with an additional landmark.
     * @default true
     */
    wondersPlusOne: Type.Optional(
      Type.Boolean({
        description: "Whether to add one extra natural wonder beyond map-size defaults to diversify layouts.",
      })
    ),
    /** Floodplain generation settings along rivers. */
    floodplains: Type.Optional(FloodplainsConfigSchema),
    /** Player start placement configuration (required fields when provided). */
    starts: Type.Optional(StartsConfigSchema),
  },
  { additionalProperties: true, default: {} }
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
    dynamics: Type.Optional(FoundationDynamicsConfigSchema),
    /** @internal Surface mode configuration (engine plumbing). */
    surface: Type.Optional(FoundationSurfaceConfigSchema),
    /** @internal Policy flags for foundation stage (engine plumbing). */
    policy: Type.Optional(FoundationPolicyConfigSchema),
    /** Diagnostics toggles for stable-slice debugging (M2-supported). */
    diagnostics: Type.Optional(FoundationDiagnosticsConfigSchema),
    /** Ocean separation policy ensuring water channels between continents. */
    oceanSeparation: Type.Optional(OceanSeparationConfigSchema),
    /** Coastline shaping, bays, and fjord settings. */
    coastlines: Type.Optional(CoastlinesConfigSchema),
    /** Island chain and archipelago generation. */
    islands: Type.Optional(IslandsConfigSchema),
    /** Mountain range generation from tectonic interactions. */
    mountains: Type.Optional(MountainsConfigSchema),
    /** Volcanic feature placement along boundaries and hotspots. */
    volcanoes: Type.Optional(VolcanoesConfigSchema),
    /** Story seed overlays: hotspots, rifts, orogeny events. */
    story: Type.Optional(StoryConfigSchema),
    /** Sea corridor policy for navigable channels. */
    corridors: Type.Optional(CorridorsConfigSchema),
    /** Biome threshold overrides for terrain assignment. */
    biomes: Type.Optional(BiomeConfigSchema),
    /** Vegetation and reef density multipliers. */
    featuresDensity: Type.Optional(FeaturesDensityConfigSchema),
    /** Late-stage placement: wonders, floodplains, starts. */
    placement: Type.Optional(PlacementConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Legacy top-level diagnostics toggles.
 *
 * These fields are currently unused by the stable-slice runtime and are kept
 * only for backward compatibility. Use foundation.diagnostics instead.
 */
export const DiagnosticsConfigSchema = Type.Object(
  {
    /**
     * @deprecated Unused in M2 stable slice. Use foundation.diagnostics.*.
     */
    logAscii: Type.Optional(
      Type.Boolean({
        description:
          "[legacy/no-op] Unused in M2 stable slice. Use foundation.diagnostics.* for ASCII output.",
        deprecated: true,
      })
    ),
    /**
     * @deprecated Unused in M2 stable slice. Use foundation.diagnostics.*.
     */
    logHistograms: Type.Optional(
      Type.Boolean({
        description:
          "[legacy/no-op] Unused in M2 stable slice. Use foundation.diagnostics.* for histogram output.",
        deprecated: true,
      })
    ),
  },
  {
    additionalProperties: true,
    default: {},
    description:
      "[legacy/no-op] Top-level diagnostics are deprecated in M2. Use foundation.diagnostics instead.",
    deprecated: true,
  }
);

/**
 * Canonical MapGen configuration schema exported by mapgen-core.
 */
export const MapGenConfigSchema = Type.Object(
  {
    /**
     * List of preset names to apply in order before processing overrides.
     * Presets are merged left-to-right, then user overrides are applied.
     * @default []
     */
    presets: Type.Optional(
      Type.Array(Type.String(), {
        default: [],
        description: "List of preset names to apply in order before processing stage overrides.",
      })
    ),
    /** @internal Stage enable/disable flags (engine plumbing). */
    stageConfig: Type.Optional(StageConfigSchema),
    /** @internal Custom stage manifest for advanced pipelines (engine plumbing). */
    stageManifest: Type.Optional(StageManifestSchema),
    /** Feature toggles controlling story events and generation features. */
    toggles: Type.Optional(TogglesSchema),
    /** Landmass geometry: water percent, tectonic bias, and post-processing. */
    landmass: Type.Optional(LandmassConfigSchema),
    /** Foundation layer: plates, dynamics, and nested terrain configs. */
    foundation: Type.Optional(FoundationConfigSchema),
    /** Climate baseline and refinement settings for humidity. */
    climate: Type.Optional(ClimateConfigSchema),
    /** Mountain generation thresholds and tectonic weights. */
    mountains: Type.Optional(MountainsConfigSchema),
    /** Volcano placement density and boundary multipliers. */
    volcanoes: Type.Optional(VolcanoesConfigSchema),
    /** Coastline shaping, bays, and fjords. */
    coastlines: Type.Optional(CoastlinesConfigSchema),
    /** Island and archipelago generation. */
    islands: Type.Optional(IslandsConfigSchema),
    /** Biome threshold overrides for terrain assignment. */
    biomes: Type.Optional(BiomeConfigSchema),
    /** Vegetation and reef density multipliers. */
    featuresDensity: Type.Optional(FeaturesDensityConfigSchema),
    /** Story seed overlays: hotspots, rifts, orogeny. */
    story: Type.Optional(StoryConfigSchema),
    /** Sea corridor policy for navigable channels. */
    corridors: Type.Optional(CorridorsConfigSchema),
    /** Ocean separation ensuring water channels between continents. */
    oceanSeparation: Type.Optional(OceanSeparationConfigSchema),
    /** Late-stage placement: wonders, floodplains, starts. */
    placement: Type.Optional(PlacementConfigSchema),
    /**
     * @deprecated Legacy top-level diagnostics toggles.
     * These are no-op in the M2 stable slice; use foundation.diagnostics instead.
     */
    diagnostics: Type.Optional(DiagnosticsConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

export type StageConfig = Static<typeof StageConfigSchema>;
export type StageDescriptor = Static<typeof StageDescriptorSchema>;
export type StageManifest = Static<typeof StageManifestSchema>;
export type Toggles = Static<typeof TogglesSchema>;
export type LandmassTectonicsConfig = Static<typeof LandmassTectonicsConfigSchema>;
export type LandmassGeometryPost = Static<typeof LandmassGeometryPostSchema>;
export type LandmassGeometry = Static<typeof LandmassGeometrySchema>;
export type LandmassConfig = Static<typeof LandmassConfigSchema>;
export type ContinentBoundsConfig = Static<typeof ContinentBoundsSchema>;
export type FoundationSeedConfig = Static<typeof FoundationSeedConfigSchema>;
export type FoundationPlatesConfig = Static<typeof FoundationPlatesConfigSchema>;
export type FoundationDirectionalityConfig = Static<typeof FoundationDirectionalityConfigSchema>;
export type FoundationDynamicsConfig = Static<typeof FoundationDynamicsConfigSchema>;
export type FoundationSurfaceConfig = Static<typeof FoundationSurfaceConfigSchema>;
export type FoundationPolicyConfig = Static<typeof FoundationPolicyConfigSchema>;
export type FoundationDiagnosticsConfig = Static<typeof FoundationDiagnosticsConfigSchema>;
export type FoundationOceanSeparationConfig = Static<typeof FoundationOceanSeparationConfigSchema>;
export type FoundationConfig = Static<typeof FoundationConfigSchema>;
export type OceanSeparationEdgePolicy = Static<typeof OceanSeparationEdgePolicySchema>;
export type OceanSeparationConfig = Static<typeof OceanSeparationConfigSchema>;
export type CoastlinePlateBiasConfig = Static<typeof CoastlinePlateBiasConfigSchema>;
export type CoastlineBayConfig = Static<typeof CoastlineBayConfigSchema>;
export type CoastlineFjordConfig = Static<typeof CoastlineFjordConfigSchema>;
export type CoastlinesConfig = Static<typeof CoastlinesConfigSchema>;
export type IslandsConfig = Static<typeof IslandsConfigSchema>;
export type MountainsConfig = Static<typeof MountainsConfigSchema>;
export type VolcanoesConfig = Static<typeof VolcanoesConfigSchema>;
export type HotspotTunables = Static<typeof HotspotTunablesSchema>;
export type FeaturesConfig = Static<typeof FeaturesConfigSchema>;
export type StoryConfig = Static<typeof StoryConfigSchema>;
export type SeaCorridorPolicy = Static<typeof SeaCorridorPolicySchema>;
export type CorridorsConfig = Static<typeof CorridorsConfigSchema>;
export type ClimateBaselineBands = Static<typeof ClimateBaselineBandsSchema>;
export type ClimateBaselineBlend = Static<typeof ClimateBaselineBlendSchema>;
export type ClimateBaselineOrographic = Static<typeof ClimateBaselineOrographicSchema>;
export type ClimateBaselineCoastal = Static<typeof ClimateBaselineCoastalSchema>;
export type ClimateBaselineNoise = Static<typeof ClimateBaselineNoiseSchema>;
export type ClimateBaseline = Static<typeof ClimateBaselineSchema>;
export type ClimateRefineWaterGradient = Static<typeof ClimateRefineWaterGradientSchema>;
export type ClimateRefineOrographic = Static<typeof ClimateRefineOrographicSchema>;
export type ClimateRefineRiverCorridor = Static<typeof ClimateRefineRiverCorridorSchema>;
export type ClimateRefineLowBasin = Static<typeof ClimateRefineLowBasinSchema>;
export type ClimateRefine = Static<typeof ClimateRefineSchema>;
export type ClimateConfig = Static<typeof ClimateConfigSchema>;
export type BiomeConfig = Static<typeof BiomeConfigSchema>;
export type FeaturesDensityConfig = Static<typeof FeaturesDensityConfigSchema>;
export type FloodplainsConfig = Static<typeof FloodplainsConfigSchema>;
export type StartsConfig = Static<typeof StartsConfigSchema>;
export type PlacementConfig = Static<typeof PlacementConfigSchema>;
export type DiagnosticsConfig = Static<typeof DiagnosticsConfigSchema>;
export type MapGenConfig = Static<typeof MapGenConfigSchema> & Record<string, unknown>;
