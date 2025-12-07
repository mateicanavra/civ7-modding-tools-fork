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

export interface LandmassConfig {
  baseWaterPercent?: number;
  geometry?: LandmassGeometry;
  [key: string]: unknown;
}

export interface LandmassGeometry {
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
