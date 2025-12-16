import { writeHeightfield } from "../../../../core/types.js";
import { clampInt } from "../../../../lib/math/index.js";
import { OCEAN_TERRAIN, FLAT_TERRAIN } from "../../../../core/terrain-constants.js";
import type { LandmassWindow } from "../types.js";
import { normalizeCrustMode } from "../crust-mode.js";
import type {
  OceanSeparationPolicy,
  PlateAwareOceanSeparationParams,
  PlateAwareOceanSeparationResult,
  RowState,
} from "./types.js";
import { DEFAULT_OCEAN_SEPARATION } from "./policy.js";
import { aggregateRowState, createRowState, normalizeWindow } from "./row-state.js";
import { carveOceanFromEast, carveOceanFromWest } from "./carve.js";
import { fillLandFromEast, fillLandFromWest } from "./fill.js";

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

  const ctx = params?.context ?? null;
  const adapter =
    params?.adapter && typeof params.adapter.setTerrainType === "function" ? params.adapter : null;

  const config = ctx?.config;
  const foundationCfg = config?.foundation as
    | {
        policy?: { oceanSeparation?: OceanSeparationPolicy; crustMode?: unknown };
        surface?: {
          oceanSeparation?: OceanSeparationPolicy;
          crustMode?: unknown;
          landmass?: { crustMode?: unknown };
        };
      }
    | undefined;

  const foundationPolicy =
    (config?.oceanSeparation as OceanSeparationPolicy | undefined) ??
    foundationCfg?.surface?.oceanSeparation ??
    foundationCfg?.policy?.oceanSeparation;

  const policy = params?.policy || foundationPolicy || DEFAULT_OCEAN_SEPARATION;
  const normalizedWindows: LandmassWindow[] = windows.map((win, idx) => normalizeWindow(win, idx, width, height));

  const foundation = ctx?.foundation;
  if (!policy || !policy.enabled || !foundation) {
    return {
      windows: normalizedWindows,
      landMask: params?.landMask ?? undefined,
    };
  }

  const landMask =
    params?.landMask instanceof Uint8Array && params.landMask.length === width * height
      ? params.landMask
      : null;

  const heightfield = ctx?.buffers?.heightfield;

  const setTerrain = (x: number, y: number, terrain: number, isLand: boolean): void => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;

    if (landMask) {
      landMask[idx] = isLand ? 1 : 0;
    }

    if (ctx) {
      writeHeightfield(ctx, x, y, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }

    if (heightfield && !landMask) {
      heightfield.landMask[idx] = isLand ? 1 : 0;
    }
  };

  const crustMode = normalizeCrustMode(
    params?.crustMode ??
      (config?.landmass as { crustMode?: unknown } | undefined)?.crustMode ??
      foundationCfg?.policy?.crustMode ??
      foundationCfg?.surface?.crustMode ??
      foundationCfg?.surface?.landmass?.crustMode
  );

  if (crustMode === "area") {
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

    if (ctx && landMask && heightfield?.landMask) {
      heightfield.landMask.set(landMask);
    }

    return {
      windows: normalized,
      landMask: landMask ?? undefined,
    };
  }

  const closeness = foundation.plates.boundaryCloseness;
  if (!closeness || closeness.length !== width * height) {
    return {
      windows: normalizedWindows,
      landMask: landMask ?? undefined,
    };
  }

  const bandPairs =
    Array.isArray(policy.bandPairs) && policy.bandPairs.length ? policy.bandPairs : [[0, 1], [1, 2]];

  const baseSeparation = Math.max(0, (policy.baseSeparationTiles ?? 0) | 0);
  const closenessMultiplier = Number.isFinite(policy.boundaryClosenessMultiplier)
    ? policy.boundaryClosenessMultiplier!
    : 1.0;
  const maxPerRow = Math.max(0, (policy.maxPerRowDelta ?? 3) | 0);

  const rowStates: RowState[] = normalizedWindows.map((win, idx) => createRowState(win, idx, width, height));

  for (const pair of bandPairs) {
    const li = Array.isArray(pair) ? (pair[0] | 0) : -1;
    const ri = Array.isArray(pair) ? (pair[1] | 0) : -1;
    const left = rowStates[li];
    const right = rowStates[ri];
    if (!left || !right) continue;

    const rowStart = Math.max(0, Math.max(left.south, right.south));
    const rowEnd = Math.min(height - 1, Math.min(left.north, right.north));

    for (let y = rowStart; y <= rowEnd; y++) {
      const mid = clampInt(Math.floor((left.east[y] + right.west[y]) / 2), 0, width - 1);
      const clos = closeness[y * width + mid] | 0;
      let sep = baseSeparation;
      if (sep > 0) {
        const weight = clos / 255;
        sep += Math.round(weight * closenessMultiplier * baseSeparation);
      }
      if (sep > maxPerRow) sep = maxPerRow;
      if (sep <= 0) continue;

      carveOceanFromEast(left, y, sep, width, landMask, setTerrain, OCEAN_TERRAIN);
      carveOceanFromWest(right, y, sep, width, landMask, setTerrain, OCEAN_TERRAIN);
    }
  }

  const edgeWest = policy.edgeWest || {};
  if (rowStates.length && edgeWest.enabled) {
    const state = rowStates[0];
    const base = (edgeWest.baseTiles ?? 0) | 0;
    const mult = Number.isFinite(edgeWest.boundaryClosenessMultiplier)
      ? edgeWest.boundaryClosenessMultiplier!
      : 1.0;
    const cap = Math.max(0, (edgeWest.maxPerRowDelta ?? 2) | 0);

    for (let y = state.south; y <= state.north; y++) {
      const clos = closeness[y * width + 0] | 0;
      let mag = Math.abs(base) + Math.round((clos / 255) * Math.abs(base) * mult);
      if (mag > cap) mag = cap;
      if (mag <= 0) continue;

      if (base >= 0) {
        carveOceanFromWest(state, y, mag, width, landMask, setTerrain, OCEAN_TERRAIN);
      } else {
        fillLandFromWest(state, y, mag, width, setTerrain, FLAT_TERRAIN);
      }
    }
  }

  const edgeEast = policy.edgeEast || {};
  if (rowStates.length && edgeEast.enabled) {
    const state = rowStates[rowStates.length - 1];
    const base = (edgeEast.baseTiles ?? 0) | 0;
    const mult = Number.isFinite(edgeEast.boundaryClosenessMultiplier)
      ? edgeEast.boundaryClosenessMultiplier!
      : 1.0;
    const cap = Math.max(0, (edgeEast.maxPerRowDelta ?? 2) | 0);

    for (let y = state.south; y <= state.north; y++) {
      const clos = closeness[y * width + (width - 1)] | 0;
      let mag = Math.abs(base) + Math.round((clos / 255) * Math.abs(base) * mult);
      if (mag > cap) mag = cap;
      if (mag <= 0) continue;

      if (base >= 0) {
        carveOceanFromEast(state, y, mag, width, landMask, setTerrain, OCEAN_TERRAIN);
      } else {
        fillLandFromEast(state, y, mag, width, setTerrain, FLAT_TERRAIN);
      }
    }
  }

  const normalized = rowStates.map((state) => aggregateRowState(state, width, height));

  if (ctx && landMask && ctx.buffers?.heightfield?.landMask) {
    ctx.buffers.heightfield.landMask.set(landMask);
  }

  return {
    windows: normalized,
    landMask: landMask ?? undefined,
  };
}
