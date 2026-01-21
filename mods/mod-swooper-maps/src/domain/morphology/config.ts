import { Type, type Static } from "@swooper/mapgen-core/authoring";

/**
 * Edge override policy for the ocean separation pass.
 */
export const OceanSeparationEdgePolicySchema = Type.Object(
  {
    /** Enable edge-specific override for this map border (west or east). */
    enabled: Type.Boolean({
      description: "Enable edge-specific override for this map border (west or east).",
      default: false,
    }),
    /** Baseline separation enforced at the map edge in tiles (before boundary multipliers). */
    baseTiles: Type.Number({
      description: "Baseline separation enforced at the map edge in tiles (before boundary multipliers).",
      default: 0,
      minimum: 0,
    }),
    /** Multiplier applied near active margins when widening oceans at the edge. */
    boundaryClosenessMultiplier: Type.Number({
      description: "Multiplier applied near active margins when widening oceans at the edge.",
      default: 1,
      minimum: 0,
    }),
    /** Maximum allowed per-latitude separation delta for this edge to avoid extreme zig-zags. */
    maxPerRowDelta: Type.Number({
      description: "Maximum allowed per-latitude separation delta for this edge to avoid extreme zig-zags.",
      default: 3,
      minimum: 0,
    }),
  }
);

/**
 * Plate-aware ocean separation policy controlling continental drift spacing.
 */
export const OceanSeparationConfigSchema = Type.Object(
  {
    /** Master switch for plate-aware ocean widening between continent bands. */
    enabled: Type.Boolean({
      description: "Master switch for plate-aware ocean widening between continent bands.",
      default: false,
    }),
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
    baseSeparationTiles: Type.Number({
      description: "Baseline widening between continents in tiles before modifiers are applied.",
      default: 0,
      minimum: 0,
    }),
    /** Extra separation applied when plates are close to active boundaries (multiplier 0..2). */
    boundaryClosenessMultiplier: Type.Number({
      description: "Extra separation applied when plates are close to active boundaries (multiplier 0..2).",
      default: 1,
      minimum: 0,
    }),
    /** Maximum per-latitude variation in separation (tiles) to keep oceans smooth north-south. */
    maxPerRowDelta: Type.Number({
      description: "Maximum per-latitude variation in separation (tiles) to keep oceans smooth north-south.",
      default: 3,
      minimum: 0,
    }),
    /** Minimum navigable channel width to preserve while widening seas (tiles). */
    minChannelWidth: Type.Number({
      description: "Minimum navigable channel width to preserve while widening seas (tiles).",
      default: 3,
      minimum: 0,
    }),
    /** Random jitter applied to channel widths to avoid uniform straight lines. */
    channelJitter: Type.Number({
      description: "Random jitter applied to channel widths to avoid uniform straight lines.",
      default: 0,
      minimum: 0,
    }),
    /** Whether strategic sea corridors should be preserved when enforcing separation. */
    respectSeaLanes: Type.Boolean({
      description: "Whether strategic sea corridors should be preserved when enforcing separation.",
      default: true,
    }),
    /** West edge-specific override policy. */
    edgeWest: OceanSeparationEdgePolicySchema,
    /** East edge-specific override policy. */
    edgeEast: OceanSeparationEdgePolicySchema,
  }
);

/**
 * Plate-aware weighting for bay/fjord odds based on boundary closeness.
 */
