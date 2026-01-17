import type { ClimateConfig as BootstrapClimateConfig } from "@mapgen/domain/config";

export type ClimateConfig = BootstrapClimateConfig;

export interface ClimateRuntime {
  adapter: ClimateAdapter;
  readRainfall: (x: number, y: number) => number;
  writeRainfall: (x: number, y: number, rainfall: number) => void;
  rand: (max: number, label: string) => number;
  idx: (x: number, y: number) => number;
}

export interface ClimateAdapter {
  isWater: (x: number, y: number) => boolean;
  isMountain: (x: number, y: number) => boolean;
  /** Optional - when undefined, climate code uses local neighborhood fallback */
  isCoastalLand?: (x: number, y: number) => boolean;
  isAdjacentToRivers: (x: number, y: number, radius: number) => boolean;
  getRainfall: (x: number, y: number) => number;
  setRainfall: (x: number, y: number, rf: number) => void;
  getElevation: (x: number, y: number) => number;
  getLatitude: (x: number, y: number) => number;
  getRandomNumber: (max: number, label: string) => number;
}

export interface OrogenyCache {
  windward?: Set<string>;
  lee?: Set<string>;
}
