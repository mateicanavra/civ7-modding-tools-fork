import { createStrategy } from "@swooper/mapgen-core/authoring";
import ProjectRiverNetworkContract from "../contract.js";
import { clamp01 } from "../rules/index.js";

function percentileThreshold(values: number[], p: number): number {
  if (values.length === 0) return Infinity;
  const pct = clamp01(p);
  const i = Math.floor((values.length - 1) * pct);
  return values[i] ?? Infinity;
}

export const defaultStrategy = createStrategy(ProjectRiverNetworkContract, "default", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/project-river-network.");
    }
    if (!(input.discharge instanceof Float32Array) || input.discharge.length !== size) {
      throw new Error("[Hydrology] Invalid discharge for hydrology/project-river-network.");
    }

    const landDischarge: number[] = [];
    for (let i = 0; i < size; i++) {
      if (input.landMask[i] !== 1) continue;
      landDischarge.push(input.discharge[i] ?? 0);
    }
    landDischarge.sort((a, b) => a - b);

    const rawMinor = percentileThreshold(landDischarge, config.minorPercentile);
    const rawMajor = percentileThreshold(landDischarge, config.majorPercentile);

    const minorThreshold = Math.max(0, config.minMinorDischarge, rawMinor);
    const majorThreshold = Math.max(minorThreshold, config.minMajorDischarge, rawMajor);

    const riverClass = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      if (input.landMask[i] !== 1) {
        riverClass[i] = 0;
        continue;
      }
      const d = input.discharge[i] ?? 0;
      riverClass[i] = d >= majorThreshold ? 2 : d >= minorThreshold ? 1 : 0;
    }

    return { riverClass, minorThreshold, majorThreshold } as const;
  },
});

