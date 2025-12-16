/**
 * Story Corridors — lightweight, gameplay-focused path tagging.
 *
 * Ports legacy JS story/corridors.js into MapContext-friendly logic:
 * - Uses EngineAdapter reads (water/elevation/rainfall/latitude) when ctx provided
 * - Publishes a canonical overlay snapshot for Task Graph contracts
 *
 * Corridors are stored in StoryTags for compatibility in M3:
 *   - corridorSeaLane / corridorIslandHop / corridorLandOpen / corridorRiverChain
 *   - corridorKind / corridorStyle / corridorAttributes metadata maps
 */

import type { ExtendedMapContext, StoryOverlaySnapshot } from "../../core/types.js";
import { inBounds, storyKey } from "../../core/index.js";
import { ctxRandom } from "../../core/types.js";
import { COAST_TERRAIN } from "../../core/terrain-constants.js";
import { getStoryTags } from "./tags.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "./overlays.js";

export type CorridorStage = "preIslands" | "postRivers";

type CorridorKind = "sea" | "islandHop" | "land" | "river";
type CorridorStyle = string;
type Orient = "col" | "row" | "diagNE" | "diagNW";

const STYLE_PRIMITIVE_CACHE = new Map<string, Readonly<Record<string, unknown>>>();

function freezeClone(obj: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) out[key] = (obj as Record<string, unknown>)[key];
  return Object.freeze(out);
}

function fetchCorridorStylePrimitive(
  corridorsCfg: Record<string, unknown>,
  kind: CorridorKind,
  style: CorridorStyle
): Readonly<Record<string, unknown>> | null {
  if (typeof kind !== "string" || typeof style !== "string") return null;
  const cacheKey = `${kind}:${style}`;
  if (STYLE_PRIMITIVE_CACHE.has(cacheKey)) return STYLE_PRIMITIVE_CACHE.get(cacheKey)!;

  const kinds = corridorsCfg.kinds as Record<string, unknown> | undefined;
  const kindCfg = (kinds?.[kind] || null) as Record<string, unknown> | null;
  const styles = (kindCfg?.styles || null) as Record<string, unknown> | null;
  const styleCfg = (styles?.[style] || null) as Record<string, unknown> | null;
  if (!styleCfg) return null;

  const primitive = Object.freeze({
    kind,
    style,
    biomes: styleCfg.biomes ? freezeClone(styleCfg.biomes) : undefined,
    features: styleCfg.features ? freezeClone(styleCfg.features) : undefined,
    edge: styleCfg.edge ? freezeClone(styleCfg.edge) : undefined,
  });

  STYLE_PRIMITIVE_CACHE.set(cacheKey, primitive);
  return primitive;
}

function assignCorridorMetadata(
  corridorsCfg: Record<string, unknown>,
  key: string,
  kind: CorridorKind,
  style: CorridorStyle
): void {
  if (typeof key !== "string" || typeof kind !== "string" || typeof style !== "string") return;
  const tags = getStoryTags();
  tags.corridorKind.set(key, kind);
  tags.corridorStyle.set(key, style);
  const primitive = fetchCorridorStylePrimitive(corridorsCfg, kind, style);
  if (primitive) tags.corridorAttributes.set(key, primitive);
  else tags.corridorAttributes.delete(key);
}

export function resetCorridorStyleCache(): void {
  STYLE_PRIMITIVE_CACHE.clear();
}

function rand(ctx: ExtendedMapContext | null | undefined, max: number, label: string): number {
  if (ctx) return ctxRandom(ctx, label, Math.max(1, max | 0));
  if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.getRandomNumber) {
    return TerrainBuilder.getRandomNumber(Math.max(1, max | 0), label || "Corr");
  }
  return Math.floor(Math.random() * Math.max(1, max | 0));
}

function getDims(ctx: ExtendedMapContext | null | undefined): { width: number; height: number } {
  if (ctx?.dimensions) return { width: ctx.dimensions.width, height: ctx.dimensions.height };
  const width = typeof GameplayMap !== "undefined" ? GameplayMap.getGridWidth() : 0;
  const height = typeof GameplayMap !== "undefined" ? GameplayMap.getGridHeight() : 0;
  return { width, height };
}

