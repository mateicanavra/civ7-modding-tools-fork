/**
 * IslandHopStrategy — Archipelago corridor detection and tagging
 *
 * Purpose:
 * - Identify island chains that form natural "stepping stone" routes
 * - Build a connectivity graph between nearby islands
 * - Find archipelago paths that connect regions across water
 * - Tag water tiles along these routes as island-hop corridors
 *
 * Algorithm:
 * 1. Flood-fill to identify distinct land masses, filtering for small islands
 * 2. Build a proximity graph where edges connect islands within hop distance
 * 3. Find connected components that span significant distance
 * 4. Score chains by length, island count, and geographic coverage
 * 5. Tag the top chains as island-hop corridors
 *
 * Invariants:
 * - Only tags water tiles (islands themselves are land)
 * - Respects maxArcs configuration limit
 * - Uses deterministic RNG for reproducibility
 * - O(width × height) for flood-fill, O(islands²) for graph building
 */

import type { ExtendedMapContext } from "../../../core/types.js";
import { inBounds, storyKey } from "../../../core/index.js";
import { getStoryTags } from "../tags/index.js";
import { assignCorridorMetadata } from "./style-cache.js";
import { getDims, rand } from "./runtime.js";

// ============================================================================
// Types
// ============================================================================

interface Island {
  id: number;
  tiles: Array<{ x: number; y: number }>;
  centroidX: number;
  centroidY: number;
  size: number;
  coastalTiles: Array<{ x: number; y: number }>;
}

interface IslandEdge {
  from: number;
  to: number;
  distance: number;
  pathTiles: Array<{ x: number; y: number }>;
}

interface IslandChain {
  islands: number[];
  waterPath: Array<{ x: number; y: number }>;
  score: number;
  span: number;
}

interface IslandHopConfig {
  maxArcs: number;
  maxIslandSize: number;
  minIslandSize: number;
  maxHopDistance: number;
  minChainIslands: number;
  minChainSpan: number;
  arcSpacing: number;
}

// ============================================================================
// Island Detection via Flood Fill
// ============================================================================

function floodFillLandmass(
  ctx: ExtendedMapContext,
  startX: number,
  startY: number,
  width: number,
  height: number,
  visited: Set<string>
): Array<{ x: number; y: number }> {
  const tiles: Array<{ x: number; y: number }> = [];
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const key = storyKey(x, y);

    if (visited.has(key)) continue;
    if (!inBounds(x, y, width, height)) continue;
    if (ctx.adapter.isWater(x, y)) continue;

    visited.add(key);
    tiles.push({ x, y });

    // 4-directional flood fill (more conservative island detection)
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    for (const n of neighbors) {
      if (!visited.has(storyKey(n.x, n.y))) {
        stack.push(n);
      }
    }
  }

  return tiles;
}

function identifyIslands(
  ctx: ExtendedMapContext,
  width: number,
  height: number,
  config: IslandHopConfig
): Island[] {
  const visited = new Set<string>();
  const islands: Island[] = [];
  let islandId = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = storyKey(x, y);
      if (visited.has(key)) continue;
      if (ctx.adapter.isWater(x, y)) {
        visited.add(key);
        continue;
      }

      const tiles = floodFillLandmass(ctx, x, y, width, height, visited);

      // Filter by size - we want small islands, not continents
      if (tiles.length < config.minIslandSize || tiles.length > config.maxIslandSize) {
        continue;
      }

      // Calculate centroid
      let sumX = 0;
      let sumY = 0;
      for (const t of tiles) {
        sumX += t.x;
        sumY += t.y;
      }
      const centroidX = sumX / tiles.length;
      const centroidY = sumY / tiles.length;

      // Find coastal tiles (land tiles adjacent to water)
      const coastalTiles: Array<{ x: number; y: number }> = [];
      for (const t of tiles) {
        let isCoastal = false;
        for (let dy = -1; dy <= 1 && !isCoastal; dy++) {
          for (let dx = -1; dx <= 1 && !isCoastal; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = t.x + dx;
            const ny = t.y + dy;
            if (inBounds(nx, ny, width, height) && ctx.adapter.isWater(nx, ny)) {
              isCoastal = true;
            }
          }
        }
        if (isCoastal) coastalTiles.push(t);
      }

      islands.push({
        id: islandId++,
        tiles,
        centroidX,
        centroidY,
        size: tiles.length,
        coastalTiles,
      });
    }
  }

  return islands;
}

