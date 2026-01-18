import { Type, type Static } from "@swooper/mapgen-core/authoring";
import { EcologyConfigSchema } from "@mapgen/domain/ecology/config.js";

/**
 * Hotspot tuning used by story overlays.
 */
const HotspotTunablesSchema = Type.Object(
  {
    /**
     * Maximum hotspot trails to seed, before map-size scaling.
     * @default 12
     */
    maxTrails: Type.Optional(
      Type.Number({
        description: "Maximum hotspot trails to seed (pre-scaling).",
        default: 12,
        minimum: 0,
      })
    ),
    /**
     * Steps per trail (pre-scaling).
     * @default 15
     */
    steps: Type.Optional(
      Type.Number({
        description: "Steps per hotspot trail (pre-scaling).",
        default: 15,
        minimum: 1,
      })
    ),
    /**
     * Step length in tiles.
     * @default 2
     */
    stepLen: Type.Optional(
      Type.Number({
        description: "Step length in tiles for hotspot trails.",
        default: 2,
        minimum: 1,
      })
    ),
    /**
     * Minimum Manhattan distance from land for trail points.
     * @default 5
     */
    minDistFromLand: Type.Optional(
      Type.Number({
        description: "Minimum Manhattan distance from land for hotspot trail points (tiles).",
        default: 5,
        minimum: 0,
      })
    ),
    /**
     * Minimum Manhattan separation between seeded trails.
     * @default 12
     */
    minTrailSeparation: Type.Optional(
      Type.Number({
        description: "Minimum Manhattan separation between seeded hotspot trails (tiles).",
        default: 12,
        minimum: 1,
      })
    ),
    /** Bias applied to paradise hotspots when selecting overlays (unitless multiplier). */
    paradiseBias: Type.Optional(
      Type.Number({
        description: "Bias applied to paradise hotspots when selecting overlays (unitless multiplier).",
        default: 2,
      })
    ),
    /** Bias applied to volcanic hotspots when selecting overlays (unitless multiplier). */
    volcanicBias: Type.Optional(
      Type.Number({
        description: "Bias applied to volcanic hotspots when selecting overlays (unitless multiplier).",
        default: 1,
      })
    ),
    /** Chance that a volcanic hotspot contains a high peak suitable for story placement (0..1). */
    volcanicPeakChance: Type.Optional(
      Type.Number({
        description: "Chance that a volcanic hotspot contains a high peak suitable for story placement (0..1).",
        default: 0.33,
        minimum: 0,
        maximum: 1,
      })
    ),
  },
  { additionalProperties: false }
);



/**
 * Story orogeny belt tunables affecting windward/lee rainfall refinement.
 */
