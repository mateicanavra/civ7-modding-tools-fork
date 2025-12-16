/**
 * Biomes Layer — designateEnhancedBiomes
 *
 * Purpose
 * - Start with base-standard biome assignment, then apply light, climate-aware
 *   nudges for playability and realism.
 * - Includes a narrow preference along rift shoulders to suggest fertile
 *   corridor edges without overriding vanilla eligibility rules.
 *
 * Behavior
 * - Base biomes: delegated to engine (vanilla-compatible).
 * - Tundra restraint: only at very high latitude or extreme elevation when dry.
 * - Tropical encouragement: wet, warm coasts near the equator.
 * - River-valley playability: temperate/warm river-adjacent tiles trend grassland.
 * - Rift shoulder bias: temperate/warm shoulder tiles prefer grassland when moist.
 *
 * Invariants
 * - Does not bypass engine constraints beyond setting biome types.
 * - Keeps adjustments modest; does not interfere with feature validation rules.
 * - O(width × height) with simple local checks.
 */

import type { ExtendedMapContext } from "../../core/types.js";
import type { EngineAdapter } from "@civ7/adapter";
import { ctxRandom } from "../../core/types.js";
import { getStoryTags } from "../../story/tags.js";
import {
  getPublishedClimateField,
  getPublishedRiverAdjacency,
} from "../../pipeline/artifacts.js";

// ============================================================================
// Types
// ============================================================================

export interface BiomeConfig {
  tundra?: {
    latMin?: number;
    elevMin?: number;
    rainMax?: number;
  };
  tropicalCoast?: {
    latMax?: number;
    rainMin?: number;
  };
  riverValleyGrassland?: {
    latMax?: number;
    rainMin?: number;
  };
  riftShoulder?: {
    grasslandLatMax?: number;
    grasslandRainMin?: number;
    tropicalLatMax?: number;
    tropicalRainMin?: number;
  };
}

export interface CorridorPolicy {
  land?: {
    biomesBiasStrength?: number;
  };
  river?: {
    biomesBiasStrength?: number;
  };
}

/**
 * Biome global indices resolved from the adapter
 */
interface BiomeGlobals {
  tundra: number;
  tropical: number;
  grassland: number;
  plains: number;
  desert: number;
  snow: number;
}

/**
 * Resolve biome globals from the engine adapter
 */
