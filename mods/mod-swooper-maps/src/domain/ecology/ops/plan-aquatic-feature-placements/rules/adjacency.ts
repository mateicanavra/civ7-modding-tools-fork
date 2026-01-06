export function hasAdjacentFeatureType(
  featureField: Int16Array,
  width: number,
  height: number,
  x: number,
  y: number,
  featureIdx: number,
  radius: number
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      if (nx < 0 || nx >= width) continue;
      if (dx === 0 && dy === 0) continue;
      if (featureField[ny * width + nx] === featureIdx) return true;
    }
  }
  return false;
}

export function isAdjacentToShallowWater(
  getTerrainType: (x: number, y: number) => number,
  coastTerrain: number,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number
): boolean {
  if (coastTerrain < 0) return false;
  for (let dy = -radius; dy <= radius; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      if (nx < 0 || nx >= width) continue;
      if (dx === 0 && dy === 0) continue;
      if (getTerrainType(nx, ny) === coastTerrain) return true;
    }
  }
  return false;
}

