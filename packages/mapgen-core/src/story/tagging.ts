/**
 * Story Tagging — Minimal narrative parity for M2 stable slice.
 *
 * Ports a conservative subset of legacy JS story/tagging.js:
 * - Continental margins (active/passive shelves) with overlay publication
 * - Hotspot trail polylines
 * - Rift valleys (lines + shoulders)
 *
 * The stable-slice orchestrator always supplies ExtendedMapContext, so these
 * implementations prefer ctx.adapter and ctx.foundation data products. When
 * foundation tensors are unavailable, rifts fall back to a legacy random march.
 */

import type { ExtendedMapContext } from "../core/types.js";
import type { StoryOverlaySnapshot } from "../core/types.js";
import { clamp, inBounds, storyKey } from "../core/index.js";
import { ctxRandom } from "../core/types.js";
import { getTunables } from "../bootstrap/tunables.js";
import { getStoryTags } from "./tags.js";
import {
  STORY_OVERLAY_KEYS,
  finalizeStoryOverlay,
  publishStoryOverlay,
  hydrateMarginsStoryTags,
} from "./overlays.js";

// ============================================================================
// Types
// ============================================================================

export interface ContinentalMarginsOptions {
  publish?: boolean;
  hydrateStoryTags?: boolean;
}

export interface HotspotTrailsSummary {
  trails: number;
  points: number;
}

export interface RiftValleysSummary {
  rifts: number;
  lineTiles: number;
  shoulderTiles: number;
  kind: "foundation" | "legacy";
}

// ============================================================================
// Helpers
// ============================================================================

function getDims(ctx?: ExtendedMapContext | null): { width: number; height: number } {
  if (ctx?.dimensions) {
    return { width: ctx.dimensions.width, height: ctx.dimensions.height };
  }
  const width = typeof GameplayMap !== "undefined" ? GameplayMap.getGridWidth() : 0;
  const height = typeof GameplayMap !== "undefined" ? GameplayMap.getGridHeight() : 0;
  return { width, height };
}

function rand(ctx: ExtendedMapContext | null | undefined, label: string, max: number): number {
  if (ctx) return ctxRandom(ctx, label, max);
  if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.getRandomNumber) {
    return TerrainBuilder.getRandomNumber(max, label);
  }
  return Math.floor(Math.random() * max);
}

function isWaterAt(
  ctx: ExtendedMapContext | null | undefined,
  x: number,
  y: number
): boolean {
  if (ctx?.adapter) return ctx.adapter.isWater(x, y);
  if (typeof GameplayMap !== "undefined" && GameplayMap?.isWater) {
    return GameplayMap.isWater(x, y);
  }
  return true;
}

function isAdjacentToLand(
  ctx: ExtendedMapContext | null | undefined,
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
      if (!isWaterAt(ctx, nx, ny)) return true;
    }
  }
  return false;
}

function isCoastalLand(
  ctx: ExtendedMapContext | null | undefined,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (isWaterAt(ctx, x, y)) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (isWaterAt(ctx, nx, ny)) return true;
    }
  }
  return false;
}

function latitudeAbsDeg(
  ctx: ExtendedMapContext | null | undefined,
  x: number,
  y: number,
  height: number
): number {
  const adapter = ctx?.adapter;
  if (adapter?.getLatitude) {
    return Math.abs(adapter.getLatitude(x, y));
  }
  // Fallback approximation: -90..90 from y position.
  const norm = height > 0 ? y / height : 0;
  return Math.abs(90 - norm * 180);
}

// ============================================================================
// Margins
// ============================================================================

/**
 * Tag active/passive continental margins and publish a margins overlay.
 * Hydrates StoryTags.activeMargin/passiveShelf by default.
 */
