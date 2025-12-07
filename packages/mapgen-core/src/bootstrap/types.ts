/**
 * Bootstrap Module Types
 *
 * Type definitions for configuration and bootstrap system.
 */

// ============================================================================
// Runtime Configuration Types
// ============================================================================

/** Per-map configuration object */
export interface MapConfig {
  /** Optional preset names to apply (in order) */
  presets?: string[];
  /** Stage configuration providers */
  stageConfig?: Record<string, boolean>;
  /** Toggle overrides */
  toggles?: Partial<Toggles>;
  /** Landmass configuration */
  landmass?: Partial<LandmassConfig>;
  /** Foundation configuration */
  foundation?: Partial<FoundationConfig>;
  /** Climate configuration */
  climate?: Partial<ClimateConfig>;
  /** Stage manifest */
  stageManifest?: Partial<StageManifest>;
  /** Other arbitrary config groups */
  [key: string]: unknown;
}

// ============================================================================
// Toggle Types
// ============================================================================

export interface Toggles {
  STORY_ENABLE_HOTSPOTS: boolean;
  STORY_ENABLE_RIFTS: boolean;
  STORY_ENABLE_OROGENY: boolean;
  STORY_ENABLE_SWATCHES: boolean;
  STORY_ENABLE_PALEO: boolean;
  STORY_ENABLE_CORRIDORS: boolean;
  [key: string]: boolean;
}

// ============================================================================
// Landmass Types
// ============================================================================

/** Tectonic noise configuration for landmass generation */
export interface LandmassTectonicsConfig {
  /** Weight for plate interior noise (0-1) */
  interiorNoiseWeight?: number;
  /** Weight for boundary arc influence (0-2) */
  boundaryArcWeight?: number;
  /** Noise weight for boundary arc (0-1) */
  boundaryArcNoiseWeight?: number;
  /** Fractal grain size (1-32) */
  fractalGrain?: number;
}

/** Geometry post-processing configuration */
export interface LandmassGeometryPost {
  /** Tiles to expand all sides */
  expandTiles?: number;
  /** Tiles to expand west side */
  expandWestTiles?: number;
  /** Tiles to expand east side */
  expandEastTiles?: number;
  /** Minimum west boundary clamp */
  clampWestMin?: number;
  /** Maximum east boundary clamp */
  clampEastMax?: number;
  /** Override south boundary */
  overrideSouth?: number;
  /** Override north boundary */
  overrideNorth?: number;
  /** Minimum width in tiles */
  minWidthTiles?: number;
}

/** Landmass geometry configuration */
export interface LandmassGeometry {
  /** Post-processing adjustments */
  post?: LandmassGeometryPost;
  [key: string]: unknown;
}

/** Landmass generation configuration */
export interface LandmassConfig {
  /** Base water percentage (0-100) */
  baseWaterPercent?: number;
  /** Water scalar multiplier (0.25-1.75) */
  waterScalar?: number;
  /** Boundary bias for land placement (0-0.4) */
  boundaryBias?: number;
  /** Target share of land on boundaries (0-1) */
  boundaryShareTarget?: number;
  /** Tectonic noise configuration */
  tectonics?: LandmassTectonicsConfig;
  /** Geometry configuration */
  geometry?: LandmassGeometry;
  [key: string]: unknown;
}

// ============================================================================
// Foundation Types
// ============================================================================

export interface FoundationConfig {
  seed?: FoundationSeedConfig;
  plates?: FoundationPlatesConfig;
  dynamics?: FoundationDynamicsConfig;
  surface?: FoundationSurfaceConfig;
  policy?: FoundationPolicyConfig;
  diagnostics?: FoundationDiagnosticsConfig;
  /** Ocean separation policy */
  oceanSeparation?: OceanSeparationConfig;
  /** Coastlines layer configuration */
  coastlines?: CoastlinesConfig;
  /** Islands layer configuration */
  islands?: IslandsConfig;
  /** Mountains layer configuration */
  mountains?: MountainsConfig;
  /** Volcanoes layer configuration */
  volcanoes?: VolcanoesConfig;
  /** Story system configuration */
  story?: StoryConfig;
  /** Corridor policy configuration */
  corridors?: CorridorsConfig;
  [key: string]: unknown;
}

