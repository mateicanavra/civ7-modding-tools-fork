/**
 * MountainPassStrategy — Mountain pass detection and corridor creation
 *
 * Purpose:
 * - Identify contiguous mountain ranges that form barriers
 * - Detect natural pass locations (saddle points, gaps, low points)
 * - Create traversable corridors through mountain ranges
 * - Optionally convert strategic mountain tiles to hills for playability
 *
 * Algorithm:
 * 1. Flood-fill to identify distinct mountain ranges
 * 2. For each significant range, find the "spine" (ridge line)
 * 3. Detect saddle points (local elevation minima along the ridge)
 * 4. Find gaps where non-mountain terrain is flanked by mountains
 * 5. Score passes by strategic value (connectivity, elevation, width)
 * 6. Tag or modify terrain to create playable passes
 *
 * Invariants:
 * - Never creates passes through single-tile mountain barriers (already passable)
 * - Respects maxPasses configuration limit
 * - Uses deterministic RNG for reproducibility
 * - O(width × height) for range detection, O(ranges × perimeter) for pass finding
 */

import type { ExtendedMapContext } from "../../../core/types.js";
import { inBounds, storyKey } from "../../../core/index.js";
import { getStoryTags } from "../tags/index.js";
import { assignCorridorMetadata } from "./style-cache.js";
import { getDims, rand } from "./runtime.js";
import { MOUNTAIN_TERRAIN, HILL_TERRAIN } from "../../../core/terrain-constants.js";

// ============================================================================
// Types
// ============================================================================

interface MountainRange {
  id: number;
  tiles: Array<{ x: number; y: number }>;
  perimeter: Array<{ x: number; y: number }>;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  size: number;
  spanX: number;
  spanY: number;
}

interface PassCandidate {
  x: number;
  y: number;
  rangeId: number;
  type: "saddle" | "gap" | "river" | "notch";
  elevation: number;
  score: number;
  width: number;
  adjacentRanges: number[];
}

interface MountainPassConfig {
  maxPasses: number;
  minRangeSize: number;
  minRangeSpan: number;
  passSpacing: number;
  saddleSearchRadius: number;
  convertToHills: boolean;
  passWidth: number;
}

// ============================================================================
// Mountain Range Detection
// ============================================================================

function isMountainTile(ctx: ExtendedMapContext, x: number, y: number): boolean {
  try {
    // Check via adapter first
    if (ctx.adapter.isMountain?.(x, y)) return true;
    // Fallback to terrain type check
    const terrain = ctx.adapter.getTerrainType(x, y);
    return terrain === MOUNTAIN_TERRAIN;
  } catch {
    return false;
  }
}

function isHillTile(ctx: ExtendedMapContext, x: number, y: number): boolean {
  try {
    const terrain = ctx.adapter.getTerrainType(x, y);
    return terrain === HILL_TERRAIN;
  } catch {
    return false;
  }
}

function floodFillMountainRange(
  ctx: ExtendedMapContext,
  startX: number,
  startY: number,
  width: number,
  height: number,
  visited: Set<string>
): MountainRange | null {
  const tiles: Array<{ x: number; y: number }> = [];
  const perimeter: Array<{ x: number; y: number }> = [];
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

  let minX = startX,
    maxX = startX;
  let minY = startY,
    maxY = startY;

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const key = storyKey(x, y);

    if (visited.has(key)) continue;
    if (!inBounds(x, y, width, height)) continue;
    if (!isMountainTile(ctx, x, y)) continue;

    visited.add(key);
    tiles.push({ x, y });

    // Track bounds
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // Check if this is a perimeter tile (adjacent to non-mountain)
    let isPerimeter = false;
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    for (const n of neighbors) {
      if (!inBounds(n.x, n.y, width, height)) {
        isPerimeter = true;
        continue;
      }

      if (!isMountainTile(ctx, n.x, n.y)) {
        isPerimeter = true;
      } else if (!visited.has(storyKey(n.x, n.y))) {
        stack.push(n);
      }
    }

    if (isPerimeter) {
      perimeter.push({ x, y });
    }
  }

  if (tiles.length === 0) return null;

  return {
    id: 0, // Will be assigned later
    tiles,
    perimeter,
    minX,
    maxX,
    minY,
    maxY,
    size: tiles.length,
    spanX: maxX - minX + 1,
    spanY: maxY - minY + 1,
  };
}

