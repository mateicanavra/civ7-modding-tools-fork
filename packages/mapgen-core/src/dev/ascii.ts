/**
 * ASCII grid rendering utilities for map visualization.
 *
 * Provides helpers to render maps as ASCII art for debugging.
 * All rendering goes through adapter methods - no direct engine access.
 *
 * @module dev/ascii
 */

import type { EngineAdapter } from "@civ7/adapter";
import { isDevEnabled, type DevFlagKey } from "./flags.js";
import { devLog, devLogLines } from "./logging.js";

// Terrain type constants - imported from shared module (matched to Civ7 terrain.xml)
// CORRECT terrain.xml order: 0:MOUNTAIN, 1:HILL, 2:FLAT, 3:COAST, 4:OCEAN
import { HILL_TERRAIN } from "../core/terrain-constants.js";

/**
 * Standard ASCII character sets for different visualizations.
 */
export const ASCII_CHARS = {
  /** Base terrain characters */
  base: {
    water: "~",
    land: ".",
    coast: ",",
  },
  /** Plate boundary overlays */
  boundary: {
    convergent: "^",
    divergent: "_",
    transform: "#",
    unknown: "+",
  },
  /** Terrain relief overlays */
  relief: {
    mountain: "M",
    hill: "h",
    volcano: "V",
    flat: ".",
  },
  /** Biome overlays */
  biome: {
    desert: "D",
    grassland: "G",
    plains: "P",
    tundra: "T",
    tropical: "J",
    unknown: "?",
  },
  /** Story corridor overlays */
  corridor: {
    seaLane: "S",
    islandHop: "I",
    riverChain: "R",
    landOpen: "L",
  },
} as const;

/**
 * Configuration for ASCII grid rendering.
 */
export interface AsciiGridConfig {
  width: number;
  height: number;
  /** Sampling step (default: auto-calculated to fit ~72 cols) */
  sampleStep?: number;
  /** Cell renderer function */
  cellFn: (x: number, y: number) => AsciiCell;
}

/**
 * Result from cell renderer.
 */
export interface AsciiCell {
  /** Base character (water/land) */
  base: string;
  /** Optional overlay character (takes precedence) */
  overlay?: string;
}

/**
 * Compute an appropriate sample step to keep ASCII output manageable.
 * Targets ~72 columns and ~48 rows.
 */
export function computeSampleStep(width: number, height: number, requested?: number): number {
  if (requested !== undefined && Number.isFinite(requested)) {
    return Math.max(1, Math.floor(requested));
  }
  const targetCols = 72;
  const targetRows = 48;
  const stepX = width > targetCols ? Math.floor(width / targetCols) : 1;
  const stepY = height > targetRows ? Math.floor(height / targetRows) : 1;
  return Math.max(1, Math.min(stepX, stepY));
}

/**
 * Render an ASCII grid from a cell function.
 *
 * @returns Array of strings, one per row
 */
