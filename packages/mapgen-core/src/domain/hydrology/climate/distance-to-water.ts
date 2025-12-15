import type { ClimateAdapter } from "./types.js";

export function distanceToNearestWater(
  width: number,
  height: number,
  isWater: (x: number, y: number) => boolean
): Int16Array;
export function distanceToNearestWater(
  x: number,
  y: number,
  maxR: number,
  adapter: ClimateAdapter,
  width: number,
  height: number
): number;
export function distanceToNearestWater(
  a: number,
  b: number,
  c: number | ((x: number, y: number) => boolean),
  adapter?: ClimateAdapter,
  width?: number,
  height?: number
): Int16Array | number {
  if (typeof c === "function") {
    const widthVal = a;
    const heightVal = b;
    const isWaterFn = c;
    const total = Math.max(0, widthVal * heightVal);
    const dist = new Int16Array(total);
    dist.fill(-1);
    const queueX: number[] = [];
    const queueY: number[] = [];

    for (let y = 0; y < heightVal; y++) {
      for (let x = 0; x < widthVal; x++) {
        if (isWaterFn(x, y)) {
          const idx = y * widthVal + x;
          dist[idx] = 0;
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
    ];

    while (head < queueX.length) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;
      const baseIdx = cy * widthVal + cx;
      const baseDist = dist[baseIdx];

      for (let i = 0; i < offsets.length; i++) {
        const dx = offsets[i][0];
        const dy = offsets[i][1];
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= widthVal || ny < 0 || ny >= heightVal) continue;
        const idx = ny * widthVal + nx;
        if (dist[idx] !== -1) continue;
        dist[idx] = baseDist + 1;
        queueX.push(nx);
        queueY.push(ny);
      }
    }

    return dist;
  }

  const x = a;
  const y = b;
  const maxR = c as number;
  if (!adapter || width === undefined || height === undefined) {
    return -1;
  }

  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (adapter.isWater(nx, ny)) return r;
        }
      }
    }
  }
  return -1;
}

