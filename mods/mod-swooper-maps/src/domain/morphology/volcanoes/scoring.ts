import { BOUNDARY_TYPE } from "@mapgen/domain/foundation/constants.js";

export function scoreVolcanoWeight(params: {
  closeness: number;
  boundaryType: number;
  hotspotBase: number;
  threshold: number;
  boundaryWeight: number;
  convergentMultiplier: number;
  transformMultiplier: number;
  divergentMultiplier: number;
}): number {
  const {
    closeness,
    boundaryType,
    hotspotBase,
    threshold,
    boundaryWeight,
    convergentMultiplier,
    transformMultiplier,
    divergentMultiplier,
  } = params;

  let weight = 0;

  if (closeness >= threshold) {
    const boundaryBand = (closeness - threshold) / Math.max(1e-3, 1 - threshold);
    const base = boundaryBand * Math.max(0, boundaryWeight);
    let multiplier = 1;
    if (boundaryType === BOUNDARY_TYPE.convergent) multiplier = Math.max(0, convergentMultiplier);
    else if (boundaryType === BOUNDARY_TYPE.transform) multiplier = Math.max(0, transformMultiplier);
    else if (boundaryType === BOUNDARY_TYPE.divergent) multiplier = Math.max(0, divergentMultiplier);
    weight += base * multiplier;
  } else {
    const interiorBand = 1 - closeness;
    weight += hotspotBase * interiorBand;
  }

  return weight;
}