export function storyTagContinentalMargins(
  ctx: ExtendedMapContext | null = null,
  options: ContinentalMarginsOptions = {}
): StoryOverlaySnapshot {
  const { width, height } = getDims(ctx);
  const tunables = getTunables();
  const marginsCfg = (tunables.FOUNDATION_CFG as Record<string, unknown>)?.margins as
    | Record<string, number>
    | undefined;

  const area = Math.max(1, width * height);
  const sqrt = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

  const baseActiveFrac = Number.isFinite(marginsCfg?.activeFraction)
    ? (marginsCfg!.activeFraction as number)
    : 0.25;
  const basePassiveFrac = Number.isFinite(marginsCfg?.passiveFraction)
    ? (marginsCfg!.passiveFraction as number)
    : 0.25;

  const activeFrac = Math.min(0.35, baseActiveFrac + 0.05 * (sqrt - 1));
  const passiveFrac = Math.min(0.35, basePassiveFrac + 0.05 * (sqrt - 1));

  const baseMinSeg = Number.isFinite(marginsCfg?.minSegmentLength)
    ? (marginsCfg!.minSegmentLength as number)
    : 12;
  const minSegLen = Math.max(10, Math.round(baseMinSeg * (0.9 + 0.4 * sqrt)));

  // Count total coastal land to set quotas.
  let totalCoast = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isCoastalLand(ctx, x, y, width, height)) totalCoast++;
    }
  }

  const targetActive = Math.floor(totalCoast * activeFrac);
  const targetPassive = Math.floor(totalCoast * passiveFrac);

  let markedActive = 0;
  let markedPassive = 0;
  const activeSet = new Set<string>();
  const passiveSet = new Set<string>();

  function markSegment(y: number, x0: number, x1: number, active: boolean): void {
    for (let x = x0; x <= x1; x++) {
      if (!isCoastalLand(ctx, x, y, width, height)) continue;
      const k = storyKey(x, y);
      if (active) {
        if (markedActive >= targetActive) break;
        if (!activeSet.has(k)) {
          activeSet.add(k);
          markedActive++;
        }
      } else {
        if (markedPassive >= targetPassive) break;
        if (!passiveSet.has(k)) {
          passiveSet.add(k);
          markedPassive++;
        }
      }
    }
  }

  let preferActive = true;
  for (let y = 1; y < height - 1; y++) {
    let x = 1;
    while (x < width - 1) {
      while (x < width - 1 && !isCoastalLand(ctx, x, y, width, height)) x++;
      if (x >= width - 1) break;

      const start = x;
      while (x < width - 1 && isCoastalLand(ctx, x, y, width, height)) x++;
      const end = x - 1;
      const segLen = end - start + 1;

      if (segLen >= minSegLen) {
        const roll = rand(ctx, "MarginSelect", 100);
        const pickActive =
          (preferActive && roll < 60) || (!preferActive && roll < 40);

        if (pickActive && markedActive < targetActive) {
          markSegment(y, start, end, true);
        } else if (markedPassive < targetPassive) {
          markSegment(y, start, end, false);
        }
        preferActive = !preferActive;
      }
    }
  }

  const overlay = {
    kind: STORY_OVERLAY_KEYS.MARGINS,
    version: 1,
    width,
    height,
    active: Array.from(activeSet),
    passive: Array.from(passiveSet),
    summary: {
      active: markedActive,
      passive: markedPassive,
      targetActive,
      targetPassive,
      minSegmentLength: minSegLen,
    },
  };

  const shouldPublish = options.publish !== false;
  const snapshot = shouldPublish
    ? publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.MARGINS, overlay)
    : finalizeStoryOverlay(STORY_OVERLAY_KEYS.MARGINS, overlay);

  if (options.hydrateStoryTags !== false) {
    hydrateMarginsStoryTags(snapshot, getStoryTags());
  }

  return snapshot;
}

// ============================================================================
// Hotspot Trails
// ============================================================================

/**
 * Tag deep-ocean hotspot trails as sparse polylines.
 */
