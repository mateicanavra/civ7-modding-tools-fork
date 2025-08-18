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
export const STORY_ENABLE_SWATCHES = true;
export const STORY_ENABLE_PALEO = true;

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
    swatches: Object.freeze({
        // "Black swan" climate swatches — large, awe‑worthy zones (N≈1), guaranteed attempt.
        // Selection is weighted; at least one swatch is attempted per map (forceAtLeastOne).
        maxPerMap: 1,
        forceAtLeastOne: true,

        // Size-aware growth is handled by callers using widthMulSqrt/lengthMulSqrt on sqrt(area/base).
        sizeScaling: Object.freeze({
            widthMulSqrt: 0.3,
            lengthMulSqrt: 0.4,
        }),

        // Per-swatch type weights and primary knobs. Callers implement the exact painting rules.
        types: Object.freeze({
            // Macro desert belt (Sahara/Arabia analog): dry subtropical band with soft edges.
            macroDesertBelt: Object.freeze({
                weight: 3,
                latitudeCenterDeg: 20,
                halfWidthDeg: 12,
                drynessDelta: 28,
                bleedRadius: 2,
            }),

            // Equatorial rain belt (Amazon/Congo analog): very wet equator with generous bleed.
            equatorialRainbelt: Object.freeze({
                weight: 3,
                latitudeCenterDeg: 0,
                halfWidthDeg: 10,
                wetnessDelta: 24,
                bleedRadius: 3,
            }),

            // Rainforest archipelago: scattered wet tropical islands and reefs.
            rainforestArchipelago: Object.freeze({
                weight: 2,
                islandBias: 2,
                reefBias: 1,
                wetnessDelta: 18,
                bleedRadius: 2,
            }),

            // Dense mountain forests (Carpathian-like): couple to orogeny windward.
            mountainForests: Object.freeze({
                weight: 2,
                coupleToOrogeny: true,
                windwardBonus: 6,
                leePenalty: 2,
                bleedRadius: 1,
            }),

            // Great Plains analog: broad lowland plains with restrained moisture.
            greatPlains: Object.freeze({
                weight: 2,
                latitudeCenterDeg: 45,
                halfWidthDeg: 8,
                dryDelta: 12,
                lowlandMaxElevation: 300,
                bleedRadius: 2,
            }),
        }),
    }),

    // Paleo‑Hydrology (deltas, oxbows, fossil channels; elevation-aware carving)
    paleo: Object.freeze({
        maxDeltas: 4, // total deltas map‑wide (cap)
        deltaFanRadius: 1, // landward radius for small marsh/floodplain fans
        deltaMarshChance: 0.35, // probability per eligible fan tile (validated)
        maxOxbows: 6, // hard cap on oxbow lake/marsh tiles
        oxbowElevationMax: 280, // only in lowlands
        maxFossilChannels: 3, // total fossil polylines
        fossilChannelLengthTiles: 12, // nominal length (tiles), size‑scaled by callers
        fossilChannelStep: 2, // spacing between fossil points
        fossilChannelHumidity: 5, // +humidity along fossil lines (clamped)
        fossilChannelMinDistanceFromCurrentRivers: 4,
        minDistanceFromStarts: 9, // intrusive edits stay away from starts
        sizeScaling: Object.freeze({
            // gentle sqrt(area) scalers (applied by callers)
            lengthMulSqrt: 0.4,
        }),
        elevationCarving: Object.freeze({
            enableCanyonRim: true, // allow subtle canyon/bluff hints near paleo features
            rimWidth: 1, // tiles on each side to consider for “rim” cues
            canyonDryBonus: 2, // additional dryness near canyon floors (small)
            bluffWetReduction: 0, // optional small reduction on bluff tops (kept 0 for now)
        }),
    }),

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
