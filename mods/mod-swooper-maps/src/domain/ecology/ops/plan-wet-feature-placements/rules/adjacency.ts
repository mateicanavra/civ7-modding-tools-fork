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

export function isCoastalLand(
  isWater: (x: number, y: number) => boolean,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number
): boolean {
  if (isWater(x, y)) return false;
  for (let dy = -radius; dy <= radius; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      if (nx < 0 || nx >= width) continue;
      if (dx === 0 && dy === 0) continue;
      if (isWater(nx, ny)) return true;
    }
  }
  return false;
}

