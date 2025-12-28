import type { EngineAdapter } from "@civ7/adapter";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type {
  OceanSeparationConfig,
  OceanSeparationEdgePolicy,
} from "@mapgen/config";
import type { LandmassWindow } from "@mapgen/domain/morphology/landmass/types.js";

export type { LandmassWindow };
export type OceanSeparationPolicy = OceanSeparationConfig;
export type { OceanSeparationEdgePolicy };

export interface PlateAwareOceanSeparationParams {
  width: number;
  height: number;
  windows: ReadonlyArray<Partial<LandmassWindow>>;
  landMask?: Uint8Array | null;
  context?: ExtendedMapContext | null;
  adapter?: Pick<EngineAdapter, "setTerrainType"> | null;
  policy?: OceanSeparationPolicy | null;
}

export interface PlateAwareOceanSeparationResult {
  windows: LandmassWindow[];
  landMask?: Uint8Array;
}

export interface RowState {
  index: number;
  west: Int16Array;
  east: Int16Array;
  south: number;
  north: number;
  continent: number;
}

export type SetTerrainFn = (x: number, y: number, terrain: number, isLand: boolean) => void;
