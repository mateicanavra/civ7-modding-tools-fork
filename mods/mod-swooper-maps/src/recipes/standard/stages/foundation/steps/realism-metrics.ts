export type BoundaryTypeCounts = Readonly<{
  none: number;
  convergent: number;
  divergent: number;
  transform: number;
  other: number;
}>;

export type BoundaryClosenessHistogram = Readonly<{
  ranges: ReadonlyArray<Readonly<{ label: string; min: number; max: number }>>;
  counts: ReadonlyArray<number>;
  total: number;
}>;

export type FoundationPlatesSummary = Readonly<{
  tileCount: number;
  boundaryBandTiles: number;
  boundaryBandFraction: number;
  boundaryTypeNonZeroTiles: number;
  boundaryTypeNonZeroFraction: number;
  boundaryTypeCounts: BoundaryTypeCounts;
  regimeSignalTiles: number;
  regimeSignalFraction: number;
}>;

export function histogramBoundaryCloseness(boundaryCloseness: Uint8Array): BoundaryClosenessHistogram {
  const ranges = [
    { label: "0", min: 0, max: 0 },
    { label: "1-16", min: 1, max: 16 },
    { label: "17-32", min: 17, max: 32 },
    { label: "33-64", min: 33, max: 64 },
    { label: "65-96", min: 65, max: 96 },
    { label: "97-128", min: 97, max: 128 },
    { label: "129-160", min: 129, max: 160 },
    { label: "161-192", min: 161, max: 192 },
    { label: "193-224", min: 193, max: 224 },
    { label: "225-255", min: 225, max: 255 },
  ] as const;

  const counts = new Array<number>(ranges.length).fill(0);
  const total = boundaryCloseness.length | 0;
  for (let i = 0; i < total; i++) {
    const v = boundaryCloseness[i] ?? 0;
    for (let r = 0; r < ranges.length; r++) {
      const range = ranges[r]!;
      if (v >= range.min && v <= range.max) {
        counts[r] = (counts[r] ?? 0) + 1;
        break;
      }
    }
  }

  return { ranges, counts, total };
}

export function summarizeFoundationPlates(params: {
  width: number;
  height: number;
  boundaryCloseness: Uint8Array;
  boundaryType: Uint8Array;
  upliftPotential?: Uint8Array;
  riftPotential?: Uint8Array;
}): FoundationPlatesSummary {
  const { width, height, boundaryCloseness, boundaryType, upliftPotential, riftPotential } = params;
  const tileCount = Math.max(0, (width | 0) * (height | 0));

  let boundaryBandTiles = 0;
  let boundaryTypeNonZeroTiles = 0;
  const boundaryTypeCounts = { none: 0, convergent: 0, divergent: 0, transform: 0, other: 0 } as const;
  const counts = { ...boundaryTypeCounts } as {
    none: number;
    convergent: number;
    divergent: number;
    transform: number;
    other: number;
  };

  let regimeSignalTiles = 0;
  for (let i = 0; i < tileCount; i++) {
    const closeness = boundaryCloseness[i] ?? 0;
    const type = boundaryType[i] ?? 0;
    if (closeness > 0) boundaryBandTiles += 1;
    if (type !== 0) boundaryTypeNonZeroTiles += 1;

    if (type === 0) counts.none += 1;
    else if (type === 1) counts.convergent += 1;
    else if (type === 2) counts.divergent += 1;
    else if (type === 3) counts.transform += 1;
    else counts.other += 1;

    const uplift = upliftPotential ? upliftPotential[i] ?? 0 : 0;
    const rift = riftPotential ? riftPotential[i] ?? 0 : 0;
    if (type !== 0 && (uplift > 0 || rift > 0)) regimeSignalTiles += 1;
  }

  const safe = (n: number) => (tileCount > 0 ? n / tileCount : 0);

  return {
    tileCount,
    boundaryBandTiles,
    boundaryBandFraction: safe(boundaryBandTiles),
    boundaryTypeNonZeroTiles,
    boundaryTypeNonZeroFraction: safe(boundaryTypeNonZeroTiles),
    boundaryTypeCounts: counts,
    regimeSignalTiles,
    regimeSignalFraction: safe(regimeSignalTiles),
  };
}