// ============================================================================
// Graph Building
// ============================================================================

function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

function bresenhamWaterPath(
  ctx: ExtendedMapContext,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  height: number
): Array<{ x: number; y: number }> | null {
  // Bresenham's line algorithm to trace a path, checking all tiles are water
  const path: Array<{ x: number; y: number }> = [];

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    if (!inBounds(x, y, width, height)) return null;

    // Only add water tiles to the path
    if (ctx.adapter.isWater(x, y)) {
      path.push({ x, y });
    } else if (x !== x0 || y !== y0) {
      // Hit land that isn't our starting point - no clear water path
      // But allow some tolerance for near-shore tiles
      if (x !== x1 || y !== y1) {
        // Check if we're close to destination
        if (manhattanDistance(x, y, x1, y1) > 2) {
          return null;
        }
      }
    }

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return path;
}

function findBestWaterPath(
  ctx: ExtendedMapContext,
  islandA: Island,
  islandB: Island,
  width: number,
  height: number,
  maxDist: number
): { distance: number; path: Array<{ x: number; y: number }> } | null {
  // Try connecting from various coastal points to find a valid water path
  let bestPath: Array<{ x: number; y: number }> | null = null;
  let bestDist = Infinity;

  // Sample coastal tiles from each island
  const samplesA = islandA.coastalTiles.slice(0, Math.min(8, islandA.coastalTiles.length));
  const samplesB = islandB.coastalTiles.slice(0, Math.min(8, islandB.coastalTiles.length));

  for (const tileA of samplesA) {
    for (const tileB of samplesB) {
      const dist = manhattanDistance(tileA.x, tileA.y, tileB.x, tileB.y);
      if (dist > maxDist || dist >= bestDist) continue;

      const path = bresenhamWaterPath(ctx, tileA.x, tileA.y, tileB.x, tileB.y, width, height);
      if (path && path.length > 0) {
        bestPath = path;
        bestDist = dist;
      }
    }
  }

  if (bestPath) {
    return { distance: bestDist, path: bestPath };
  }
  return null;
}

function buildIslandGraph(
  ctx: ExtendedMapContext,
  islands: Island[],
  width: number,
  height: number,
  config: IslandHopConfig
): Map<number, IslandEdge[]> {
  const graph = new Map<number, IslandEdge[]>();

  // Initialize adjacency lists
  for (const island of islands) {
    graph.set(island.id, []);
  }

  // Find edges between islands within hop distance
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const islandA = islands[i];
      const islandB = islands[j];

      // Quick centroid distance check first
      const centroidDist = manhattanDistance(
        islandA.centroidX,
        islandA.centroidY,
        islandB.centroidX,
        islandB.centroidY
      );

      if (centroidDist > config.maxHopDistance * 1.5) continue;

      // Find actual water path
      const pathResult = findBestWaterPath(ctx, islandA, islandB, width, height, config.maxHopDistance);
      if (!pathResult) continue;

      const edge: IslandEdge = {
        from: islandA.id,
        to: islandB.id,
        distance: pathResult.distance,
        pathTiles: pathResult.path,
      };

      graph.get(islandA.id)!.push(edge);
      graph.get(islandB.id)!.push({
        from: islandB.id,
        to: islandA.id,
        distance: pathResult.distance,
        pathTiles: pathResult.path,
      });
    }
  }

  return graph;
}

// ============================================================================
// Chain Finding
// ============================================================================

