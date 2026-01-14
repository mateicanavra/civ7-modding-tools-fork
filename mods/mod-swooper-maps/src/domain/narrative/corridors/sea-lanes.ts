import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { storyKey } from "@swooper/mapgen-core";
import { assignCorridorMetadata } from "@mapgen/domain/narrative/corridors/style-cache.js";
import type { Orient } from "@mapgen/domain/narrative/corridors/types.js";
import type { CorridorState } from "@mapgen/domain/narrative/corridors/state.js";
import { getDims, isAdjacentToLand } from "@mapgen/domain/narrative/corridors/runtime.js";

export function hasPerpWidth(
  ctx: ExtendedMapContext,
  x: number,
  y: number,
  orient: Orient,
  minWidth: number,
  width: number,
  height: number
): boolean {
  const r = Math.floor((minWidth - 1) / 2);
  if (r <= 0) return ctx.adapter.isWater(x, y);
  if (!ctx.adapter.isWater(x, y)) return false;

  if (orient === "col") {
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx;
      if (nx < 0 || nx >= width) return false;
      if (!ctx.adapter.isWater(nx, y)) return false;
    }
    return true;
  }

  if (orient === "row") {
    for (let dy = -r; dy <= r; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) return false;
      if (!ctx.adapter.isWater(x, ny)) return false;
    }
    return true;
  }

  if (orient === "diagNE") {
    for (let t = -r; t <= r; t++) {
      const nx = x + t;
      const ny = y + t;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
      if (!ctx.adapter.isWater(nx, ny)) return false;
    }
    return true;
  }

  if (orient === "diagNW") {
    for (let t = -r; t <= r; t++) {
      const nx = x + t;
      const ny = y - t;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
      if (!ctx.adapter.isWater(nx, ny)) return false;
    }
    return true;
  }

  return false;
}

export function longestWaterRunColumn(ctx: ExtendedMapContext, x: number, height: number): { start: number; end: number; len: number } {
  let bestStart = -1;
  let bestEnd = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  for (let y = 0; y < height; y++) {
    if (ctx.adapter.isWater(x, y)) {
      if (curLen === 0) curStart = y;
      curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
        bestEnd = y;
      }
    } else {
      curLen = 0;
    }
  }
  return { start: bestStart, end: bestEnd, len: bestLen };
}

export function longestWaterRunRow(ctx: ExtendedMapContext, y: number, width: number): { start: number; end: number; len: number } {
  let bestStart = -1;
  let bestEnd = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  for (let x = 0; x < width; x++) {
    if (ctx.adapter.isWater(x, y)) {
      if (curLen === 0) curStart = x;
      curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
        bestEnd = x;
      }
    } else {
      curLen = 0;
    }
  }
  return { start: bestStart, end: bestEnd, len: bestLen };
}

export function longestWaterRunDiagSum(
  ctx: ExtendedMapContext,
  k: number,
  width: number,
  height: number
): { startX: number; endX: number; len: number; axisLen: number } {
  const xs = Math.max(0, k - (height - 1));
  const xe = Math.min(width - 1, k);
  let bestStartX = -1;
  let bestEndX = -1;
  let bestLen = 0;
  let curStartX = -1;
  let curLen = 0;
  for (let x = xs; x <= xe; x++) {
    const y = k - x;
    if (ctx.adapter.isWater(x, y)) {
      if (curLen === 0) curStartX = x;
      curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStartX = curStartX;
        bestEndX = x;
      }
    } else {
      curLen = 0;
    }
  }
  return { startX: bestStartX, endX: bestEndX, len: bestLen, axisLen: xe - xs + 1 };
}

