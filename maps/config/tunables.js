/**
 * Climate Story — Tunables and Toggles (conservative defaults)
 * This module centralizes configuration for narrative motifs so they’re easy to
 * tweak without spelunking through the generator. All values here should remain
 * compatible with performance and balance guardrails.
 *
 * Notes:
 * - Keep rainfall deltas clamped within [0, 200] in the calling code.
 * - Sea-lane width constraints are enforced by placement code; not configured here.
 * - Counts and radii are intentionally conservative to avoid visual clutter.
 */

// Master feature toggles (safe to ship enabled)
export const STORY_ENABLE_HOTSPOTS = true;
export const STORY_ENABLE_RIFTS = true;
export const STORY_ENABLE_OROGENY = true;

// Tunables grouped by concern
export const STORY_TUNABLES = Object.freeze({
    // Deep-ocean hotspot trails (aligned island chains)
    hotspot: Object.freeze({
        maxTrails: 3, // total trails on a Huge map
        steps: 10, // polyline steps per trail
        stepLen: 4, // tiles advanced per step
        minDistFromLand: 4, // keep trails away from coasts
        minTrailSeparation: 12, // avoid parallel clutter between trails

        // Island realization biases (read by island placement)
        // Paradise vs. Volcanic classification happens at placement time.
        paradiseBias: 2, // 2:1 paradise:volcanic selection weight
        volcanicBias: 1,
        volcanicPeakChance: 0.33, // chance that a volcanic center "peeks" as land
    }),

    // Continental rift lines (linear inland lakes/shoulders; microclimate hooks)
    rift: Object.freeze({
        maxRiftsPerMap: 3, // absolute cap across all continents (safe default)
        lineSteps: 18, // steps marched per rift
        stepLen: 2, // tiles advanced per step
        shoulderWidth: 1, // lateral shoulder band on each side of the line
    }),

    // Orogeny belts (windward/lee amplification along mountain chains)
    orogeny: Object.freeze({
        beltMaxPerContinent: 2, // hard cap per large continent
        beltMinLength: 30, // minimum tiles to consider a belt
        radius: 2, // narrow belt radius for flank effects
        windwardBoost: 4, // +rainfall on windward flank (clamped by caller)
        leeDrynessAmplifier: 1.15, // multiply local orographic subtraction on lee
    }),

    // Microclimate adjustments (applied in climate refinement/feature layers)
    rainfall: Object.freeze({
        riftBoost: 8, // +humidity near rift lines (radius-limited; clamped)
        riftRadius: 2, // tiles around rift line to receive boost
        paradiseDelta: 6, // +humidity near paradise islands
        volcanicDelta: 8, // +humidity near volcanic centers (fertile ash soils)
    }),

    // Feature/vegetation tweaks near hotspot flavors (validated, sparse)
    features: Object.freeze({
        paradiseReefChance: 18, // % chance to place a reef on eligible shallow water near paradise centers
        volcanicForestChance: 22, // % chance to place forest on eligible warm/wet land near volcanic centers
        volcanicTaigaChance: 25, // % chance to place taiga on eligible cold/wet land near volcanic centers
    }),
});
