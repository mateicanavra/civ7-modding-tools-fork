export function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

export function xyFromIndex(index: number, width: number): { x: number; y: number } {
  return { x: index % width, y: Math.floor(index / width) };
}

