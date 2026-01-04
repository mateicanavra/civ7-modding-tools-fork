export interface SwatchTypeEntry {
  key: string;
  w: number;
}

export type SwatchTypeConfig = Record<string, number | boolean | undefined>;
export type SwatchTypesConfig = Record<string, SwatchTypeConfig>;

export interface SwatchRuntime {
  readRainfall: (x: number, y: number) => number;
  writeRainfall: (x: number, y: number, rf: number) => void;
  idx: (x: number, y: number) => number;
}

export interface SwatchHelpers {
  clamp200: (v: number) => number;
  isWater: (x: number, y: number) => boolean;
  isCoastalLand: (x: number, y: number) => boolean;
  signedLatitudeAt: (y: number) => number;
  getElevation: (x: number, y: number) => number;
  inLocalBounds: (x: number, y: number) => boolean;
}
