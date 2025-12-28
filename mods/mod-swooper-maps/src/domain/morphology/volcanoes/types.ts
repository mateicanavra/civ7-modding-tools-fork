import type { VolcanoesConfig as BootstrapVolcanoesConfig } from "@mapgen/config";

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

