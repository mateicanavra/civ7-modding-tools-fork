import { writeHeightfield } from "@swooper/mapgen-core";
import { clampInt } from "@swooper/mapgen-core/lib/math";
import { OCEAN_TERRAIN } from "@swooper/mapgen-core";
import type { LandmassWindow } from "@mapgen/domain/morphology/landmass/types.js";
import type {
  OceanSeparationPolicy,
  PlateAwareOceanSeparationParams,
  PlateAwareOceanSeparationResult,
  RowState,
} from "@mapgen/domain/morphology/landmass/ocean-separation/types.js";
import { aggregateRowState, createRowState, normalizeWindow } from "@mapgen/domain/morphology/landmass/ocean-separation/row-state.js";

export function applyPlateAwareOceanSeparation(
  params: PlateAwareOceanSeparationParams
): PlateAwareOceanSeparationResult {
  const width = params?.width | 0;
  const height = params?.height | 0;
  const windows = Array.isArray(params?.windows) ? params.windows : [];

  if (!width || !height || windows.length === 0) {
    return {
      windows: windows.map((win, idx) => normalizeWindow(win, idx, width, height)),
    };
  }

  const context = params?.context ?? null;
  if (!context) {
    throw new Error("[OceanSeparation] MapContext is required to apply separation.");
  }
  const policy = params?.policy ?? null;
  if (!policy || typeof policy !== "object") {
    throw new Error("[OceanSeparation] Missing ocean separation policy.");
  }
  if (!Object.prototype.hasOwnProperty.call(policy, "enabled")) {
    throw new Error("[OceanSeparation] Missing ocean separation policy.enabled.");
  }
  const normalizedWindows: LandmassWindow[] = windows.map((win, idx) => normalizeWindow(win, idx, width, height));

  if (!policy || !policy.enabled) {
    return {
      windows: normalizedWindows,
      landMask: params?.landMask ?? undefined,
    };
  }

  const landMask =
    params?.landMask instanceof Uint8Array && params.landMask.length === width * height
      ? params.landMask
      : null;

  const heightfield = context.buffers?.heightfield;

  const setTerrain = (x: number, y: number, terrain: number, isLand: boolean): void => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;

    if (landMask) {
      landMask[idx] = isLand ? 1 : 0;
    }

    writeHeightfield(context, x, y, { terrain, isLand });

    if (heightfield && !landMask) {
      heightfield.landMask[idx] = isLand ? 1 : 0;
    }
  };

  const minChannelWidth = Math.max(1, (policy.minChannelWidth ?? 3) | 0);
  const channelJitter = Math.max(0, (policy.channelJitter ?? 0) | 0);
  const rowStates: RowState[] = normalizedWindows.map((win, idx) => createRowState(win, idx, width, height));

  for (let i = 0; i < rowStates.length - 1; i++) {
    const left = rowStates[i];
    const right = rowStates[i + 1];
    if (!left || !right) continue;

    const rowStart = Math.max(0, Math.max(left.south, right.south));
    const rowEnd = Math.min(height - 1, Math.min(left.north, right.north));
    if (rowStart > rowEnd) continue;

    for (let y = rowStart; y <= rowEnd; y++) {
      const baseCenter = clampInt(Math.floor((left.east[y] + right.west[y]) / 2), 0, width - 1);
      const span = channelJitter * 2 + 1;
      const jitter = channelJitter > 0 ? ((y + i) % span) - channelJitter : 0;
      const center = clampInt(baseCenter + jitter, 0, width - 1);
      const halfWidth = Math.max(0, Math.floor((minChannelWidth - 1) / 2));

      let start = clampInt(center - halfWidth, 0, width - 1);
      let end = clampInt(start + minChannelWidth - 1, 0, width - 1);
      if (end >= width) {
        end = width - 1;
        start = Math.max(0, end - minChannelWidth + 1);
      }

      for (let x = start; x <= end; x++) {
        setTerrain(x, y, OCEAN_TERRAIN, false);
      }

      if (start <= left.west[y]) {
        left.east[y] = left.west[y] - 1;
      } else {
        left.east[y] = clampInt(Math.min(left.east[y], start - 1), 0, width - 1);
      }

      if (end >= right.east[y]) {
        right.west[y] = right.east[y] + 1;
      } else {
        right.west[y] = clampInt(Math.max(right.west[y], end + 1), 0, width - 1);
      }
    }
  }

  const normalized = rowStates.map((state) => aggregateRowState(state, width, height));

  if (context && landMask && heightfield?.landMask) {
    heightfield.landMask.set(landMask);
  }

  return {
    windows: normalized,
    landMask: landMask ?? undefined,
  };
}