export function storyTagHotspotTrails(
  ctx: ExtendedMapContext | null = null
): HotspotTrailsSummary {
  const { width, height } = getDims(ctx);
  const tunables = getTunables();
  const storyCfg = (tunables.FOUNDATION_CFG?.story || {}) as Record<string, unknown>;
  const hotspotCfg = (storyCfg.hotspot || {}) as Record<string, number>;

  const areaHot = Math.max(1, width * height);
  const sqrtHot = Math.min(2.0, Math.max(0.6, Math.sqrt(areaHot / 10000)));

  const baseMaxTrails = hotspotCfg.maxTrails ?? 12;
  const baseSteps = hotspotCfg.steps ?? 15;
  const stepLen = Math.max(1, (hotspotCfg.stepLen ?? 2) | 0);
  const minDistFromLand = Math.max(0, (hotspotCfg.minDistFromLand ?? 5) | 0);
  const minTrailSeparation = Math.max(1, (hotspotCfg.minTrailSeparation ?? 12) | 0);

  const maxTrails = Math.max(
    1,
    Math.round(baseMaxTrails * (0.9 + 0.6 * sqrtHot))
  );
  const steps = Math.max(
    1,
    Math.round(baseSteps * (0.9 + 0.4 * sqrtHot))
  );

  const StoryTags = getStoryTags();

  function farFromExisting(x: number, y: number): boolean {
    for (const key of StoryTags.hotspot) {
      const [sx, sy] = key.split(",").map(Number);
      const d = Math.abs(sx - x) + Math.abs(sy - y);
      if (d < minTrailSeparation) return false;
    }
    return true;
  }

  let trailsMade = 0;
  let totalPoints = 0;
  let attempts = 0;

  while (trailsMade < maxTrails && attempts < 200) {
    attempts++;
    const sx = rand(ctx, "HotspotSeedX", width);
    const sy = rand(ctx, "HotspotSeedY", height);

    if (!inBounds(sx, sy, width, height)) continue;
    if (!isWaterAt(ctx, sx, sy)) continue;
    if (isAdjacentToLand(ctx, sx, sy, minDistFromLand, width, height)) continue;
    if (!farFromExisting(sx, sy)) continue;

    const dirs: Array<[number, number]> = [
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
    ];

    let dIndex = rand(ctx, "HotspotDir", dirs.length);
    let [dx, dy] = dirs[dIndex];
    let x = sx;
    let y = sy;
    let taggedThisTrail = 0;

    for (let s = 0; s < steps; s++) {
      x += dx * stepLen;
      y += dy * stepLen;

      if (!inBounds(x, y, width, height)) break;
      if (!isWaterAt(ctx, x, y)) continue;
      if (isAdjacentToLand(ctx, x, y, minDistFromLand, width, height)) continue;

      StoryTags.hotspot.add(storyKey(x, y));
      taggedThisTrail++;
      totalPoints++;

      if (rand(ctx, "HotspotBend", 5) === 0) {
        dIndex = (dIndex + (rand(ctx, "HotspotTurn", 3) - 1) + dirs.length) % dirs.length;
        [dx, dy] = dirs[dIndex];
      }
    }

    if (taggedThisTrail > 0) trailsMade++;
  }

  const summary = { trails: trailsMade, points: totalPoints };

  publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.HOTSPOTS, {
    kind: STORY_OVERLAY_KEYS.HOTSPOTS,
    version: 1,
    width,
    height,
    active: Array.from(StoryTags.hotspot),
    summary: { trails: summary.trails, points: summary.points },
  });

  return summary;
}

// ============================================================================
// Rift Valleys
// ============================================================================

/**
 * Tag inland rift valleys using foundation riftPotential when available.
 * Falls back to legacy random marching when foundation is disabled.
 */
