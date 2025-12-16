import { wrapX } from "../wrap.js";

const OFFSETS_ODD: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, 1],
  [1, 1],
];

const OFFSETS_EVEN: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
];

export function getHexNeighborIndicesOddQ(x: number, y: number, width: number, height: number): number[] {
  const isOddCol = (x & 1) === 1;
  const offsets = isOddCol ? OFFSETS_ODD : OFFSETS_EVEN;
  const indices: number[] = [];

  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    const wrappedX = wrapX(nx, width);
    indices.push(ny * width + wrappedX);
  }

  return indices;
}

export function forEachHexNeighborOddQ(
  x: number,
  y: number,
  width: number,
  height: number,
  fn: (nx: number, ny: number) => void
): void {
  const isOddCol = (x & 1) === 1;
  const offsets = isOddCol ? OFFSETS_ODD : OFFSETS_EVEN;

  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    fn(wrapX(nx, width), ny);
  }
}