export const CoastlinePlateBiasConfigSchema = Type.Object(
  {
    /** Normalized closeness where coastline edits begin to respond to plate boundaries (0..1). */
    threshold: Type.Number({
      description: "Normalized closeness where coastline edits begin to respond to plate boundaries (0..1).",
      default: 0.45,
      minimum: 0,
      maximum: 1,
    }),
    /**
     * Exponent shaping how quickly bias ramps after the threshold.
     * Values >1 concentrate effects near boundaries; <1 spreads them wider.
     */
    power: Type.Number({
      description: "Exponent shaping how quickly bias ramps after the threshold; >1 concentrates effects near boundaries.",
      default: 1.25,
      minimum: 0,
    }),
    /** Bias multiplier for convergent boundaries; positive values encourage dramatic coasts and fjords. */
    convergent: Type.Number({
      description: "Bias multiplier for convergent boundaries; positive values encourage dramatic coasts and fjords.",
      default: 1.0,
    }),
    /** Bias multiplier for transform boundaries; lower values soften edits along shear zones. */
    transform: Type.Number({
      description: "Bias multiplier for transform boundaries; lower values soften edits along shear zones.",
      default: 0.4,
    }),
    /** Bias multiplier for divergent boundaries; negative values discourage ruggedization along rifts. */
    divergent: Type.Number({
      description: "Bias multiplier for divergent boundaries; negative values discourage ruggedization along rifts.",
      default: -0.6,
    }),
    /** Residual bias for interior coasts away from boundaries; typically near zero. */
    interior: Type.Number({
      description: "Residual bias for interior coasts away from boundaries; typically near zero.",
      default: 0,
    }),
    /** Strength applied to bay denominators; higher values increase bay carving where bias is positive. */
    bayWeight: Type.Number({
      description: "Strength applied to bay denominators; higher values increase bay carving where bias is positive.",
      default: 0.35,
      minimum: 0,
    }),
    /** Extra noise gate reduction when bias is positive, allowing smaller bays near active margins. */
    bayNoiseBonus: Type.Number({
      description: "Extra noise gate reduction when bias is positive, allowing smaller bays near active margins.",
      default: 1.0,
      minimum: 0,
    }),
    /** Strength applied to fjord denominators; higher values create more fjords along favored coasts. */
    fjordWeight: Type.Number({
      description: "Strength applied to fjord denominators; higher values create more fjords along favored coasts.",
      default: 0.8,
      minimum: 0,
    }),
  }
);

/**
 * Bay configuration (gentle coastal indentations).
 */
export const CoastlineBayConfigSchema = Type.Object(
  {
    /** Extra noise threshold on larger maps; higher values reduce bay frequency while keeping size larger. */
    noiseGateAdd: Type.Number({
      description: "Extra noise threshold on larger maps; higher values reduce bay frequency while keeping size larger.",
      default: 0,
    }),
    /** Bay frequency on active margins; lower denominators produce more bays along energetic coasts. */
    rollDenActive: Type.Number({
      description: "Bay frequency on active margins; lower denominators produce more bays along energetic coasts.",
      default: 4,
      minimum: 1,
    }),
    /** Bay frequency on passive margins; lower denominators carve more bays in calm regions. */
    rollDenDefault: Type.Number({
      description: "Bay frequency on passive margins; lower denominators carve more bays in calm regions.",
      default: 5,
      minimum: 1,
    }),
  }
);

/**
 * Fjord configuration (deep, narrow inlets along steep margins).
 */
export const CoastlineFjordConfigSchema = Type.Object(
  {
    /** Base fjord frequency; smaller values increase fjord count across the map. */
    baseDenom: Type.Number({
      description: "Base fjord frequency; smaller values increase fjord count across the map.",
      default: 12,
      minimum: 1,
    }),
    /** Bonus applied on active convergent margins; subtracts from baseDenom to amplify fjord density. */
    activeBonus: Type.Number({
      description: "Bonus applied on active convergent margins; subtracts from baseDenom to amplify fjord density.",
      default: 1,
      minimum: 0,
    }),
    /** Bonus applied on passive shelves; subtracts from baseDenom for gentler fjords. */
    passiveBonus: Type.Number({
      description: "Bonus applied on passive shelves; subtracts from baseDenom for gentler fjords.",
      default: 2,
      minimum: 0,
    }),
  }
);

/**
 * Island chain placement using deterministic noise and volcanism signals.
 */
export const IslandsConfigSchema = Type.Object(
  {
    /** Noise cutoff for island seeds (percent). Higher values mean fewer, larger island groups. */
    fractalThresholdPercent: Type.Number({
      description: "Noise cutoff for island seeds (percent). Higher values mean fewer, larger island groups.",
      default: 90,
      minimum: 0,
      maximum: 100,
    }),
    /** Minimum spacing from continental landmasses (tiles) to prevent coastal clutter. */
    minDistFromLandRadius: Type.Number({
      description: "Minimum spacing from continental landmasses (tiles) to prevent coastal clutter.",
      default: 2,
      minimum: 0,
    }),
    /**
     * Island frequency near active margins.
     * Lower denominators spawn more volcanic arcs like Japan.
     */
    baseIslandDenNearActive: Type.Number({
      description: "Island frequency near active margins; lower denominators spawn more volcanic arcs like Japan.",
      default: 5,
      minimum: 1,
    }),
    /** Island frequency away from active margins; controls interior archipelagos. */
    baseIslandDenElse: Type.Number({
      description: "Island frequency away from active margins; controls interior archipelagos.",
      default: 7,
      minimum: 1,
    }),
    /**
     * Island seed frequency along volcanism signals.
     * Smaller values create Hawaii-style chains.
     */
    hotspotSeedDenom: Type.Number({
      description: "Island seed frequency along volcanism signals; smaller values create Hawaii-style chains.",
      default: 2,
      minimum: 1,
    }),
    /** Maximum tiles per island cluster to cap archipelago size (tiles). */
    clusterMax: Type.Number({
      description: "Maximum tiles per island cluster to cap archipelago size (tiles).",
      default: 3,
      minimum: 1,
    }),
    /** Chance of spawning larger microcontinent chains outside major margins (0..1). */
    microcontinentChance: Type.Number({
      description: "Chance of spawning larger microcontinent chains outside major margins (0..1).",
      default: 0,
      minimum: 0,
      maximum: 1,
    }),
  }
);

