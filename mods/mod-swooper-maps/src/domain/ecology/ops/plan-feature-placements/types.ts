import type { FeatureKey } from "./schema.js";

export type FeaturePlacement = {
  x: number;
  y: number;
  feature: FeatureKey;
};

export type FeaturesPlacementInput = {
  width: number;
  height: number;
  seed: number;
  biomeIndex: Uint8Array;
  vegetationDensity: Float32Array;
  effectiveMoisture: Float32Array;
  surfaceTemperature: Float32Array;
  aridityIndex: Float32Array;
  freezeIndex: Float32Array;
  landMask: Uint8Array;
  terrainType: Uint8Array;
  latitude: Float32Array;
  featureKeyField: Int16Array;
  naturalWonderMask: Uint8Array;
  nearRiverMask: Uint8Array;
  isolatedRiverMask: Uint8Array;
  navigableRiverTerrain: number;
  coastTerrain: number;
};