export interface FoundationSeedConfig {
  mode?: "engine" | "fixed";
  fixedSeed?: number;
  offset?: number;
  [key: string]: unknown;
}

export interface FoundationPlatesConfig {
  count?: number;
  relaxationSteps?: number;
  convergenceMix?: number;
  plateRotationMultiple?: number;
  seedMode?: "engine" | "fixed";
  fixedSeed?: number;
  seedOffset?: number;
  [key: string]: unknown;
}

export interface FoundationDynamicsConfig {
  mantle?: {
    bumps?: number;
    amplitude?: number;
    scale?: number;
  };
  wind?: {
    jetStreaks?: number;
    jetStrength?: number;
    variance?: number;
  };
  directionality?: FoundationDirectionalityConfig;
  [key: string]: unknown;
}

export interface FoundationDirectionalityConfig {
  cohesion?: number;
  primaryAxes?: {
    plateAxisDeg?: number;
    windBiasDeg?: number;
    currentBiasDeg?: number;
  };
  variability?: {
    angleJitterDeg?: number;
    magnitudeVariance?: number;
  };
  hemispheres?: {
    southernFlip?: boolean;
  };
  interplay?: {
    windsFollowPlates?: number;
    currentsFollowWinds?: number;
  };
  [key: string]: unknown;
}

export interface FoundationSurfaceConfig {
  landmass?: LandmassConfig;
  oceanSeparation?: FoundationOceanSeparationConfig;
  [key: string]: unknown;
}

export interface FoundationPolicyConfig {
  oceanSeparation?: FoundationOceanSeparationConfig;
  [key: string]: unknown;
}

export interface FoundationOceanSeparationConfig {
  [key: string]: unknown;
}

export interface FoundationDiagnosticsConfig {
  [key: string]: unknown;
}

// ============================================================================
// Ocean Separation Types
// ============================================================================

/** Ocean separation edge policy */
export interface OceanSeparationEdgePolicy {
  enabled?: boolean;
  baseTiles?: number;
  boundaryClosenessMultiplier?: number;
  maxPerRowDelta?: number;
}

/** Ocean separation policy configuration */
export interface OceanSeparationConfig {
  enabled?: boolean;
  bandPairs?: Array<[number, number]>;
  baseSeparationTiles?: number;
  boundaryClosenessMultiplier?: number;
  maxPerRowDelta?: number;
  edgeWest?: OceanSeparationEdgePolicy;
  edgeEast?: OceanSeparationEdgePolicy;
}

// ============================================================================
// Coastlines Types
// ============================================================================

/** Coastline plate bias configuration */
export interface CoastlinePlateBiasConfig {
  threshold?: number;
  power?: number;
  convergent?: number;
  transform?: number;
  divergent?: number;
  interior?: number;
  bayWeight?: number;
  bayNoiseBonus?: number;
  fjordWeight?: number;
}

/** Bay carving configuration */
export interface CoastlineBayConfig {
  noiseGateAdd?: number;
  rollDenActive?: number;
  rollDenDefault?: number;
}

/** Fjord generation configuration */
export interface CoastlineFjordConfig {
  baseDenom?: number;
  activeBonus?: number;
  passiveBonus?: number;
}

/** Coastlines layer configuration */
export interface CoastlinesConfig {
  bay?: CoastlineBayConfig;
  fjord?: CoastlineFjordConfig;
  plateBias?: CoastlinePlateBiasConfig;
  minSeaLaneWidth?: number;
}

// ============================================================================
// Islands Types
// ============================================================================

/** Islands layer configuration */
export interface IslandsConfig {
  fractalThresholdPercent?: number;
  minDistFromLandRadius?: number;
  baseIslandDenNearActive?: number;
  baseIslandDenElse?: number;
  hotspotSeedDenom?: number;
  clusterMax?: number;
}