/**
 * Mountain and hill placement tuning driven by foundation physics.
 */
export const MountainsConfigSchema = Type.Object(
  {
    /**
     * Global scale for tectonic effects.
     * Primary dial for overall mountain prevalence across the map.
     */
    tectonicIntensity: Type.Number({
      description: "Global scale for tectonic effects; primary dial for overall mountain prevalence.",
      default: 1.0,
      minimum: 0,
    }),
    /** Score threshold for promoting a tile to a mountain; lower values allow more peaks. */
    mountainThreshold: Type.Number({
      description: "Score threshold for promoting a tile to a mountain; lower values allow more peaks.",
      default: 0.58,
      minimum: 0,
    }),
    /** Score threshold for assigning hills; lower values increase hill coverage. */
    hillThreshold: Type.Number({
      description: "Score threshold for assigning hills; lower values increase hill coverage.",
      default: 0.32,
      minimum: 0,
    }),
    /** Weight applied to uplift potential; keeps mountains aligned with convergent zones. */
    upliftWeight: Type.Number({
      description: "Weight applied to uplift potential; keeps mountains aligned with convergent zones.",
      default: 0.35,
      minimum: 0,
    }),
    /** Weight applied to fractal noise to introduce natural variation in ranges. */
    fractalWeight: Type.Number({
      description: "Weight applied to fractal noise to introduce natural variation in ranges.",
      default: 0.15,
      minimum: 0,
    }),
    /** Depression severity along divergent boundaries (0..1); higher values carve deeper rifts. */
    riftDepth: Type.Number({
      description: "Depression severity along divergent boundaries (0..1); higher values carve deeper rifts.",
      default: 0.2,
      minimum: 0,
      maximum: 1,
    }),
    /** Additional weight from plate-boundary closeness that pulls mountains toward margins. */
    boundaryWeight: Type.Number({
      description: "Additional weight from plate-boundary closeness that pulls mountains toward margins.",
      default: 1.0,
      minimum: 0,
    }),
    /**
     * Boundary-closeness gate (0..0.99).
     *
     * Tiles with boundary closeness at-or-below this value receive no boundary-driven contribution,
     * but can still form mountains/hills from uplift + fractal noise.
     *
     * Set to 0 for more interior variety; raise it to keep mountains concentrated along active margins.
     */
    boundaryGate: Type.Number({
      description:
        "Boundary-closeness gate (0..0.99). Set to 0 for more interior variety; raise it to concentrate mountains along margins.",
      default: 0.1,
      minimum: 0,
      maximum: 0.99,
    }),
    /** Exponent controlling how quickly boundary influence decays with distance (>=0.25). */
    boundaryExponent: Type.Number({
      description: "Exponent controlling how quickly boundary influence decays with distance (>=0.25).",
      default: 1.6,
      minimum: 0.25,
    }),
    /**
     * Penalty applied to deep interior tiles to keep high terrain near tectonic action.
     *
     * Applied as a multiplier that scales with distance from plate boundaries (higher = fewer interior peaks).
     */
    interiorPenaltyWeight: Type.Number({
      description:
        "Penalty applied to deep interior tiles to keep high terrain near tectonic action (higher = fewer interior peaks).",
      default: 0.0,
      minimum: 0,
    }),
    /** Extra additive weight for convergent tiles, creating dominant orogeny ridges. */
    convergenceBonus: Type.Number({
      description: "Extra additive weight for convergent tiles, creating dominant orogeny ridges.",
      default: 1.0,
      minimum: 0,
    }),
    /** Penalty multiplier for transform boundaries to soften shearing ridges. */
    transformPenalty: Type.Number({
      description: "Penalty multiplier for transform boundaries to soften shearing ridges.",
      default: 0.6,
      minimum: 0,
    }),
    /** Penalty multiplier applied along divergent boundaries before riftDepth is carved. */
    riftPenalty: Type.Number({
      description: "Penalty multiplier applied along divergent boundaries before riftDepth is carved.",
      default: 1.0,
      minimum: 0,
    }),
    /** Hill weight contributed by boundary closeness, forming foothill skirts near margins. */
    hillBoundaryWeight: Type.Number({
      description: "Hill weight contributed by boundary closeness, forming foothill skirts near margins.",
      default: 0.35,
      minimum: 0,
    }),
    /** Hill bonus added beside rift valleys, creating uplifted shoulders. */
    hillRiftBonus: Type.Number({
      description: "Hill bonus added beside rift valleys, creating uplifted shoulders.",
      default: 0.25,
      minimum: 0,
    }),
    /** Extra foothill weight on convergent tiles to smooth transitions into mountain ranges. */
    hillConvergentFoothill: Type.Number({
      description: "Extra foothill weight on convergent tiles to smooth transitions into mountain ranges.",
      default: 0.35,
      minimum: 0,
    }),
    /**
     * Penalty for hills deep inside plates; higher values keep hills near tectonic features.
     *
     * Applied as a multiplier that scales with distance from plate boundaries.
     */
    hillInteriorFalloff: Type.Number({
      description:
        "Penalty for hills deep inside plates; scales with distance from boundaries (higher = fewer interior hills).",
      default: 0.1,
      minimum: 0,
    }),
    /** Residual uplift contribution applied to hills so basins and foothills stay balanced. */
    hillUpliftWeight: Type.Number({
      description: "Residual uplift contribution applied to hills so basins and foothills stay balanced.",
      default: 0.2,
      minimum: 0,
    }),
  }
);

