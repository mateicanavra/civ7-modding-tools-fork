import type { FeatureKey } from "../plan-feature-placements/schema.js";

export type ReefEmbellishmentsInput = {
  width: number;
  height: number;
  seed: number;
  landMask: Uint8Array;
  featureKeyField: Int16Array;
  paradiseMask: Uint8Array;
  passiveShelfMask: Uint8Array;
};

export type ReefEmbellishmentPlacement = {
  x: number;
  y: number;
  feature: FeatureKey;
};
