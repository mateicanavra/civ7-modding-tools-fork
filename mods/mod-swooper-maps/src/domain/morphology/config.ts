import { Type, type Static } from "typebox";

/**
 * Edge override policy for the ocean separation pass.
 */
const OceanSeparationEdgePolicySchema = Type.Object(
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
  { additionalProperties: false }
);

/**
 * Plate-aware ocean separation policy controlling continental drift spacing.
 */
const OceanSeparationConfigSchema = Type.Object(
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
  { additionalProperties: false }
);

/**
 * Plate-aware weighting for bay/fjord odds based on boundary closeness.
 */
const CoastlinePlateBiasConfigSchema = Type.Object(
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
  { additionalProperties: false }
);

/**
 * Bay configuration (gentle coastal indentations).
 */
const CoastlineBayConfigSchema = Type.Object(
  {
    /** Extra noise threshold on larger maps; higher values reduce bay frequency while keeping size larger. */
    noiseGateAdd: Type.Optional(
      Type.Number({
        description: "Extra noise threshold on larger maps; higher values reduce bay frequency while keeping size larger.",
        default: 0,
      })
    ),
    /** Bay frequency on active margins; lower denominators produce more bays along energetic coasts. */
    rollDenActive: Type.Optional(
      Type.Number({
        description: "Bay frequency on active margins; lower denominators produce more bays along energetic coasts.",
        default: 4,
      })
    ),
    /** Bay frequency on passive margins; lower denominators carve more bays in calm regions. */
    rollDenDefault: Type.Optional(
      Type.Number({
        description: "Bay frequency on passive margins; lower denominators carve more bays in calm regions.",
        default: 5,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Fjord configuration (deep, narrow inlets along steep margins).
 */
const CoastlineFjordConfigSchema = Type.Object(
  {
    /** Base fjord frequency; smaller values increase fjord count across the map. */
    baseDenom: Type.Optional(
      Type.Number({
        description: "Base fjord frequency; smaller values increase fjord count across the map.",
        default: 12,
      })
    ),
    /** Bonus applied on active convergent margins; subtracts from baseDenom to amplify fjord density. */
    activeBonus: Type.Optional(
      Type.Number({
        description: "Bonus applied on active convergent margins; subtracts from baseDenom to amplify fjord density.",
        default: 1,
      })
    ),
    /** Bonus applied on passive shelves; subtracts from baseDenom for gentler fjords. */
    passiveBonus: Type.Optional(
      Type.Number({
        description: "Bonus applied on passive shelves; subtracts from baseDenom for gentler fjords.",
        default: 2,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Coastline ruggedization settings that transform smooth coasts into bays and fjords.
 */
const CoastlinesConfigSchema = Type.Object(
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
  { additionalProperties: false }
);

/**
 * Island chain placement using fractal noise and hotspot trails.
 */
const IslandsConfigSchema = Type.Object(
  {
    /** Noise cutoff for island seeds (percent). Higher values mean fewer, larger island groups. */
    fractalThresholdPercent: Type.Optional(
      Type.Number({
        description: "Noise cutoff for island seeds (percent). Higher values mean fewer, larger island groups.",
        default: 90,
      })
    ),
    /** Minimum spacing from continental landmasses (tiles) to prevent coastal clutter. */
    minDistFromLandRadius: Type.Optional(
      Type.Number({
        description: "Minimum spacing from continental landmasses (tiles) to prevent coastal clutter.",
        default: 2,
      })
    ),
    /**
     * Island frequency near active margins.
     * Lower denominators spawn more volcanic arcs like Japan.
     */
    baseIslandDenNearActive: Type.Optional(
      Type.Number({
        description: "Island frequency near active margins; lower denominators spawn more volcanic arcs like Japan.",
        default: 5,
      })
    ),
    /** Island frequency away from active margins; controls passive-shelf archipelagos. */
    baseIslandDenElse: Type.Optional(
      Type.Number({
        description: "Island frequency away from active margins; controls passive-shelf archipelagos.",
        default: 7,
      })
    ),
    /**
     * Island seed frequency along hotspot trails.
     * Smaller values create Hawaii-style chains.
     */
    hotspotSeedDenom: Type.Optional(
      Type.Number({
        description: "Island seed frequency along hotspot trails; smaller values create Hawaii-style chains.",
        default: 2,
      })
    ),
    /** Maximum tiles per island cluster to cap archipelago size (tiles). */
    clusterMax: Type.Optional(
      Type.Number({
        description: "Maximum tiles per island cluster to cap archipelago size (tiles).",
        default: 3,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Mountain and hill placement tuning driven by foundation physics.
 */
const MountainsConfigSchema = Type.Object(
  {
    /**
     * Global scale for tectonic effects.
     * Primary dial for overall mountain prevalence across the map.
     */
    tectonicIntensity: Type.Optional(
      Type.Number({
        description: "Global scale for tectonic effects; primary dial for overall mountain prevalence.",
        default: 1.0,
      })
    ),
    /** Score threshold for promoting a tile to a mountain; lower values allow more peaks. */
    mountainThreshold: Type.Optional(
      Type.Number({
        description: "Score threshold for promoting a tile to a mountain; lower values allow more peaks.",
        default: 0.58,
      })
    ),
    /** Score threshold for assigning hills; lower values increase hill coverage. */
    hillThreshold: Type.Optional(
      Type.Number({
        description: "Score threshold for assigning hills; lower values increase hill coverage.",
        default: 0.32,
      })
    ),
    /** Weight applied to uplift potential; keeps mountains aligned with convergent zones. */
    upliftWeight: Type.Optional(
      Type.Number({
        description: "Weight applied to uplift potential; keeps mountains aligned with convergent zones.",
        default: 0.35,
      })
    ),
    /** Weight applied to fractal noise to introduce natural variation in ranges. */
    fractalWeight: Type.Optional(
      Type.Number({
        description: "Weight applied to fractal noise to introduce natural variation in ranges.",
        default: 0.15,
      })
    ),
    /** Depression severity along divergent boundaries (0..1); higher values carve deeper rifts. */
    riftDepth: Type.Optional(
      Type.Number({
        description: "Depression severity along divergent boundaries (0..1); higher values carve deeper rifts.",
        default: 0.2,
      })
    ),
    /** Additional weight from plate-boundary closeness that pulls mountains toward margins. */
    boundaryWeight: Type.Optional(
      Type.Number({
        description: "Additional weight from plate-boundary closeness that pulls mountains toward margins.",
        default: 1.0,
      })
    ),
    /**
     * Boundary-closeness gate (0..0.99).
     *
     * Tiles with boundary closeness at-or-below this value receive no boundary-driven contribution,
     * but can still form mountains/hills from uplift + fractal noise.
     *
     * Set to 0 for more interior variety; raise it to keep mountains concentrated along active margins.
     */
    boundaryGate: Type.Optional(
      Type.Number({
        description:
          "Boundary-closeness gate (0..0.99). Set to 0 for more interior variety; raise it to concentrate mountains along margins.",
        default: 0.1,
        minimum: 0,
        maximum: 0.99,
      })
    ),
    /** Exponent controlling how quickly boundary influence decays with distance (>=0.25). */
    boundaryExponent: Type.Optional(
      Type.Number({
        description: "Exponent controlling how quickly boundary influence decays with distance (>=0.25).",
        default: 1.6,
      })
    ),
    /**
     * Penalty applied to deep interior tiles to keep high terrain near tectonic action.
     *
     * Applied as a multiplier that scales with distance from plate boundaries (higher = fewer interior peaks).
     */
    interiorPenaltyWeight: Type.Optional(
      Type.Number({
        description:
          "Penalty applied to deep interior tiles to keep high terrain near tectonic action (higher = fewer interior peaks).",
        default: 0.0,
      })
    ),
    /** Extra additive weight for convergent tiles, creating dominant orogeny ridges. */
    convergenceBonus: Type.Optional(
      Type.Number({
        description: "Extra additive weight for convergent tiles, creating dominant orogeny ridges.",
        default: 1.0,
      })
    ),
    /** Penalty multiplier for transform boundaries to soften shearing ridges. */
    transformPenalty: Type.Optional(
      Type.Number({
        description: "Penalty multiplier for transform boundaries to soften shearing ridges.",
        default: 0.6,
      })
    ),
    /** Penalty multiplier applied along divergent boundaries before riftDepth is carved. */
    riftPenalty: Type.Optional(
      Type.Number({
        description: "Penalty multiplier applied along divergent boundaries before riftDepth is carved.",
        default: 1.0,
      })
    ),
    /** Hill weight contributed by boundary closeness, forming foothill skirts near margins. */
    hillBoundaryWeight: Type.Optional(
      Type.Number({
        description: "Hill weight contributed by boundary closeness, forming foothill skirts near margins.",
        default: 0.35,
      })
    ),
    /** Hill bonus added beside rift valleys, creating uplifted shoulders. */
    hillRiftBonus: Type.Optional(
      Type.Number({
        description: "Hill bonus added beside rift valleys, creating uplifted shoulders.",
        default: 0.25,
      })
    ),
    /** Extra foothill weight on convergent tiles to smooth transitions into mountain ranges. */
    hillConvergentFoothill: Type.Optional(
      Type.Number({
        description: "Extra foothill weight on convergent tiles to smooth transitions into mountain ranges.",
        default: 0.35,
      })
    ),
    /**
     * Penalty for hills deep inside plates; higher values keep hills near tectonic features.
     *
     * Applied as a multiplier that scales with distance from plate boundaries.
     */
    hillInteriorFalloff: Type.Optional(
      Type.Number({
        description:
          "Penalty for hills deep inside plates; scales with distance from boundaries (higher = fewer interior hills).",
        default: 0.1,
      })
    ),
    /** Residual uplift contribution applied to hills so basins and foothills stay balanced. */
    hillUpliftWeight: Type.Optional(
      Type.Number({
        description: "Residual uplift contribution applied to hills so basins and foothills stay balanced.",
        default: 0.2,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Volcano placement controls combining plate-aware arcs and hotspot trails.
 */
const VolcanoesConfigSchema = Type.Object(
  {
    /** Master toggle for volcano placement. */
    enabled: Type.Optional(
      Type.Boolean({
        description: "Master toggle for volcano placement.",
        default: true,
      })
    ),
    /** Baseline volcanoes per land tile; higher density spawns more vents overall. */
    baseDensity: Type.Optional(
      Type.Number({
        description: "Baseline volcanoes per land tile; higher density spawns more vents overall.",
        default: 1 / 170,
      })
    ),
    /** Minimum Euclidean distance between volcanoes in tiles to avoid clusters merging. */
    minSpacing: Type.Optional(
      Type.Number({
        description: "Minimum Euclidean distance between volcanoes in tiles to avoid clusters merging.",
        default: 3,
      })
    ),
    /** Plate-boundary closeness threshold (0..1) for treating a tile as margin-adjacent. */
    boundaryThreshold: Type.Optional(
      Type.Number({
        description: "Plate-boundary closeness threshold (0..1) for treating a tile as margin-adjacent.",
        default: 0.35,
      })
    ),
    /** Base weight applied to tiles within the boundary band, biasing arcs over interiors. */
    boundaryWeight: Type.Optional(
      Type.Number({
        description: "Base weight applied to tiles within the boundary band, biasing arcs over interiors.",
        default: 1.2,
      })
    ),
    /** Weight multiplier for convergent boundaries; raises classic arc volcano density. */
    convergentMultiplier: Type.Optional(
      Type.Number({
        description: "Weight multiplier for convergent boundaries; raises classic arc volcano density.",
        default: 2.4,
      })
    ),
    /** Weight multiplier for transform boundaries; typically lower to avoid shear volcanism. */
    transformMultiplier: Type.Optional(
      Type.Number({
        description: "Weight multiplier for transform boundaries; typically lower to avoid shear volcanism.",
        default: 1.1,
      })
    ),
    /** Weight multiplier for divergent boundaries; keep small to prevent rift volcanism dominating. */
    divergentMultiplier: Type.Optional(
      Type.Number({
        description: "Weight multiplier for divergent boundaries; keep small to prevent rift volcanism dominating.",
        default: 0.35,
      })
    ),
    /** Weight contribution for interior hotspots; increases inland/shield volcano presence. */
    hotspotWeight: Type.Optional(
      Type.Number({
        description: "Weight contribution for interior hotspots; increases inland/shield volcano presence.",
        default: 0.12,
      })
    ),
    /** Penalty applied using shield stability; higher values suppress volcanoes on ancient cratons. */
    shieldPenalty: Type.Optional(
      Type.Number({
        description: "Penalty applied using shield stability; higher values suppress volcanoes on ancient cratons.",
        default: 0.6,
      })
    ),
    /** Random additive jitter per tile to break up deterministic patterns. */
    randomJitter: Type.Optional(
      Type.Number({
        description: "Random additive jitter per tile to break up deterministic patterns.",
        default: 0.08,
      })
    ),
    /** Minimum volcano count target to guarantee a few vents even on sparse maps. */
    minVolcanoes: Type.Optional(
      Type.Number({
        description: "Minimum volcano count target to guarantee a few vents even on sparse maps.",
        default: 5,
      })
    ),
    /** Maximum volcano count cap; set <=0 to disable the cap and allow density-driven totals. */
    maxVolcanoes: Type.Optional(
      Type.Number({
        description: "Maximum volcano count cap; set <=0 to disable the cap and allow density-driven totals.",
        default: 40,
      })
    ),
  },
  { additionalProperties: false }
);

export const MorphologyConfigSchema = Type.Object(
  {
    oceanSeparation: Type.Optional(OceanSeparationConfigSchema),
    coastlines: Type.Optional(CoastlinesConfigSchema),
    islands: Type.Optional(IslandsConfigSchema),
    mountains: Type.Optional(MountainsConfigSchema),
    volcanoes: Type.Optional(VolcanoesConfigSchema),
  },
  { additionalProperties: false }
);

export type MorphologyConfig = Static<typeof MorphologyConfigSchema>;
export type OceanSeparationEdgePolicy =
  Static<typeof MorphologyConfigSchema["properties"]["oceanSeparation"]["properties"]["edgeWest"]>;
export type OceanSeparationConfig =
  Static<typeof MorphologyConfigSchema["properties"]["oceanSeparation"]>;
export type CoastlinePlateBiasConfig =
  Static<typeof MorphologyConfigSchema["properties"]["coastlines"]["properties"]["plateBias"]>;
export type CoastlineBayConfig =
  Static<typeof MorphologyConfigSchema["properties"]["coastlines"]["properties"]["bay"]>;
export type CoastlineFjordConfig =
  Static<typeof MorphologyConfigSchema["properties"]["coastlines"]["properties"]["fjord"]>;
export type CoastlinesConfig =
  Static<typeof MorphologyConfigSchema["properties"]["coastlines"]>;
export type IslandsConfig =
  Static<typeof MorphologyConfigSchema["properties"]["islands"]>;
export type MountainsConfig =
  Static<typeof MorphologyConfigSchema["properties"]["mountains"]>;
export type VolcanoesConfig =
  Static<typeof MorphologyConfigSchema["properties"]["volcanoes"]>;

/**
 * Hotspot tuning used by story overlays.
 */