/**
 * Volcano placement controls combining plate-aware arcs and hotspot trails.
 */
export const VolcanoesConfigSchema = Type.Object(
  {
    /** Master toggle for volcano placement. */
    enabled: Type.Boolean({
      description: "Master toggle for volcano placement.",
      default: true,
    }),
    /** Baseline volcanoes per land tile; higher density spawns more vents overall. */
    baseDensity: Type.Number({
      description: "Baseline volcanoes per land tile; higher density spawns more vents overall.",
      default: 1 / 170,
      minimum: 0,
    }),
    /** Minimum Euclidean distance between volcanoes in tiles to avoid clusters merging. */
    minSpacing: Type.Number({
      description: "Minimum Euclidean distance between volcanoes in tiles to avoid clusters merging.",
      default: 3,
      minimum: 0,
    }),
    /** Plate-boundary closeness threshold (0..1) for treating a tile as margin-adjacent. */
    boundaryThreshold: Type.Number({
      description: "Plate-boundary closeness threshold (0..1) for treating a tile as margin-adjacent.",
      default: 0.35,
      minimum: 0,
      maximum: 1,
    }),
    /** Base weight applied to tiles within the boundary band, biasing arcs over interiors. */
    boundaryWeight: Type.Number({
      description: "Base weight applied to tiles within the boundary band, biasing arcs over interiors.",
      default: 1.2,
      minimum: 0,
    }),
    /** Weight multiplier for convergent boundaries; raises classic arc volcano density. */
    convergentMultiplier: Type.Number({
      description: "Weight multiplier for convergent boundaries; raises classic arc volcano density.",
      default: 2.4,
      minimum: 0,
    }),
    /** Weight multiplier for transform boundaries; typically lower to avoid shear volcanism. */
    transformMultiplier: Type.Number({
      description: "Weight multiplier for transform boundaries; typically lower to avoid shear volcanism.",
      default: 1.1,
      minimum: 0,
    }),
    /** Weight multiplier for divergent boundaries; keep small to prevent rift volcanism dominating. */
    divergentMultiplier: Type.Number({
      description: "Weight multiplier for divergent boundaries; keep small to prevent rift volcanism dominating.",
      default: 0.35,
      minimum: 0,
    }),
    /** Weight contribution for interior hotspots; increases inland/shield volcano presence. */
    hotspotWeight: Type.Number({
      description: "Weight contribution for interior hotspots; increases inland/shield volcano presence.",
      default: 0.12,
      minimum: 0,
    }),
    /** Penalty applied using shield stability; higher values suppress volcanoes on ancient cratons. */
    shieldPenalty: Type.Number({
      description: "Penalty applied using shield stability; higher values suppress volcanoes on ancient cratons.",
      default: 0.6,
      minimum: 0,
      maximum: 1,
    }),
    /** Random additive jitter per tile to break up deterministic patterns. */
    randomJitter: Type.Number({
      description: "Random additive jitter per tile to break up deterministic patterns.",
      default: 0.08,
      minimum: 0,
    }),
    /** Minimum volcano count target to guarantee a few vents even on sparse maps. */
    minVolcanoes: Type.Number({
      description: "Minimum volcano count target to guarantee a few vents even on sparse maps.",
      default: 5,
      minimum: 0,
    }),
    /** Maximum volcano count cap; set <=0 to disable the cap and allow density-driven totals. */
    maxVolcanoes: Type.Number({
      description: "Maximum volcano count cap; set <=0 to disable the cap and allow density-driven totals.",
      default: 40,
    }),
  }
);