export function renderAsciiGrid(config: AsciiGridConfig): string[] {
  const { width, height, cellFn } = config;
  const step = computeSampleStep(width, height, config.sampleStep);
  const rows: string[] = [];

  for (let y = 0; y < height; y += step) {
    let row = "";
    for (let x = 0; x < width; x += step) {
      const cell = cellFn(x, y);
      row += cell.overlay ?? cell.base;
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Log an ASCII grid with optional legend.
 * No-op if the specified flag is disabled.
 */
export function logAsciiGrid(
  flag: DevFlagKey,
  label: string,
  config: AsciiGridConfig,
  legend?: string
): void {
  if (!isDevEnabled(flag)) return;

  const step = computeSampleStep(config.width, config.height, config.sampleStep);
  devLog(`${label} (step=${step})${legend ? `: ${legend}` : ""}`);

  const rows = renderAsciiGrid(config);
  devLogLines(rows);
}

/**
 * Render foundation/plate boundary ASCII visualization.
 */
export function logFoundationAscii(
  adapter: EngineAdapter,
  width: number,
  height: number,
  foundation: {
    boundaryCloseness?: Uint8Array;
    boundaryType?: Uint8Array;
  },
  options: { sampleStep?: number; threshold?: number } = {}
): void {
  if (!isDevEnabled("LOG_FOUNDATION_ASCII")) return;

  const { boundaryCloseness, boundaryType } = foundation;
  if (!boundaryCloseness || !boundaryType) {
    devLog("[foundation] ascii: Missing boundary data");
    return;
  }

  const threshold = Math.round((options.threshold ?? 0.65) * 255);
  const chars = ASCII_CHARS;

  logAsciiGrid(
    "LOG_FOUNDATION_ASCII",
    "[foundation] plates",
    {
      width,
      height,
      sampleStep: options.sampleStep,
      cellFn: (x, y) => {
        const idx = y * width + x;
        const isWater = adapter.isWater(x, y);
        const base = isWater ? chars.base.water : chars.base.land;

        const closeness = boundaryCloseness[idx] ?? 0;
        if (closeness < threshold) {
          return { base };
        }

        const bType = boundaryType[idx] ?? 0;
        const overlay =
          bType === 1
            ? chars.boundary.convergent
            : bType === 2
              ? chars.boundary.divergent
              : bType === 3
                ? chars.boundary.transform
                : chars.boundary.unknown;

        return { base, overlay };
      },
    },
    `${chars.base.water}=water ${chars.base.land}=land ${chars.boundary.convergent}=conv ${chars.boundary.divergent}=div ${chars.boundary.transform}=trans`
  );
}

/**
 * Render landmass (land vs water) ASCII visualization.
 */
export function logLandmassAscii(
  adapter: EngineAdapter,
  width: number,
  height: number,
  options: { sampleStep?: number } = {}
): void {
  if (!isDevEnabled("LOG_LANDMASS_ASCII")) return;

  const chars = ASCII_CHARS;

  logAsciiGrid(
    "LOG_LANDMASS_ASCII",
    "[landmass] continents",
    {
      width,
      height,
      sampleStep: options.sampleStep,
      cellFn: (x, y) => {
        const isWater = adapter.isWater(x, y);
        const base = isWater ? chars.base.water : chars.base.land;
        return { base };
      },
    },
    `${chars.base.water}=water ${chars.base.land}=land`
  );
}

/**
 * Render terrain relief (mountains/hills/volcanoes) ASCII visualization.
 */
export function logReliefAscii(
  adapter: EngineAdapter,
  width: number,
  height: number,
  options: { sampleStep?: number } = {}
): void {
  if (!isDevEnabled("LOG_RELIEF_ASCII")) return;

  const chars = ASCII_CHARS;

  logAsciiGrid(
    "LOG_RELIEF_ASCII",
    "[relief] terrain",
    {
      width,
      height,
      sampleStep: options.sampleStep,
      cellFn: (x, y) => {
        const isWater = adapter.isWater(x, y);
        if (isWater) {
          return { base: chars.base.water };
        }

        const isMountain = adapter.isMountain(x, y);
        // Check hills by terrain type (no isHills on adapter)
        const terrainType = adapter.getTerrainType(x, y);
        const isHills = terrainType === HILL_TERRAIN;

        if (isMountain) {
          return { base: chars.base.land, overlay: chars.relief.mountain };
        }
        if (isHills) {
          return { base: chars.base.land, overlay: chars.relief.hill };
        }
        return { base: chars.base.land };
      },
    },
    `${chars.base.water}=water ${chars.relief.mountain}=mountain ${chars.relief.hill}=hill ${chars.base.land}=flat`
  );
}

/**
 * Render rainfall ASCII heatmap visualization.
 */
export function logRainfallAscii(
  adapter: EngineAdapter,
  width: number,
  height: number,
  options: { sampleStep?: number } = {}
): void {
  if (!isDevEnabled("LOG_RAINFALL_ASCII")) return;

  // Rainfall buckets: 0-3 for arid to lush
  const bucketChars = ["0", "1", "2", "3", "4"];

  logAsciiGrid(
    "LOG_RAINFALL_ASCII",
    "[rainfall] heatmap",
    {
      width,
      height,
      sampleStep: options.sampleStep,
      cellFn: (x, y) => {
        const isWater = adapter.isWater(x, y);
        if (isWater) {
          return { base: ASCII_CHARS.base.water };
        }

        const rainfall = adapter.getRainfall(x, y);
        // Map 0-200 rainfall to 0-4 bucket
        const bucket = Math.min(4, Math.floor((rainfall / 200) * 5));
        return { base: bucketChars[bucket] };
      },
    },
    `~=water 0=arid 1=semi-arid 2=temperate 3=wet 4=lush`
  );
}

/**
 * Render biome ASCII visualization.
 */
export function logBiomeAscii(
  adapter: EngineAdapter,
  width: number,
  height: number,
  biomeCharMap?: Map<number, string>,
  options: { sampleStep?: number } = {}
): void {
  if (!isDevEnabled("LOG_BIOME_ASCII")) return;

  // Default char for unknown biomes
  const defaultChar = "?";

  logAsciiGrid(
    "LOG_BIOME_ASCII",
    "[biome] classification",
    {
      width,
      height,
      sampleStep: options.sampleStep,
      cellFn: (x, y) => {
        const isWater = adapter.isWater(x, y);
        if (isWater) {
          return { base: ASCII_CHARS.base.water };
        }

        const biomeId = adapter.getBiomeType(x, y);
        const char = biomeCharMap?.get(biomeId) ?? defaultChar;
        return { base: char };
      },
    },
    `~=water ?=unknown (use biomeCharMap for custom mapping)`
  );
}
