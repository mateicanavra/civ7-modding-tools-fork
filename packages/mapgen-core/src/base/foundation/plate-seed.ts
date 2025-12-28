/**
 * PlateSeedManager — deterministic Voronoi physics seeding
 *
 * Responsibilities:
 * - Normalize plate seed config (mode, fixed seed, offsets).
 * - Capture the RNG state before plate generation, apply overrides,
 *   and provide a restoration callback so downstream systems share a single seed.
 * - Emit frozen snapshots for diagnostics (timestamp, RNG state, seed locations).
 *
 * This is a pure TypeScript port that works both in-game and in tests.
 */

import type {
  PlateConfig,
  SeedSnapshot,
  SeedCaptureResult,
} from "@mapgen/base/foundation/types.js";

// ============================================================================
// Helpers
// ============================================================================

function safeTimestamp(): number | null {
  try {
    return typeof Date?.now === "function" ? Date.now() : null;
  } catch {
    return null;
  }
}

interface NormalizedSeedConfig {
  seedMode: "engine" | "fixed";
  fixedSeed: number | null;
  seedOffset: number;
}

function normalizeSeedConfig(config: Partial<PlateConfig> | null): NormalizedSeedConfig {
  const cfg = config || {};
  const wantsFixed = cfg.seedMode === "fixed";
  const hasFixed = wantsFixed && Number.isFinite(cfg.fixedSeed);
  const seedMode = hasFixed ? "fixed" : "engine";
  const fixedSeed = hasFixed ? Math.trunc(cfg.fixedSeed!) : null;
  const seedOffset = Number.isFinite(cfg.seedOffset) ? Math.trunc(cfg.seedOffset!) : 0;
  return { seedMode, fixedSeed, seedOffset };
}

function resolveSeedValue(seedMode: "engine" | "fixed", fixedSeed: number | null, seedOffset: number): number | null {
  if (seedMode !== "fixed") return null;
  if (!Number.isFinite(fixedSeed)) return null;
  const base = Math.trunc(fixedSeed!);
  const offset = Number.isFinite(seedOffset) ? Math.trunc(seedOffset) : 0;
  return ((base + offset) >>> 0) | 0;
}

interface SiteInput {
  id?: number;
  x?: number;
  y?: number;
}

function normalizeSites(
  sites: SiteInput[] | null | undefined
): ReadonlyArray<{ id: number; x: number; y: number }> | null {
  if (!Array.isArray(sites) || sites.length === 0) return null;

  const frozen = sites.map((site, index) => {
    if (site && typeof site === "object") {
      const id = site.id ?? index;
      const x = site.x ?? 0;
      const y = site.y ?? 0;
      return Object.freeze({ id, x, y });
    }
    return Object.freeze({ id: index, x: 0, y: 0 });
  });

  return Object.freeze(frozen);
}

// ============================================================================
// PlateSeedManager
// ============================================================================

export interface PlateSeedManagerInterface {
  /**
   * Capture the current RNG state and apply seed configuration.
   * Returns a snapshot and optional restore function.
   */
  capture(
    width: number,
    height: number,
    config: Partial<PlateConfig> | null
  ): SeedCaptureResult;

  /**
   * Finalize a seed snapshot with additional metadata.
   */
  finalize(
    baseSnapshot: SeedSnapshot | null,
    extras?: {
      config?: Partial<PlateConfig>;
      meta?: {
        seedLocations?: Array<{ id: number; x: number; y: number }>;
        sites?: Array<{ id: number; x: number; y: number }>;
      };
    }
  ): Readonly<SeedSnapshot> | null;
}

export const PlateSeedManager: PlateSeedManagerInterface = {
  capture(
    width: number,
    height: number,
    config: Partial<PlateConfig> | null
  ): SeedCaptureResult {
    const seedCfg = normalizeSeedConfig(config);
    const timestamp = safeTimestamp();
    const seed = resolveSeedValue(seedCfg.seedMode, seedCfg.fixedSeed, seedCfg.seedOffset);

    const snapshot: SeedSnapshot = {
      width,
      height,
      seedMode: seedCfg.seedMode,
      seedOffset: seedCfg.seedOffset,
    };

    if (seedCfg.fixedSeed != null) snapshot.fixedSeed = seedCfg.fixedSeed;
    if (timestamp != null) snapshot.timestamp = timestamp;
    if (seed != null) snapshot.seed = seed;

    return {
      snapshot: Object.freeze(snapshot),
      restore: null,
    };
  },

  finalize(
    baseSnapshot: SeedSnapshot | null,
    extras: {
      config?: Partial<PlateConfig>;
      meta?: {
        seedLocations?: Array<{ id: number; x: number; y: number }>;
        sites?: Array<{ id: number; x: number; y: number }>;
      };
    } = {}
  ): Readonly<SeedSnapshot> | null {
    if (!baseSnapshot || typeof baseSnapshot !== "object") return null;

    const { config = null, meta = null } = extras;

    const result: SeedSnapshot = {
      width: baseSnapshot.width,
      height: baseSnapshot.height,
      seedMode: baseSnapshot.seedMode,
    };

    if (baseSnapshot.timestamp != null) result.timestamp = baseSnapshot.timestamp;
    if (baseSnapshot.seedOffset != null) result.seedOffset = baseSnapshot.seedOffset;
    if (baseSnapshot.seed != null) result.seed = baseSnapshot.seed;
    if (baseSnapshot.fixedSeed != null) result.fixedSeed = baseSnapshot.fixedSeed;
    if (baseSnapshot.rngState) result.rngState = baseSnapshot.rngState;

    if (config && typeof config === "object") {
      result.config = Object.freeze({ ...config });
    }

    const seeds = Array.isArray(meta?.seedLocations)
      ? meta.seedLocations
      : Array.isArray(meta?.sites)
        ? meta.sites
        : null;

    const normalizedSites = normalizeSites(seeds);
    if (normalizedSites) {
      result.seedLocations = normalizedSites;
      result.sites = normalizedSites;
    }

    return Object.freeze(result);
  },
};

export default PlateSeedManager;
