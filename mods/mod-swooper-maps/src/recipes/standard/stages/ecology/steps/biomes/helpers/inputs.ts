/**
 * Builds a binary mask for tiles listed in a coordinate set.
 */
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

/**
 * Builds a latitude field by interpolating between env bounds.
 */
export function buildLatitudeField(
  latitudeBounds: { topLatitude: number; bottomLatitude: number },
  width: number,
  height: number
): Float32Array {
  const { topLatitude, bottomLatitude } = latitudeBounds;
  const latitude = new Float32Array(width * height);
  const clamp = (value: number): number => Math.max(-89.999, Math.min(89.999, value));
  const rowLatitude: number[] = [];
  if (height <= 1) {
    const mid = (topLatitude + bottomLatitude) / 2;
    for (let y = 0; y < height; y++) rowLatitude[y] = clamp(mid);
  } else {
    const step = (bottomLatitude - topLatitude) / (height - 1);
    for (let y = 0; y < height; y++) {
      rowLatitude[y] = clamp(topLatitude + step * y);
    }
  }
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      latitude[rowOffset + x] = rowLatitude[y] ?? 0;
    }
  }
  return latitude;
}