function identifyMountainRanges(
  ctx: ExtendedMapContext,
  width: number,
  height: number,
  config: MountainPassConfig
): MountainRange[] {
  const visited = new Set<string>();
  const ranges: MountainRange[] = [];
  let rangeId = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = storyKey(x, y);
      if (visited.has(key)) continue;

      if (!isMountainTile(ctx, x, y)) {
        visited.add(key);
        continue;
      }

      const range = floodFillMountainRange(ctx, x, y, width, height, visited);
      if (!range) continue;

      // Filter by size and span
      const span = Math.max(range.spanX, range.spanY);
      if (range.size < config.minRangeSize) continue;
      if (span < config.minRangeSpan) continue;

      range.id = rangeId++;
      ranges.push(range);
    }
  }

  return ranges;
}

// ============================================================================
// Pass Detection
// ============================================================================

function findSaddlePoints(
  ctx: ExtendedMapContext,
  range: MountainRange,
  width: number,
  height: number,
  config: MountainPassConfig
): PassCandidate[] {
  const candidates: PassCandidate[] = [];
  const radius = config.saddleSearchRadius;

  // Find perimeter tiles with lower elevation than neighbors along the ridge
  for (const tile of range.perimeter) {
    const { x, y } = tile;
    const elevation = ctx.adapter.getElevation(x, y);

    // Count mountain neighbors and non-mountain neighbors
    let mountainNeighbors = 0;
    let nonMountainNeighbors = 0;
    let totalNeighborElev = 0;
    let neighborCount = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny, width, height)) continue;

        if (isMountainTile(ctx, nx, ny)) {
          mountainNeighbors++;
          totalNeighborElev += ctx.adapter.getElevation(nx, ny);
          neighborCount++;
        } else if (!ctx.adapter.isWater(nx, ny)) {
          nonMountainNeighbors++;
        }
      }
    }

    // Saddle point criteria:
    // - On the edge of the range (has non-mountain neighbors)
    // - Lower elevation than average mountain neighbors
    // - Has significant mountain mass on multiple sides
    if (
      nonMountainNeighbors >= 1 &&
      mountainNeighbors >= 3 &&
      neighborCount > 0
    ) {
      const avgNeighborElev = totalNeighborElev / neighborCount;
      if (elevation < avgNeighborElev * 0.95) {
        // Determine pass width (how many adjacent passable tiles)
        let passWidth = 1;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny, width, height)) continue;
            if (!isMountainTile(ctx, nx, ny) && !ctx.adapter.isWater(nx, ny)) {
              passWidth++;
            }
          }
        }

        const elevDiff = avgNeighborElev - elevation;
        const score =
          elevDiff * 0.5 + // Prefer lower relative to neighbors
          mountainNeighbors * 2 + // Prefer tiles embedded in range
          passWidth * 3; // Prefer narrower passes (more strategic)

        candidates.push({
          x,
          y,
          rangeId: range.id,
          type: "saddle",
          elevation,
          score,
          width: passWidth,
          adjacentRanges: [range.id],
        });
      }
    }
  }

  return candidates;
}

