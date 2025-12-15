export function wrapX(x: number, width: number): number {
  return ((x % width) + width) % width;
}

