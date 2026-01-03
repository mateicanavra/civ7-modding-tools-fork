import type { FeatureKey } from "../plan-feature-placements/schema.js";

export type VegetationEmbellishmentsInput = {
  width: number;
  height: number;
  seed: number;
  landMask: Uint8Array;
  terrainType: Uint8Array;
  featureKeyField: Int16Array;
  biomeIndex: Uint8Array;
  rainfall: Uint8Array;
  vegetationDensity: Float32Array;
  elevation: Int16Array;
  latitude: Float32Array;
  volcanicMask: Uint8Array;
  navigableRiverTerrain: number;
};

export type VegetationEmbellishmentPlacement = {
  x: number;
  y: number;
  feature: FeatureKey;
};