// ============================================================================
// Mountains Types
// ============================================================================

/** Mountains layer configuration */
export interface MountainsConfig {
  tectonicIntensity?: number;
  mountainThreshold?: number;
  hillThreshold?: number;
  upliftWeight?: number;
  fractalWeight?: number;
  riftDepth?: number;
  boundaryWeight?: number;
  boundaryExponent?: number;
  interiorPenaltyWeight?: number;
  convergenceBonus?: number;
  transformPenalty?: number;
  riftPenalty?: number;
  hillBoundaryWeight?: number;
  hillRiftBonus?: number;
  hillConvergentFoothill?: number;
  hillInteriorFalloff?: number;
  hillUpliftWeight?: number;
}

// ============================================================================
// Volcanoes Types
// ============================================================================

/** Volcanoes layer configuration */
export interface VolcanoesConfig {
  enabled?: boolean;
  baseDensity?: number;
  minSpacing?: number;
  boundaryThreshold?: number;
  boundaryWeight?: number;
  convergentMultiplier?: number;
  transformMultiplier?: number;
  divergentMultiplier?: number;
  hotspotWeight?: number;
  shieldPenalty?: number;
  randomJitter?: number;
  minVolcanoes?: number;
  maxVolcanoes?: number;
}

// ============================================================================
// Story Types
// ============================================================================

/** Hotspot story tunables */
export interface HotspotTunables {
  paradiseBias?: number;
  volcanicBias?: number;
  volcanicPeakChance?: number;
}

/** Story system configuration */
export interface StoryConfig {
  hotspot?: HotspotTunables;
  [key: string]: unknown;
}

// ============================================================================
// Corridors Types
// ============================================================================

/** Sea corridor policy */
export interface SeaCorridorPolicy {
  protection?: "hard" | "soft";
  softChanceMultiplier?: number;
  avoidRadius?: number;
}

/** Corridors configuration */
export interface CorridorsConfig {
  sea?: SeaCorridorPolicy;
  [key: string]: unknown;
}

// ============================================================================
// Climate Types
// ============================================================================

export interface ClimateConfig {
  baseline?: ClimateBaseline;
  refine?: ClimateRefine;
  swatches?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ClimateBaseline {
  bands?: Record<string, unknown>;
  blend?: Record<string, unknown>;
  orographic?: Record<string, unknown>;
  coastal?: Record<string, unknown>;
  noise?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ClimateRefine {
  waterGradient?: Record<string, unknown>;
  orographic?: Record<string, unknown>;
  riverCorridor?: Record<string, unknown>;
  lowBasin?: Record<string, unknown>;
  pressure?: Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================================
// Stage Manifest Types
// ============================================================================

export interface StageManifest {
  order: string[];
  stages: Record<string, StageDescriptor>;
}

export interface StageDescriptor {
  enabled?: boolean;
  requires?: string[];
  provides?: string[];
  legacyToggles?: string[];
  blockedBy?: string;
}

export type StageName = string;

// ============================================================================
// Tunables Snapshot Types
// ============================================================================

export interface TunablesSnapshot {
  STAGE_MANIFEST: Readonly<StageManifest>;
  STORY_ENABLE_HOTSPOTS: boolean;
  STORY_ENABLE_RIFTS: boolean;
  STORY_ENABLE_OROGENY: boolean;
  STORY_ENABLE_SWATCHES: boolean;
  STORY_ENABLE_PALEO: boolean;
  STORY_ENABLE_CORRIDORS: boolean;
  LANDMASS_CFG: Readonly<LandmassConfig>;
  FOUNDATION_CFG: Readonly<FoundationConfig>;
  FOUNDATION_PLATES: Readonly<FoundationPlatesConfig>;
  FOUNDATION_DYNAMICS: Readonly<FoundationDynamicsConfig>;
  FOUNDATION_DIRECTIONALITY: Readonly<FoundationDirectionalityConfig>;
  CLIMATE_CFG: Readonly<ClimateConfig>;
  [key: string]: unknown;
}