export function storyTagRiftValleys(
  ctx: ExtendedMapContext | null = null
): RiftValleysSummary {
  const { width, height } = getDims(ctx);
  const tunables = getTunables();
  const storyCfg = (tunables.FOUNDATION_CFG?.story || {}) as Record<string, unknown>;
  const riftCfg = (storyCfg.rift || {}) as Record<string, number>;

  const areaRift = Math.max(1, width * height);
  const sqrtRift = Math.min(2.0, Math.max(0.6, Math.sqrt(areaRift / 10000)));

  const baseMaxRifts = riftCfg.maxRiftsPerMap ?? 3;
  const baseLineSteps = riftCfg.lineSteps ?? 18;
  const baseStepLen = riftCfg.stepLen ?? 2;
  const baseShoulderWidth = riftCfg.shoulderWidth ?? 1;

  const maxRiftsPerMap = Math.max(
    1,
    Math.round(baseMaxRifts * (0.8 + 0.6 * sqrtRift))
  );
  const lineSteps = Math.max(
    1,
    Math.round(baseLineSteps * (0.9 + 0.4 * sqrtRift))
  );
  const stepLen = Math.max(1, baseStepLen | 0);
  const shoulderWidth = (baseShoulderWidth | 0) + (sqrtRift > 1.5 ? 1 : 0);

  const StoryTags = getStoryTags();

  const foundation = ctx?.foundation;
  const plates = foundation?.plates;
  const useFoundation =
    !!plates &&
    plates.riftPotential &&
    plates.boundaryType &&
    plates.boundaryCloseness;

  const idx = (x: number, y: number): number => y * width + x;

  if (useFoundation && plates) {
    const RP = plates.riftPotential;
    const BT = plates.boundaryType; // 2 = divergent
    const BC = plates.boundaryCloseness;

    const latDegAt = (y: number): number => latitudeAbsDeg(ctx, 0, y, height);

    // Find sparse local maxima on divergent boundaries over land.
    const seeds: Array<{ x: number; y: number; v: number }> = [];
    let thr = 192;
    let attempts = 0;

    while (attempts++ < 6) {
      seeds.length = 0;
      for (let y = 1; y < height - 1; y++) {
        if (latDegAt(y) > 70) continue;
        for (let x = 1; x < width - 1; x++) {
          if (isWaterAt(ctx, x, y)) continue;
          const i = idx(x, y);
          if (BT[i] !== 2 || BC[i] <= 32 || RP[i] < thr) continue;

          const v = RP[i];
          let isPeak = true;
          for (let dy = -1; dy <= 1 && isPeak; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (RP[idx(x + dx, y + dy)] > v) {
                isPeak = false;
                break;
              }
            }
          }
          if (isPeak) seeds.push({ x, y, v });
        }
      }
      if (seeds.length >= maxRiftsPerMap * 2 || thr <= 112) break;
      thr -= 16;
    }

    seeds.sort((a, b) => b.v - a.v);

    const chosen: Array<{ x: number; y: number; v: number }> = [];
    const minSeedSep = Math.round(sqrtRift > 1.5 ? 18 : 14);

    for (const s of seeds) {
      if (chosen.length >= maxRiftsPerMap) break;
      const farEnough = chosen.every(
        (c) => Math.abs(c.x - s.x) + Math.abs(c.y - s.y) >= minSeedSep
      );
      if (farEnough) chosen.push(s);
    }

    let riftsMade = 0;
    let lineCount = 0;
    let shoulderCount = 0;

    function tagShoulders(x: number, y: number, sdx: number, sdy: number): void {
      for (let off = 1; off <= shoulderWidth; off++) {
        const px = x + -sdy * off;
        const py = y + sdx * off;
        const qx = x + sdy * off;
        const qy = y + -sdx * off;

        if (inBounds(px, py, width, height) && !isWaterAt(ctx, px, py)) {
          const pk = storyKey(px, py);
          if (!StoryTags.riftShoulder.has(pk)) {
            StoryTags.riftShoulder.add(pk);
            shoulderCount++;
          }
        }
        if (inBounds(qx, qy, width, height) && !isWaterAt(ctx, qx, qy)) {
          const qk = storyKey(qx, qy);
          if (!StoryTags.riftShoulder.has(qk)) {
            StoryTags.riftShoulder.add(qk);
            shoulderCount++;
          }
        }
      }
    }

    for (const seed of chosen) {
      let x = seed.x;
      let y = seed.y;
      if (latDegAt(y) > 70) continue;

      let sdx = 1;
      let sdy = 0;
      {
        let best = -1;
        let bdx = 1;
        let bdy = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny, width, height) || isWaterAt(ctx, nx, ny)) continue;
            const p = RP[idx(nx, ny)];
            if (p > best) {
              best = p;
              bdx = dx;
              bdy = dy;
            }
          }
        }
        sdx = bdx;
        sdy = bdy;
      }

      let placedAny = false;

      for (let s = 0; s < lineSteps; s++) {
        if (!inBounds(x, y, width, height) || isWaterAt(ctx, x, y) || latDegAt(y) > 70) break;

        const k = storyKey(x, y);
        if (!StoryTags.riftLine.has(k)) {
          StoryTags.riftLine.add(k);
          lineCount++;
        }
        placedAny = true;
        tagShoulders(x, y, sdx, sdy);

        function stepDirBias(tx: number, ty: number): number {
          try {
            const DIR = (tunables.FOUNDATION_DIRECTIONALITY || {}) as Record<string, unknown>;
            const coh = clamp(Number(DIR.cohesion ?? 0), 0, 1);
            const interplay = (DIR.interplay || {}) as Record<string, number>;
            const follow = clamp(Number(interplay.riftsFollowPlates ?? 0), 0, 1) * coh;
            if (follow <= 0) return 0;
            const primaryAxes = (DIR.primaryAxes || {}) as Record<string, number>;
            const deg = (primaryAxes.plateAxisDeg ?? 0) | 0;
            const rad = (deg * Math.PI) / 180;
            const ax = Math.cos(rad);
            const ay = Math.sin(rad);
            const vlen = Math.max(1, Math.hypot(tx, ty));
            const vx = tx / vlen;
            const vy = ty / vlen;
            const dot = ax * vx + ay * vy;
            return Math.round(10 * follow * dot);
          } catch {
            return 0;
          }
        }

        let bestScore = -1;
        let ndx = sdx;
        let ndy = sdy;
        let nx = x;
        let ny = y;

        for (let ty = -1; ty <= 1; ty++) {
          for (let tx = -1; tx <= 1; tx++) {
            if (tx === 0 && ty === 0) continue;
            const cx = x + tx * stepLen;
            const cy = y + ty * stepLen;
            if (!inBounds(cx, cy, width, height) || isWaterAt(ctx, cx, cy)) continue;
            const p = RP[idx(cx, cy)];
            const align =
              tx === sdx && ty === sdy ? 16 : tx === -sdx && ty === -sdy ? -12 : 0;
            const score = p + align + stepDirBias(tx, ty);
            if (score > bestScore) {
              bestScore = score;
              ndx = tx;
              ndy = ty;
              nx = cx;
              ny = cy;
            }
          }
        }

        const ii = inBounds(nx, ny, width, height) ? idx(nx, ny) : -1;
        if (ii < 0 || BT[ii] !== 2 || BC[ii] <= 16 || RP[ii] < 64) break;

        x = nx;
        y = ny;
        sdx = ndx;
        sdy = ndy;
      }

      if (placedAny) riftsMade++;
      if (riftsMade >= maxRiftsPerMap) break;
    }

    const summary: RiftValleysSummary = {
      rifts: riftsMade,
      lineTiles: lineCount,
      shoulderTiles: shoulderCount,
      kind: "foundation",
    };

    publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.RIFTS, {
      kind: STORY_OVERLAY_KEYS.RIFTS,
      version: 1,
      width,
      height,
      active: Array.from(StoryTags.riftLine),
      passive: Array.from(StoryTags.riftShoulder),
      summary: {
        rifts: summary.rifts,
        lineTiles: summary.lineTiles,
        shoulderTiles: summary.shoulderTiles,
        kind: summary.kind,
      },
    });

    return summary;
  }

  // Legacy random marching fallback.
  const dirsNS: Array<[number, number]> = [
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
  ];
  const dirsEW: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [1, 1],
    [-1, -1],
  ];

  let riftsMade = 0;
  let lineCount = 0;
  let shoulderCount = 0;
  let tries = 0;

  while (riftsMade < maxRiftsPerMap && tries < 300) {
    tries++;
    const sx = rand(ctx, "RiftSeedX", width);
    const sy = rand(ctx, "RiftSeedY", height);

    if (!inBounds(sx, sy, width, height)) continue;
    if (isWaterAt(ctx, sx, sy)) continue;
    if (latitudeAbsDeg(ctx, sx, sy, height) > 70) continue;

    const elev = ctx?.adapter?.getElevation ? ctx.adapter.getElevation(sx, sy) : 0;
    if (elev > 500) continue;

    const useNS = rand(ctx, "RiftAxis", 2) === 0;
    let dir = useNS
      ? dirsNS[rand(ctx, "RiftDirNS", dirsNS.length)]
      : dirsEW[rand(ctx, "RiftDirEW", dirsEW.length)];

    let [dx, dy] = dir;
    let x = sx;
    let y = sy;
    let placedAny = false;

    for (let s = 0; s < lineSteps; s++) {
      x += dx * stepLen;
      y += dy * stepLen;

      if (!inBounds(x, y, width, height)) break;
      if (isWaterAt(ctx, x, y)) continue;

      const k = storyKey(x, y);
      if (!StoryTags.riftLine.has(k)) {
        StoryTags.riftLine.add(k);
        lineCount++;
      }
      placedAny = true;

      for (let off = 1; off <= shoulderWidth; off++) {
        const px = x + -dy * off;
        const py = y + dx * off;
        const qx = x + dy * off;
        const qy = y + -dx * off;

        if (inBounds(px, py, width, height) && !isWaterAt(ctx, px, py)) {
          const pk = storyKey(px, py);
          if (!StoryTags.riftShoulder.has(pk)) {
            StoryTags.riftShoulder.add(pk);
            shoulderCount++;
          }
        }
        if (inBounds(qx, qy, width, height) && !isWaterAt(ctx, qx, qy)) {
          const qk = storyKey(qx, qy);
          if (!StoryTags.riftShoulder.has(qk)) {
            StoryTags.riftShoulder.add(qk);
            shoulderCount++;
          }
        }
      }

      if (rand(ctx, "RiftBend", 6) === 0) {
        dir = useNS
          ? dirsNS[rand(ctx, "RiftDirNS2", dirsNS.length)]
          : dirsEW[rand(ctx, "RiftDirEW2", dirsEW.length)];
        [dx, dy] = dir;
      }
    }

    if (placedAny) riftsMade++;
  }

  const summary: RiftValleysSummary = {
    rifts: riftsMade,
    lineTiles: lineCount,
    shoulderTiles: shoulderCount,
    kind: "legacy",
  };

  publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.RIFTS, {
    kind: STORY_OVERLAY_KEYS.RIFTS,
    version: 1,
    width,
    height,
    active: Array.from(StoryTags.riftLine),
    passive: Array.from(StoryTags.riftShoulder),
    summary: {
      rifts: summary.rifts,
      lineTiles: summary.lineTiles,
      shoulderTiles: summary.shoulderTiles,
      kind: summary.kind,
    },
  });

  return summary;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  storyTagContinentalMargins,
  storyTagHotspotTrails,
  storyTagRiftValleys,
};
