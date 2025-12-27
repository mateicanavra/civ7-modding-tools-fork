/**
 * Foundation Module Types
 *
 * Type definitions for plate tectonics, Voronoi diagrams, and foundation simulation.
 * These types allow the algorithms to be tested independently of the game engine.
 */

/// <reference types="@civ7/types" />

// ============================================================================
// Voronoi and Spatial Types
// ============================================================================

/** 2D point/vector */
export interface Point2D {
  x: number;
  y: number;
}

/** Voronoi cell site (seed point) */
export interface VoronoiSite extends Point2D {
  voronoiId?: number;
}

/** Voronoi cell with edges and site */
export interface VoronoiCell {
  site: VoronoiSite;
  halfedges: VoronoiHalfEdge[];
}

/** Voronoi half-edge for cell boundaries */
export interface VoronoiHalfEdge {
  getStartpoint(): Point2D;
  getEndpoint(): Point2D;
}

/** Voronoi diagram result */
export interface VoronoiDiagram {
  cells: VoronoiCell[];
  edges: unknown[];
  vertices: Point2D[];
}

/** Bounding box for Voronoi computation */
export interface BoundingBox {
  xl: number; // left
  xr: number; // right
  yt: number; // top
  yb: number; // bottom
}

// ============================================================================
// Plate Tectonics Types
// ============================================================================

/** Boundary type enumeration */
export const BOUNDARY_TYPE = {
  none: 0,
  convergent: 1,
  divergent: 2,
  transform: 3,
} as const;

export type BoundaryType = (typeof BOUNDARY_TYPE)[keyof typeof BOUNDARY_TYPE];
export type BoundaryTypeName = keyof typeof BOUNDARY_TYPE;

/** Plate region with movement vectors */
export interface PlateRegion {
  name: string;
  id: number;
  type: number;
  maxArea: number;
  color: { x: number; y: number; z: number };
  seedLocation: Point2D;
  m_movement: Point2D;
  m_rotation: number;
}

/** Region cell for spatial partitioning */
export interface RegionCell {
  cell: VoronoiCell;
  id: number;
  area: number;
  plateId: number;
}

/** Plate generation configuration */
export interface PlateConfig {
  /** Number of plates to generate */
  count: number;
  /** Lloyd relaxation iterations (default 5) */
  relaxationSteps?: number;
  /** 0..1, ratio of convergent vs divergent boundaries */
  convergenceMix?: number;
  /** Multiplier for plate rotation influence */
  plateRotationMultiple?: number;
  /** Optional directionality config */
  directionality?: DirectionalityConfig | null;
  /** Use Civ's seed (engine) or a fixed seed value (fixed) */
  seedMode?: "engine" | "fixed";
  /** Seed value when seedMode is "fixed" */
  fixedSeed?: number;
  /** Integer offset applied to the chosen base seed */
  seedOffset?: number;
}

/** Directionality configuration for plates/winds/currents */
export interface DirectionalityConfig {
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
}

/** Result of plate generation */
export interface PlateGenerationResult {
  /** Plate assignment per tile */
  plateId: Int16Array;
  /** 0..255, higher near boundaries */
  boundaryCloseness: Uint8Array;
  /** BOUNDARY_TYPE values */
  boundaryType: Uint8Array;
  /** 0..255, tracks boundary closeness */
  tectonicStress: Uint8Array;
  /** 0..255, high at convergent boundaries */
  upliftPotential: Uint8Array;
  /** 0..255, high at divergent boundaries */
  riftPotential: Uint8Array;
  /** 0..255, inverse of stress (plate interiors) */
  shieldStability: Uint8Array;
  /** -127..127, horizontal plate movement */
  plateMovementU: Int8Array;
  /** -127..127, vertical plate movement */
  plateMovementV: Int8Array;
  /** -127..127, plate rotation value */
  plateRotation: Int8Array;
  /** Deprecated: tile-precise boundaries used instead */
  boundaryTree: null;
  /** Array of PlateRegion instances */
  plateRegions: PlateRegion[];
  /** Generation metadata */
  meta?: PlateGenerationMeta;
}

/** Metadata from plate generation */
export interface PlateGenerationMeta {
  width: number;
  height: number;
  config: Partial<PlateConfig>;
  seedLocations: Array<{ id: number; x: number; y: number }>;
  boundaryStats?: BoundaryStats;
  generationAttempts?: Array<{
    params: Record<string, unknown>;
    boundaryStats: BoundaryStats;
  }>;
}

/** Statistics about boundary coverage */
export interface BoundaryStats {
  boundaryTileShare: number;
  boundaryInfluenceShare: number;
  avgCloseness: number;
  avgInfluenceCloseness: number;
  maxCloseness: number;
  boundaryTiles: number;
  influencedTiles: number;
  totalTiles: number;
}

// ============================================================================
// Seed Management Types
// ============================================================================

/** RNG state snapshot */
export interface RngState {
  state?: bigint | number;
  inc?: bigint | number;
  [key: string]: unknown;
}

/** Seed capture snapshot */
export interface SeedSnapshot {
  width: number;
  height: number;
  seedMode: "engine" | "fixed";
  seedOffset?: number;
  fixedSeed?: number;
  timestamp?: number;
  seed?: number;
  rngState?: Readonly<RngState>;
  config?: Readonly<Partial<PlateConfig>>;
  seedLocations?: ReadonlyArray<{ id: number; x: number; y: number }>;
  sites?: ReadonlyArray<{ id: number; x: number; y: number }>;
}

/** Seed capture result */
export interface SeedCaptureResult {
  snapshot: Readonly<SeedSnapshot>;
  restore: (() => void) | null;
}

// ============================================================================
// Dependency Injection Types (for testability)
// ============================================================================

/** Voronoi utilities interface for dependency injection */
export interface VoronoiUtilsInterface {
  createRandomSites(count: number, width: number, height: number): VoronoiSite[];
  computeVoronoi(
    sites: VoronoiSite[],
    bbox: BoundingBox,
    relaxationSteps?: number
  ): VoronoiDiagram;
  calculateCellArea(cell: VoronoiCell): number;
  normalize(v: Point2D): Point2D;
}

/** RNG function type */
export type RngFunction = (max: number, label?: string) => number;
