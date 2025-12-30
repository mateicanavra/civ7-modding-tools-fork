import type { BiomeThresholds } from "../classification/types.js";
import type { NarrativePolicy } from "../classification/overlay.js";

export interface BiomeConfig {
  thresholds?: BiomeThresholds;
  narrative?: Partial<NarrativePolicy>;
}

export interface CorridorPolicy {
  land?: {
    biomesBiasStrength?: number;
  };
  river?: {
    biomesBiasStrength?: number;
  };
}

export interface BiomeGlobals {
  tundra: number;
  tropical: number;
  grassland: number;
  plains: number;
  desert: number;
  snow: number;
}
