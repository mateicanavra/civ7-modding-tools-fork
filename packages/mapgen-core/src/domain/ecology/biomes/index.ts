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

import type { ExtendedMapContext } from "../../../core/types.js";
import { ctxRandom } from "../../../core/types.js";
import { getStoryTags } from "../../narrative/tags/index.js";
import {
  getPublishedClimateField,
  getPublishedRiverAdjacency,
} from "../../../pipeline/artifacts.js";
import type { BiomeConfig, CorridorPolicy } from "./types.js";
import { resolveBiomeGlobals } from "./globals.js";
import { applyTundraRestraint } from "./nudges/tundra-restraint.js";
import { applyTropicalCoastBias } from "./nudges/tropical-coast.js";
import { applyRiverValleyGrasslandBias } from "./nudges/river-valley.js";
import { applyCorridorKindBiomeBias, applyCorridorTileBias } from "./nudges/corridor-bias.js";
import { applyCorridorEdgeHints } from "./nudges/corridor-edge-hints.js";
import { applyRiftShoulderBias } from "./nudges/rift-shoulder.js";

export type { BiomeConfig, BiomeGlobals, CorridorPolicy } from "./types.js";

/**
 * Enhanced biome designation with gentle, readable nudges.
 */
export function designateEnhancedBiomes(
  iWidth: number,
  iHeight: number,
  ctx?: ExtendedMapContext | null
): void {
  console.log("Creating enhanced biome diversity (climate-aware)...");

  if (!ctx || !ctx.adapter) {
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

  const StoryTags = getStoryTags(ctx);

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

  const getRandom = (label: string, max: number): number => ctxRandom(ctx, label, max);

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

      if (
        applyTundraRestraint(adapter, globals, x, y, lat, elevation, rainfall, {
          latMin: TUNDRA_LAT_MIN,
          elevMin: TUNDRA_ELEV_MIN,
          rainMax: TUNDRA_RAIN_MAX,
        })
      ) {
        continue;
      }

      applyTropicalCoastBias(adapter, globals, x, y, iWidth, iHeight, lat, rainfall, {
        latMax: TCOAST_LAT_MAX,
        rainMin: TCOAST_RAIN_MIN,
      });

      applyRiverValleyGrasslandBias(adapter, globals, x, y, iWidth, riverAdjacency, lat, rainfall, {
        latMax: RV_LAT_MAX,
        rainMin: RV_RAIN_MIN,
      });

      applyCorridorTileBias(adapter, globals, x, y, lat, rainfall, StoryTags, getRandom, {
        landBiasStrength: LAND_BIAS_STRENGTH,
        riverBiasStrength: RIVER_BIAS_STRENGTH,
      });

      applyCorridorEdgeHints(adapter, globals, x, y, iWidth, lat, rainfall, StoryTags, getRandom);

      applyCorridorKindBiomeBias(adapter, globals, x, y, lat, elevation, rainfall, StoryTags, getRandom, {
        landBiasStrength: LAND_BIAS_STRENGTH,
        riverBiasStrength: RIVER_BIAS_STRENGTH,
      });

      if (StoryTags.riftShoulder.size > 0) {
        applyRiftShoulderBias(adapter, globals, x, y, lat, rainfall, StoryTags, {
          grasslandLatMax: RS_GRASS_LAT_MAX,
          grasslandRainMin: RS_GRASS_RAIN_MIN,
          tropicalLatMax: RS_TROP_LAT_MAX,
          tropicalRainMin: RS_TROP_RAIN_MIN,
        });
      }
    }
  }
}

export default designateEnhancedBiomes;