/**
 * Land fraction / hypsometry controls used for sea-level selection.
 */
export const HypsometryConfigSchema = Type.Object(
  {
    /** Target global water coverage (0-100). */
    targetWaterPercent: Type.Number({
      description:
        "Target global water coverage (0-100). 55-65 mimics Earth; 70-75 drifts toward archipelago worlds.",
      default: 60,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Multiplier applied after targetWaterPercent (typically 0.75-1.25).
     * Clamped to 0.25-1.75 to prevent full ocean/land wipeouts.
     */
    targetScalar: Type.Number({
      description:
        "Multiplier applied after targetWaterPercent (typically 0.75-1.25). Values are clamped to 0.25-1.75.",
      default: 1,
      minimum: 0.25,
      maximum: 1.75,
    }),
    /** Optional variance (0-100) applied to the target water percent per map. */
    variance: Type.Number({
      description: "Optional variance (0-100) applied to the target water percent per map.",
      default: 0,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Soft backstop on the share of land inside the boundary closeness band (0..1).
     * The solver lowers threshold in 5-point steps until boundary share meets this target.
     */
    boundaryShareTarget: Type.Number({
      description: "Soft backstop on the share of land inside the boundary closeness band (0..1).",
      default: 0.15,
      minimum: 0,
      maximum: 1,
    }),
    /** Desired share of continental crust when balancing land vs. ocean plates (0..1). */
    continentalFraction: Type.Optional(
      Type.Number({
        description: "Desired share of continental crust when balancing land vs. ocean plates (0..1).",
        minimum: 0,
        maximum: 1,
      })
    ),
  }
);

/**
 * Base relief shaping controls (tectonic expression into elevation).
 */
export const ReliefConfigSchema = Type.Object(
  {
    /** Closeness bonus favoring tiles near plate boundaries (0..1). */
    boundaryBias: Type.Number({
      description: "Closeness bonus favoring tiles near plate boundaries (0..1).",
      default: 0,
      minimum: 0,
      maximum: 1,
    }),
    /** Bias that clusters continental plates together. */
    clusteringBias: Type.Number({
      description:
        "Bias that clusters continental plates together; higher values encourage supercontinents.",
      default: 0,
      minimum: 0,
      maximum: 1,
    }),
    /** Blend factor for smoothing crust edges (0..1). */
    crustEdgeBlend: Type.Number({
      description: "Blend factor for smoothing crust edges (0..1).",
      default: 0.45,
      minimum: 0,
      maximum: 1,
    }),
    /** Amplitude of base noise injected into crust elevations (0..1). */
    crustNoiseAmplitude: Type.Number({
      description: "Amplitude of base noise injected into crust elevations (0..1).",
      default: 0.1,
      minimum: 0,
      maximum: 1,
    }),
    /** Baseline elevation for continental crust (normalized units). */
    continentalHeight: Type.Number({
      description: "Baseline elevation for continental crust (normalized units).",
      default: 0.32,
    }),
    /** Baseline elevation for oceanic crust (normalized units). */
    oceanicHeight: Type.Number({
      description: "Baseline elevation for oceanic crust (normalized units).",
      default: -0.55,
    }),
    /** Tectonic weighting used while shaping base topography. */
    tectonics: Type.Object(
      {
        interiorNoiseWeight: Type.Number({
          description: "Blend factor for plate-interior noise.",
          default: 0.5,
          minimum: 0,
        }),
        boundaryArcWeight: Type.Number({
          description: "Multiplier for convergent boundary uplift arcs.",
          default: 0.35,
          minimum: 0,
        }),
        boundaryArcNoiseWeight: Type.Number({
          description: "Raggedness injected into boundary arcs.",
          default: 0.2,
          minimum: 0,
        }),
        fractalGrain: Type.Number({
          description: "Grain of tectonic fractal noise (higher = finer).",
          default: 4,
          minimum: 1,
        }),
      }
    ),
  }
);

/**
 * Geomorphic cycle controls (fluvial incision + diffusion + deposition).
 */
export const GeomorphologyConfigSchema = Type.Object(
  {
    fluvial: Type.Object(
      {
        rate: Type.Number({
          description: "Fluvial incision rate (0..1).",
          default: 0.15,
          minimum: 0,
          maximum: 1,
        }),
        m: Type.Number({ description: "Stream power exponent m.", default: 0.5 }),
        n: Type.Number({ description: "Stream power exponent n.", default: 1.0 }),
      }
    ),
    diffusion: Type.Object(
      {
        rate: Type.Number({
          description: "Hillslope diffusion rate (0..1).",
          default: 0.2,
          minimum: 0,
          maximum: 1,
        }),
        talus: Type.Optional(
          Type.Number({
            description: "Optional talus threshold (normalized units).",
            default: 0.5,
            minimum: 0,
          })
        ),
      }
    ),
    deposition: Type.Object(
      {
        rate: Type.Number({
          description: "Sediment deposition rate (0..1).",
          default: 0.1,
          minimum: 0,
          maximum: 1,
        }),
      }
    ),
    eras: Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3)], {
      description: "Number of geomorphic eras to apply.",
      default: 2,
    }),
  }
);

export const WorldAgeSchema = Type.Union(
  [Type.Literal("young"), Type.Literal("mature"), Type.Literal("old")],
  {
    description: "World age posture used to scale geomorphic intensity.",
    default: "mature",
  }
);

export const CoastConfigSchema = Type.Object(
  {
    bay: CoastlineBayConfigSchema,
    fjord: CoastlineFjordConfigSchema,
    plateBias: CoastlinePlateBiasConfigSchema,
  }
);

export const LandformsConfigSchema = Type.Object(
  {
    islands: IslandsConfigSchema,
    mountains: MountainsConfigSchema,
    volcanoes: VolcanoesConfigSchema,
  }
);

export const MorphologyConfigSchema = Type.Object(
  {
    hypsometry: HypsometryConfigSchema,
    relief: ReliefConfigSchema,
    basinSeparation: OceanSeparationConfigSchema,
    coast: CoastConfigSchema,
    landforms: LandformsConfigSchema,
    geomorphology: GeomorphologyConfigSchema,
    worldAge: WorldAgeSchema,
  }
);

export type MorphologyConfig = Static<typeof MorphologyConfigSchema>;
export type HypsometryConfig = Static<typeof HypsometryConfigSchema>;
export type ReliefConfig = Static<typeof ReliefConfigSchema>;
export type GeomorphologyConfig = Static<typeof GeomorphologyConfigSchema>;
export type BasinSeparationConfig =
  Static<typeof MorphologyConfigSchema["properties"]["basinSeparation"]>;
export type OceanSeparationEdgePolicy =
  Static<typeof OceanSeparationConfigSchema["properties"]["edgeWest"]>;
export type CoastConfig = Static<typeof CoastConfigSchema>;
export type LandformsConfig = Static<typeof LandformsConfigSchema>;
export type CoastlinePlateBiasConfig =
  Static<typeof CoastConfigSchema["properties"]["plateBias"]>;
export type CoastlineBayConfig =
  Static<typeof CoastConfigSchema["properties"]["bay"]>;
export type CoastlineFjordConfig =
  Static<typeof CoastConfigSchema["properties"]["fjord"]>;
export type IslandsConfig =
  Static<typeof LandformsConfigSchema["properties"]["islands"]>;
export type MountainsConfig =
  Static<typeof LandformsConfigSchema["properties"]["mountains"]>;
export type VolcanoesConfig =
  Static<typeof LandformsConfigSchema["properties"]["volcanoes"]>;