function findLongestChainFromIsland(
  startId: number,
  islands: Map<number, Island>,
  graph: Map<number, IslandEdge[]>,
  minIslands: number
): IslandChain | null {
  // BFS/DFS to find the longest chain starting from this island
  const visited = new Set<number>();
  const bestChain: { islands: number[]; waterPath: Array<{ x: number; y: number }> } = {
    islands: [],
    waterPath: [],
  };

  function dfs(
    current: number,
    chain: number[],
    waterPath: Array<{ x: number; y: number }>,
    depth: number
  ): void {
    if (depth > 20) return; // Prevent infinite recursion

    if (chain.length > bestChain.islands.length) {
      bestChain.islands = [...chain];
      bestChain.waterPath = [...waterPath];
    }

    const edges = graph.get(current) || [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;

      visited.add(edge.to);
      chain.push(edge.to);
      waterPath.push(...edge.pathTiles);

      dfs(edge.to, chain, waterPath, depth + 1);

      chain.pop();
      waterPath.splice(waterPath.length - edge.pathTiles.length);
      visited.delete(edge.to);
    }
  }

  visited.add(startId);
  dfs(startId, [startId], [], 0);

  if (bestChain.islands.length < minIslands) {
    return null;
  }

  // Calculate chain span (geographic coverage)
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const id of bestChain.islands) {
    const island = islands.get(id)!;
    minX = Math.min(minX, island.centroidX);
    maxX = Math.max(maxX, island.centroidX);
    minY = Math.min(minY, island.centroidY);
    maxY = Math.max(maxY, island.centroidY);
  }

  const span = Math.max(maxX - minX, maxY - minY);

  // Score: prioritize longer chains with more islands and greater span
  const score = bestChain.islands.length * 10 + span * 0.5 + bestChain.waterPath.length * 0.1;

  return {
    islands: bestChain.islands,
    waterPath: bestChain.waterPath,
    score,
    span,
  };
}

