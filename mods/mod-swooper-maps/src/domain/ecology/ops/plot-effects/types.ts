import type { EngineAdapter } from "@civ7/adapter";

export type PlotEffectPlacement = {
  x: number;
  y: number;
  plotEffectType: number;
};

export type PlotEffectsInput = {
  width: number;
  height: number;
  adapter: EngineAdapter;
  biomeIndex: Uint8Array;
  vegetationDensity: Float32Array;
  effectiveMoisture: Float32Array;
  surfaceTemperature: Float32Array;
  aridityIndex: Float32Array;
  freezeIndex: Float32Array;
  elevation: Int16Array;
  rand: (label: string, max: number) => number;
};
