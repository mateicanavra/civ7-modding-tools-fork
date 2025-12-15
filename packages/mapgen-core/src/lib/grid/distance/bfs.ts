import { inBounds } from "../bounds.js";

export interface DistanceTransformOptions {
  neighbors?: readonly (readonly [number, number])[];
}

const DEFAULT_NEIGHBORS_8: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

export function distanceTransform(
  width: number,
  height: number,
  isSource: (x: number, y: number) => boolean,
  options: DistanceTransformOptions = {}
): Int16Array {
  const total = Math.max(0, width * height);
  const dist = new Int16Array(total);
  dist.fill(-1);

  const queueX: number[] = [];
  const queueY: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isSource(x, y)) {
        const i = y * width + x;
        dist[i] = 0;
        queueX.push(x);
        queueY.push(y);
      }
    }
  }

  const offsets = options.neighbors ?? DEFAULT_NEIGHBORS_8;
  let head = 0;

  while (head < queueX.length) {
    const cx = queueX[head];
    const cy = queueY[head];
    head++;

    const baseIdx = cy * width + cx;
    const baseDist = dist[baseIdx];

    for (const [dx, dy] of offsets) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      const i = ny * width + nx;
      if (dist[i] !== -1) continue;
      dist[i] = baseDist + 1;
      queueX.push(nx);
      queueY.push(ny);
    }
  }

  return dist;
}