export function longestWaterRunDiagDiff(
  ctx: ExtendedMapContext,
  d: number,
  width: number,
  height: number
): { startY: number; endY: number; len: number; axisLen: number } {
  const ys = Math.max(0, -d);
  const ye = Math.min(height - 1, width - 1 - d);
  let bestStartY = -1;
  let bestEndY = -1;
  let bestLen = 0;
  let curStartY = -1;
  let curLen = 0;
  for (let y = ys; y <= ye; y++) {
    const x = d + y;
    if (ctx.adapter.isWater(x, y)) {
      if (curLen === 0) curStartY = y;
      curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStartY = curStartY;
        bestEndY = y;
      }
    } else {
      curLen = 0;
    }
  }
  return { startY: bestStartY, endY: bestEndY, len: bestLen, axisLen: ye - ys + 1 };
}

export function tagSeaLanes(
  ctx: ExtendedMapContext,
  corridorsCfg: Record<string, unknown>,
  state: CorridorState
): void {
  const cfg = corridorsCfg.sea as Record<string, unknown>;
  if (!cfg) {
    throw new Error("[Narrative] Missing corridors.sea config.");
  }
  const { width, height } = getDims(ctx);

  const maxLanes = Math.max(0, Number((cfg.maxLanes as number) ?? 3) | 0);
  const stride = Math.max(2, Number((cfg.scanStride as number) ?? 6) | 0);
  const minLenFrac = Math.min(1, Math.max(0.4, Number((cfg.minLengthFrac as number) ?? 0.7)));
  const preferDiagonals = !!cfg.preferDiagonals;
  const laneSpacing = Math.max(0, Number((cfg.laneSpacing as number) ?? 6) | 0);
  const requiredMinWidth = Math.max(1, Number((cfg.minChannelWidth as number) ?? 3) | 0);

  const laneBias = (_orient: Orient): number => 0;

  const candidates: Array<{ orient: Orient; index: number; start: number; end: number; len: number; minWidth: number; score: number }> = [];

  const minCol = Math.floor(height * minLenFrac);
  for (let x = 1; x < width - 1; x += stride) {
    const run = longestWaterRunColumn(ctx, x, height);
    if (run.len < minCol) continue;
    const step = Math.max(1, Math.floor(run.len / 10));
    let ok = true;
    for (let y = run.start; y <= run.end; y += step) {
      if (!hasPerpWidth(ctx, x, y, "col", requiredMinWidth, width, height)) {
        ok = false;
        break;
      }
    }
    const minW = ok ? requiredMinWidth : 1;
    const coverage = run.len / height;
    let score = run.len + 3 * minW + Math.round(coverage * 10);
    score += laneBias("col");
    candidates.push({ orient: "col", index: x, start: run.start, end: run.end, len: run.len, minWidth: minW, score });
  }

  const minRow = Math.floor(width * minLenFrac);
  for (let y = 1; y < height - 1; y += stride) {
    const run = longestWaterRunRow(ctx, y, width);
    if (run.len < minRow) continue;
    const step = Math.max(1, Math.floor(run.len / 10));
    let ok = true;
    for (let x = run.start; x <= run.end; x += step) {
      if (!hasPerpWidth(ctx, x, y, "row", requiredMinWidth, width, height)) {
        ok = false;
        break;
      }
    }
    const minW = ok ? requiredMinWidth : 1;
    const coverage = run.len / width;
    let score = run.len + 3 * minW + Math.round(coverage * 10);
    score += laneBias("row");
    candidates.push({ orient: "row", index: y, start: run.start, end: run.end, len: run.len, minWidth: minW, score });
  }

  if (preferDiagonals) {
    const kMax = (width - 1) + (height - 1);
    for (let k = 0; k <= kMax; k += Math.max(2, stride)) {
      const run = longestWaterRunDiagSum(ctx, k, width, height);
      const minDiag = Math.floor(run.axisLen * minLenFrac);
      if (run.len < minDiag || run.startX === -1) continue;
      const step = Math.max(1, Math.floor(run.len / 10));
      let ok = true;
      for (let x = run.startX; x <= run.endX; x += step) {
        const y = k - x;
        if (!hasPerpWidth(ctx, x, y, "diagNE", requiredMinWidth, width, height)) {
          ok = false;
          break;
        }
      }
      const minW = ok ? requiredMinWidth : 1;
      const coverage = run.len / run.axisLen;
      let score = run.len + 2 * minW + Math.round(coverage * 10);
      score += laneBias("diagNE");
      candidates.push({ orient: "diagNE", index: k, start: run.startX, end: run.endX, len: run.len, minWidth: minW, score });
    }

    const dMin = -(height - 1);
    const dMax = width - 1;
    for (let d = dMin; d <= dMax; d += Math.max(2, stride)) {
      const run = longestWaterRunDiagDiff(ctx, d, width, height);
      const minDiag = Math.floor(run.axisLen * minLenFrac);
      if (run.len < minDiag || run.startY === -1) continue;
      const step = Math.max(1, Math.floor(run.len / 10));
      let ok = true;
      for (let y = run.startY; y <= run.endY; y += step) {
        const x = d + y;
        if (!hasPerpWidth(ctx, x, y, "diagNW", requiredMinWidth, width, height)) {
          ok = false;
          break;
        }
      }
      const minW = ok ? requiredMinWidth : 1;
      const coverage = run.len / run.axisLen;
      let score = run.len + 2 * minW + Math.round(coverage * 10);
      score += laneBias("diagNW");
      candidates.push({ orient: "diagNW", index: d, start: run.startY, end: run.endY, len: run.len, minWidth: minW, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const chosenIdx: Record<Orient, number[]> = { col: [], row: [], diagNE: [], diagNW: [] };
  const spaced = (orient: Orient, index: number): boolean => {
    for (const existing of chosenIdx[orient]) {
      if (Math.abs(existing - index) < laneSpacing) return false;
    }
    return true;
  };

  let lanes = 0;
  for (const c of candidates) {
    if (lanes >= maxLanes) break;
    if (!spaced(c.orient, c.index)) continue;
    chosenIdx[c.orient].push(c.index);

    if (c.orient === "col") {
      const x = c.index;
      for (let y = c.start; y <= c.end; y++) {
        if (!ctx.adapter.isWater(x, y)) continue;
        const kk = storyKey(x, y);
        state.seaLanes.add(kk);
        const style = isAdjacentToLand(ctx, x, y, 2, width, height) ? "coastal" : "ocean";
        assignCorridorMetadata(state, ctx, corridorsCfg, kk, "sea", style);
      }
    } else if (c.orient === "row") {
      const y = c.index;
      for (let x = c.start; x <= c.end; x++) {
        if (!ctx.adapter.isWater(x, y)) continue;
        const kk = storyKey(x, y);
        state.seaLanes.add(kk);
        const style = isAdjacentToLand(ctx, x, y, 2, width, height) ? "coastal" : "ocean";
        assignCorridorMetadata(state, ctx, corridorsCfg, kk, "sea", style);
      }
    } else if (c.orient === "diagNE") {
      const k = c.index;
      for (let x = c.start; x <= c.end; x++) {
        const y = k - x;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (!ctx.adapter.isWater(x, y)) continue;
        const kk = storyKey(x, y);
        state.seaLanes.add(kk);
        const style = isAdjacentToLand(ctx, x, y, 2, width, height) ? "coastal" : "ocean";
        assignCorridorMetadata(state, ctx, corridorsCfg, kk, "sea", style);
      }
    } else if (c.orient === "diagNW") {
      const d = c.index;
      for (let y = c.start; y <= c.end; y++) {
        const x = d + y;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (!ctx.adapter.isWater(x, y)) continue;
        const kk = storyKey(x, y);
        state.seaLanes.add(kk);
        const style = isAdjacentToLand(ctx, x, y, 2, width, height) ? "coastal" : "ocean";
        assignCorridorMetadata(state, ctx, corridorsCfg, kk, "sea", style);
      }
    }

    lanes++;
  }
}
