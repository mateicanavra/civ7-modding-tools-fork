import type { VolcanoesConfig as BootstrapVolcanoesConfig } from "@mapgen/bootstrap/types.js";

export type VolcanoesConfig = BootstrapVolcanoesConfig;

export interface VolcanoCandidate {
  x: number;
  y: number;
  weight: number;
  closeness: number;
  boundaryType: number;
}

export interface PlacedVolcano {
  x: number;
  y: number;
}

