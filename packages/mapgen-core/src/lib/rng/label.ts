export type LabelRng = (max: number, label?: string) => number;

const hashLabel = (label: string): number => {
  let hash = 5381;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) + hash ^ label.charCodeAt(i);
  }
  return hash | 0;
};

/**
 * Derive a deterministic seed from a base seed and label.
 */
export function deriveStepSeed(baseSeed: number, label: string): number {
  return (baseSeed | 0) ^ hashLabel(label);
}

/**
 * Deterministic RNG keyed by label.
 *
 * Each unique label maintains its own LCG state derived from the base seed.
 * Useful for stable, intention-revealing randomness without global RNG plumbing.
 *
 * Returns values in [0, max).
 */
export function createLabelRng(seed: number): LabelRng {
  const baseSeed = seed | 0;
  const stateByLabel = new Map<string, number>();

  return (max: number, label?: string): number => {
    const bound = Math.max(1, max | 0);
    const key = label && label.length > 0 ? label : "rng";
    let state = stateByLabel.get(key);
    if (state == null) {
      state = (baseSeed ^ hashLabel(key)) >>> 0;
    }
    state = (state * 1664525 + 1013904223) >>> 0;
    stateByLabel.set(key, state);
    return state % bound;
  };
}
