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
  RngState,
  SeedSnapshot,
  SeedCaptureResult,
  RandomInterface,
} from "./types.js";

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

function freezeRngState(state: RngState | null): Readonly<RngState> | null {
  if (!state || typeof state !== "object") return null;
  const clone: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    clone[key] = state[key];
  }
  return Object.freeze(clone) as Readonly<RngState>;
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

interface SeedControlResult {
  restore: (() => void) | null;
  seed: number | null;
  rngState: Readonly<RngState> | null;
}

/**
 * Get the RandomImpl from the global scope if available.
 * Returns null in test environments without the engine.
 */
function getRandomImpl(): RandomInterface | null {
  try {
    // In game environment, this would be available as a global or import
    const global = globalThis as Record<string, unknown>;
    if (global.RandomImpl && typeof global.RandomImpl === "object") {
      return global.RandomImpl as RandomInterface;
    }
  } catch {
    // Ignore
  }
  return null;
}

function applySeedControl(
  seedMode: "engine" | "fixed",
  fixedSeed: number | null,
  seedOffset: number
): SeedControlResult {
  const RandomImpl = getRandomImpl();

  if (
    !RandomImpl ||
    typeof RandomImpl.getState !== "function" ||
    typeof RandomImpl.setState !== "function"
  ) {
    return { restore: null, seed: null, rngState: null };
  }

  let originalState: RngState | null = null;
  try {
    originalState = RandomImpl.getState();
  } catch {
    originalState = null;
  }

  if (!originalState || typeof originalState !== "object") {
    return { restore: null, seed: null, rngState: null };
  }

  const hasFixed = seedMode === "fixed" && Number.isFinite(fixedSeed);
  const offsetValue = Number.isFinite(seedOffset) ? Math.trunc(seedOffset) : 0;

  let seedValue: number | null = null;

  if (hasFixed) {
    seedValue = Math.trunc(fixedSeed!);
  } else {
    const base = originalState.state;
    if (typeof base === "bigint") {
      seedValue = Number(base & 0xffffffffn);
    } else if (typeof base === "number") {
      seedValue = base >>> 0;
    }
  }

  if (seedValue == null) {
    const restore = () => {
      try {
        RandomImpl.setState(originalState!);
      } catch {
        /* no-op */
      }
    };
    return { restore, seed: null, rngState: freezeRngState(originalState) };
  }

  seedValue = offsetValue ? (seedValue + offsetValue) >>> 0 : seedValue >>> 0;

  let appliedState: RngState | null = null;
  try {
    if (typeof RandomImpl.seed === "function") {
      RandomImpl.seed(seedValue >>> 0);
      appliedState = RandomImpl.getState?.() ?? null;
    } else {
      const nextState = { ...originalState };
      if (typeof nextState.state === "bigint") {
        nextState.state = BigInt(seedValue >>> 0);
      } else {
        nextState.state = seedValue >>> 0;
      }
      RandomImpl.setState(nextState);
      appliedState = nextState;
    }
  } catch {
    appliedState = null;
  }

  const restore = () => {
    try {
      RandomImpl.setState(originalState!);
    } catch {
      /* no-op */
    }
  };

  return { restore, seed: seedValue >>> 0, rngState: freezeRngState(appliedState) };
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
    const control = applySeedControl(seedCfg.seedMode, seedCfg.fixedSeed, seedCfg.seedOffset);

    const snapshot: SeedSnapshot = {
      width,
      height,
      seedMode: seedCfg.seedMode,
      seedOffset: seedCfg.seedOffset,
    };

    if (seedCfg.fixedSeed != null) snapshot.fixedSeed = seedCfg.fixedSeed;
    if (timestamp != null) snapshot.timestamp = timestamp;
    if (control.seed != null) snapshot.seed = control.seed;
    if (control.rngState) snapshot.rngState = control.rngState;

    return {
      snapshot: Object.freeze(snapshot),
      restore: typeof control.restore === "function" ? control.restore : null,
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