function findGapPasses(
  ctx: ExtendedMapContext,
  range: MountainRange,
  width: number,
  height: number
): PassCandidate[] {
  const candidates: PassCandidate[] = [];

  // Look for non-mountain tiles that are flanked by mountains on opposite sides
  // These are natural "gap" passes through the range

  const rangeSet = new Set<string>();
  for (const t of range.tiles) {
    rangeSet.add(storyKey(t.x, t.y));
  }

  // Check tiles adjacent to the range
  const checked = new Set<string>();
  for (const perim of range.perimeter) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = perim.x + dx;
        const ny = perim.y + dy;
        const key = storyKey(nx, ny);

        if (checked.has(key)) continue;
        checked.add(key);

        if (!inBounds(nx, ny, width, height)) continue;
        if (isMountainTile(ctx, nx, ny)) continue;
        if (ctx.adapter.isWater(nx, ny)) continue;

        // Check for mountains on opposite sides (N-S or E-W)
        const hasNorth =
          inBounds(nx, ny - 1, width, height) && rangeSet.has(storyKey(nx, ny - 1));
        const hasSouth =
          inBounds(nx, ny + 1, width, height) && rangeSet.has(storyKey(nx, ny + 1));
        const hasEast =
          inBounds(nx + 1, ny, width, height) && rangeSet.has(storyKey(nx + 1, ny));
        const hasWest =
          inBounds(nx - 1, ny, width, height) && rangeSet.has(storyKey(nx - 1, ny));

        const nsGap = hasNorth && hasSouth;
        const ewGap = hasEast && hasWest;

        if (nsGap || ewGap) {
          const elevation = ctx.adapter.getElevation(nx, ny);
          const score =
            50 + // Base score for gaps (they're very valuable)
            (nsGap && ewGap ? 20 : 0) + // Bonus for cross-gap
            (isHillTile(ctx, nx, ny) ? 10 : 0); // Hills are natural passes

          candidates.push({
            x: nx,
            y: ny,
            rangeId: range.id,
            type: "gap",
            elevation,
            score,
            width: 1,
            adjacentRanges: [range.id],
          });
        }
      }
    }
  }

  return candidates;
}

function findNotchPasses(
  ctx: ExtendedMapContext,
  range: MountainRange,
  width: number,
  height: number
): PassCandidate[] {
  const candidates: PassCandidate[] = [];

  // A "notch" is a mountain tile that, if converted to a hill,
  // would create a pass through the range
  // We look for thin sections of the range

  const rangeSet = new Set<string>();
  for (const t of range.tiles) {
    rangeSet.add(storyKey(t.x, t.y));
  }

  for (const tile of range.tiles) {
    const { x, y } = tile;

    // Check if this tile is a "bridge" - removing it would disconnect the range
    // Simplified: look for tiles with non-mountain on two opposite sides

    const terrain = [
      { dx: 0, dy: -1, opposite: { dx: 0, dy: 1 } }, // N-S
      { dx: -1, dy: 0, opposite: { dx: 1, dy: 0 } }, // W-E
      { dx: -1, dy: -1, opposite: { dx: 1, dy: 1 } }, // NW-SE
      { dx: -1, dy: 1, opposite: { dx: 1, dy: -1 } }, // SW-NE
    ];

    for (const axis of terrain) {
      const n1x = x + axis.dx;
      const n1y = y + axis.dy;
      const n2x = x + axis.opposite.dx;
      const n2y = y + axis.opposite.dy;

      if (!inBounds(n1x, n1y, width, height)) continue;
      if (!inBounds(n2x, n2y, width, height)) continue;

      const n1IsMtn = rangeSet.has(storyKey(n1x, n1y));
      const n2IsMtn = rangeSet.has(storyKey(n2x, n2y));

      // Both sides have mountains - this is a potential notch
      if (n1IsMtn && n2IsMtn) {
        // Check perpendicular direction for non-mountain
        const perpDx = axis.dy;
        const perpDy = -axis.dx;

        const p1x = x + perpDx;
        const p1y = y + perpDy;
        const p2x = x - perpDx;
        const p2y = y - perpDy;

        const p1Clear =
          inBounds(p1x, p1y, width, height) &&
          !rangeSet.has(storyKey(p1x, p1y)) &&
          !ctx.adapter.isWater(p1x, p1y);
        const p2Clear =
          inBounds(p2x, p2y, width, height) &&
          !rangeSet.has(storyKey(p2x, p2y)) &&
          !ctx.adapter.isWater(p2x, p2y);

        if (p1Clear || p2Clear) {
          const elevation = ctx.adapter.getElevation(x, y);

          // Score: prefer lower elevation, tiles that connect two clear sides
          const score =
            30 + // Base
            (p1Clear && p2Clear ? 40 : 0) + // Full pass-through potential
            (1000 - Math.min(1000, elevation)) * 0.02; // Lower is better

          candidates.push({
            x,
            y,
            rangeId: range.id,
            type: "notch",
            elevation,
            score,
            width: 1,
            adjacentRanges: [range.id],
          });
          break; // Only count this tile once
        }
      }
    }
  }

  return candidates;
}

