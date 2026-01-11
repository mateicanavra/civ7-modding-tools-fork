import type { ExtendedMapContext } from "@swooper/mapgen-core";

export function maskFromCoordSet(
  source: ReadonlySet<string> | null | undefined,
  width: number,
  height: number
): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (!source) return mask;

  for (const key of source) {
    const [xStr, yStr] = key.split(",");
    const x = Number.parseInt(xStr ?? "", 10);
    const y = Number.parseInt(yStr ?? "", 10);
    if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height) {
      mask[y * width + x] = 1;
    }
  }

  return mask;
}

export function combineCorridorMasks(
  corridorMask: Uint8Array,
  riverCorridorMask: Uint8Array
): Uint8Array {
  for (let i = 0; i < corridorMask.length; i++) {
    if (riverCorridorMask[i] === 1) corridorMask[i] = 1;
  }
  return corridorMask;
}

export function buildLatitudeField(
  adapter: ExtendedMapContext["adapter"],
  width: number,
  height: number
): Float32Array {
  const latitude = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      latitude[rowOffset + x] = adapter.getLatitude(x, y);
    }
  }
  return latitude;
}
