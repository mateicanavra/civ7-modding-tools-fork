import type { EngineAdapter } from "@civ7/adapter";

export type FeaturePlacement = {
  x: number;
  y: number;
  feature: number;
};

export type FeaturesPlacementInput = {
  width: number;
  height: number;
  adapter: EngineAdapter;
  biomeIndex: Uint8Array;
  vegetationDensity: Float32Array;
  effectiveMoisture: Float32Array;
  surfaceTemperature: Float32Array;
  rand: (label: string, max: number) => number;
};