function findRiverPasses(
  ctx: ExtendedMapContext,
  range: MountainRange,
  width: number,
  height: number
): PassCandidate[] {
  const candidates: PassCandidate[] = [];

  // Rivers have already found paths through terrain
  // Look for river-adjacent tiles near the range

  const rangeSet = new Set<string>();
  for (const t of range.tiles) {
    rangeSet.add(storyKey(t.x, t.y));
  }

  const checked = new Set<string>();
  for (const perim of range.perimeter) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = perim.x + dx;
        const ny = perim.y + dy;
        const key = storyKey(nx, ny);

        if (checked.has(key)) continue;
        checked.add(key);

        if (!inBounds(nx, ny, width, height)) continue;
        if (ctx.adapter.isWater(nx, ny)) continue;
        if (rangeSet.has(key)) continue;

        // Check if this tile is river-adjacent
        try {
          const isRiverAdj = ctx.adapter.isRiverAdjacent?.(nx, ny);
          if (!isRiverAdj) continue;
        } catch {
          continue;
        }

        // Check if it's also mountain-adjacent
        let mtnAdjCount = 0;
        for (let ndy = -1; ndy <= 1; ndy++) {
          for (let ndx = -1; ndx <= 1; ndx++) {
            if (ndx === 0 && ndy === 0) continue;
            if (rangeSet.has(storyKey(nx + ndx, ny + ndy))) mtnAdjCount++;
          }
        }

        if (mtnAdjCount >= 2) {
          const elevation = ctx.adapter.getElevation(nx, ny);
          const score =
            60 + // Rivers are great natural passes
            mtnAdjCount * 5 +
            (isHillTile(ctx, nx, ny) ? 10 : 0);

          candidates.push({
            x: nx,
            y: ny,
            rangeId: range.id,
            type: "river",
            elevation,
            score,
            width: 2,
            adjacentRanges: [range.id],
          });
        }
      }
    }
  }

  return candidates;
}

// ============================================================================
// Pass Selection and Application
// ============================================================================

function selectBestPasses(
  candidates: PassCandidate[],
  config: MountainPassConfig,
  ctx: ExtendedMapContext
): PassCandidate[] {
  if (candidates.length === 0) return [];

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  const selected: PassCandidate[] = [];
  const usedLocations = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= config.maxPasses) break;

    // Check spacing from already selected passes
    let tooClose = false;
    for (const existing of selected) {
      const dist =
        Math.abs(existing.x - candidate.x) + Math.abs(existing.y - candidate.y);
      if (dist < config.passSpacing) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) continue;

    // Don't select the same location twice
    const key = storyKey(candidate.x, candidate.y);
    if (usedLocations.has(key)) continue;

    selected.push(candidate);
    usedLocations.add(key);

    // Also reserve adjacent tiles
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        usedLocations.add(storyKey(candidate.x + dx, candidate.y + dy));
      }
    }
  }

  return selected;
}

