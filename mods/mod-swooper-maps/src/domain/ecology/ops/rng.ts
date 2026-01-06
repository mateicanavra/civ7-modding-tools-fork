export type LabelRng = (label: string, max: number) => number;

const hashLabel = (label: string): number => {
  let hash = 5381;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) + hash ^ label.charCodeAt(i);
  }
  return hash | 0;
};

export function createLabelRng(seed: number): LabelRng {
  const baseSeed = seed | 0;
  const stateByLabel = new Map<string, number>();

  return (label: string, max: number): number => {
    const bound = Math.max(1, max | 0);
    const key = label || "rng";
    let state = stateByLabel.get(key);
    if (state == null) {
      state = (baseSeed ^ hashLabel(key)) >>> 0;
    }
    state = (state * 1664525 + 1013904223) >>> 0;
    stateByLabel.set(key, state);
    return state % bound;
  };
}
