// @ts-nocheck
/**
 * PlateSeedManager — deterministic Voronoi physics seeding
 *
 * Responsibilities
 * - Normalize plate seed config (mode, fixed seed, offsets).
 * - Capture the Civ VII RandomImpl state before plate generation, apply overrides,
 *   and provide a restoration callback so downstream systems share a single seed.
 * - Emit frozen snapshots for diagnostics (timestamp, RNG state, seed locations).
 */
import { RandomImpl } from "/base-standard/scripts/random-pcg-32.js";

function safeTimestamp() {
    try {
        return typeof Date?.now === "function" ? Date.now() : null;
    }
    catch (_err) {
        return null;
    }
}

function freezeRngState(state) {
    if (!state || typeof state !== "object")
        return null;
    const clone = {};
    for (const key of Object.keys(state)) {
        clone[key] = state[key];
    }
    return Object.freeze(clone);
}

function normalizeSeedConfig(config) {
    const cfg = config || {};
    const wantsFixed = cfg?.seedMode === "fixed";
    const hasFixed = wantsFixed && Number.isFinite(cfg?.fixedSeed);
    const seedMode = hasFixed ? "fixed" : "engine";
    const fixedSeed = hasFixed ? Math.trunc(cfg.fixedSeed) : null;
    const seedOffset = Number.isFinite(cfg?.seedOffset) ? Math.trunc(cfg.seedOffset) : 0;
    return { seedMode, fixedSeed, seedOffset };
}

function applySeedControl(seedMode, fixedSeed, seedOffset) {
    if (!RandomImpl || typeof RandomImpl.getState !== "function" || typeof RandomImpl.setState !== "function") {
        return { restore: null, seed: null, rngState: null };
    }
    let originalState = null;
    try {
        originalState = RandomImpl.getState();
    }
    catch (_err) {
        originalState = null;
    }
    if (!originalState || typeof originalState !== "object") {
        return { restore: null, seed: null, rngState: null };
    }
    const hasFixed = seedMode === "fixed" && Number.isFinite(fixedSeed);
    const offsetValue = Number.isFinite(seedOffset) ? Math.trunc(seedOffset) : 0;
    let seedValue = null;
    if (hasFixed) {
        seedValue = Math.trunc(fixedSeed);
    }
    else {
        const base = originalState.state;
        if (typeof base === "bigint") {
            seedValue = Number(base & 0xffffffffn);
        }
    }
    if (seedValue == null) {
        const restore = () => {
            try {
                RandomImpl.setState(originalState);
            }
            catch (_err) {
                /* no-op */
            }
        };
        return { restore, seed: null, rngState: freezeRngState(originalState) };
    }
    seedValue = offsetValue ? (seedValue + offsetValue) >>> 0 : seedValue >>> 0;
    let appliedState = null;
    try {
        if (typeof RandomImpl.seed === "function") {
            RandomImpl.seed(seedValue >>> 0);
            appliedState = RandomImpl.getState?.() ?? null;
        }
        else {
            const nextState = { ...originalState };
            if (typeof nextState.state === "bigint") {
                nextState.state = BigInt(seedValue >>> 0);
            }
            RandomImpl.setState(nextState);
            appliedState = nextState;
        }
    }
    catch (_err) {
        appliedState = null;
    }
    const restore = () => {
        try {
            RandomImpl.setState(originalState);
        }
        catch (_err) {
            /* no-op */
        }
    };
    return { restore, seed: seedValue >>> 0, rngState: freezeRngState(appliedState) };
}

function normalizeSites(sites) {
    if (!Array.isArray(sites) || sites.length === 0)
        return null;
    const frozen = sites.map((site, index) => {
        if (site && typeof site === "object") {
            const id = site.id ?? index;
            const x = site.x ?? (Array.isArray(site) ? site[0] ?? 0 : 0);
            const y = site.y ?? (Array.isArray(site) ? site[1] ?? 0 : 0);
            return Object.freeze({ id, x, y });
        }
        if (Array.isArray(site)) {
            const [x = 0, y = 0] = site;
            return Object.freeze({ id: index, x, y });
        }
        return Object.freeze({ id: index, x: 0, y: 0 });
    });
    return Object.freeze(frozen);
}

export const PlateSeedManager = {
    capture(width, height, config) {
        const seedCfg = normalizeSeedConfig(config);
        const timestamp = safeTimestamp();
        const control = applySeedControl(seedCfg.seedMode, seedCfg.fixedSeed, seedCfg.seedOffset);
        const snapshot = {
            width,
            height,
            seedMode: seedCfg.seedMode,
            seedOffset: seedCfg.seedOffset,
        };
        if (seedCfg.fixedSeed != null)
            snapshot.fixedSeed = seedCfg.fixedSeed;
        if (timestamp != null)
            snapshot.timestamp = timestamp;
        if (control.seed != null)
            snapshot.seed = control.seed;
        if (control.rngState)
            snapshot.rngState = control.rngState;
        return {
            snapshot: Object.freeze(snapshot),
            restore: typeof control.restore === "function" ? control.restore : null,
        };
    },
    finalize(baseSnapshot, extras = {}) {
        if (!baseSnapshot || typeof baseSnapshot !== "object")
            return null;
        const { config = null, meta = null } = extras || {};
        const result = {
            width: baseSnapshot.width,
            height: baseSnapshot.height,
            seedMode: baseSnapshot.seedMode,
        };
        if (baseSnapshot.timestamp != null)
            result.timestamp = baseSnapshot.timestamp;
        if (baseSnapshot.seedOffset != null)
            result.seedOffset = baseSnapshot.seedOffset;
        if (baseSnapshot.seed != null)
            result.seed = baseSnapshot.seed;
        if (baseSnapshot.fixedSeed != null)
            result.fixedSeed = baseSnapshot.fixedSeed;
        if (baseSnapshot.rngState)
            result.rngState = baseSnapshot.rngState;
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