function isWaterAt(ctx: ExtendedMapContext | null | undefined, x: number, y: number): boolean {
  if (ctx?.adapter) return ctx.adapter.isWater(x, y);
  if (typeof GameplayMap !== "undefined" && GameplayMap?.isWater) return GameplayMap.isWater(x, y);
  return true;
}

function isCoastalLand(ctx: ExtendedMapContext, x: number, y: number, width: number, height: number): boolean {
  if (ctx.adapter.isWater(x, y)) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (ctx.adapter.isWater(nx, ny)) return true;
    }
  }
  return false;
}

function isAdjacentToShallowWater(ctx: ExtendedMapContext, x: number, y: number, width: number, height: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (!ctx.adapter.isWater(nx, ny)) continue;
      if (ctx.adapter.getTerrainType(nx, ny) === COAST_TERRAIN) return true;
    }
  }
  return false;
}

function isAdjacentToLand(
  ctx: ExtendedMapContext,
  x: number,
  y: number,
  radius: number,
  width: number,
  height: number
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (!ctx.adapter.isWater(nx, ny)) return true;
    }
  }
  return false;
}

// ----------------------------------------------------------------------------
// Sea lanes
// ----------------------------------------------------------------------------

function hasPerpWidth(
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

function longestWaterRunColumn(ctx: ExtendedMapContext, x: number, height: number): { start: number; end: number; len: number } {
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

function longestWaterRunRow(ctx: ExtendedMapContext, y: number, width: number): { start: number; end: number; len: number } {
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

function longestWaterRunDiagSum(
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

function longestWaterRunDiagDiff(
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

function tagSeaLanes(ctx: ExtendedMapContext, corridorsCfg: Record<string, unknown>): void {
  const cfg = ((corridorsCfg.sea || {}) as Record<string, unknown>) || {};
  const { width, height } = getDims(ctx);

  const maxLanes = Math.max(0, Number((cfg.maxLanes as number) ?? 3) | 0);
  const stride = Math.max(2, Number((cfg.scanStride as number) ?? 6) | 0);
  const minLenFrac = Math.min(1, Math.max(0.4, Number((cfg.minLengthFrac as number) ?? 0.7)));
  const preferDiagonals = !!cfg.preferDiagonals;
  const laneSpacing = Math.max(0, Number((cfg.laneSpacing as number) ?? 6) | 0);
  const requiredMinWidth = Math.max(1, Number((cfg.minChannelWidth as number) ?? 3) | 0);

  const DIR = (ctx?.config?.foundation?.dynamics?.directionality || {}) as Record<string, unknown>;
  const COH = Math.max(0, Math.min(1, Number((DIR.cohesion as number) ?? 0)));
  const primaryAxes = (DIR.primaryAxes || {}) as Record<string, number>;
  const interplay = (DIR.interplay || {}) as Record<string, number>;
  const plateAxisDeg = (primaryAxes.plateAxisDeg ?? 0) | 0;
  let windAxisDeg = (primaryAxes.windBiasDeg ?? 0) | 0;
  let currentAxisDeg = (primaryAxes.currentBiasDeg ?? 0) | 0;
  const windsFollowPlates = Math.max(0, Math.min(1, interplay.windsFollowPlates ?? 0)) * COH;
  const currentsFollowWinds = Math.max(0, Math.min(1, interplay.currentsFollowWinds ?? 0)) * COH;
  windAxisDeg += Math.round(plateAxisDeg * windsFollowPlates);
  currentAxisDeg += Math.round(plateAxisDeg * windsFollowPlates * 0.5);

  const axisVec = (deg: number): { x: number; y: number } => {
    const r = (deg * Math.PI) / 180;
    return { x: Math.cos(r), y: Math.sin(r) };
  };

  const laneVec = (orient: Orient): { x: number; y: number } => {
    if (orient === "col") return { x: 0, y: 1 };
    if (orient === "row") return { x: 1, y: 0 };
    if (orient === "diagNE") return { x: 1 / Math.SQRT2, y: -1 / Math.SQRT2 };
    if (orient === "diagNW") return { x: 1 / Math.SQRT2, y: 1 / Math.SQRT2 };
    return { x: 1, y: 0 };
  };

  const WV = axisVec(windAxisDeg);
  const CV = axisVec(currentAxisDeg);

  const directionalityBias = (orient: Orient): number => {
    if (COH <= 0) return 0;
    const L = laneVec(orient);
    const dotWind = Math.abs(WV.x * L.x + WV.y * L.y);
    const dotCurr = Math.abs(CV.x * L.x + CV.y * L.y);
    const wW = 1.0;
    const wC = 0.8 + 0.6 * currentsFollowWinds;
    const align = (dotWind * wW + dotCurr * wC) / (wW + wC);
    return Math.round(align * 25 * COH);
  };

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
    score += directionalityBias("col");
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
    score += directionalityBias("row");
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
      score += directionalityBias("diagNE");
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
      score += directionalityBias("diagNW");
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
  const tags = getStoryTags();
  for (const c of candidates) {
    if (lanes >= maxLanes) break;
    if (!spaced(c.orient, c.index)) continue;
    chosenIdx[c.orient].push(c.index);

    if (c.orient === "col") {
      const x = c.index;
      for (let y = c.start; y <= c.end; y++) {
        if (!ctx.adapter.isWater(x, y)) continue;
        const kk = storyKey(x, y);
        tags.corridorSeaLane.add(kk);
        const style = isAdjacentToLand(ctx, x, y, 2, width, height) ? "coastal" : "ocean";
        assignCorridorMetadata(corridorsCfg, kk, "sea", style);
      }
    } else if (c.orient === "row") {
      const y = c.index;
      for (let x = c.start; x <= c.end; x++) {
        if (!ctx.adapter.isWater(x, y)) continue;
        const kk = storyKey(x, y);
        tags.corridorSeaLane.add(kk);
        const style = isAdjacentToLand(ctx, x, y, 2, width, height) ? "coastal" : "ocean";
        assignCorridorMetadata(corridorsCfg, kk, "sea", style);
      }
    } else if (c.orient === "diagNE") {
      const k = c.index;
      for (let x = c.start; x <= c.end; x++) {
        const y = k - x;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (!ctx.adapter.isWater(x, y)) continue;
        const kk = storyKey(x, y);
        tags.corridorSeaLane.add(kk);
        const style = isAdjacentToLand(ctx, x, y, 2, width, height) ? "coastal" : "ocean";
        assignCorridorMetadata(corridorsCfg, kk, "sea", style);
      }
    } else if (c.orient === "diagNW") {
      const d = c.index;
      for (let y = c.start; y <= c.end; y++) {
        const x = d + y;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (!ctx.adapter.isWater(x, y)) continue;
        const kk = storyKey(x, y);
        tags.corridorSeaLane.add(kk);
        const style = isAdjacentToLand(ctx, x, y, 2, width, height) ? "coastal" : "ocean";
        assignCorridorMetadata(corridorsCfg, kk, "sea", style);
      }
    }

    lanes++;
  }
}

// ----------------------------------------------------------------------------
// Island-hop lanes (hotspots)
// ----------------------------------------------------------------------------

function tagIslandHopFromHotspots(ctx: ExtendedMapContext, corridorsCfg: Record<string, unknown>): void {
  const cfg = ((corridorsCfg.islandHop || {}) as Record<string, unknown>) || {};
  if (!cfg.useHotspots) return;

  const maxArcs = Math.max(0, Number((cfg.maxArcs as number) ?? 2) | 0);
  if (maxArcs === 0) return;

  const { width, height } = getDims(ctx);
  const tags = getStoryTags();
  const keys = Array.from(tags.hotspot);
  if (!keys.length) return;

  const picked = new Set<string>();
  let arcs = 0;
  let attempts = 0;

  while (arcs < maxArcs && attempts < 100 && attempts < keys.length * 2) {
    attempts++;
    const idx = rand(ctx, keys.length, "IslandHopPick");
    const key = keys[idx % keys.length];
    if (picked.has(key)) continue;
    picked.add(key);
    arcs++;

    const [sx, sy] = key.split(",").map(Number);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = sx + dx;
        const ny = sy + dy;
        if (!inBounds(nx, ny, width, height)) continue;
        if (!ctx.adapter.isWater(nx, ny)) continue;
        const kk = storyKey(nx, ny);
        tags.corridorIslandHop.add(kk);
        assignCorridorMetadata(corridorsCfg, kk, "islandHop", "archipelago");
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Land corridors (rift shoulders)
// ----------------------------------------------------------------------------

function tagLandCorridorsFromRifts(ctx: ExtendedMapContext, corridorsCfg: Record<string, unknown>): void {
  const cfg = ((corridorsCfg.land || {}) as Record<string, unknown>) || {};
  if (!cfg.useRiftShoulders) return;

  const { width, height } = getDims(ctx);
  const tags = getStoryTags();

  const maxCorridors = Math.max(0, Number((cfg.maxCorridors as number) ?? 2) | 0);
  const minRun = Math.max(12, Number((cfg.minRunLength as number) ?? 24) | 0);
  const spacing = Math.max(0, Number((cfg.spacing as number) ?? 0) | 0);

  if (maxCorridors === 0 || tags.riftShoulder.size === 0) return;

  let corridors = 0;
  const usedRows: number[] = [];

  for (let y = 1; y < height - 1 && corridors < maxCorridors; y++) {
    let x = 1;
    while (x < width - 1 && corridors < maxCorridors) {
      while (x < width - 1 && !tags.riftShoulder.has(storyKey(x, y))) x++;
      if (x >= width - 1) break;
      const start = x;
      while (x < width - 1 && tags.riftShoulder.has(storyKey(x, y))) x++;
      const end = x - 1;
      const len = end - start + 1;
      if (len < minRun) continue;

      let tooClose = false;
      for (const row of usedRows) {
        if (Math.abs(row - y) < spacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      let totalElev = 0;
      let totalRain = 0;
      let samples = 0;
      let reliefHits = 0;

      for (let cx = start; cx <= end; cx++) {
        if (ctx.adapter.isWater(cx, y)) continue;
        const e = ctx.adapter.getElevation(cx, y);
        const r = ctx.adapter.getRainfall(cx, y);
        totalElev += e;
        totalRain += r;
        samples++;

        const eN = ctx.adapter.getElevation(cx, Math.max(0, y - 1));
        const eS = ctx.adapter.getElevation(cx, Math.min(height - 1, y + 1));
        const eW = ctx.adapter.getElevation(Math.max(0, cx - 1), y);
        const eE = ctx.adapter.getElevation(Math.min(width - 1, cx + 1), y);
        const dMax = Math.max(Math.abs(e - eN), Math.abs(e - eS), Math.abs(e - eW), Math.abs(e - eE));
        if (dMax >= 60) reliefHits++;
      }

      const avgElev = samples > 0 ? Math.round(totalElev / samples) : 0;
      const avgRain = samples > 0 ? Math.round(totalRain / samples) : 0;
      const reliefFrac = samples > 0 ? reliefHits / samples : 0;
      const latDeg = Math.abs(ctx.adapter.getLatitude(0, y));

      let style = "plainsBelt";
      if (reliefFrac > 0.35 && avgRain < 95) style = "canyon";
      else if (avgElev > 650 && reliefFrac < 0.2) style = "plateau";
      else if (avgElev > 550 && reliefFrac < 0.35) style = "flatMtn";
      else if (avgRain < 85 && latDeg < 35) style = "desertBelt";
      else if (avgRain > 115) style = "grasslandBelt";

      try {
        const DIR = (ctx?.config?.foundation?.dynamics?.directionality || {}) as Record<string, unknown>;
        const cohesion = Math.max(0, Math.min(1, Number((DIR.cohesion as number) ?? 0)));
        if (cohesion > 0) {
          const axes = (DIR.primaryAxes || {}) as Record<string, number>;
          const plateDeg = (axes.plateAxisDeg ?? 0) | 0;
          const windDeg = (axes.windBiasDeg ?? 0) | 0;
          const radP = (plateDeg * Math.PI) / 180;
          const radW = (windDeg * Math.PI) / 180;
          const PV = { x: Math.cos(radP), y: Math.sin(radP) };
          const WV = { x: Math.cos(radW), y: Math.sin(radW) };
          const L = { x: 1, y: 0 };
          const alignPlate = Math.abs(PV.x * L.x + PV.y * L.y);
          const alignWind = Math.abs(WV.x * L.x + WV.y * L.y);
          const hiAlign = 0.75 * cohesion + 0.1;
          const midAlign = 0.5 * cohesion + 0.1;

          if (alignPlate >= hiAlign) {
            if (avgElev > 650 && reliefFrac < 0.28) style = "plateau";
            else if (reliefFrac > 0.3 && avgRain < 100) style = "canyon";
            else if (avgElev > 560 && reliefFrac < 0.35) style = "flatMtn";
          } else if (alignPlate >= midAlign) {
            if (avgElev > 600 && reliefFrac < 0.25) style = "plateau";
          }

          if (alignWind >= hiAlign) {
            if (avgRain > 110 || (latDeg < 25 && avgRain > 100)) style = "grasslandBelt";
            else if (avgRain < 90 && latDeg < 35) style = "desertBelt";
          } else if (alignWind >= midAlign) {
            if (avgRain > 120) style = "grasslandBelt";
          }
        }
      } catch {
        // keep baseline style
      }

      for (let cx = start; cx <= end; cx++) {
        if (ctx.adapter.isWater(cx, y)) continue;
        const kk = storyKey(cx, y);
        tags.corridorLandOpen.add(kk);
        assignCorridorMetadata(corridorsCfg, kk, "land", style);
      }

      usedRows.push(y);
      corridors++;
    }
  }
}

// ----------------------------------------------------------------------------
// River chain corridors (post-rivers)
// ----------------------------------------------------------------------------

function tagRiverChainsPostRivers(ctx: ExtendedMapContext, corridorsCfg: Record<string, unknown>): void {
  const cfg = ((corridorsCfg.river || {}) as Record<string, unknown>) || {};
  const { width, height } = getDims(ctx);

  const maxChains = Math.max(0, Number((cfg.maxChains as number) ?? 2) | 0);
  const maxSteps = Math.max(20, Number((cfg.maxSteps as number) ?? 80) | 0);
  const lowlandThresh = Math.max(0, Number((cfg.preferLowlandBelow as number) ?? 300) | 0);
  const coastSeedR = Math.max(1, Number((cfg.coastSeedRadius as number) ?? 2) | 0);
  const minTiles = Math.max(0, Number((cfg.minTiles as number) ?? 0) | 0);
  const mustEndNearCoast = !!cfg.mustEndNearCoast;

  if (maxChains === 0) return;

  const tags = getStoryTags();
  let chains = 0;
  let tries = 0;

  while (chains < maxChains && tries < 300) {
    tries++;
    const sx = rand(ctx, width, "RiverChainSX");
    const sy = rand(ctx, height, "RiverChainSY");
    if (!inBounds(sx, sy, width, height)) continue;
    if (!isCoastalLand(ctx, sx, sy, width, height)) continue;
    if (!ctx.adapter.isAdjacentToRivers(sx, sy, coastSeedR)) continue;

    let x = sx;
    let y = sy;
    let steps = 0;
    const pathKeys: string[] = [];

    while (steps < maxSteps) {
      if (!ctx.adapter.isWater(x, y) && ctx.adapter.isAdjacentToRivers(x, y, 1)) {
        pathKeys.push(storyKey(x, y));
      }

      let bx = x;
      let by = y;
      let be = ctx.adapter.getElevation(x, y);
      let improved = false;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (!inBounds(nx, ny, width, height) || ctx.adapter.isWater(nx, ny)) continue;
          if (!ctx.adapter.isAdjacentToRivers(nx, ny, 1)) continue;
          const e = ctx.adapter.getElevation(nx, ny);
          const prefer = e <= be || (e < lowlandThresh && be >= lowlandThresh);
          if (!prefer) continue;
          if (!improved || rand(ctx, 3, "RiverChainTie") === 0) {
            bx = nx;
            by = ny;
            be = e;
            improved = true;
          }
        }
      }

      if (!improved) break;
      x = bx;
      y = by;
      steps++;
    }

    let endOK = true;
    if (mustEndNearCoast) {
      endOK = isCoastalLand(ctx, x, y, width, height) || isAdjacentToShallowWater(ctx, x, y, width, height);
    }

    if (pathKeys.length >= minTiles && endOK) {
      for (const kk of pathKeys) {
        tags.corridorRiverChain.add(kk);
        assignCorridorMetadata(corridorsCfg, kk, "river", "riverChain");
      }
      chains++;
    }
  }
}

// ----------------------------------------------------------------------------
// Backfill + overlay
// ----------------------------------------------------------------------------

function backfillCorridorKinds(ctx: ExtendedMapContext, corridorsCfg: Record<string, unknown>): void {
  const { width, height } = getDims(ctx);
  const tags = getStoryTags();

  for (const key of tags.corridorSeaLane) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "sea";
    let style = tags.corridorStyle.get(key);
    if (!style) {
      const [sx, sy] = key.split(",").map(Number);
      style = isAdjacentToShallowWater(ctx, sx, sy, width, height) ? "coastal" : "ocean";
    }
    assignCorridorMetadata(corridorsCfg, key, kind, style);
  }

  for (const key of tags.corridorIslandHop) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "islandHop";
    const style = tags.corridorStyle.get(key) || "archipelago";
    assignCorridorMetadata(corridorsCfg, key, kind, style);
  }

  for (const key of tags.corridorLandOpen) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "land";
    const style = tags.corridorStyle.get(key) || "plainsBelt";
    assignCorridorMetadata(corridorsCfg, key, kind, style);
  }

  for (const key of tags.corridorRiverChain) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "river";
    const style = tags.corridorStyle.get(key) || "riverChain";
    assignCorridorMetadata(corridorsCfg, key, kind, style);
  }
}

export function storyTagStrategicCorridors(ctx: ExtendedMapContext, stage: CorridorStage): StoryOverlaySnapshot {
  const corridorsCfg = (ctx.config.corridors || {}) as Record<string, unknown>;

  resetCorridorStyleCache();

  if (stage === "preIslands") {
    tagSeaLanes(ctx, corridorsCfg);
    tagIslandHopFromHotspots(ctx, corridorsCfg);
    tagLandCorridorsFromRifts(ctx, corridorsCfg);
    backfillCorridorKinds(ctx, corridorsCfg);
  } else if (stage === "postRivers") {
    tagRiverChainsPostRivers(ctx, corridorsCfg);
    backfillCorridorKinds(ctx, corridorsCfg);
  }

  const tags = getStoryTags();
  const seaLane = Array.from(tags.corridorSeaLane);
  const islandHop = Array.from(tags.corridorIslandHop);
  const landOpen = Array.from(tags.corridorLandOpen);
  const riverChain = Array.from(tags.corridorRiverChain);

  const all = new Set<string>();
  for (const k of seaLane) all.add(k);
  for (const k of islandHop) all.add(k);
  for (const k of landOpen) all.add(k);
  for (const k of riverChain) all.add(k);

  const { width, height } = ctx.dimensions;
  return publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.CORRIDORS, {
    kind: STORY_OVERLAY_KEYS.CORRIDORS,
    version: 1,
    width,
    height,
    active: Array.from(all),
    summary: {
      stage,
      seaLane,
      islandHop,
      landOpen,
      riverChain,
      kindByTile: Object.fromEntries(tags.corridorKind),
      styleByTile: Object.fromEntries(tags.corridorStyle),
      attributesByTile: Object.fromEntries(tags.corridorAttributes),
      seaLaneTiles: seaLane.length,
      islandHopTiles: islandHop.length,
      landOpenTiles: landOpen.length,
      riverChainTiles: riverChain.length,
      totalTiles: all.size,
    },
  });
}
