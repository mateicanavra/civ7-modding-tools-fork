import type { PlotEffectKey } from "./schema.js";

export type PlotEffectPlacement = {
  x: number;
  y: number;
  plotEffect: PlotEffectKey;
};

export type PlotEffectsInput = {
  width: number;
  height: number;
  seed: number;
  biomeIndex: Uint8Array;
  vegetationDensity: Float32Array;
  effectiveMoisture: Float32Array;
  surfaceTemperature: Float32Array;
  aridityIndex: Float32Array;
  freezeIndex: Float32Array;
  elevation: Int16Array;
  landMask: Uint8Array;
};
