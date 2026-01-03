const hashLabel = (label: string): number => {
  let hash = 5381;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) + hash) ^ label.charCodeAt(i);
  }
  return hash | 0;
};

export function deriveStepSeed(baseSeed: number, label: string): number {
  return (baseSeed | 0) ^ hashLabel(label);
}
