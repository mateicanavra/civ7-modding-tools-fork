export type RngFn = (max: number, label: string) => number;

export function rollUnit(rng: RngFn, label: string): number {
  const scale = 1_000_000;
  const roll = rng(scale, label);
  return (roll % scale) / scale;
}