function findBestChains(
  islands: Island[],
  graph: Map<number, IslandEdge[]>,
  config: IslandHopConfig,
  ctx: ExtendedMapContext
): IslandChain[] {
  const islandMap = new Map<number, Island>();
  for (const island of islands) {
    islandMap.set(island.id, island);
  }

  const chains: IslandChain[] = [];
  const usedIslands = new Set<number>();

  // Try starting from each island to find chains
  const candidates: IslandChain[] = [];

  for (const island of islands) {
    if (usedIslands.has(island.id)) continue;

    const chain = findLongestChainFromIsland(island.id, islandMap, graph, config.minChainIslands);
    if (chain && chain.span >= config.minChainSpan) {
      candidates.push(chain);
    }
  }

  // Sort by score and pick top chains with spacing
  candidates.sort((a, b) => b.score - a.score);

  for (const chain of candidates) {
    if (chains.length >= config.maxArcs) break;

    // Check if this chain overlaps too much with existing chains
    let overlaps = false;
    for (const existingChain of chains) {
      let sharedIslands = 0;
      for (const id of chain.islands) {
        if (existingChain.islands.includes(id)) {
          sharedIslands++;
        }
      }
      if (sharedIslands > chain.islands.length * 0.3) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      chains.push(chain);
      for (const id of chain.islands) {
        usedIslands.add(id);
      }
    }
  }

  return chains;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Tag island-hop corridors using archipelago detection and path-finding.
 *
 * This is a complete replacement for the naive hotspot-based approach,
 * implementing proper island chain detection.
 */
export function tagIslandHopChains(ctx: ExtendedMapContext, corridorsCfg: Record<string, unknown>): void {
  const cfg = ((corridorsCfg.islandHop || {}) as Record<string, unknown>) || {};

  const { width, height } = getDims(ctx);
  const tags = getStoryTags(ctx);

  // Configuration with sensible defaults
  const config: IslandHopConfig = {
    maxArcs: Math.max(0, Number((cfg.maxArcs as number) ?? 3) | 0),
    maxIslandSize: Math.max(1, Number((cfg.maxIslandSize as number) ?? 50) | 0),
    minIslandSize: Math.max(1, Number((cfg.minIslandSize as number) ?? 2) | 0),
    maxHopDistance: Math.max(3, Number((cfg.maxHopDistance as number) ?? 12) | 0),
    minChainIslands: Math.max(2, Number((cfg.minChainIslands as number) ?? 3) | 0),
    minChainSpan: Math.max(5, Number((cfg.minChainSpan as number) ?? 15) | 0),
    arcSpacing: Math.max(0, Number((cfg.arcSpacing as number) ?? 8) | 0),
  };

  if (config.maxArcs === 0) return;

  // Step 1: Identify islands
  const islands = identifyIslands(ctx, width, height, config);
  if (islands.length < config.minChainIslands) {
    // Fall back to legacy hotspot method if no suitable islands found
    tagIslandHopFromHotspotsLegacy(ctx, corridorsCfg);
    return;
  }

  // Step 2: Build connectivity graph
  const graph = buildIslandGraph(ctx, islands, width, height, config);

  // Step 3: Find best chains
  const chains = findBestChains(islands, graph, config, ctx);

  if (chains.length === 0) {
    // Fall back to legacy if no chains found
    tagIslandHopFromHotspotsLegacy(ctx, corridorsCfg);
    return;
  }

  // Step 4: Tag the water paths
  let taggedArcs = 0;
  for (const chain of chains) {
    if (taggedArcs >= config.maxArcs) break;

    // Determine style based on chain characteristics
    let style = "archipelago";
    if (chain.islands.length >= 5) {
      style = "archipelago-major";
    } else if (chain.span > 30) {
      style = "stepping-stones";
    }

    // Tag water tiles in the path
    for (const tile of chain.waterPath) {
      const key = storyKey(tile.x, tile.y);
      tags.corridorIslandHop.add(key);
      assignCorridorMetadata(ctx, corridorsCfg, key, "islandHop", style);
    }

    // Also tag shallow water adjacent to islands in the chain
    const islandMap = new Map<number, Island>();
    for (const island of islands) {
      islandMap.set(island.id, island);
    }

    for (const islandId of chain.islands) {
      const island = islandMap.get(islandId);
      if (!island) continue;

      for (const coastal of island.coastalTiles) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = coastal.x + dx;
            const ny = coastal.y + dy;
            if (!inBounds(nx, ny, width, height)) continue;
            if (!ctx.adapter.isWater(nx, ny)) continue;

            const key = storyKey(nx, ny);
            if (!tags.corridorIslandHop.has(key)) {
              tags.corridorIslandHop.add(key);
              assignCorridorMetadata(ctx, corridorsCfg, key, "islandHop", "coastal-hop");
            }
          }
        }
      }
    }

    taggedArcs++;
  }
}

/**
 * Legacy fallback: Tag island-hop from hotspots (original simplistic behavior).
 * Used when no suitable island chains are detected.
 */
function tagIslandHopFromHotspotsLegacy(
  ctx: ExtendedMapContext,
  corridorsCfg: Record<string, unknown>
): void {
  const cfg = ((corridorsCfg.islandHop || {}) as Record<string, unknown>) || {};

  const maxArcs = Math.max(0, Number((cfg.maxArcs as number) ?? 2) | 0);
  if (maxArcs === 0) return;

  const { width, height } = getDims(ctx);
  const tags = getStoryTags(ctx);
  const hotspotKeys = Array.from(tags.hotspot);
  if (!hotspotKeys.length) return;

  const picked = new Set<string>();
  let arcs = 0;
  let attempts = 0;

  while (arcs < maxArcs && attempts < 100 && attempts < hotspotKeys.length * 2) {
    attempts++;
    const idx = rand(ctx, hotspotKeys.length, "IslandHopLegacyPick");
    const key = hotspotKeys[idx % hotspotKeys.length];
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
        assignCorridorMetadata(ctx, corridorsCfg, kk, "islandHop", "hotspot-fallback");
      }
    }
  }
}

export default tagIslandHopChains;
