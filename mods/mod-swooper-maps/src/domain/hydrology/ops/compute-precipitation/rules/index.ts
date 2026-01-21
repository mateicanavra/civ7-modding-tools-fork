import { idx } from "@swooper/mapgen-core/lib/grid";

export function clampRainfall(rainfall: number): number {
  return Math.max(0, Math.min(200, rainfall));
}

export function rainfallToHumidityU8(rainfall: number): number {
  const rf = clampRainfall(rainfall);
  return (Math.max(0, Math.min(255, Math.round((rf / 200) * 255))) | 0) & 0xff;
}

export function computeDistanceToWater(width: number, height: number, landMask: Uint8Array): Int16Array {
  const total = Math.max(0, width * height);
  const dist = new Int16Array(total);
  dist.fill(-1);
  const queueX: number[] = [];
  const queueY: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      if (landMask[i] === 0) {
        dist[i] = 0;
        queueX.push(x);
        queueY.push(y);
      }
    }
  }

  let head = 0;
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const;

  while (head < queueX.length) {
    const cx = queueX[head];
    const cy = queueY[head];
    head++;
    const baseIdx = idx(cx, cy, width);
    const baseDist = dist[baseIdx];

    for (let i = 0; i < offsets.length; i++) {
      const dx = offsets[i][0];
      const dy = offsets[i][1];
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const ni = idx(nx, ny, width);
      if (dist[ni] !== -1) continue;
      dist[ni] = baseDist + 1;
      queueX.push(nx);
      queueY.push(ny);
    }
  }

  return dist;
}

export function upwindOffset(
  u: number,
  v: number,
  absLatDeg: number
): { dx: number; dy: number } {
  if (Math.abs(u) >= Math.abs(v)) {
    if (u !== 0) return { dx: u > 0 ? 1 : -1, dy: 0 };
  } else if (v !== 0) {
    return { dx: 0, dy: v > 0 ? 1 : -1 };
  }
  return absLatDeg < 30 || absLatDeg >= 60 ? { dx: -1, dy: 0 } : { dx: 1, dy: 0 };
}

export function upwindBarrierDistance(
  x: number,
  y: number,
  width: number,
  height: number,
  elevation: Int16Array,
  landMask: Uint8Array,
  windU: Int8Array,
  windV: Int8Array,
  latitudeByRow: Float32Array,
  steps: number,
  options: { barrierElevationM: number }
): number {
  let cx = x;
  let cy = y;
  const maxSteps = Math.max(1, steps | 0);

  for (let s = 1; s <= maxSteps; s++) {
    const i = idx(cx, cy, width);
    const absLat = Math.abs(latitudeByRow[cy] ?? 0);
    const dir = upwindOffset(windU[i] | 0, windV[i] | 0, absLat);
    const nx = cx + dir.dx;
    const ny = cy + dir.dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;

    const ni = idx(nx, ny, width);
    if (landMask[ni] === 1) {
      if ((elevation[ni] | 0) >= options.barrierElevationM) {
        return s;
      }
    }

    cx = nx;
    cy = ny;
  }

  return 0;
}

export function isAdjacentToRivers(
  x: number,
  y: number,
  width: number,
  height: number,
  riverAdjacency: Uint8Array,
  radius: number
): boolean {
  const r = Math.max(1, radius | 0);
  if (r === 1) return riverAdjacency[idx(x, y, width)] === 1;

  const rr = r - 1;
  for (let dy = -rr; dy <= rr; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    for (let dx = -rr; dx <= rr; dx++) {
      const nx = x + dx;
      if (nx < 0 || nx >= width) continue;
      if (riverAdjacency[idx(nx, ny, width)] === 1) return true;
    }
  }
  return false;
}

export function isLowBasinClosed(
  x: number,
  y: number,
  width: number,
  height: number,
  elevation: Int16Array,
  radius: number,
  openThresholdM: number
): boolean {
  const elev = elevation[idx(x, y, width)] | 0;
  const basinRadius = Math.max(1, radius | 0);
  const threshold = Math.max(0, openThresholdM | 0);

  for (let dy = -basinRadius; dy <= basinRadius; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    for (let dx = -basinRadius; dx <= basinRadius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      if (nx < 0 || nx >= width) continue;
      if ((elevation[idx(nx, ny, width)] | 0) < elev + threshold) return false;
    }
  }
  return true;
}