function applyPass(
  ctx: ExtendedMapContext,
  pass: PassCandidate,
  width: number,
  height: number,
  config: MountainPassConfig,
  tags: ReturnType<typeof getStoryTags>,
  corridorsCfg: Record<string, unknown>
): void {
  const { x, y, type } = pass;

  // Determine corridor style based on pass type
  let style = "mountain-pass";
  if (type === "river") style = "river-valley-pass";
  else if (type === "gap") style = "mountain-gap";
  else if (type === "notch") style = "mountain-notch";
  else if (type === "saddle") style = "saddle-pass";

  // Tag the pass tile
  const key = storyKey(x, y);
  tags.corridorLandOpen.add(key);
  assignCorridorMetadata(ctx, corridorsCfg, key, "land", style);

  // If this is a notch (mountain tile) and conversion is enabled, convert to hill
  if (type === "notch" && config.convertToHills) {
    try {
      ctx.adapter.setTerrainType(x, y, HILL_TERRAIN);
    } catch {
      // Adapter may not support terrain modification
    }
  }

  // Widen the pass if configured
  if (config.passWidth > 1) {
    const additionalTiles: Array<{ x: number; y: number }> = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny, width, height)) continue;
        if (ctx.adapter.isWater(nx, ny)) continue;

        // For notches, also convert adjacent mountain tiles
        if (config.convertToHills && isMountainTile(ctx, nx, ny)) {
          additionalTiles.push({ x: nx, y: ny });
        }

        // Tag as part of pass corridor
        const nKey = storyKey(nx, ny);
        if (!tags.corridorLandOpen.has(nKey)) {
          tags.corridorLandOpen.add(nKey);
          assignCorridorMetadata(ctx, corridorsCfg, nKey, "land", `${style}-approach`);
        }
      }
    }

    // Convert additional tiles to hills (limited by passWidth)
    const toConvert = additionalTiles.slice(0, config.passWidth - 1);
    for (const tile of toConvert) {
      try {
        ctx.adapter.setTerrainType(tile.x, tile.y, HILL_TERRAIN);
      } catch {
        // Adapter may not support terrain modification
      }
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Detect mountain ranges and create strategic passes for playability.
 *
 * This function analyzes mountain terrain to find natural pass locations
 * and creates traversable corridors through mountain barriers.
 */
export function tagMountainPasses(
  ctx: ExtendedMapContext,
  corridorsCfg: Record<string, unknown>
): void {
  const cfg = ((corridorsCfg.mountainPass || {}) as Record<string, unknown>) || {};

  const { width, height } = getDims(ctx);
  const tags = getStoryTags(ctx);

  // Configuration with sensible defaults
  const config: MountainPassConfig = {
    maxPasses: Math.max(0, Number((cfg.maxPasses as number) ?? 6) | 0),
    minRangeSize: Math.max(3, Number((cfg.minRangeSize as number) ?? 8) | 0),
    minRangeSpan: Math.max(3, Number((cfg.minRangeSpan as number) ?? 5) | 0),
    passSpacing: Math.max(3, Number((cfg.passSpacing as number) ?? 8) | 0),
    saddleSearchRadius: Math.max(1, Number((cfg.saddleSearchRadius as number) ?? 2) | 0),
    convertToHills: (cfg.convertToHills as boolean) ?? true,
    passWidth: Math.max(1, Math.min(3, Number((cfg.passWidth as number) ?? 2) | 0)),
  };

  if (config.maxPasses === 0) return;

  // Step 1: Identify mountain ranges
  const ranges = identifyMountainRanges(ctx, width, height, config);
  if (ranges.length === 0) return;

  console.log(`[MountainPass] Found ${ranges.length} mountain ranges`);

  // Step 2: Find pass candidates for each range
  const allCandidates: PassCandidate[] = [];

  for (const range of ranges) {
    // Skip small ranges
    if (range.size < config.minRangeSize) continue;

    const saddles = findSaddlePoints(ctx, range, width, height, config);
    const gaps = findGapPasses(ctx, range, width, height);
    const notches = findNotchPasses(ctx, range, width, height);
    const rivers = findRiverPasses(ctx, range, width, height);

    allCandidates.push(...saddles, ...gaps, ...notches, ...rivers);
  }

  if (allCandidates.length === 0) {
    console.log("[MountainPass] No pass candidates found");
    return;
  }

  console.log(`[MountainPass] Found ${allCandidates.length} pass candidates`);

  // Step 3: Select best passes
  const selectedPasses = selectBestPasses(allCandidates, config, ctx);

  console.log(`[MountainPass] Selected ${selectedPasses.length} passes`);

  // Step 4: Apply passes (tag corridors and optionally modify terrain)
  for (const pass of selectedPasses) {
    applyPass(ctx, pass, width, height, config, tags, corridorsCfg);
  }

  // Log summary by type
  const byType = new Map<string, number>();
  for (const p of selectedPasses) {
    byType.set(p.type, (byType.get(p.type) || 0) + 1);
  }
  console.log(
    `[MountainPass] Pass types: ${Array.from(byType.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`
  );
}

export default tagMountainPasses;