const OrogenyTunablesSchema = Type.Object(
  {
    /** Search radius (tiles) for windward/lee tagging around detected belts. */
    radius: Type.Optional(
      Type.Number({
        description: "Search radius (tiles) for windward/lee tagging around detected belts.",
        default: 2,
        minimum: 0,
      })
    ),
    /** Minimum belt size floor before windward/lee tagging is applied (tiles). */
    beltMinLength: Type.Optional(
      Type.Number({
        description:
          "Minimum belt size floor before windward/lee tagging is applied (tiles). Larger maps auto-scale this upward.",
        default: 30,
        minimum: 0,
      })
    ),
    /** Rainfall boost applied on windward belts (rainfall units). */
    windwardBoost: Type.Optional(
      Type.Number({
        description: "Rainfall boost applied on windward orogeny belts (rainfall units).",
        default: 5,
      })
    ),
    /** Multiplier applied to lee-side drying (>= 1.0). */
    leeDrynessAmplifier: Type.Optional(
      Type.Number({
        description: "Multiplier applied to lee-side drying (>= 1.0).",
        default: 1.2,
        minimum: 1,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Story rift valley tagging tunables.
 */
const RiftTunablesSchema = Type.Object(
  {
    /** Maximum rift valleys per map (pre-scaling). */
    maxRiftsPerMap: Type.Optional(
      Type.Number({
        description: "Maximum rift valleys per map (pre-scaling).",
        default: 3,
        minimum: 0,
      })
    ),
    /** Steps along each rift line (pre-scaling). */
    lineSteps: Type.Optional(
      Type.Number({
        description: "Steps along each rift line (pre-scaling).",
        default: 18,
        minimum: 1,
      })
    ),
    /** Step length for rift marching (tiles). */
    stepLen: Type.Optional(
      Type.Number({
        description: "Step length for rift marching (tiles).",
        default: 2,
        minimum: 1,
      })
    ),
    /** Shoulder width around rift lines (tiles). */
    shoulderWidth: Type.Optional(
      Type.Number({
        description: "Shoulder width around rift lines (tiles).",
        default: 1,
        minimum: 0,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Continental margin tagging parameters.
 *
 * Used by storyTagContinentalMargins() to decide how much coastline is tagged
 * as active vs passive margins.
 */
const ContinentalMarginsConfigSchema = Type.Object(
  {
    /** Fraction of coastal tiles to tag as active margins (0..1). */
    activeFraction: Type.Optional(
      Type.Number({
        description: "Fraction of coastal tiles to tag as active margins (0..1).",
        default: 0.25,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Fraction of coastal tiles to tag as passive shelves (0..1). */
    passiveFraction: Type.Optional(
      Type.Number({
        description: "Fraction of coastal tiles to tag as passive shelves (0..1).",
        default: 0.25,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Minimum contiguous coastline segment length to consider (tiles). */
    minSegmentLength: Type.Optional(
      Type.Number({
        description: "Minimum contiguous coastline segment length to consider (tiles).",
        default: 12,
        minimum: 0,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Aggregated story configuration controlling hotspots and localized features.
 */
const StoryConfigSchema = Type.Object(
  {
    /** Hotspot tuning for volcanic/paradise overlays. */
    hotspot: Type.Optional(HotspotTunablesSchema),
    /** Rift valley tagging knobs. */
    rift: Type.Optional(RiftTunablesSchema),
    /** Orogeny belt climate modifiers. */
    orogeny: Type.Optional(OrogenyTunablesSchema),
    /** Localized feature bonuses around story elements. */
    features: Type.Optional(EcologyConfigSchema.properties.features),
  },
  { additionalProperties: false }
);

/**
 * Policy governing how strategic sea corridors are protected or softened.
 */
const SeaCorridorPolicySchema = Type.Object(
  {
    /**
     * Protection mode for sea corridors.
     * - `'hard'` blocks all edits in corridors
     * - `'soft'` allows limited carving with penalties
     */
    protection: Type.Optional(
      Type.Union([Type.Literal("hard"), Type.Literal("soft")], {
        description: "Hard protection blocks edits in corridors; soft allows limited carving with penalties.",
        default: "hard",
      })
    ),
    /** Probability multiplier applied when protection is soft to keep lanes mostly open. */
    softChanceMultiplier: Type.Optional(
      Type.Number({
        description: "Probability multiplier applied when protection is soft to keep lanes mostly open.",
        default: 0.5,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Radius in tiles to avoid placing blocking features inside a sea corridor. */
    avoidRadius: Type.Optional(
      Type.Number({
        description: "Radius in tiles to avoid placing blocking features inside a sea corridor.",
        default: 2,
        minimum: 0,
      })
    ),
    /** Maximum sea lanes to tag. */
    maxLanes: Type.Optional(
      Type.Number({
        description: "Maximum sea lanes to tag (integer).",
        default: 3,
        minimum: 0,
      })
    ),
    /** Scan stride in tiles when searching for candidate lanes. */
    scanStride: Type.Optional(
      Type.Number({
        description: "Scan stride in tiles when searching for candidate lanes (integer).",
        default: 6,
        minimum: 1,
      })
    ),
    /** Minimum run length fraction relative to map dimension (0..1). */
    minLengthFrac: Type.Optional(
      Type.Number({
        description: "Minimum run length fraction relative to map dimension (0..1).",
        default: 0.7,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Whether diagonal lanes are eligible during tagging. */
    preferDiagonals: Type.Optional(
      Type.Boolean({
        description: "Whether diagonal lanes are eligible during tagging.",
        default: false,
      })
    ),
    /** Minimum spacing between accepted lanes (tiles). */
    laneSpacing: Type.Optional(
      Type.Number({
        description: "Minimum spacing between accepted lanes (tiles).",
        default: 6,
        minimum: 0,
      })
    ),
    /** Minimum required channel width for a tile to be considered part of a lane (tiles). */
    minChannelWidth: Type.Optional(
      Type.Number({
        description: "Minimum required channel width for a tile to be considered part of a lane (tiles).",
        default: 3,
        minimum: 1,
      })
    ),
  },
  { additionalProperties: false }
);

const IslandHopCorridorConfigSchema = Type.Object(
  {
    /** Whether island-hop corridors should be tagged from hotspots. */
    useHotspots: Type.Optional(
      Type.Boolean({
        description: "Whether island-hop corridors should be tagged from hotspots.",
        default: true,
      })
    ),
    /** Maximum hotspot arcs to tag (integer). */
    maxArcs: Type.Optional(
      Type.Number({
        description: "Maximum hotspot arcs to tag (integer).",
        default: 2,
        minimum: 0,
      })
    ),
  },
  { additionalProperties: false }
);

const LandCorridorConfigSchema = Type.Object(
  {
    /** Strength of biome biasing near land corridors (0..1). */
    biomesBiasStrength: Type.Optional(
      Type.Number({
        description: "Strength of biome biasing near land corridors (0..1).",
        default: 0.6,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Whether rift shoulders should seed land corridors. */
    useRiftShoulders: Type.Optional(
      Type.Boolean({
        description: "Whether rift shoulders should seed land corridors.",
        default: true,
      })
    ),
    /** Maximum land corridors to tag (integer). */
    maxCorridors: Type.Optional(
      Type.Number({
        description: "Maximum land corridors to tag (integer).",
        default: 2,
        minimum: 0,
      })
    ),
    /** Minimum contiguous run length required to tag a corridor (tiles). */
    minRunLength: Type.Optional(
      Type.Number({
        description: "Minimum contiguous run length required to tag a corridor (tiles).",
        default: 24,
        minimum: 0,
      })
    ),
    /** Minimum spacing between corridors (rows). */
    spacing: Type.Optional(
      Type.Number({
        description: "Minimum spacing between corridors (rows).",
        default: 0,
        minimum: 0,
      })
    ),
  },
  { additionalProperties: false }
);

/**
 * Strategic corridor configuration currently scoped to sea lanes.
 */
export const CorridorsConfigSchema = Type.Object(
  {
    /** Sea corridor protection policy for naval passage. */
    sea: Type.Optional(SeaCorridorPolicySchema),
    /** Land corridor tagging policy (rift-driven). */
    land: Type.Optional(LandCorridorConfigSchema),
    /** Island-hop corridor tagging policy (hotspot-driven). */
    islandHop: Type.Optional(IslandHopCorridorConfigSchema),
  },
  { additionalProperties: false }
);

export const NarrativeConfigSchema = Type.Object(
  {
    story: Type.Optional(StoryConfigSchema),
    corridors: Type.Optional(CorridorsConfigSchema),
    margins: Type.Optional(ContinentalMarginsConfigSchema),
  },
  { additionalProperties: false }
);

export type NarrativeConfig = Static<typeof NarrativeConfigSchema>;
export type StoryConfig = Static<typeof NarrativeConfigSchema["properties"]["story"]>;
export type CorridorsConfig = Static<typeof NarrativeConfigSchema["properties"]["corridors"]>;
export type ContinentalMarginsConfig =
  Static<typeof NarrativeConfigSchema["properties"]["margins"]>;
export type NarrativeHotspotTunables = Static<typeof HotspotTunablesSchema>;
export type RiftTunables =
  Static<typeof NarrativeConfigSchema["properties"]["story"]["properties"]["rift"]>;
export type OrogenyTunables =
  Static<typeof NarrativeConfigSchema["properties"]["story"]["properties"]["orogeny"]>;
export type SeaCorridorPolicy =
  Static<typeof NarrativeConfigSchema["properties"]["corridors"]["properties"]["sea"]>;
export type LandCorridorConfig =
  Static<typeof NarrativeConfigSchema["properties"]["corridors"]["properties"]["land"]>;
export type IslandHopCorridorConfig =
  Static<typeof NarrativeConfigSchema["properties"]["corridors"]["properties"]["islandHop"]>;

// ────────────────────────────────────────────────────────────────────────────
// Climate sub-schemas used by story-driven climate tuning
// ────────────────────────────────────────────────────────────────────────────

/**
 * Rainfall targets by latitude zone for the climate engine.
 * Values are rainfall units (0-200 typical range).
 */