function resolveBiomeGlobals(adapter: EngineAdapter): BiomeGlobals {
  return {
    tundra: adapter.getBiomeGlobal("tundra"),
    tropical: adapter.getBiomeGlobal("tropical"),
    grassland: adapter.getBiomeGlobal("grassland"),
    plains: adapter.getBiomeGlobal("plains"),
    desert: adapter.getBiomeGlobal("desert"),
    snow: adapter.getBiomeGlobal("snow"),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a tile is coastal land (land adjacent to water)
 * Local implementation since this isn't always on the base adapter
 */
function isCoastalLand(
  adapter: EngineAdapter,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (adapter.isWater(x, y)) return false;

  // Check all 6 hex neighbors
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
    [x - 1, y - 1],
    [x + 1, y + 1],
  ];

  for (const [nx, ny] of neighbors) {
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      if (adapter.isWater(nx, ny)) return true;
    }
  }
  return false;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Enhanced biome designation with gentle, readable nudges.
 */
export function designateEnhancedBiomes(
  iWidth: number,
  iHeight: number,
  ctx?: ExtendedMapContext | null
): void {
  console.log("Creating enhanced biome diversity (climate-aware)...");

  if (!ctx?.adapter) {
    throw new Error(
      "designateEnhancedBiomes: MapContext adapter is required (legacy direct-engine fallback removed)."
    );
  }

  const adapter = ctx.adapter;
  const globals = resolveBiomeGlobals(adapter);

  // Start with vanilla-consistent biomes via the real engine
  adapter.designateBiomes(iWidth, iHeight);

  const config = ctx.config;
  const biomesCfg = (config.biomes || {}) as BiomeConfig;
  const corridorPolicy = (config.corridors || {}) as CorridorPolicy;

  const StoryTags = getStoryTags();

  // Apply small, climate-aware preferences
  const _tundra = biomesCfg.tundra || {};
  const TUNDRA_LAT_MIN = Number.isFinite(_tundra.latMin)
    ? _tundra.latMin!
    : 70;
  const TUNDRA_ELEV_MIN = Number.isFinite(_tundra.elevMin)
    ? _tundra.elevMin!
    : 850;
  const TUNDRA_RAIN_MAX = Number.isFinite(_tundra.rainMax)
    ? _tundra.rainMax!
    : 90;

  const _tcoast = biomesCfg.tropicalCoast || {};
  const TCOAST_LAT_MAX = Number.isFinite(_tcoast.latMax)
    ? _tcoast.latMax!
    : 18;
  const TCOAST_RAIN_MIN = Number.isFinite(_tcoast.rainMin)
    ? _tcoast.rainMin!
    : 105;

  const _rv = biomesCfg.riverValleyGrassland || {};
  const RV_LAT_MAX = Number.isFinite(_rv.latMax) ? _rv.latMax! : 50;
  const RV_RAIN_MIN = Number.isFinite(_rv.rainMin) ? _rv.rainMin! : 75;

  const _rs = biomesCfg.riftShoulder || {};
  const RS_GRASS_LAT_MAX = Number.isFinite(_rs.grasslandLatMax)
    ? _rs.grasslandLatMax!
    : 50;
  const RS_GRASS_RAIN_MIN = Number.isFinite(_rs.grasslandRainMin)
    ? _rs.grasslandRainMin!
    : 75;
  const RS_TROP_LAT_MAX = Number.isFinite(_rs.tropicalLatMax)
    ? _rs.tropicalLatMax!
    : 18;
  const RS_TROP_RAIN_MIN = Number.isFinite(_rs.tropicalRainMin)
    ? _rs.tropicalRainMin!
    : 100;

  const LAND_BIAS_STRENGTH = Math.max(
    0,
    Math.min(1, corridorPolicy?.land?.biomesBiasStrength ?? 0.6)
  );
  const RIVER_BIAS_STRENGTH = Math.max(
    0,
    Math.min(1, corridorPolicy?.river?.biomesBiasStrength ?? 0.5)
  );

  const getRandom = (label: string, max: number): number => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    return adapter.getRandomNumber(max, label);
  };

  const climateField = getPublishedClimateField(ctx);
  if (!climateField?.rainfall) {
    throw new Error(
      "designateEnhancedBiomes: Missing artifact:climateField rainfall field."
    );
  }
  const rainfallField = climateField.rainfall;

  const riverAdjacency = getPublishedRiverAdjacency(ctx);
  if (!riverAdjacency) {
    throw new Error(
      "designateEnhancedBiomes: Missing artifact:riverAdjacency (required for river-valley biome bias)."
    );
  }

  for (let y = 0; y < iHeight; y++) {
    for (let x = 0; x < iWidth; x++) {
      if (adapter.isWater(x, y)) continue;

      const lat = Math.abs(adapter.getLatitude(x, y));
      const elevation = adapter.getElevation(x, y);
      const idxValue = y * iWidth + x;
      const rainfall = rainfallField[idxValue] | 0;

      // Tundra restraint: require very high lat or extreme elevation and dryness
      if (
        (lat > TUNDRA_LAT_MIN || elevation > TUNDRA_ELEV_MIN) &&
        rainfall < TUNDRA_RAIN_MAX
      ) {
        adapter.setBiomeType(x, y, globals.tundra);
        continue; // lock this decision; skip other nudges
      }

      // Wet, warm coasts near the equator tend tropical
      if (
        lat < TCOAST_LAT_MAX &&
        isCoastalLand(adapter, x, y, iWidth, iHeight) &&
        rainfall > TCOAST_RAIN_MIN
      ) {
        adapter.setBiomeType(x, y, globals.tropical);
      }

      // Temperate/warm river valleys prefer grassland for playability
      if (
        riverAdjacency[idxValue] === 1 &&
        rainfall > RV_RAIN_MIN &&
        lat < RV_LAT_MAX
      ) {
        adapter.setBiomeType(x, y, globals.grassland);
      }

      // Strategic Corridors: land-open corridor tiles gently bias to grassland
      if (
        StoryTags.corridorLandOpen &&
        StoryTags.corridorLandOpen.has(`${x},${y}`)
      ) {
        if (
          rainfall > 80 &&
          lat < 55 &&
          getRandom("Corridor Land-Open Biome", 100) <
            Math.round(LAND_BIAS_STRENGTH * 100)
        ) {
          adapter.setBiomeType(x, y, globals.grassland);
        }
      }

      // Strategic Corridors: river-chain tiles gently bias to grassland
      if (
        StoryTags.corridorRiverChain &&
        StoryTags.corridorRiverChain.has(`${x},${y}`)
      ) {
        if (
          rainfall > 75 &&
          lat < 55 &&
          getRandom("Corridor River-Chain Biome", 100) <
            Math.round(RIVER_BIAS_STRENGTH * 100)
        ) {
          adapter.setBiomeType(x, y, globals.grassland);
        }
      }

      // Edge hints near land/river corridors
      {
        if (
          !(
            StoryTags.corridorLandOpen?.has?.(`${x},${y}`) ||
            StoryTags.corridorRiverChain?.has?.(`${x},${y}`)
          )
        ) {
          let edgeAttr: { edge?: Record<string, number> } | null = null;

          for (let ddy = -1; ddy <= 1 && !edgeAttr; ddy++) {
            for (let ddx = -1; ddx <= 1; ddx++) {
              if (ddx === 0 && ddy === 0) continue;
              const nx = x + ddx;
              const ny = y + ddy;
              const nk = `${nx},${ny}`;

              if (!StoryTags) continue;
              if (
                StoryTags.corridorLandOpen?.has?.(nk) ||
                StoryTags.corridorRiverChain?.has?.(nk)
              ) {
                const attr = StoryTags.corridorAttributes?.get?.(nk) as
                  | { edge?: Record<string, number> }
                  | undefined;
                if (attr && attr.edge) edgeAttr = attr;
              }
            }
          }

          if (edgeAttr && edgeAttr.edge) {
            const edgeCfg = edgeAttr.edge;

            // Forest rim: bias toward forest-friendly biomes when moist
            const forestRimChance = Math.max(
              0,
              Math.min(1, edgeCfg.forestRimChance ?? 0)
            );
            if (
              forestRimChance > 0 &&
              rainfall > 90 &&
              getRandom("Corr Forest Rim", 100) <
                Math.round(forestRimChance * 100)
            ) {
              const target =
                lat < 22 && rainfall > 110
                  ? globals.tropical
                  : globals.grassland;
              adapter.setBiomeType(x, y, target);
            }

            // Hill/mountain rim: suggest drier, relief-friendly biomes
            const hillRimChance = Math.max(
              0,
              Math.min(1, edgeCfg.hillRimChance ?? 0)
            );
            const mountainRimChance = Math.max(
              0,
              Math.min(1, edgeCfg.mountainRimChance ?? 0)
            );
            const escarpmentChance = Math.max(
              0,
              Math.min(1, edgeCfg.escarpmentChance ?? 0)
            );
            const reliefChance = Math.max(
              0,
              Math.min(1, hillRimChance + mountainRimChance + escarpmentChance)
            );

            if (
              reliefChance > 0 &&
              getRandom("Corr Relief Rim", 100) < Math.round(reliefChance * 100)
            ) {
              const elev = adapter.getElevation(x, y);
              const target =
                (lat > 62 || elev > 800) && rainfall < 95
                  ? globals.tundra
                  : globals.plains;
              adapter.setBiomeType(x, y, target);
            }
          }
        }
      }

      // Strategic Corridors: kind/style biome bias (very gentle; policy-scaled)
      {
        const cKey = `${x},${y}`;
        const attr = StoryTags.corridorAttributes?.get?.(cKey) as
          | { kind?: string; biomes?: Record<string, number> }
          | undefined;
        const cKind =
          attr?.kind || (StoryTags.corridorKind && StoryTags.corridorKind.get(cKey));
        const biomesCfgCorridor = attr?.biomes;

        if ((cKind === "land" || cKind === "river") && biomesCfgCorridor) {
          const strength =
            cKind === "land" ? LAND_BIAS_STRENGTH : RIVER_BIAS_STRENGTH;

          if (
            strength > 0 &&
            getRandom("Corridor Kind Bias", 100) < Math.round(strength * 100)
          ) {
            const entries = Object.keys(biomesCfgCorridor);
            let totalW = 0;
            for (const k of entries) totalW += Math.max(0, biomesCfgCorridor[k] || 0);

            if (totalW > 0) {
              let roll = getRandom("Corridor Kind Pick", totalW);
              let chosen = entries[0];

              for (const k of entries) {
                const w = Math.max(0, biomesCfgCorridor[k] || 0);
                if (roll < w) {
                  chosen = k;
                  break;
                }
                roll -= w;
              }

              let target: number | null = null;
              if (chosen === "desert") target = globals.desert;
              else if (chosen === "plains") target = globals.plains;
              else if (chosen === "grassland") target = globals.grassland;
              else if (chosen === "tropical") target = globals.tropical;
              else if (chosen === "tundra") target = globals.tundra;
              else if (chosen === "snow") target = globals.snow;

              if (target != null) {
                // Light sanity gates to avoid extreme mismatches
                let ok = true;
                if (target === globals.desert && rainfall > 110) ok = false;
                if (target === globals.tropical && !(lat < 25 && rainfall > 95))
                  ok = false;
                if (
                  target === globals.tundra &&
                  !(lat > 60 || elevation > 800)
                )
                  ok = false;
                if (target === globals.snow && !(lat > 70 || elevation > 900))
                  ok = false;
                if (ok) {
                  adapter.setBiomeType(x, y, target);
                }
              }
            }
          }
        }
      }

      // Climate Story: rift shoulder preference (narrow, moisture-aware)
      if (config.toggles?.STORY_ENABLE_RIFTS && StoryTags.riftShoulder.size > 0) {
        const key = `${x},${y}`;
        if (StoryTags.riftShoulder.has(key)) {
          // Temperate/warm shoulders: prefer grassland when sufficiently moist
          if (lat < RS_GRASS_LAT_MAX && rainfall > RS_GRASS_RAIN_MIN) {
            adapter.setBiomeType(x, y, globals.grassland);
          } else if (lat < RS_TROP_LAT_MAX && rainfall > RS_TROP_RAIN_MIN) {
            // In very warm & wet shoulders, allow tropical bias
            adapter.setBiomeType(x, y, globals.tropical);
          }
        }
      }
    }
  }
}

export default designateEnhancedBiomes;
