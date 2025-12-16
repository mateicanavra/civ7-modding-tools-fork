import type {
  LandmassConfig as BootstrapLandmassConfig,
  LandmassGeometry,
  LandmassGeometryPost,
  LandmassTectonicsConfig,
} from "../../../bootstrap/types.js";

export type { LandmassTectonicsConfig, LandmassGeometry, LandmassGeometryPost };

export type LandmassConfig = BootstrapLandmassConfig;
export type TectonicsConfig = LandmassTectonicsConfig;
export type GeometryConfig = LandmassGeometry;
export type GeometryPostConfig = LandmassGeometryPost;

export interface LandmassWindow {
  west: number;
  east: number;
  south: number;
  north: number;
  continent: number;
}

export interface CreateLandmassesOptions {
  landmassCfg?: Partial<LandmassConfig>;
  geometry?: GeometryConfig;
}

export interface LandmassGenerationResult {
  windows: LandmassWindow[];
  startRegions?: {
    westContinent?: LandmassWindow;
    eastContinent?: LandmassWindow;
  };
  landMask: Uint8Array;
  landTiles?: number;
  threshold?: number;
}

export interface PlateStats {
  plateId: number;
  count: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CrustSummary {
  continentalPlateIds: number[];
  oceanicPlateIds: number[];
  continentalArea: number;
  oceanicArea: number;
}

export interface AreaCrustResult extends CrustSummary {
  crustTypes: Uint8Array;
}

export interface CrustFirstResult {
  mode: "legacy" | "area";
  landMask: Uint8Array;
  landTiles: number;
  seaLevel: number;
  plateCount: number;
  continentalPlates: number;
  continentalPlateIds: number[];
  oceanicPlateIds: number[];
  continentalArea: number;
  oceanicArea: number;
  targetLandTiles: number;
  baseHeightRange: { min: number; max: number };
  crustConfigApplied: {
    mode: "legacy" | "area";
    continentalFraction: number;
    clusteringBias: number;
    microcontinentChance: number;
    edgeBlend: number;
    noiseAmplitude: number;
    continentalHeight: number;
    oceanicHeight: number;
  };
}

