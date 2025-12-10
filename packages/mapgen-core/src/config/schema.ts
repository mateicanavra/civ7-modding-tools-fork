import { Type, type Static } from "@sinclair/typebox";

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
    west: Type.Number({
      description: "Westernmost tile column (inclusive) for the continent window.",
    }),
    east: Type.Number({
      description: "Easternmost tile column (inclusive) for the continent window.",
    }),
    south: Type.Number({
      description: "Southernmost tile row (inclusive) for the continent window.",
    }),
    north: Type.Number({
      description: "Northernmost tile row (inclusive) for the continent window.",
    }),
    continent: Type.Optional(
      Type.Number({
        description: "Optional continent index used when mirroring legacy continent tagging.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Stage enablement overrides keyed by stage name.
 * Values are boolean switches consumed by the stage resolver.
 */
export const StageConfigSchema = Type.Record(Type.String(), Type.Boolean(), {
  default: {},
  description: "Per-stage enablement overrides keyed by manifest stage id.",
});

/**
 * Descriptor for a stage in the orchestrated manifest.
 * Captures dependencies, provided tags, and legacy toggle aliases.
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
        description: "Stage names that must run before this stage executes.",
      })
    ),
    provides: Type.Optional(
      Type.Array(Type.String(), {
        default: [],
        description: "Capabilities or data this stage makes available to dependents.",
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
  { additionalProperties: true, default: {} }
);

/**
 * Ordered list of stages plus metadata consumed by the bootstrap resolver.
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
  { default: {} }
);

/**
 * High-level toggles that mirror the legacy STORY_ENABLE_* flags.
 */
export const TogglesSchema = Type.Object(
  {
    STORY_ENABLE_HOTSPOTS: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Whether volcanic/paradise hotspots are allowed to generate story overlays.",
      })
    ),
    STORY_ENABLE_RIFTS: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Whether continental rift valleys and shoulders should be created.",
      })
    ),
    STORY_ENABLE_OROGENY: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Controls whether orogenic mountain belts are simulated along convergent margins.",
      })
    ),
    STORY_ENABLE_SWATCHES: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Enables macro swatch overrides that recolor large climate regions.",
      })
    ),
    STORY_ENABLE_PALEO: Type.Optional(
      Type.Boolean({
        default: true,
        description: "Enables paleo-hydrology artifacts such as fossil channels and oxbows.",
      })
    ),
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
    interiorNoiseWeight: Type.Optional(
      Type.Number({
        description:
          "Blend factor for plate-interior fractal noise; higher values create thicker/thinner sections inside plates.",
      })
    ),
    boundaryArcWeight: Type.Optional(
      Type.Number({
        description:
          "Multiplier for convergent boundary uplift arcs; higher weights favor dramatic coastal arcs like the Andes.",
      })
    ),
    boundaryArcNoiseWeight: Type.Optional(
      Type.Number({
        description:
          "Raggedness injected into boundary arcs; increases coastline roughness along active margins.",
      })
    ),
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
    expandTiles: Type.Optional(
      Type.Number({
        description: "Uniform horizontal expansion (tiles) applied to every landmass before individual offsets.",
      })
    ),
    expandWestTiles: Type.Optional(
      Type.Number({
        description: "Extra west-side padding (tiles) added on top of the shared expansion value.",
      })
    ),
    expandEastTiles: Type.Optional(
      Type.Number({
        description: "Extra east-side padding (tiles) added on top of the shared expansion value.",
      })
    ),
    clampWestMin: Type.Optional(
      Type.Number({
        description: "Minimum allowed west boundary (tile index) to prevent over-expansion off the map.",
      })
    ),
    clampEastMax: Type.Optional(
      Type.Number({
        description: "Maximum allowed east boundary (tile index) to keep landmasses within the map.",
      })
    ),
    overrideSouth: Type.Optional(
      Type.Number({
        description: "Fixed south boundary (tile row) for all landmasses; useful for curated presets.",
      })
    ),
    overrideNorth: Type.Optional(
      Type.Number({
        description: "Fixed north boundary (tile row) for all landmasses; pairs with overrideSouth for custom bands.",
      })
    ),
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
    post: Type.Optional(
      LandmassGeometryPostSchema,
      {
        description: "Fine-tuning applied after the plate-driven landmask is computed.",
      }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Controls overall land/water mix and how plates bias the landmask.
 */
export const LandmassConfigSchema = Type.Object(
  {
    crustMode: Type.Optional(
      Type.Union([Type.Literal("legacy"), Type.Literal("area")], {
        description:
          "Legacy landmask mode selector: 'legacy' preserves historical behavior, 'area' uses area-weighted windows.",
      })
    ),
    baseWaterPercent: Type.Optional(
      Type.Number({
        description:
          "Target global water coverage (0-100). Clamped in landmass scoring; 55-65 mimics Earth,"
          + " 70-75 drifts toward archipelago worlds, and 50-55 yields Pangaea-style supercontinents.",
      })
    ),
    waterScalar: Type.Optional(
      Type.Number({
        description:
          "Multiplier applied after baseWaterPercent (typically 0.75-1.25). Values are clamped to a 0.25-1.75"
          + " band so nudging water for huge/tiny maps cannot wipe out land entirely.",
      })
    ),
    boundaryBias: Type.Optional(
      Type.Number({
        description:
          "Closeness bonus favoring tiles near plate boundaries (clamped to ~0.4). Higher values pull continents"
          + " toward active margins to guarantee coastal mountain arcs while still keeping interior cores.",
      })
    ),
    boundaryShareTarget: Type.Optional(
      Type.Number({
        description:
          "Soft backstop on the share of land that should fall inside the boundary closeness band (0..1)."
          + " After picking an initial threshold, the solver lowers it in 5-point steps until the boundary"
          + " share meets this target (default ~0.15) or land exceeds ~150% of the goal. Use this to ensure"
          + " some land hugs convergent margins for dramatic coasts without drowning interiors.",
      })
    ),
    continentalFraction: Type.Optional(
      Type.Number({
        description: "Desired share of continental crust when balancing land vs. ocean plates (0..1).",
      })
    ),
    crustContinentalFraction: Type.Optional(
      Type.Number({
        description: "Legacy fallback for continentalFraction kept for backward compatibility.",
      })
    ),
    crustClusteringBias: Type.Optional(
      Type.Number({
        description:
          "Bias that clusters continental plates together; higher values encourage supercontinents rather than scattered shards.",
      })
    ),
    microcontinentChance: Type.Optional(
      Type.Number({
        description:
          "Probability of spawning small continental shards; increases detached microcontinents for naval play.",
      })
    ),
    crustEdgeBlend: Type.Optional(
      Type.Number({
        description:
          "Blend factor softening crust transitions at edges; higher values smooth abrupt height changes at plate seams.",
      })
    ),
    crustNoiseAmplitude: Type.Optional(
      Type.Number({
        description:
          "Amplitude of crust noise injected into the landmask to avoid uniform thickness across continents.",
      })
    ),
    continentalHeight: Type.Optional(
      Type.Number({
        description: "Base elevation assigned to continental crust before mountains/hills are applied.",
      })
    ),
    oceanicHeight: Type.Optional(
      Type.Number({
        description: "Base elevation assigned to oceanic crust; deeper negatives create deeper basins.",
      })
    ),
    tectonics: Type.Optional(
      LandmassTectonicsConfigSchema,
      { description: "Tectonic weighting applied while selecting land vs. sea tiles." }
    ),
    geometry: Type.Optional(
      LandmassGeometrySchema,
      { description: "Post-processing adjustments applied after the plate landmask is derived." }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Seed configuration shared across the foundation pipeline.
 */
export const FoundationSeedConfigSchema = Type.Object(
  {
    mode: Type.Optional(
      Type.Union([Type.Literal("engine"), Type.Literal("fixed")], {
        description: "Choose Civ engine RNG or a fixed deterministic seed for reproducible worlds.",
      })
    ),
    fixedSeed: Type.Optional(
      Type.Number({
        description: "Explicit seed value used when mode is set to 'fixed'.",
      })
    ),
    offset: Type.Optional(
      Type.Number({
        description: "Global offset added before deriving per-subsystem seeds to decorrelate runs.",
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
    count: Type.Optional(
      Type.Number({
        description: "Number of tectonic plates; fewer plates yield supercontinents, more plates fragment the map.",
      })
    ),
    relaxationSteps: Type.Optional(
      Type.Number({
        description: "Lloyd relaxation iterations to smooth plate boundaries; higher values create rounder plates.",
      })
    ),
    convergenceMix: Type.Optional(
      Type.Number({
        description: "Ratio of convergent to divergent boundaries (0..1) controlling how much collision vs. rifting occurs.",
      })
    ),
    plateRotationMultiple: Type.Optional(
      Type.Number({
        description: "Multiplier applied to plate rotation weighting along boundaries; higher values spin plates faster.",
      })
    ),
    seedMode: Type.Optional(
      Type.Union([Type.Literal("engine"), Type.Literal("fixed")], {
        description: "Choose Civ engine RNG or a fixed seed specifically for plate layout.",
      })
    ),
    fixedSeed: Type.Optional(
      Type.Number({
        description: "Explicit plate seed used when seedMode is 'fixed' to lock plate positions.",
      })
    ),
    seedOffset: Type.Optional(
      Type.Number({
        description: "Offset applied to the plate seed to decorrelate from other subsystems while keeping reproducibility.",
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
    cohesion: Type.Optional(
      Type.Number({
        description: "Global alignment strength (0..1); higher values keep plates, winds, and currents pointing similarly.",
      })
    ),
    primaryAxes: Type.Optional(
      Type.Object(
        {
          plateAxisDeg: Type.Optional(
            Type.Number({
              description: "Preferred plate motion heading in degrees (0° = east).",
            })
          ),
          windBiasDeg: Type.Optional(
            Type.Number({
              description: "Bias for prevailing wind direction relative to zonal flow (degrees).",
            })
          ),
          currentBiasDeg: Type.Optional(
            Type.Number({
              description: "Bias for major ocean gyre rotation (degrees).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    variability: Type.Optional(
      Type.Object(
        {
          angleJitterDeg: Type.Optional(
            Type.Number({
              description: "Random angular deviation applied to preferred axes (degrees).",
            })
          ),
          magnitudeVariance: Type.Optional(
            Type.Number({
              description: "Variance multiplier controlling how strongly directionality is enforced across the map.",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    hemispheres: Type.Optional(
      Type.Object(
        {
          southernFlip: Type.Optional(
            Type.Boolean({
              description: "Flip directionality in the southern hemisphere for Coriolis-style mirroring.",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    interplay: Type.Optional(
      Type.Object(
        {
          windsFollowPlates: Type.Optional(
            Type.Number({
              description: "How strongly prevailing winds align with plate motion (0..1).",
            })
          ),
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
    mantle: Type.Optional(
      Type.Object(
        {
          bumps: Type.Optional(
            Type.Number({
              description: "Number of mantle plume hotspots that feed uplift potential (integer).",
            })
          ),
          amplitude: Type.Optional(
            Type.Number({
              description: "Strength of mantle pressure contributions; higher values increase uplift everywhere.",
            })
          ),
          scale: Type.Optional(
            Type.Number({
              description: "Spatial scale of mantle effects; larger scales spread hotspots wider before decay.",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    wind: Type.Optional(
      Type.Object(
        {
          jetStreaks: Type.Optional(
            Type.Number({
              description: "Number of jet stream bands influencing storm tracks (e.g., 2-5).",
            })
          ),
          jetStrength: Type.Optional(
            Type.Number({
              description: "Overall jet stream intensity multiplier affecting rainfall steering.",
            })
          ),
          variance: Type.Optional(
            Type.Number({
              description: "Directional variance for winds; higher variance loosens strict banded flow.",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    directionality: Type.Optional(
      FoundationDirectionalityConfigSchema,
      {
        description: "Cross-system alignment controls connecting plates, winds, and currents.",
      }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Placeholder for plate-aware ocean separation inputs stored during foundation.
 */
export const FoundationOceanSeparationConfigSchema = Type.Object(
  {},
  { additionalProperties: true, default: {} }
);

/**
 * Surface targets derived from the world foundation seed.
 */
export const FoundationSurfaceConfigSchema = Type.Object(
  {
    landmass: Type.Optional(
      LandmassConfigSchema,
      { description: "Landmass targets and geometry preferences produced for the plate solver." }
    ),
    oceanSeparation: Type.Optional(
      FoundationOceanSeparationConfigSchema,
      { description: "Plate-aware ocean separation policy persisted for downstream stages." }
    ),
    crustMode: Type.Optional(
      Type.Union([Type.Literal("legacy"), Type.Literal("area")], {
        description: "Forwarded crust mode so surface consumers can mirror legacy vs. area-weighted behavior.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Policy multipliers exposed to downstream stages (coastlines, story overlays, etc.).
 */
export const FoundationPolicyConfigSchema = Type.Object(
  {
    oceanSeparation: Type.Optional(
      FoundationOceanSeparationConfigSchema,
      {
        description: "Public-facing ocean separation hints that downstream consumers may honor when widening seas.",
      }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Diagnostics and logging toggles for the foundation pipeline.
 */
export const FoundationDiagnosticsConfigSchema = Type.Object(
  {},
  { additionalProperties: true, default: {} }
);

/**
 * Edge override policy for the ocean separation pass.
 */
export const OceanSeparationEdgePolicySchema = Type.Object(
  {
    enabled: Type.Optional(
      Type.Boolean({
        description: "Enable edge-specific override for this map border (west or east).",
      })
    ),
    baseTiles: Type.Optional(
      Type.Number({
        description: "Baseline separation enforced at the map edge in tiles (before boundary multipliers).",
      })
    ),
    boundaryClosenessMultiplier: Type.Optional(
      Type.Number({
        description: "Multiplier applied near active margins when widening oceans at the edge.",
      })
    ),
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
    enabled: Type.Optional(
      Type.Boolean({
        description: "Master switch for plate-aware ocean widening between continent bands.",
      })
    ),
    bandPairs: Type.Optional(
      Type.Array(Type.Tuple([Type.Number(), Type.Number()]), {
        default: [],
        description: "Pairs of continent indices to separate (e.g., [[0,1],[1,2]]).",
      })
    ),
    baseSeparationTiles: Type.Optional(
      Type.Number({
        description: "Baseline widening between continents in tiles before modifiers are applied.",
      })
    ),
    boundaryClosenessMultiplier: Type.Optional(
      Type.Number({
        description: "Extra separation applied when plates are close to active boundaries (multiplier 0..2).",
      })
    ),
    maxPerRowDelta: Type.Optional(
      Type.Number({
        description: "Maximum per-latitude variation in separation (tiles) to keep oceans smooth north-south.",
      })
    ),
    minChannelWidth: Type.Optional(
      Type.Number({
        description: "Minimum navigable channel width to preserve while widening seas (tiles).",
      })
    ),
    channelJitter: Type.Optional(
      Type.Number({
        description: "Random jitter applied to channel widths to avoid uniform straight lines.",
      })
    ),
    respectSeaLanes: Type.Optional(
      Type.Boolean({
        description: "Whether strategic sea corridors should be preserved when enforcing separation.",
      })
    ),
    edgeWest: Type.Optional(
      OceanSeparationEdgePolicySchema,
      { description: "Overrides applied specifically to the western map edge." }
    ),
    edgeEast: Type.Optional(
      OceanSeparationEdgePolicySchema,
      { description: "Overrides applied specifically to the eastern map edge." }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Plate-aware weighting for bay/fjord odds based on boundary closeness.
 */
export const CoastlinePlateBiasConfigSchema = Type.Object(
  {
    threshold: Type.Optional(
      Type.Number({
        description: "Normalized closeness where coastline edits begin to respond to plate boundaries (0..1).",
      })
    ),
    power: Type.Optional(
      Type.Number({
        description: "Exponent shaping how quickly bias ramps after the threshold; >1 concentrates effects near boundaries.",
      })
    ),
    convergent: Type.Optional(
      Type.Number({
        description: "Bias multiplier for convergent boundaries; positive values encourage dramatic coasts and fjords.",
      })
    ),
    transform: Type.Optional(
      Type.Number({
        description: "Bias multiplier for transform boundaries; lower values soften edits along shear zones.",
      })
    ),
    divergent: Type.Optional(
      Type.Number({
        description: "Bias multiplier for divergent boundaries; negative values discourage ruggedization along rifts.",
      })
    ),
    interior: Type.Optional(
      Type.Number({
        description: "Residual bias for interior coasts away from boundaries; typically near zero.",
      })
    ),
    bayWeight: Type.Optional(
      Type.Number({
        description: "Strength applied to bay denominators; higher values increase bay carving where bias is positive.",
      })
    ),
    bayNoiseBonus: Type.Optional(
      Type.Number({
        description: "Extra noise gate reduction when bias is positive, allowing smaller bays near active margins.",
      })
    ),
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
    noiseGateAdd: Type.Optional(
      Type.Number({
        description: "Extra noise threshold on larger maps; higher values reduce bay frequency while keeping size larger.",
      })
    ),
    rollDenActive: Type.Optional(
      Type.Number({
        description: "Bay frequency on active margins; lower denominators produce more bays along energetic coasts.",
      })
    ),
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
    baseDenom: Type.Optional(
      Type.Number({
        description: "Base fjord frequency; smaller values increase fjord count across the map.",
      })
    ),
    activeBonus: Type.Optional(
      Type.Number({
        description: "Bonus applied on active convergent margins; subtracts from baseDenom to amplify fjord density.",
      })
    ),
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
    bay: Type.Optional(
      CoastlineBayConfigSchema,
      { description: "Bay shaping configuration for gentle coastal indentations." }
    ),
    fjord: Type.Optional(
      CoastlineFjordConfigSchema,
      { description: "Fjord shaping configuration for steep, narrow inlets along active margins." }
    ),
    plateBias: Type.Optional(
      CoastlinePlateBiasConfigSchema,
      { description: "Plate-aware weighting that ties bay/fjord odds to boundary closeness." }
    ),
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
    fractalThresholdPercent: Type.Optional(
      Type.Number({
        description: "Noise cutoff for island seeds (percent). Higher values mean fewer, larger island groups.",
      })
    ),
    minDistFromLandRadius: Type.Optional(
      Type.Number({
        description: "Minimum spacing from continental landmasses (tiles) to prevent coastal clutter.",
      })
    ),
    baseIslandDenNearActive: Type.Optional(
      Type.Number({
        description: "Island frequency near active margins; lower denominators spawn more volcanic arcs like Japan.",
      })
    ),
    baseIslandDenElse: Type.Optional(
      Type.Number({
        description: "Island frequency away from active margins; controls passive-shelf archipelagos.",
      })
    ),
    hotspotSeedDenom: Type.Optional(
      Type.Number({
        description: "Island seed frequency along hotspot trails; smaller values create Hawaii-style chains.",
      })
    ),
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
    tectonicIntensity: Type.Optional(
      Type.Number({
        description: "Global scale for tectonic effects; primary dial for overall mountain prevalence.",
      })
    ),
    mountainThreshold: Type.Optional(
      Type.Number({
        description: "Score threshold for promoting a tile to a mountain; lower values allow more peaks.",
      })
    ),
    hillThreshold: Type.Optional(
      Type.Number({
        description: "Score threshold for assigning hills; lower values increase hill coverage.",
      })
    ),
    upliftWeight: Type.Optional(
      Type.Number({
        description: "Weight applied to uplift potential; keeps mountains aligned with convergent zones.",
      })
    ),
    fractalWeight: Type.Optional(
      Type.Number({
        description: "Weight applied to fractal noise to introduce natural variation in ranges.",
      })
    ),
    riftDepth: Type.Optional(
      Type.Number({
        description: "Depression severity along divergent boundaries (0..1); higher values carve deeper rifts.",
      })
    ),
    boundaryWeight: Type.Optional(
      Type.Number({
        description: "Additional weight from plate-boundary closeness that pulls mountains toward margins.",
      })
    ),
    boundaryExponent: Type.Optional(
      Type.Number({
        description: "Exponent controlling how quickly boundary influence decays with distance (>=0.25).",
      })
    ),
    interiorPenaltyWeight: Type.Optional(
      Type.Number({
        description: "Penalty applied to deep interior tiles to keep high terrain near tectonic action.",
      })
    ),
    convergenceBonus: Type.Optional(
      Type.Number({
        description: "Extra additive weight for convergent tiles, creating dominant orogeny ridges.",
      })
    ),
    transformPenalty: Type.Optional(
      Type.Number({
        description: "Penalty multiplier for transform boundaries to soften shearing ridges.",
      })
    ),
    riftPenalty: Type.Optional(
      Type.Number({
        description: "Penalty multiplier applied along divergent boundaries before riftDepth is carved.",
      })
    ),
    hillBoundaryWeight: Type.Optional(
      Type.Number({
        description: "Hill weight contributed by boundary closeness, forming foothill skirts near margins.",
      })
    ),
    hillRiftBonus: Type.Optional(
      Type.Number({
        description: "Hill bonus added beside rift valleys, creating uplifted shoulders.",
      })
    ),
    hillConvergentFoothill: Type.Optional(
      Type.Number({
        description: "Extra foothill weight on convergent tiles to smooth transitions into mountain ranges.",
      })
    ),
    hillInteriorFalloff: Type.Optional(
      Type.Number({
        description: "Penalty for hills deep inside plates; higher values keep hills near tectonic features.",
      })
    ),
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
    enabled: Type.Optional(
      Type.Boolean({
        description: "Master toggle for volcano placement.",
      })
    ),
    baseDensity: Type.Optional(
      Type.Number({
        description: "Baseline volcanoes per land tile; higher density spawns more vents overall.",
      })
    ),
    minSpacing: Type.Optional(
      Type.Number({
        description: "Minimum Euclidean distance between volcanoes in tiles to avoid clusters merging.",
      })
    ),
    boundaryThreshold: Type.Optional(
      Type.Number({
        description: "Plate-boundary closeness threshold (0..1) for treating a tile as margin-adjacent.",
      })
    ),
    boundaryWeight: Type.Optional(
      Type.Number({
        description: "Base weight applied to tiles within the boundary band, biasing arcs over interiors.",
      })
    ),
    convergentMultiplier: Type.Optional(
      Type.Number({
        description: "Weight multiplier for convergent boundaries; raises classic arc volcano density.",
      })
    ),
    transformMultiplier: Type.Optional(
      Type.Number({
        description: "Weight multiplier for transform boundaries; typically lower to avoid shear volcanism.",
      })
    ),
    divergentMultiplier: Type.Optional(
      Type.Number({
        description: "Weight multiplier for divergent boundaries; keep small to prevent rift volcanism dominating.",
      })
    ),
    hotspotWeight: Type.Optional(
      Type.Number({
        description: "Weight contribution for interior hotspots; increases inland/shield volcano presence.",
      })
    ),
    shieldPenalty: Type.Optional(
      Type.Number({
        description: "Penalty applied using shield stability; higher values suppress volcanoes on ancient cratons.",
      })
    ),
    randomJitter: Type.Optional(
      Type.Number({
        description: "Random additive jitter per tile to break up deterministic patterns.",
      })
    ),
    minVolcanoes: Type.Optional(
      Type.Number({
        description: "Minimum volcano count target to guarantee a few vents even on sparse maps.",
      })
    ),
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
    paradiseBias: Type.Optional(
      Type.Number({
        description: "Bias applied to paradise hotspots when selecting overlays (unitless multiplier).",
      })
    ),
    volcanicBias: Type.Optional(
      Type.Number({
        description: "Bias applied to volcanic hotspots when selecting overlays (unitless multiplier).",
      })
    ),
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
    paradiseReefChance: Type.Optional(
      Type.Number({
        description: "Extra coral reef probability near paradise islands (0..1 expressed as a fraction).",
      })
    ),
    volcanicForestChance: Type.Optional(
      Type.Number({
        description: "Extra temperate forest chance on volcanic slopes in warm climates (0..1 fraction).",
      })
    ),
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
    hotspot: Type.Optional(
      HotspotTunablesSchema,
      { description: "Bias controls for selecting and weighting story hotspots." }
    ),
    features: Type.Optional(
      FeaturesConfigSchema,
      { description: "Localized biome/feature bonuses applied around story elements." }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Policy governing how strategic sea corridors are protected or softened.
 */
export const SeaCorridorPolicySchema = Type.Object(
  {
    protection: Type.Optional(
      Type.Union([Type.Literal("hard"), Type.Literal("soft")], {
        description: "Hard protection blocks edits in corridors; soft allows limited carving with penalties.",
      })
    ),
    softChanceMultiplier: Type.Optional(
      Type.Number({
        description: "Probability multiplier applied when protection is soft to keep lanes mostly open.",
      })
    ),
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
    sea: Type.Optional(
      SeaCorridorPolicySchema,
      { description: "Sea-lane protection policy ensuring naval passages stay open." }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Baseline rainfall and local bonuses used by the climate engine.
 */
export const ClimateBaselineSchema = Type.Object(
  {
    bands: Type.Optional(
      UnknownRecord,
      { description: "Rainfall targets by latitude band (units 0..200) keyed by band name." }
    ),
    blend: Type.Optional(
      UnknownRecord,
      { description: "Weights for blending engine rainfall with latitude-based targets." }
    ),
    orographic: Type.Optional(
      UnknownRecord,
      { description: "Orographic lift bonuses keyed by elevation thresholds and rainfall additions." }
    ),
    coastal: Type.Optional(
      UnknownRecord,
      { description: "Coastal rainfall bonuses such as shoreline and shallow-water boosts." }
    ),
    noise: Type.Optional(
      UnknownRecord,
      { description: "Rainfall jitter controls to break up uniform bands across different map sizes." }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Earthlike refinement parameters layered on top of baseline climate.
 */
export const ClimateRefineSchema = Type.Object(
  {
    waterGradient: Type.Optional(
      UnknownRecord,
      { description: "Continental effect knobs controlling how distance from ocean dries interiors." }
    ),
    orographic: Type.Optional(
      UnknownRecord,
      { description: "Rain shadow simulation knobs determining leeward drying strength." }
    ),
    riverCorridor: Type.Optional(
      UnknownRecord,
      { description: "Humidity bonuses applied along river valleys to keep them fertile." }
    ),
    lowBasin: Type.Optional(
      UnknownRecord,
      { description: "Enclosed basin humidity retention controls that support oasis-style pockets." }
    ),
    pressure: Type.Optional(
      UnknownRecord,
      { description: "Synoptic-scale pressure field adjustments used by the climate engine." }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Aggregated climate configuration grouping baseline, refinement, and swatch knobs.
 */
export const ClimateConfigSchema = Type.Object(
  {
    baseline: Type.Optional(
      ClimateBaselineSchema,
      { description: "Latitude-driven rainfall template applied before refinements." }
    ),
    refine: Type.Optional(
      ClimateRefineSchema,
      { description: "Physically motivated refinements such as rain shadows and continental drying." }
    ),
    swatches: Type.Optional(
      UnknownRecord,
      { description: "Macro swatch overrides that recolor large climate regions for narrative beats." }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Biome nudge thresholds that fine-tune terrain assignment.
 */
export const BiomeConfigSchema = Type.Object(
  {
    tundra: Type.Optional(
      Type.Object(
        {
          latMin: Type.Optional(
            Type.Number({
              description: "Minimum latitude for tundra to prevent low-latitude cold deserts (degrees).",
            })
          ),
          elevMin: Type.Optional(
            Type.Number({
              description: "Minimum elevation for tundra; lowlands below this stay as taiga or grassland.",
            })
          ),
          rainMax: Type.Optional(
            Type.Number({
              description: "Maximum rainfall tolerated before tundra flips to wetter biomes (rainfall units).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    tropicalCoast: Type.Optional(
      Type.Object(
        {
          latMax: Type.Optional(
            Type.Number({
              description: "Latitude limit for tropical coasts; nearer the equator keeps coasts lush (degrees).",
            })
          ),
          rainMin: Type.Optional(
            Type.Number({
              description: "Minimum rainfall needed to classify a warm coastline as tropical (rainfall units).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    riverValleyGrassland: Type.Optional(
      Type.Object(
        {
          latMax: Type.Optional(
            Type.Number({
              description: "Latitude limit for temperate river grasslands; beyond this prefer taiga or tundra.",
            })
          ),
          rainMin: Type.Optional(
            Type.Number({
              description: "Minimum humidity needed for river valley grasslands (rainfall units).",
            })
          ),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    riftShoulder: Type.Optional(
      Type.Object(
        {
          grasslandLatMax: Type.Optional(
            Type.Number({
              description: "Latitude ceiling for grassland on rift shoulders (degrees).",
            })
          ),
          grasslandRainMin: Type.Optional(
            Type.Number({
              description: "Minimum rainfall for grassland shoulders along rifts (rainfall units).",
            })
          ),
          tropicalLatMax: Type.Optional(
            Type.Number({
              description: "Latitude ceiling for tropical rift shoulders (degrees).",
            })
          ),
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
    shelfReefMultiplier: Type.Optional(
      Type.Number({
        description: "Coral reef density multiplier on passive continental shelves (scalar).",
      })
    ),
    rainforestExtraChance: Type.Optional(
      Type.Number({
        description: "Bonus jungle/rainforest probability in wet tropics (0..1 fraction or percent).",
      })
    ),
    forestExtraChance: Type.Optional(
      Type.Number({
        description: "Bonus temperate forest probability in moderate rainfall zones (0..1 fraction or percent).",
      })
    ),
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
    minLength: Type.Optional(
      Type.Number({
        description: "Minimum river segment length that can host floodplains (tiles).",
      })
    ),
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
 */
export const StartsConfigSchema = Type.Object(
  {
    playersLandmass1: Type.Number({
      description: "Player count allocated to the primary landmass band.",
    }),
    playersLandmass2: Type.Number({
      description: "Player count allocated to the secondary landmass band (if present).",
    }),
    westContinent: ContinentBoundsSchema,
    eastContinent: ContinentBoundsSchema,
    startSectorRows: Type.Number({
      description: "Number of sector rows used when partitioning the map for starts.",
    }),
    startSectorCols: Type.Number({
      description: "Number of sector columns used when partitioning the map for starts.",
    }),
    startSectors: Type.Array(Type.Unknown(), {
      default: [],
      description: "Explicit start sector descriptors passed directly to placement logic.",
    }),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Late-stage placement controls for wonders, floodplains, and start metadata.
 */
export const PlacementConfigSchema = Type.Object(
  {
    wondersPlusOne: Type.Optional(
      Type.Boolean({
        description: "Whether to add one extra natural wonder beyond map-size defaults to diversify layouts.",
      })
    ),
    floodplains: Type.Optional(
      FloodplainsConfigSchema,
      { description: "Floodplain generation parameters applied along eligible river segments." }
    ),
    starts: Type.Optional(
      StartsConfigSchema,
      { description: "Player start positioning metadata keyed by continent bands." }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Consolidated foundation configuration replacing the legacy worldModel split.
 */
export const FoundationConfigSchema = Type.Object(
  {
    seed: Type.Optional(
      FoundationSeedConfigSchema,
      { description: "Deterministic seed controls shared by plates and dynamics." }
    ),
    plates: Type.Optional(
      FoundationPlatesConfigSchema,
      { description: "Voronoi plate generation controls for the foundation grid." }
    ),
    dynamics: Type.Optional(
      FoundationDynamicsConfigSchema,
      { description: "Atmospheric, oceanic, and mantle driver configuration." }
    ),
    surface: Type.Optional(
      FoundationSurfaceConfigSchema,
      { description: "Landmass targets and ocean separation policy generated from seeds." }
    ),
    policy: Type.Optional(
      FoundationPolicyConfigSchema,
      { description: "Public policy multipliers exposed to downstream layers." }
    ),
    diagnostics: Type.Optional(
      FoundationDiagnosticsConfigSchema,
      { description: "Diagnostics and logging toggles for the foundation pipeline." }
    ),
    oceanSeparation: Type.Optional(
      OceanSeparationConfigSchema,
      { description: "Deprecated compatibility alias for plate-aware ocean separation controls." }
    ),
    coastlines: Type.Optional(
      CoastlinesConfigSchema,
      { description: "Coastline ruggedization controls forwarded for foundation consumers." }
    ),
    islands: Type.Optional(
      IslandsConfigSchema,
      { description: "Island chain placement controls forwarded for foundation consumers." }
    ),
    mountains: Type.Optional(
      MountainsConfigSchema,
      { description: "Mountain and hill placement tuning forwarded for foundation consumers." }
    ),
    volcanoes: Type.Optional(
      VolcanoesConfigSchema,
      { description: "Volcano placement controls forwarded for foundation consumers." }
    ),
    story: Type.Optional(
      StoryConfigSchema,
      { description: "Story overlay tunables forwarded for foundation consumers." }
    ),
    corridors: Type.Optional(
      CorridorsConfigSchema,
      { description: "Strategic corridor policy forwarded for foundation consumers." }
    ),
    biomes: Type.Optional(
      BiomeConfigSchema,
      { description: "Biome nudges forwarded for foundation consumers." }
    ),
    featuresDensity: Type.Optional(
      FeaturesDensityConfigSchema,
      { description: "Feature density tweaks forwarded for foundation consumers." }
    ),
    placement: Type.Optional(
      PlacementConfigSchema,
      { description: "Late-stage placement controls forwarded for foundation consumers." }
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Diagnostics toggles shared by top-level map generation stages.
 */
export const DiagnosticsConfigSchema = Type.Object(
  {
    logAscii: Type.Optional(
      Type.Boolean({
        description: "Emit ASCII diagnostics for core stages such as foundation and landmass windows.",
      })
    ),
    logHistograms: Type.Optional(
      Type.Boolean({
        description: "Log histogram summaries for quick visual validation of distributions.",
      })
    ),
  },
  { additionalProperties: true, default: {} }
);

/**
 * Canonical MapGen configuration schema exported by mapgen-core.
 */
export const MapGenConfigSchema = Type.Object(
  {
    presets: Type.Optional(
      Type.Array(Type.String(), {
        default: [],
        description: "List of preset names to apply in order before processing stage overrides.",
      })
    ),
    stageConfig: Type.Optional(
      StageConfigSchema,
      { description: "Per-stage enablement overrides consumed by the stage resolver." }
    ),
    stageManifest: Type.Optional(
      StageManifestSchema,
      { description: "Ordered stage manifest with dependency metadata." }
    ),
    toggles: Type.Optional(
      TogglesSchema,
      { description: "Legacy story toggles kept for compatibility with upstream pipelines." }
    ),
    landmass: Type.Optional(
      LandmassConfigSchema,
      { description: "Primary landmass controls (water coverage, tectonics, geometry)." }
    ),
    foundation: Type.Optional(
      FoundationConfigSchema,
      { description: "Unified foundation configuration covering seeds, plates, and dynamics." }
    ),
    climate: Type.Optional(
      ClimateConfigSchema,
      { description: "Climate baseline, refinement, and swatch configuration." }
    ),
    mountains: Type.Optional(
      MountainsConfigSchema,
      { description: "Mountain and hill placement tuning." }
    ),
    volcanoes: Type.Optional(
      VolcanoesConfigSchema,
      { description: "Volcano placement controls." }
    ),
    coastlines: Type.Optional(
      CoastlinesConfigSchema,
      { description: "Coastline ruggedization controls." }
    ),
    islands: Type.Optional(
      IslandsConfigSchema,
      { description: "Island chain placement controls." }
    ),
    biomes: Type.Optional(
      BiomeConfigSchema,
      { description: "Biome threshold tweaks." }
    ),
    featuresDensity: Type.Optional(
      FeaturesDensityConfigSchema,
      { description: "Feature density controls for vegetation and reefs." }
    ),
    story: Type.Optional(
      StoryConfigSchema,
      { description: "Story overlay and hotspot configuration." }
    ),
    corridors: Type.Optional(
      CorridorsConfigSchema,
      { description: "Strategic corridor policies." }
    ),
    oceanSeparation: Type.Optional(
      OceanSeparationConfigSchema,
      { description: "Top-level alias for ocean separation controls used by legacy consumers." }
    ),
    placement: Type.Optional(
      PlacementConfigSchema,
      { description: "Late-stage placement controls for wonders, floodplains, and starts." }
    ),
    diagnostics: Type.Optional(
      DiagnosticsConfigSchema,
      { description: "Diagnostics toggles for ASCII and histogram logging across stages." }
    ),
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
export type ClimateBaseline = Static<typeof ClimateBaselineSchema>;
export type ClimateRefine = Static<typeof ClimateRefineSchema>;
export type ClimateConfig = Static<typeof ClimateConfigSchema>;
export type BiomeConfig = Static<typeof BiomeConfigSchema>;
export type FeaturesDensityConfig = Static<typeof FeaturesDensityConfigSchema>;
export type FloodplainsConfig = Static<typeof FloodplainsConfigSchema>;
export type StartsConfig = Static<typeof StartsConfigSchema>;
export type PlacementConfig = Static<typeof PlacementConfigSchema>;
export type DiagnosticsConfig = Static<typeof DiagnosticsConfigSchema>;
export type MapGenConfig = Static<typeof MapGenConfigSchema> & Record<string, unknown>;
