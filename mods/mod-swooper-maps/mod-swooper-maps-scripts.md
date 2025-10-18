This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: mod/maps/**/*.js, dist/maps/**/*.js
- Files matching these patterns are excluded: mod/maps/base-standard/**, dist/maps/base-standard/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
mod/
  maps/
    config/
      defaults/
        base.js
      presets/
        classic.js
        temperate.js
      dev.js
      entry.js
      resolved.js
      runtime.js
      tunables.js
    core/
      utils.js
    layers/
      biomes.js
      climate-baseline.js
      climate-refinement.js
      coastlines.js
      features.js
      islands.js
      placement.js
    story/
      corridors.js
      tagging.js
      tags.js
    world/
      model.js
    epic-diverse-huge-kahula.js
    epic-diverse-huge-temperate.js
    epic-diverse-huge.js
    map_orchestrator.js
```

# Files

## File: mod/maps/config/defaults/base.js
```javascript
// @ts-nocheck
/**
 * Base defaults for Epic Diverse Huge map configs.
 *
 * Purpose
 * - Single, explicit source for baseline defaults that all consumers compose from.
 * - These values form the canonical defaults (no other hidden defaults elsewhere).
 *
 * Notes
 * - Keep objects frozen to discourage mutation and encourage override/merge patterns.
 * - Arrays are provided as plain arrays; resolver will treat arrays as replace-by-default.
 */
// @ts-check
/** @type {import('../map_config.d.ts').MapConfig} */
export const BASE_CONFIG = Object.freeze({
    // --- Master Feature Toggles ---
    // Enable or disable major Climate Story systems. Set to false to skip a layer entirely.
    toggles: Object.freeze({
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true,
        STORY_ENABLE_WORLDMODEL: true,
    }),
    // --- Climate Story Tunables ---
    // Detailed parameters for each narrative motif.
    story: Object.freeze({
        // Deep-ocean hotspot trails (aligned island chains)
        hotspot: Object.freeze({
            maxTrails: 12, // total trails on a Huge map
            steps: 15, // polyline steps per trail
            stepLen: 2, // tiles advanced per step
            minDistFromLand: 5, // keep trails away from coasts
            minTrailSeparation: 12, // avoid parallel clutter between trails
            paradiseBias: 2, // 2:1 paradise:volcanic selection weight
            volcanicBias: 1,
            volcanicPeakChance: 0.7, // chance a volcanic center "peeks" as land
        }),
        // Continental rift lines (linear inland lakes/shoulders)
        rift: Object.freeze({
            maxRiftsPerMap: 3,
            lineSteps: 18,
            stepLen: 2,
            shoulderWidth: 1,
        }),
        // Orogeny belts (windward/lee amplification along mountain chains)
        orogeny: Object.freeze({
            beltMaxPerContinent: 2,
            beltMinLength: 30,
            radius: 2,
            windwardBoost: 5,
            leeDrynessAmplifier: 1.2,
        }),
        // "Black swan" climate swatches (guaranteed N≈1 macro zone)
        swatches: Object.freeze({
            maxPerMap: 7,
            forceAtLeastOne: true,
            sizeScaling: Object.freeze({
                widthMulSqrt: 0.3,
                lengthMulSqrt: 0.4,
            }),
            types: Object.freeze({
                macroDesertBelt: Object.freeze({
                    weight: 8,
                    latitudeCenterDeg: 20,
                    halfWidthDeg: 12,
                    drynessDelta: 28,
                    bleedRadius: 3,
                }),
                equatorialRainbelt: Object.freeze({
                    weight: 3,
                    latitudeCenterDeg: 0,
                    halfWidthDeg: 10,
                    wetnessDelta: 24,
                    bleedRadius: 3,
                }),
                rainforestArchipelago: Object.freeze({
                    weight: 7,
                    islandBias: 2,
                    reefBias: 1,
                    wetnessDelta: 18,
                    bleedRadius: 3,
                }),
                mountainForests: Object.freeze({
                    weight: 2,
                    coupleToOrogeny: true,
                    windwardBonus: 6,
                    leePenalty: 2,
                    bleedRadius: 3,
                }),
                greatPlains: Object.freeze({
                    weight: 5,
                    latitudeCenterDeg: 45,
                    halfWidthDeg: 8,
                    dryDelta: 12,
                    lowlandMaxElevation: 300,
                    bleedRadius: 4,
                }),
            }),
        }),
        // Paleo‑Hydrology (deltas, oxbows, fossil channels)
        paleo: Object.freeze({
            maxDeltas: 4,
            deltaFanRadius: 1,
            deltaMarshChance: 0.35,
            maxOxbows: 6,
            oxbowElevationMax: 580,
            maxFossilChannels: 12,
            fossilChannelLengthTiles: 12,
            fossilChannelStep: 2,
            fossilChannelHumidity: 6,
            fossilChannelMinDistanceFromCurrentRivers: 4,
            minDistanceFromStarts: 7,
            sizeScaling: Object.freeze({
                lengthMulSqrt: 0.7,
            }),
            elevationCarving: Object.freeze({
                enableCanyonRim: true,
                rimWidth: 4,
                canyonDryBonus: 3,
                bluffWetReduction: 0,
            }),
        }),
    }),
    // --- Microclimate & Feature Adjustments ---
    // Small deltas applied by refinement passes.
    microclimate: Object.freeze({
        rainfall: Object.freeze({
            riftBoost: 8,
            riftRadius: 2,
            paradiseDelta: 6,
            volcanicDelta: 8,
        }),
        features: Object.freeze({
            paradiseReefChance: 23, // % chance
            volcanicForestChance: 27, // % chance
            volcanicTaigaChance: 25, // % chance
        }),
    }),
    // --- Strategic Corridors (sea lanes, island-hop, land, river chains) ---
    corridors: Object.freeze({
        sea: Object.freeze({
            maxLanes: 3,
            minLengthFrac: 0.7,
            scanStride: 6,
            avoidRadius: 2,
            // Scoring and spacing controls
            preferDiagonals: true,
            laneSpacing: 6,
            minChannelWidth: 3,
        }),
        islandHop: Object.freeze({
            useHotspots: true,
            maxArcs: 2,
        }),
        land: Object.freeze({
            useRiftShoulders: true,
            maxCorridors: 5,
            minRunLength: 24,
            spacing: 11,
        }),
        river: Object.freeze({
            maxChains: 2,
            maxSteps: 80,
            preferLowlandBelow: 300,
            coastSeedRadius: 2,
            minTiles: 24,
            mustEndNearCoast: true,
        }),
        // Per-consumer policy strengths and behaviors
        policy: Object.freeze({
            sea: Object.freeze({
                // 'hard' = never edit on lanes; 'soft' = reduce chance instead of skip
                protection: "hard",
                // When protection is 'soft', multiply coast edit probabilities by this factor (0..1)
                softChanceMultiplier: 0.5,
            }),
            land: Object.freeze({
                // 0..1; scales grassland bias strength on land-open corridors
                biomesBiasStrength: 0.6,
            }),
            river: Object.freeze({
                // 0..1; scales grassland bias strength on river-chain corridors
                biomesBiasStrength: 0.5,
            }),
        }),
        // Corridor kinds and styles (probabilities are gentle multipliers; consumers must validate)
        kinds: Object.freeze({
            sea: Object.freeze({
                styles: Object.freeze({
                    ocean: Object.freeze({
                        edge: Object.freeze({
                            cliffsChance: 0.15,
                            fjordChance: 0.1,
                        }),
                        features: Object.freeze({
                            reefBias: 0.1,
                        }),
                    }),
                    coastal: Object.freeze({
                        edge: Object.freeze({
                            cliffsChance: 0.25,
                            bayCarveMultiplier: 1.15,
                        }),
                        features: Object.freeze({
                            reefBias: 0.2,
                        }),
                    }),
                }),
            }),
            islandHop: Object.freeze({
                styles: Object.freeze({
                    archipelago: Object.freeze({
                        features: Object.freeze({
                            reefBias: 0.5,
                        }),
                        edge: Object.freeze({
                            shelfReefMultiplier: 1.25,
                        }),
                    }),
                }),
            }),
            land: Object.freeze({
                styles: Object.freeze({
                    desertBelt: Object.freeze({
                        biomes: Object.freeze({
                            desert: 0.7,
                            plains: 0.25,
                            grassland: 0.1,
                            tundra: 0.05,
                        }),
                        edge: Object.freeze({
                            mountainRimChance: 0.4,
                            forestRimChance: 0.1,
                        }),
                    }),
                    plainsBelt: Object.freeze({
                        biomes: Object.freeze({
                            plains: 0.55,
                            grassland: 0.3,
                            desert: 0.1,
                            tundra: 0.05,
                        }),
                        edge: Object.freeze({
                            forestRimChance: 0.1,
                            hillRimChance: 0.08,
                        }),
                    }),
                    grasslandBelt: Object.freeze({
                        biomes: Object.freeze({
                            grassland: 0.6,
                            plains: 0.25,
                            tropical: 0.1,
                            tundra: 0.05,
                        }),
                        edge: Object.freeze({
                            forestRimChance: 0.15,
                            hillRimChance: 0.05,
                        }),
                    }),
                    canyon: Object.freeze({
                        biomes: Object.freeze({
                            desert: 0.45,
                            plains: 0.3,
                            grassland: 0.15,
                            tundra: 0.1,
                        }),
                        edge: Object.freeze({
                            cliffChance: 0.6,
                            mountainRimChance: 0.12,
                        }),
                    }),
                    plateau: Object.freeze({
                        biomes: Object.freeze({
                            plains: 0.4,
                            grassland: 0.35,
                            desert: 0.15,
                            tundra: 0.1,
                        }),
                        edge: Object.freeze({
                            escarpmentChance: 0.71,
                            mountainRimChance: 0.08,
                        }),
                    }),
                    flatMtn: Object.freeze({
                        biomes: Object.freeze({
                            grassland: 0.35,
                            plains: 0.3,
                            tundra: 0.2,
                            desert: 0.15,
                        }),
                        edge: Object.freeze({
                            mountainRimChance: 0.6,
                            forestRimChance: 0.3,
                        }),
                    }),
                }),
            }),
            river: Object.freeze({
                styles: Object.freeze({
                    riverChain: Object.freeze({
                        biomes: Object.freeze({
                            grassland: 0.6,
                            plains: 0.25,
                            tropical: 0.15,
                        }),
                        features: Object.freeze({
                            floodplainBias: 0.1,
                            forestBias: 0.1,
                        }),
                        edge: Object.freeze({
                            forestRimChance: 0.15,
                        }),
                    }),
                }),
            }),
        }),
    }),
    // --- World Model (Earth Forces; lightweight, optional) ---
    worldModel: Object.freeze({
        // Master switch for foundational Earth Forces fields (dev-on by default)
        enabled: true,
        // Plates (Voronoi plates + boundary types; fields drive rifts/orogeny/margins)
        plates: Object.freeze({
            count: 8, // Huge maps: 6–10 recommended
            axisAngles: Object.freeze([15, -20, 35]), // degrees; used to align macro trends
            convergenceMix: 0.6, // 0..1 fraction for convergent vs divergent balance
            seedJitter: 3, // tile jitter for plate seeds
            interiorSmooth: 3, // smoothing steps for shield interiors
        }),
        // Global winds (zonal baseline + jet streams; used in refinement upwind checks)
        wind: Object.freeze({
            jetStreaks: 5,
            jetStrength: 1.75,
            variance: 0.6,
            coriolisZonalScale: 1.0,
        }),
        // Ocean currents (basin gyres + boundary currents; small humidity/coast effects)
        currents: Object.freeze({
            basinGyreCountMax: 2,
            westernBoundaryBias: 1.1,
            currentStrength: 4.0,
        }),
        // Mantle pressure (bumps/ridges; optional small influence on hills/relief)
        pressure: Object.freeze({
            bumps: 7,
            amplitude: 0.75,
            scale: 0.4,
        }),
        // Directionality (global cohesion and alignment controls for Earth forces)
        // Purpose: provide cohesive, high-level controls so plates, winds, currents, and rift/orogeny
        // can evolve in concert while remaining varied. These are read by WorldModel and consumers.
        directionality: Object.freeze({
            // Master cohesion dial (0..1): higher = stronger alignment between systems
            cohesion: 0.75,
            // Macro axes in degrees: bias plate motion, prevailing winds, and gyre/currents
            primaryAxes: Object.freeze({
                plateAxisDeg: 20, // macro plate motion axis (deg)
                windBiasDeg: 270, // global wind bias offset (deg)
                currentBiasDeg: -10, // global current gyre bias (deg)
            }),
            // Interplay weights (0..1): how much one system aligns with another
            interplay: Object.freeze({
                windsFollowPlates: 0.6, // jets and streaks tend to align with plate axes
                currentsFollowWinds: 0.75, // surface currents track prevailing winds
                riftsFollowPlates: 0.8, // divergent rifts along plate boundaries
                orogenyOpposesRifts: 0.5, // convergent uplift tends to oppose divergent directions
            }),
            // Hemisphere options and seasonal asymmetry (future-facing)
            hemispheres: Object.freeze({
                southernFlip: true, // flip sign conventions in S hemisphere for winds/currents bias
                equatorBandDeg: 18, // symmetric behavior band around equator
                monsoonBias: 0.7, // seasonal asymmetry placeholder (kept conservative)
            }),
            // Variability knobs to avoid rigid patterns while honoring directionality
            variability: Object.freeze({
                angleJitterDeg: 8, // random jitter around macro axes
                magnitudeVariance: 0.35, // 0..1 variance applied to vector magnitudes
                seedOffset: 0, // RNG stream offset dedicated to directionality
            }),
        }),
        // Policy scalars for consumers (keep gentle; all effects remain clamped/validated)
        policy: Object.freeze({
            windInfluence: 1.0, // scales wind use in refinement upwind barrier checks
            currentHumidityBias: 0.4, // scales coastal humidity tweak from currents
            boundaryFjordBias: 0.3, // scales fjord/bay bias near convergent boundaries
            shelfReefBias: 0.2, // scales passive-shelf reef bias (validated in features)
            // Ocean separation policy (plate-aware; consumed by landmass/coast shaping)
            oceanSeparation: Object.freeze({
                enabled: false, // default off until consumer layer is wired
                // Which continent band pairs to bias apart (0-based indices used by orchestrator):
                // Use [] to disable, or [[0,1],[1,2]] to bias both left–middle and middle–right bands.
                bandPairs: Object.freeze([
                    [0, 1],
                    [1, 2],
                ]),
                // Base lateral push (tiles) applied pre-coast expansion; positive widens oceans
                baseSeparationTiles: 2,
                // Multiplier (0..2) scaling separation near high WorldModel.boundaryCloseness
                boundaryClosenessMultiplier: 1.0,
                // Maximum absolute separation delta per row to preserve robust sea lanes
                maxPerRowDelta: 3,
                // Respect strategic sea lanes and enforce minimum channel width
                respectSeaLanes: true,
                minChannelWidth: 4,
                // Optional outer-edge ocean widening/narrowing (map sides)
                edgeWest: Object.freeze({
                    enabled: false,
                    baseTiles: 0,
                    boundaryClosenessMultiplier: 1.0,
                    maxPerRowDelta: 2,
                }),
                edgeEast: Object.freeze({
                    enabled: false,
                    baseTiles: 0,
                    boundaryClosenessMultiplier: 1.0,
                    maxPerRowDelta: 2,
                }),
            }),
        }),
    }),
    // --- Landmass (base land/ocean and shaping) ---
    landmass: Object.freeze({
        baseWaterPercent: 64,
        waterThumbOnScale: -4,
        jitterAmpFracBase: 0.03,
        jitterAmpFracScale: 0.015,
        curveAmpFrac: 0.05,
        // Geometry: orchestrator preferences for landmass generators.
        geometry: Object.freeze({
            mode: "auto",
            post: Object.freeze({
                expandTiles: 0,
                expandWestTiles: 0,
                expandEastTiles: 0,
            }),
        }),
    }),
    // --- Coastlines (rugged coasts; lane-safe) ---
    coastlines: Object.freeze({
        bay: Object.freeze({
            noiseGateAdd: 0,
            rollDenActive: 4,
            rollDenDefault: 5,
        }),
        fjord: Object.freeze({
            baseDenom: 12,
            activeBonus: 1,
            passiveBonus: 2,
        }),
        minSeaLaneWidth: 4,
    }),
    // --- Margins (active/passive tagging) ---
    margins: Object.freeze({
        activeFraction: 0.25,
        passiveFraction: 0.25,
        minSegmentLength: 12,
    }),
    // --- Islands (offshore clusters; hotspot bias) ---
    islands: Object.freeze({
        fractalThresholdPercent: 90,
        baseIslandDenNearActive: 5,
        baseIslandDenElse: 7,
        hotspotSeedDenom: 2,
        clusterMax: 3,
        minDistFromLandRadius: 2,
    }),
    // --- Climate Baseline (banded blend + local bonuses) ---
    climateBaseline: Object.freeze({
        blend: Object.freeze({
            baseWeight: 0.6,
            bandWeight: 0.4,
        }),
        bands: Object.freeze({
            deg0to10: 120,
            deg10to20: 104,
            deg20to35: 75,
            deg35to55: 70,
            deg55to70: 60,
            deg70plus: 45,
        }),
        orographic: Object.freeze({
            hi1Threshold: 350,
            hi1Bonus: 8,
            hi2Threshold: 600,
            hi2Bonus: 7,
        }),
        coastal: Object.freeze({
            coastalLandBonus: 24,
            shallowAdjBonus: 16,
        }),
        noise: Object.freeze({
            baseSpanSmall: 3,
            spanLargeScaleFactor: 1.0,
        }),
    }),
    // --- Climate Refinement (earthlike) ---
    climateRefine: Object.freeze({
        waterGradient: Object.freeze({
            radius: 5,
            perRingBonus: 5,
            lowlandBonus: 3,
        }),
        orographic: Object.freeze({
            steps: 4,
            reductionBase: 8,
            reductionPerStep: 6,
        }),
        riverCorridor: Object.freeze({
            lowlandAdjacencyBonus: 14,
            highlandAdjacencyBonus: 5,
        }),
        lowBasin: Object.freeze({
            radius: 3,
            delta: 6,
        }),
    }),
    // --- Biomes (nudges) ---
    biomes: Object.freeze({
        tundra: Object.freeze({
            latMin: 70,
            elevMin: 850,
            rainMax: 90,
        }),
        tropicalCoast: Object.freeze({
            latMax: 18,
            rainMin: 105,
        }),
        riverValleyGrassland: Object.freeze({
            latMax: 50,
            rainMin: 75,
        }),
        riftShoulder: Object.freeze({
            grasslandLatMax: 50,
            grasslandRainMin: 75,
            tropicalLatMax: 18,
            tropicalRainMin: 100,
        }),
    }),
    // --- Features density tweaks (validated) ---
    featuresDensity: Object.freeze({
        rainforestExtraChance: 75,
        forestExtraChance: 20,
        taigaExtraChance: 35,
        shelfReefMultiplier: 0.6,
    }),
    // --- Placement ---
    placement: Object.freeze({
        wondersPlusOne: true,
        floodplains: Object.freeze({
            minLength: 4,
            maxLength: 10,
        }),
    }),
    // --- Dev logger defaults (ON for development) ---
    // These feed the resolved config; dev.js will be aligned to read from them.
    dev: Object.freeze({
        enabled: true,
        logTiming: true,
        logStoryTags: true,
        rainfallHistogram: true,
    }),
});
export default BASE_CONFIG;
```

## File: mod/maps/config/presets/classic.js
```javascript
// @ts-nocheck
/**
 * Classic preset — baseline three‑band layout with vanilla‑like oceans.
 *
 * Purpose
 * - Provide a named, conservative baseline preset suitable as a starting point
 *   for variants. This preset is intentionally minimal and close to defaults.
 *
 * Usage (example)
 *   import { CLASSIC_PRESET } from "./config/presets/classic.js";
 *   setConfig({
 *     ...CLASSIC_PRESET,
 *     // Optional overrides...
 *   });
 */
// @ts-check
export const CLASSIC_PRESET = Object.freeze({
    // Keep all major systems enabled by default
    toggles: Object.freeze({
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true,
        STORY_ENABLE_WORLDMODEL: true,
    }),
    // Classic baseline: Voronoi-first with plate fallback when available
    landmass: Object.freeze({
        geometry: Object.freeze({
            mode: "auto",
        }),
    }),
    // WorldModel is available but uses central defaults for detailed fields
    worldModel: Object.freeze({
        enabled: true,
    }),
    // Dev logger defaults (quiet; entries/presets may override for debugging)
    dev: Object.freeze({
        enabled: false,
        logTiming: false,
        logStoryTags: false,
        rainfallHistogram: false,
    }),
});
export default CLASSIC_PRESET;
```

## File: mod/maps/config/presets/temperate.js
```javascript
// @ts-nocheck
/**
 * Temperate preset — gentle, trade‑wind world with plate-aware Voronoi layout.
 *
 * Purpose
 * - Provide a concise, conservative preset to compose with defaults and/or
 *   per-entry overrides. This is a partial config (no exhaustive fields).
 *
 * Usage (example)
 *   import { TEMPERATE_PRESET } from "./config/presets/temperate.js";
 *   setConfig({
 *     ...TEMPERATE_PRESET,
 *     // Optional overrides...
 *   });
 */
// @ts-check
export const TEMPERATE_PRESET = Object.freeze({
    // Keep all major systems enabled (gentle, cohesive world)
    toggles: Object.freeze({
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true,
        STORY_ENABLE_WORLDMODEL: true,
    }),
    // Voronoi-first layout with gentle plate fallback (safe navigation)
    landmass: Object.freeze({
        geometry: Object.freeze({
            mode: "auto",
        }),
    }),
    // Lightweight Earth Forces with moderated global cohesion
    worldModel: Object.freeze({
        enabled: true,
        directionality: Object.freeze({
            cohesion: 0.6,
            hemispheres: Object.freeze({
                // Slight seasonal/hemispheric asymmetry
                monsoonBias: 0.25,
            }),
        }),
    }),
    // Dev logger defaults (quiet; entries may override during debugging)
    dev: Object.freeze({
        enabled: false,
        logTiming: false,
        logStoryTags: false,
        rainfallHistogram: false,
    }),
});
export default TEMPERATE_PRESET;
```

## File: mod/maps/config/dev.js
```javascript
// @ts-nocheck
/**
 * Developer logging configuration and helpers (disabled by default).
 *
 * Purpose
 * - Centralize all dev-only flags and utilities so verbose logs can be enabled
 *   temporarily without touching generation logic.
 * - Keep all helpers no-op when disabled to avoid perf impact or noisy output.
 *
 * Usage (example)
 *   import { DEV, devLog, devLogIf, timeSection, logStoryTagsSummary, logRainfallHistogram } from "./config/dev.js";
 *
 *   // Enable locally for a debugging session:
 *   // DEV.ENABLED = true; DEV.LOG_TIMING = true; DEV.LOG_STORY_TAGS = true;
 *
 *   devLog("Hello from dev logs");
 *   devLogIf("LOG_STORY_TAGS", "Story tags will be summarized later");
 *
 *   timeSection("Layer: addIslandChains", () => {
 *     addIslandChains(width, height);
 *   });
 *
 *   logStoryTagsSummary(StoryTags);
 *   logRainfallHistogram(width, height, 12);
 */
/**
 * Master toggles (all false by default).
 * Flip selectively during development sessions; keep off for release builds.
 */
import { DEV_LOG_CFG as __DEV_CFG__ } from "./resolved.js";
export const DEV = {
    ENABLED: true, // Master switch — must be true for any dev logging
    LOG_TIMING: true, // Log per-section timings (timeSection / timeStart/timeEnd)
    LOG_STORY_TAGS: true, // Log StoryTags summary counts
    RAINFALL_HISTOGRAM: true, // Log a coarse rainfall histogram (non-water tiles only)
    LOG_CORRIDOR_ASCII: true, // Print a coarse ASCII overlay of corridor tags (downsampled)
    LOG_WORLDMODEL_SUMMARY: false, // Print compact WorldModel summary when available
    WORLDMODEL_HISTOGRAMS: false, // Print histograms for rift/uplift (optionally near tags)
    LAYER_COUNTS: false, // Reserved for layer-specific counters (if used by callers)
};
/**
 * Internal: guard that checks if a specific flag is enabled (and master is on).
 * @param {keyof typeof DEV} flag
 * @returns {boolean}
 */
/**
 * Initialize DEV flags from resolved.DEV_LOG_CFG() at module import time.
 * Entries/presets can override dev logging per run.
 */
try {
    const __cfg = typeof __DEV_CFG__ === "function" ? __DEV_CFG__() : null;
    if (__cfg && typeof __cfg === "object") {
        if ("enabled" in __cfg)
            DEV.ENABLED = !!__cfg.enabled;
        if ("logTiming" in __cfg)
            DEV.LOG_TIMING = !!__cfg.logTiming;
        if ("logStoryTags" in __cfg)
            DEV.LOG_STORY_TAGS = !!__cfg.logStoryTags;
        if ("rainfallHistogram" in __cfg)
            DEV.RAINFALL_HISTOGRAM = !!__cfg.rainfallHistogram;
        if ("LOG_CORRIDOR_ASCII" in __cfg)
            DEV.LOG_CORRIDOR_ASCII = !!__cfg.LOG_CORRIDOR_ASCII;
        if ("LOG_WORLDMODEL_SUMMARY" in __cfg)
            DEV.LOG_WORLDMODEL_SUMMARY = !!__cfg.LOG_WORLDMODEL_SUMMARY;
        if ("WORLDMODEL_HISTOGRAMS" in __cfg)
            DEV.WORLDMODEL_HISTOGRAMS = !!__cfg.WORLDMODEL_HISTOGRAMS;
    }
}
catch (_) {
    /* no-op */
}
function isOn(flag) {
    return !!(DEV && DEV.ENABLED && DEV[flag]);
}
/**
 * Safe console.log wrapper (no-op if disabled).
 * @param  {...any} args
 */
export function devLog(...args) {
    if (!DEV.ENABLED)
        return;
    try {
        console.log("[DEV]", ...args);
    }
    catch (_) {
        /* swallow */
    }
}
/**
 * Conditional console.log wrapper for a specific flag under the master switch.
 * @param {keyof typeof DEV} flag
 * @param  {...any} args
 */
export function devLogIf(flag, ...args) {
    if (!isOn(flag))
        return;
    try {
        console.log(`[DEV][${String(flag)}]`, ...args);
    }
    catch (_) {
        /* swallow */
    }
}
/**
 * Time a synchronous section and log duration (no-op if LOG_TIMING disabled).
 * @template T
 * @param {string} label
 * @param {() => T} fn
 * @returns {T}
 */
export function timeSection(label, fn) {
    if (!isOn("LOG_TIMING"))
        return fn();
    const t0 = nowMs();
    try {
        return fn();
    }
    finally {
        const dt = nowMs() - t0;
        safeLog(`[DEV][time] ${label}: ${fmtMs(dt)}`);
    }
}
/**
 * Start a timing span; returns a token to pass to timeEnd.
 * No-op (returns null) if LOG_TIMING disabled.
 * @param {string} label
 * @returns {{label:string,t0:number}|null}
 */
export function timeStart(label) {
    if (!isOn("LOG_TIMING"))
        return null;
    return { label, t0: nowMs() };
}
/**
 * End a timing span started by timeStart.
 * Safe to call with null (no-op).
 * @param {{label:string,t0:number}|null} token
 */
export function timeEnd(token) {
    if (!token)
        return;
    const dt = nowMs() - token.t0;
    safeLog(`[DEV][time] ${token.label}: ${fmtMs(dt)}`);
}
/**
 * Log a compact summary of StoryTags (sizes of known sets).
 * Safe if StoryTags is missing or partially defined.
 * No-op if LOG_STORY_TAGS disabled.
 * @param {{hotspot?:Set<string>,hotspotParadise?:Set<string>,hotspotVolcanic?:Set<string>,riftLine?:Set<string>,riftShoulder?:Set<string>,activeMargin?:Set<string>,passiveShelf?:Set<string>}} StoryTags
 * @param {{belts?:Set<string>,windward?:Set<string>,lee?:Set<string>}} [OrogenyCache]
 */
export function logStoryTagsSummary(StoryTags, OrogenyCache) {
    if (!isOn("LOG_STORY_TAGS"))
        return;
    if (!StoryTags || typeof StoryTags !== "object") {
        safeLog("[DEV][story] StoryTags not available");
        return;
    }
    const counts = {
        hotspot: sizeOf(StoryTags.hotspot),
        hotspotParadise: sizeOf(StoryTags.hotspotParadise),
        hotspotVolcanic: sizeOf(StoryTags.hotspotVolcanic),
        riftLine: sizeOf(StoryTags.riftLine),
        riftShoulder: sizeOf(StoryTags.riftShoulder),
        activeMargin: sizeOf(StoryTags.activeMargin),
        passiveShelf: sizeOf(StoryTags.passiveShelf),
        corridorSeaLane: sizeOf(StoryTags.corridorSeaLane),
        corridorIslandHop: sizeOf(StoryTags.corridorIslandHop),
        corridorLandOpen: sizeOf(StoryTags.corridorLandOpen),
        corridorRiverChain: sizeOf(StoryTags.corridorRiverChain),
    };
    safeLog("[DEV][story] tags:", counts);
    if (OrogenyCache && typeof OrogenyCache === "object") {
        const oroCounts = {
            belts: sizeOf(OrogenyCache.belts),
            windward: sizeOf(OrogenyCache.windward),
            lee: sizeOf(OrogenyCache.lee),
        };
        if (oroCounts.belts > 0) {
            safeLog("[DEV][story] orogeny:", oroCounts);
        }
    }
    // Optional ASCII corridor overlay (downsampled)
    if (isOn("LOG_CORRIDOR_ASCII")) {
        logCorridorAsciiOverlay();
    }
}
/**
 * Build and log a rainfall histogram over non-water tiles (coarse bins).
 * Depends on GameplayMap (provided by the game engine at runtime).
 * No-op if RAINFALL_HISTOGRAM disabled or GameplayMap is unavailable.
 * @param {number} width
 * @param {number} height
 * @param {number} [bins=10]
 */
export function logRainfallHistogram(width, height, bins = 10) {
    if (!isOn("RAINFALL_HISTOGRAM"))
        return;
    try {
        if (typeof GameplayMap?.getRainfall !== "function" ||
            typeof GameplayMap?.isWater !== "function") {
            safeLog("[DEV][rain] GameplayMap API unavailable; skipping histogram.");
            return;
        }
        const counts = new Array(Math.max(1, Math.min(100, bins))).fill(0);
        let samples = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (GameplayMap.isWater(x, y))
                    continue;
                const r = clampTo(GameplayMap.getRainfall(x, y), 0, 200);
                const idx = Math.min(counts.length - 1, Math.floor((r / 201) * counts.length));
                counts[idx]++;
                samples++;
            }
        }
        if (samples === 0) {
            safeLog("[DEV][rain] No land samples for histogram.");
            return;
        }
        const pct = counts.map((c) => ((c / samples) * 100).toFixed(1) + "%");
        safeLog("[DEV][rain] histogram (bins=", counts.length, "):", pct);
    }
    catch (err) {
        safeLog("[DEV][rain] histogram error:", err);
    }
}
/**
 * WorldModel summary: plates and boundary type counts (compact).
 * Accepts a WorldModel-like object (so callers can pass the singleton).
 * No-op if LOG_WORLDMODEL_SUMMARY disabled.
 * @param {{isEnabled?:()=>boolean,plateId?:Int16Array,boundaryType?:Uint8Array,boundaryCloseness?:Uint8Array,upliftPotential?:Uint8Array, riftPotential?:Uint8Array}} WorldModel
 */
export function logWorldModelSummary(WorldModel) {
    if (!isOn("LOG_WORLDMODEL_SUMMARY"))
        return;
    try {
        const enabled = !!WorldModel &&
            typeof WorldModel.isEnabled === "function" &&
            !!WorldModel.isEnabled();
        if (!enabled) {
            safeLog("[DEV][wm] WorldModel disabled or unavailable.");
            return;
        }
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        const size = Math.max(0, width * height) | 0;
        const plateId = WorldModel.plateId;
        const bType = WorldModel.boundaryType;
        const bClose = WorldModel.boundaryCloseness;
        const uplift = WorldModel.upliftPotential;
        const rift = WorldModel.riftPotential;
        if (!plateId || !bType || !bClose) {
            safeLog("[DEV][wm] Missing core fields; skipping summary.");
            return;
        }
        const plates = new Set();
        const btCounts = [0, 0, 0, 0]; // none, convergent, divergent, transform
        let boundaryTiles = 0;
        const n = Math.min(size, plateId.length, bType.length, bClose.length);
        for (let i = 0; i < n; i++) {
            plates.add(plateId[i]);
            const bt = bType[i] | 0;
            if (bt >= 0 && bt < btCounts.length)
                btCounts[bt]++;
            if ((bClose[i] | 0) > 32)
                boundaryTiles++;
        }
        function avgByte(arr) {
            if (!arr || !arr.length)
                return 0;
            const m = Math.min(arr.length, size || arr.length);
            let s = 0;
            for (let i = 0; i < m; i++)
                s += arr[i] | 0;
            return Math.round(s / Math.max(1, m));
        }
        const summary = {
            width,
            height,
            plates: plates.size,
            boundaryTiles,
            boundaryTypes: {
                none: btCounts[0] | 0,
                convergent: btCounts[1] | 0,
                divergent: btCounts[2] | 0,
                transform: btCounts[3] | 0,
            },
            upliftAvg: uplift ? avgByte(uplift) : null,
            riftAvg: rift ? avgByte(rift) : null,
        };
        safeLog("[DEV][wm] summary:", summary);
    }
    catch (err) {
        safeLog("[DEV][wm] summary error:", err);
    }
}
/**
 * WorldModel histograms for uplift/rift potentials. Optionally restrict samples
 * to tiles included in provided tag sets (Orogeny belts or Rift lines).
 * No-op if WORLDMODEL_HISTOGRAMS disabled.
 * @param {{isEnabled?:()=>boolean,upliftPotential?:Uint8Array, riftPotential?:Uint8Array}} WorldModel
 * @param {{riftSet?:Set<string>, beltSet?:Set<string>, bins?:number}} [opts]
 */
export function logWorldModelHistograms(WorldModel, opts = {}) {
    if (!isOn("WORLDMODEL_HISTOGRAMS"))
        return;
    try {
        const enabled = !!WorldModel &&
            typeof WorldModel.isEnabled === "function" &&
            !!WorldModel.isEnabled();
        if (!enabled) {
            safeLog("[DEV][wm] hist: WorldModel disabled or unavailable.");
            return;
        }
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        const size = Math.max(0, width * height) | 0;
        const uplift = WorldModel.upliftPotential;
        const rift = WorldModel.riftPotential;
        if (!uplift || !rift) {
            safeLog("[DEV][wm] hist: Missing fields (uplift/rift).");
            return;
        }
        const bins = Math.max(5, Math.min(50, opts.bins | 0 || 10));
        const histAll = (arr) => {
            const h = new Array(bins).fill(0);
            const n = Math.min(arr.length, size || arr.length);
            let samples = 0;
            for (let i = 0; i < n; i++) {
                const v = arr[i] | 0; // 0..255
                const bi = Math.min(bins - 1, Math.floor((v / 256) * bins));
                h[bi]++;
                samples++;
            }
            return { h, samples };
        };
        const histMasked = (arr, maskSet) => {
            if (!maskSet || !(maskSet instanceof Set) || maskSet.size === 0)
                return null;
            const h = new Array(bins).fill(0);
            let samples = 0;
            // Scan grid once; test membership by tile key
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const key = `${x},${y}`;
                    if (!maskSet.has(key))
                        continue;
                    const i = y * width + x;
                    const v = arr[i] | 0;
                    const bi = Math.min(bins - 1, Math.floor((v / 256) * bins));
                    h[bi]++;
                    samples++;
                }
            }
            return { h, samples };
        };
        const pct = (h, total) => h.map((c) => ((c / Math.max(1, total)) * 100).toFixed(1) + "%");
        const aU = histAll(uplift);
        const aR = histAll(rift);
        safeLog("[DEV][wm] uplift (all) hist:", pct(aU.h, aU.samples));
        safeLog("[DEV][wm] rift   (all) hist:", pct(aR.h, aR.samples));
        // Optional masked histograms near tags
        const mUrift = histMasked(uplift, opts.riftSet);
        const mRrift = histMasked(rift, opts.riftSet);
        if (mUrift && mRrift) {
            safeLog("[DEV][wm] uplift (near riftLine) hist:", pct(mUrift.h, mUrift.samples));
            safeLog("[DEV][wm] rift   (near riftLine) hist:", pct(mRrift.h, mRrift.samples));
        }
        const mUbelts = histMasked(uplift, opts.beltSet);
        const mRbelts = histMasked(rift, opts.beltSet);
        if (mUbelts && mRbelts) {
            safeLog("[DEV][wm] uplift (near orogeny belts) hist:", pct(mUbelts.h, mUbelts.samples));
            safeLog("[DEV][wm] rift   (near orogeny belts) hist:", pct(mRbelts.h, mRbelts.samples));
        }
    }
    catch (err) {
        safeLog("[DEV][wm] hist error:", err);
    }
}
/**
 * Log a coarse ASCII overlay of corridor tags (downsampled).
 * Legend:
 * Legend:
 *  - S: corridorSeaLane (protected open water)
 *  - I: corridorIslandHop (hotspot arcs over water)
 *  - R: corridorRiverChain (river-adjacent land)
 *  - L: corridorLandOpen (open land lanes)
 *  - ~: water (no corridor)
 *  - .: land (no corridor)
 * The overlay samples every `step` tiles to keep output compact on Huge maps.
 * @param {number} [step=8] sampling stride in tiles
 */
export function logCorridorAsciiOverlay(step = 8) {
    if (!isOn("LOG_CORRIDOR_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog("[DEV][corridor] No map bounds; skipping ASCII overlay.");
            return;
        }
        const s = Math.max(1, step | 0);
        safeLog("[DEV][corridor] ASCII overlay (step=", s, "): S=SeaLane, I=IslandHop, L=LandOpen, R=RiverChain, ~=water, .=land");
        for (let y = 0; y < height; y += s) {
            let row = "";
            for (let x = 0; x < width; x += s) {
                const k = `${x},${y}`;
                const isWater = !!GameplayMap.isWater?.(x, y);
                const cS = !!StoryTags?.corridorSeaLane &&
                    !!StoryTags.corridorSeaLane.has?.(k);
                const cI = !!StoryTags?.corridorIslandHop &&
                    !!StoryTags.corridorIslandHop.has?.(k);
                const cL = !!StoryTags?.corridorLandOpen &&
                    !!StoryTags.corridorLandOpen.has?.(k);
                const cR = !!StoryTags?.corridorRiverChain &&
                    !!StoryTags.corridorRiverChain.has?.(k);
                let ch = isWater ? "~" : ".";
                if (isWater && cS)
                    ch = "S";
                else if (isWater && cI)
                    ch = "I";
                else if (!isWater && cR)
                    ch = "R";
                else if (!isWater && cL)
                    ch = "L";
                row += ch;
            }
            safeLog(row);
        }
    }
    catch (err) {
        safeLog("[DEV][corridor] ASCII overlay error:", err);
    }
}
/* ----------------------- internal helpers ----------------------- */
function safeLog(...args) {
    try {
        console.log(...args);
    }
    catch (_) {
        /* no-op */
    }
}
function nowMs() {
    try {
        // Prefer high-resolution timer when available
        // @ts-ignore
        if (typeof performance !== "undefined" &&
            typeof performance.now === "function")
            return performance.now();
    }
    catch (_) {
        /* ignore */
    }
    return Date.now();
}
function fmtMs(ms) {
    // Format as e.g. "12.34 ms"
    const n = typeof ms === "number" ? ms : Number(ms) || 0;
    return `${n.toFixed(2)} ms`;
}
function sizeOf(setLike) {
    if (!setLike)
        return 0;
    if (typeof setLike.size === "number")
        return setLike.size;
    try {
        return Array.isArray(setLike) ? setLike.length : 0;
    }
    catch {
        return 0;
    }
}
function clampTo(v, lo, hi) {
    if (v < lo)
        return lo;
    if (v > hi)
        return hi;
    return v;
}
export default {
    DEV,
    devLog,
    devLogIf,
    timeSection,
    timeStart,
    timeEnd,
    logStoryTagsSummary,
    logRainfallHistogram,
    logWorldModelSummary,
    logWorldModelHistograms,
};
```

## File: mod/maps/config/entry.js
```javascript
// @ts-nocheck
/**
 * Entry Bootstrap Helper
 *
 * Purpose
 * - Minimize boilerplate in map entry files.
 * - Compose configuration from named presets and inline overrides, then
 *   set the active runtime config. Entries must import the orchestrator separately.
 *
 * Usage (in a map entry file):
 *   import { bootstrap } from "./config/entry.js";
 *   bootstrap({
 *     presets: ["classic", "temperate"], // optional, ordered
 *     overrides: {
 *       // any partial config to override the resolved result
 *       toggles: { STORY_ENABLE_WORLDMODEL: true },
 *       worldModel: { enabled: true },
 *       // ...
 *     }
 *   });
 *
 * Notes
 * - This helper is intentionally simple and synchronous for game VM compatibility.
 * - Presets are applied by name via resolved.js; arrays replace, objects deep-merge.
 * - This helper does not import the orchestrator; keep the explicit import in the entry.
 */
// @ts-check
import { setConfig } from "./runtime.js";
/**
 * Deep merge utility (objects by key, arrays replaced, primitives overwritten).
 * Returns a new object; never mutates inputs.
 * @param {any} base
 * @param {any} src
 * @returns {any}
 */
function deepMerge(base, src) {
    const isObj = (v) => v != null &&
        typeof v === "object" &&
        (Object.getPrototypeOf(v) === Object.prototype ||
            Object.getPrototypeOf(v) === null);
    if (!isObj(base) || Array.isArray(src)) {
        return clone(src);
    }
    if (!isObj(src)) {
        return clone(src);
    }
    /** @type {Record<string, any>} */
    const out = {};
    for (const k of Object.keys(base))
        out[k] = clone(base[k]);
    for (const k of Object.keys(src)) {
        const b = out[k];
        const s = src[k];
        out[k] = isObj(b) && isObj(s) ? deepMerge(b, s) : clone(s);
    }
    return out;
}
/**
 * Shallow clone helper (new containers for arrays/objects).
 * @param {any} v
 * @returns {any}
 */
function clone(v) {
    if (Array.isArray(v))
        return v.slice();
    const isObj = v != null &&
        typeof v === "object" &&
        (Object.getPrototypeOf(v) === Object.prototype ||
            Object.getPrototypeOf(v) === null);
    if (isObj) {
        const o = {};
        for (const k of Object.keys(v))
            o[k] = v[k];
        return o;
    }
    return v;
}
/**
 * Compose a per-entry configuration object from presets and overrides,
 * and set it as the active runtime config.
 *
 * @param {object} [options]
 * @param {ReadonlyArray<string>} [options.presets] - Ordered list of preset names understood by resolved.js
 * @param {object} [options.overrides] - Inline overrides applied last (highest precedence)
 */
export function bootstrap(options = {}) {
    const presets = Array.isArray(options.presets) &&
        options.presets.length > 0
        ? options.presets.filter((n) => typeof n === "string")
        : undefined;
    const overrides = options && typeof options === "object" && options.overrides
        ? clone(options.overrides)
        : undefined;
    const cfg = {};
    if (presets)
        cfg.presets = presets;
    if (overrides) {
        // If both presets and overrides exist, ensure overrides apply last (highest precedence)
        Object.assign(cfg, deepMerge(cfg, overrides));
    }
    // Store runtime config for this map entry (entries must import orchestrator separately)
    setConfig(cfg);
}
export default { bootstrap };
```

## File: mod/maps/config/resolved.js
```javascript
// @ts-nocheck
/**
 * Resolved Config Provider
 *
 * Purpose
 * - Build a single, immutable configuration snapshot for the current run by
 *   composing, in order of increasing precedence:
 *     1) Explicit defaults (BASE_CONFIG)
 *     2) Named presets (optional, ordered)
 *     3) Per-entry overrides from runtime (set via setConfig in entry files)
 *
 * Usage
 * - Call refresh() once at the start of generation (e.g., top of generateMap()).
 * - Import and use the getters below to read resolved groups/fields.
 *
 * Notes
 * - Arrays are replaced (not merged); objects are deep-merged by key.
 * - The final snapshot is deeply frozen to prevent accidental mutation.
 * - Control keys (e.g., `presets`) are stripped from the final snapshot.
 */
// @ts-check
import { BASE_CONFIG } from "./defaults/base.js";
import { CLASSIC_PRESET } from "./presets/classic.js";
import { TEMPERATE_PRESET } from "./presets/temperate.js";
import { getConfig as getRuntimeConfig } from "./runtime.js";
/* -----------------------------------------------------------------------------
 * Internal state
 * -------------------------------------------------------------------------- */
/** @typedef {Record<string, any>} AnyObject */
/** @type {Record<string, AnyObject>} */
const PRESET_REGISTRY = Object.freeze({
    classic: CLASSIC_PRESET,
    temperate: TEMPERATE_PRESET,
});
/** @type {ReadonlyArray<string>} */
let ACTIVE_PRESETS = Object.freeze([]);
/** @type {Readonly<AnyObject>} */
let SNAPSHOT = BASE_CONFIG;
/* -----------------------------------------------------------------------------
 * Merge and freeze helpers
 * -------------------------------------------------------------------------- */
/**
 * @param {any} v
 * @returns {v is AnyObject}
 */
function isPlainObject(v) {
    return (v != null &&
        typeof v === "object" &&
        (Object.getPrototypeOf(v) === Object.prototype ||
            Object.getPrototypeOf(v) === null));
}
/**
 * Deeply merge two values into a new value.
 * - Objects: merged per-key (recursively).
 * - Arrays: replaced by the source (no concat).
 * - Other types: replaced by the source.
 *
 * @template T
 * @param {T} base
 * @param {any} src
 * @returns {T}
 */
function deepMerge(base, src) {
    // Replace primitives and arrays directly
    if (!isPlainObject(base) || Array.isArray(src)) {
        return clone(src);
    }
    if (!isPlainObject(src)) {
        // If source is not a plain object, replace
        return clone(src);
    }
    /** @type {AnyObject} */
    const out = {};
    // Copy base keys first
    for (const k of Object.keys(base)) {
        out[k] = clone(base[k]);
    }
    // Merge/replace from source
    for (const k of Object.keys(src)) {
        const b = out[k];
        const s = src[k];
        if (isPlainObject(b) && isPlainObject(s)) {
            out[k] = deepMerge(b, s);
        }
        else {
            out[k] = clone(s);
        }
    }
    return /** @type {T} */ (out);
}
/**
 * Clone a value shallowly (objects/arrays produce new containers).
 * @param {any} v
 * @returns {any}
 */
function clone(v) {
    if (Array.isArray(v))
        return v.slice();
    if (isPlainObject(v)) {
        const o = {};
        for (const k of Object.keys(v))
            o[k] = v[k];
        return o;
    }
    return v;
}
/**
 * Deep-freeze an object graph (objects/arrays).
 * Loosened typing for @ts-check to avoid structural complaints in JS.
 * @param {any} v
 * @returns {any}
 */
function deepFreeze(v) {
    if (v == null)
        return v;
    if (typeof Object.isFrozen === "function" && Object.isFrozen(v))
        return v;
    if (Array.isArray(v)) {
        const arr = v.map((item) => deepFreeze(item));
        return Object.freeze(arr);
    }
    if (isPlainObject(v)) {
        /** @type {Record<string, any>} */
        const out = {};
        for (const k of Object.keys(v)) {
            out[k] = deepFreeze(v[k]);
        }
        return Object.freeze(out);
    }
    return v;
}
/* -----------------------------------------------------------------------------
 * Resolution
 * -------------------------------------------------------------------------- */
/**
 * Build a new resolved snapshot by composing:
 *   BASE_CONFIG <- presets[] <- runtimeOverrides
 *
 * Runtime overrides may optionally include { presets: string[] } to select
 * named presets. The 'presets' control key is stripped from the final snapshot.
 *
 * @returns {{ snapshot: Readonly<AnyObject>, activePresetNames: ReadonlyArray<string> }}
 */
function buildSnapshot() {
    // Start from explicit defaults
    let merged = /** @type {AnyObject} */ (deepMerge({}, BASE_CONFIG));
    // Read per-entry overrides
    const rc = /** @type {AnyObject} */ (getRuntimeConfig() || {});
    // Resolve and apply presets (ordered)
    const presetNames = Array.isArray(rc.presets)
        ? rc.presets.filter((n) => typeof n === "string" && !!PRESET_REGISTRY[n])
        : [];
    for (const name of presetNames) {
        const presetObj = PRESET_REGISTRY[name];
        if (presetObj) {
            merged = deepMerge(merged, presetObj);
        }
    }
    // Strip control keys (e.g., 'presets') from overrides before merge
    /** @type {AnyObject} */
    const overrides = {};
    for (const k of Object.keys(rc)) {
        if (k === "presets")
            continue;
        overrides[k] = rc[k];
    }
    // Apply per-entry overrides last (highest precedence)
    merged = deepMerge(merged, overrides);
    // Freeze deeply for safety
    const frozen = deepFreeze(merged);
    return {
        snapshot: frozen,
        activePresetNames: Object.freeze(presetNames.slice()),
    };
}
/* -----------------------------------------------------------------------------
 * Public API
 * -------------------------------------------------------------------------- */
/**
 * Rebuild the resolved snapshot for the current run.
 * Should be called at the start of generation (e.g., in generateMap()).
 */
export function refresh() {
    const { snapshot, activePresetNames } = buildSnapshot();
    SNAPSHOT = snapshot;
    ACTIVE_PRESETS = activePresetNames;
}
/**
 * Get the current immutable snapshot (for diagnostics or advanced usage).
 * @returns {Readonly<AnyObject>}
 */
export function getSnapshot() {
    return SNAPSHOT;
}
/**
 * Get the currently active preset names (in application order).
 * @returns {ReadonlyArray<string>}
 */
export function currentActivePresets() {
    return ACTIVE_PRESETS;
}
/**
 * Generic group accessor with safe fallback to empty object.
 * @param {string} groupName
 * @returns {Readonly<AnyObject>}
 */
export function getGroup(groupName) {
    const g = SNAPSHOT && /** @type {AnyObject} */ (SNAPSHOT)[groupName];
    return /** @type {any} */ (isPlainObject(g) ? g : {});
}
/**
 * Dot-path getter for convenience (e.g., "worldModel.directionality").
 * Returns undefined if not found.
 * @param {string} path
 * @returns {any}
 */
export function get(path) {
    if (!path || typeof path !== "string")
        return undefined;
    const parts = path.split(".");
    /** @type {any} */
    let cur = SNAPSHOT;
    for (const p of parts) {
        if (cur == null)
            return undefined;
        cur = cur[p];
    }
    return cur;
}
/* ---- Named helpers (common groups; return empty objects if missing) ---- */
export function TOGGLES() {
    return getGroup("toggles");
}
export function STORY() {
    return getGroup("story");
}
export function MICROCLIMATE() {
    return getGroup("microclimate");
}
export function LANDMASS_CFG() {
    return getGroup("landmass");
}
export function COASTLINES_CFG() {
    return getGroup("coastlines");
}
export function MARGINS_CFG() {
    return getGroup("margins");
}
export function ISLANDS_CFG() {
    return getGroup("islands");
}
export function CLIMATE_BASELINE_CFG() {
    return getGroup("climateBaseline");
}
export function CLIMATE_REFINE_CFG() {
    return getGroup("climateRefine");
}
export function BIOMES_CFG() {
    return getGroup("biomes");
}
export function FEATURES_DENSITY_CFG() {
    return getGroup("featuresDensity");
}
export function CORRIDORS_CFG() {
    return getGroup("corridors");
}
export function PLACEMENT_CFG() {
    return getGroup("placement");
}
export function DEV_LOG_CFG() {
    return getGroup("dev");
}
export function WORLDMODEL_CFG() {
    return getGroup("worldModel");
}
/* ---- Common nested worldModel helpers ---- */
export function WORLDMODEL_PLATES() {
    return /** @type {any} */ (get("worldModel.plates") || {});
}
export function WORLDMODEL_WIND() {
    return /** @type {any} */ (get("worldModel.wind") || {});
}
export function WORLDMODEL_CURRENTS() {
    return /** @type {any} */ (get("worldModel.currents") || {});
}
export function WORLDMODEL_PRESSURE() {
    return /** @type {any} */ (get("worldModel.pressure") || {});
}
export function WORLDMODEL_POLICY() {
    return /** @type {any} */ (get("worldModel.policy") || {});
}
export function WORLDMODEL_DIRECTIONALITY() {
    return /** @type {any} */ (get("worldModel.directionality") || {});
}
export function WORLDMODEL_OCEAN_SEPARATION() {
    return /** @type {any} */ (get("worldModel.policy.oceanSeparation") || {});
}
/* ---- Default export (optional convenience) ---- */
export default {
    refresh,
    getSnapshot,
    currentActivePresets,
    getGroup,
    get,
    // Groups
    TOGGLES,
    STORY,
    MICROCLIMATE,
    LANDMASS_CFG,
    COASTLINES_CFG,
    MARGINS_CFG,
    ISLANDS_CFG,
    CLIMATE_BASELINE_CFG,
    CLIMATE_REFINE_CFG,
    BIOMES_CFG,
    FEATURES_DENSITY_CFG,
    CORRIDORS_CFG,
    PLACEMENT_CFG,
    DEV_LOG_CFG,
    WORLDMODEL_CFG,
    // WorldModel subsets
    WORLDMODEL_PLATES,
    WORLDMODEL_WIND,
    WORLDMODEL_CURRENTS,
    WORLDMODEL_PRESSURE,
    WORLDMODEL_POLICY,
    WORLDMODEL_DIRECTIONALITY,
    WORLDMODEL_OCEAN_SEPARATION,
};
```

## File: mod/maps/config/runtime.js
```javascript
// @ts-nocheck
/**
 * Minimal runtime config store for per-map inline configuration.
 *
 * Intent
 * - Each map entry file defines a plain JS object (MAP_CONFIG) inline and calls setConfig(MAP_CONFIG).
 * - The generator/orchestrator imports this module and calls getConfig() at runtime (e.g., inside generateMap()).
 * - No dynamic imports, no registries, no evaluation-time side effects. Dead simple and explicit.
 *
 * Usage (in a map entry file):
 *   import { setConfig } from "./config/runtime.js";
 *   import "./map_orchestrator.js"; // or your generator module that reads getConfig() at runtime
 *
 *   setConfig({
 *     toggles: { STORY_ENABLE_WORLDMODEL: true },
 *     landmass: { /* ... *\/ },
 *     worldModel: { /* ... *\/ },
 *     /* other groups ... *\/
 *   });
 *
 * Usage (in the orchestrator/generator):
 *   import { getConfig } from "./config/runtime.js";
 *   function generateMap() {
 *     const cfg = getConfig();
 *     // read cfg.toggles, cfg.landmass, etc., and proceed
 *   }
 */
const GLOBAL_KEY = "__EPIC_MAP_CONFIG__";
/**
 * Store the per-map configuration for this run.
 * Accepts any plain object. Non-objects are coerced to an empty object.
 * The stored object is shallow-frozen to prevent accidental mutation.
 * @param {object} config
 */
export function setConfig(config) {
    const obj = isObject(config) ? config : {};
    const frozen = shallowFreeze(obj);
    try {
        // Use a single well-known global key so all modules can access the same config
        // without import-time coupling or registries.
        globalThis[GLOBAL_KEY] = frozen;
    }
    catch {
        // In restricted environments, fall back to a local static (unlikely in Civ VM).
        __localStore.value = frozen;
    }
}
/**
 * Retrieve the current per-map configuration.
 * Returns an empty frozen object if none was set.
 * @returns {object}
 */
export function getConfig() {
    try {
        const v = globalThis[GLOBAL_KEY];
        return isObject(v) ? v : EMPTY_FROZEN_OBJECT;
    }
    catch {
        return isObject(__localStore.value) ? __localStore.value : EMPTY_FROZEN_OBJECT;
    }
}
/* -----------------------------------------------------------------------------
 * Internal helpers
 * -------------------------------------------------------------------------- */
const EMPTY_FROZEN_OBJECT = Object.freeze({});
/** @type {{ value: object }} */
const __localStore = { value: EMPTY_FROZEN_OBJECT };
/**
 * Shallow-freeze an object (freezes only the first level).
 * @template T extends object
 * @param {T} obj
 * @returns {Readonly<T>}
 */
function shallowFreeze(obj) {
    try {
        return Object.freeze(obj);
    }
    catch {
        return obj;
    }
}
/**
 * @param {any} v
 * @returns {v is object}
 */
function isObject(v) {
    return v != null && typeof v === "object";
}
```

## File: mod/maps/config/tunables.js
```javascript
// @ts-nocheck
/**
 * Unified Tunables — Live bindings with runtime rebind()
 *
 * Intent
 * - Provide a single import surface for all generator tunables (toggles and groups)
 *   backed by the resolved config snapshot.
 * - Export live ES module bindings (let variables) so callers see updated values
 *   after a call to rebind().
 *
 * Usage
 *   // Import once anywhere (bindings are live)
 *   import {
 *     rebind,
 *     STORY_ENABLE_WORLDMODEL,
 *     LANDMASS_CFG,
 *     WORLDMODEL_DIRECTIONALITY,
 *     // ...
 *   } from "./config/tunables.js";
 *
 *   // Call rebind() at the start of a generation (or when the active entry changes)
 *   rebind();
 *
 * Notes
 * - rebind() calls resolved.refresh() internally, then updates all exported bindings.
 * - A best‑effort initial rebind() is performed at module load for safety.
 * - Arrays and objects returned from the resolver are treated as read‑only.
 */
// @ts-check
import { refresh as __refreshResolved__, 
// group getters
TOGGLES as __TOGGLES__, STORY as __STORY__, MICROCLIMATE as __MICROCLIMATE__, LANDMASS_CFG as __LANDMASS__, COASTLINES_CFG as __COASTLINES__, MARGINS_CFG as __MARGINS__, ISLANDS_CFG as __ISLANDS__, CLIMATE_BASELINE_CFG as __CLIMATE_BASELINE__, CLIMATE_REFINE_CFG as __CLIMATE_REFINE__, BIOMES_CFG as __BIOMES__, FEATURES_DENSITY_CFG as __FEATURES_DENSITY__, CORRIDORS_CFG as __CORRIDORS__, PLACEMENT_CFG as __PLACEMENT__, DEV_LOG_CFG as __DEV__, WORLDMODEL_CFG as __WM__, 
// nested WM helpers
WORLDMODEL_PLATES as __WM_PLATES__, WORLDMODEL_WIND as __WM_WIND__, WORLDMODEL_CURRENTS as __WM_CURRENTS__, WORLDMODEL_PRESSURE as __WM_PRESSURE__, WORLDMODEL_POLICY as __WM_POLICY__, WORLDMODEL_DIRECTIONALITY as __WM_DIR__, WORLDMODEL_OCEAN_SEPARATION as __WM_OSEPARATION__, } from "./resolved.js";
/**
 * @typedef {import('./map_config.d.ts').Landmass} Landmass
 * @typedef {import('./map_config.d.ts').LandmassGeometry} LandmassGeometry
 * @typedef {import('./map_config.d.ts').Coastlines} CoastlinesCfg
 * @typedef {import('./map_config.d.ts').Margins} MarginsCfg
 * @typedef {import('./map_config.d.ts').Islands} IslandsCfg
 * @typedef {import('./map_config.d.ts').ClimateBaseline} ClimateBaseline
 * @typedef {import('./map_config.d.ts').ClimateRefine} ClimateRefine
 * @typedef {import('./map_config.d.ts').Biomes} Biomes
 * @typedef {import('./map_config.d.ts').FeaturesDensity} FeaturesDensity
 * @typedef {import('./map_config.d.ts').Corridors} Corridors
 * @typedef {import('./map_config.d.ts').CorridorPolicy} CorridorPolicy
 * @typedef {import('./map_config.d.ts').CorridorKinds} CorridorKinds
 * @typedef {import('./map_config.d.ts').Placement} Placement
 * @typedef {import('./map_config.d.ts').DevLogging} DevLogging
 * @typedef {import('./map_config.d.ts').WorldModel} WorldModel
 */
/* -----------------------------------------------------------------------------
 * Exported live bindings (updated by rebind)
 * -------------------------------------------------------------------------- */
// Master toggles
export let STORY_ENABLE_HOTSPOTS = true;
export let STORY_ENABLE_RIFTS = true;
export let STORY_ENABLE_OROGENY = true;
export let STORY_ENABLE_SWATCHES = true;
export let STORY_ENABLE_PALEO = true;
export let STORY_ENABLE_CORRIDORS = true;
export let STORY_ENABLE_WORLDMODEL = true;
// Merged story+micro tunables convenience view
export let STORY_TUNABLES = Object.freeze({
    hotspot: Object.freeze({}),
    rift: Object.freeze({}),
    orogeny: Object.freeze({}),
    swatches: Object.freeze({}),
    paleo: Object.freeze({}),
    rainfall: Object.freeze({}),
    features: Object.freeze({}),
});
// Group objects (treat as read‑only from callers)
/** @type {Readonly<Landmass>} */
export let LANDMASS_CFG = Object.freeze({});
/** @type {Readonly<LandmassGeometry>} */
export let LANDMASS_GEOMETRY = Object.freeze({});
/** @type {Readonly<CoastlinesCfg>} */
export let COASTLINES_CFG = Object.freeze({});
/** @type {Readonly<MarginsCfg>} */
export let MARGINS_CFG = Object.freeze({});
/** @type {Readonly<IslandsCfg>} */
export let ISLANDS_CFG = Object.freeze({});
/** @type {Readonly<ClimateBaseline>} */
export let CLIMATE_BASELINE_CFG = Object.freeze({});
/** @type {Readonly<ClimateRefine>} */
export let CLIMATE_REFINE_CFG = Object.freeze({});
/** @type {Readonly<Biomes>} */
export let BIOMES_CFG = Object.freeze({});
/** @type {Readonly<FeaturesDensity>} */
export let FEATURES_DENSITY_CFG = Object.freeze({});
/** @type {Readonly<Corridors>} */
export let CORRIDORS_CFG = Object.freeze({});
/** @type {Readonly<Placement>} */
export let PLACEMENT_CFG = Object.freeze({});
/** @type {Readonly<DevLogging>} */
export let DEV_LOG_CFG = Object.freeze({});
/** @type {Readonly<WorldModel>} */
export let WORLDMODEL_CFG = Object.freeze({});
// Corridor sub-groups
/** @type {Readonly<CorridorPolicy>} */
export let CORRIDOR_POLICY = Object.freeze({});
/** @type {Readonly<CorridorKinds>} */
export let CORRIDOR_KINDS = Object.freeze({});
// WorldModel nested groups
/** @type {Readonly<WorldModel['plates']>} */
export let WORLDMODEL_PLATES = Object.freeze({});
/** @type {Readonly<WorldModel['wind']>} */
export let WORLDMODEL_WIND = Object.freeze({});
/** @type {Readonly<WorldModel['currents']>} */
export let WORLDMODEL_CURRENTS = Object.freeze({});
/** @type {Readonly<WorldModel['pressure']>} */
export let WORLDMODEL_PRESSURE = Object.freeze({});
/** @type {Readonly<WorldModel['policy']>} */
export let WORLDMODEL_POLICY = Object.freeze({});
/** @type {Readonly<WorldModel['directionality']>} */
export let WORLDMODEL_DIRECTIONALITY = Object.freeze({});
/** @type {Readonly<NonNullable<WorldModel['policy']>['oceanSeparation']>} */
export let WORLDMODEL_OCEAN_SEPARATION = Object.freeze({});
/* -----------------------------------------------------------------------------
 * Rebind implementation
 * -------------------------------------------------------------------------- */
/**
 * Refresh the resolved snapshot then update all exported bindings.
 * Call this at the start of a generation (or whenever the active entry changes).
 */
export function rebind() {
    // 1) Resolve the current snapshot from defaults + presets + per-entry overrides
    __refreshResolved__();
    // 2) Toggles
    const T = safeObj(__TOGGLES__());
    STORY_ENABLE_HOTSPOTS = T.STORY_ENABLE_HOTSPOTS ?? true;
    STORY_ENABLE_RIFTS = T.STORY_ENABLE_RIFTS ?? true;
    STORY_ENABLE_OROGENY = T.STORY_ENABLE_OROGENY ?? true;
    STORY_ENABLE_SWATCHES = T.STORY_ENABLE_SWATCHES ?? true;
    STORY_ENABLE_PALEO = T.STORY_ENABLE_PALEO ?? true;
    STORY_ENABLE_CORRIDORS = T.STORY_ENABLE_CORRIDORS ?? true;
    STORY_ENABLE_WORLDMODEL = T.STORY_ENABLE_WORLDMODEL ?? true;
    // 3) Story+Micro merged convenience
    const S = safeObj(__STORY__());
    const M = safeObj(__MICROCLIMATE__());
    STORY_TUNABLES = Object.freeze({
        hotspot: safeObj(S.hotspot),
        rift: safeObj(S.rift),
        orogeny: safeObj(S.orogeny),
        swatches: safeObj(S.swatches),
        paleo: safeObj(S.paleo),
        rainfall: safeObj(M.rainfall),
        features: safeObj(M.features),
    });
    // 4) Groups
    LANDMASS_CFG = safeObj(__LANDMASS__());
    LANDMASS_GEOMETRY = safeObj(LANDMASS_CFG.geometry);
    COASTLINES_CFG = safeObj(__COASTLINES__());
    MARGINS_CFG = safeObj(__MARGINS__());
    ISLANDS_CFG = safeObj(__ISLANDS__());
    CLIMATE_BASELINE_CFG = safeObj(__CLIMATE_BASELINE__());
    CLIMATE_REFINE_CFG = safeObj(__CLIMATE_REFINE__());
    BIOMES_CFG = safeObj(__BIOMES__());
    FEATURES_DENSITY_CFG = safeObj(__FEATURES_DENSITY__());
    CORRIDORS_CFG = safeObj(__CORRIDORS__());
    PLACEMENT_CFG = safeObj(__PLACEMENT__());
    DEV_LOG_CFG = safeObj(__DEV__());
    WORLDMODEL_CFG = safeObj(__WM__());
    // 5) Corridor sub-groups
    CORRIDOR_POLICY = safeObj(CORRIDORS_CFG.policy);
    CORRIDOR_KINDS = safeObj(CORRIDORS_CFG.kinds);
    // 6) WorldModel nested groups
    WORLDMODEL_PLATES = safeObj(__WM_PLATES__());
    WORLDMODEL_WIND = safeObj(__WM_WIND__());
    WORLDMODEL_CURRENTS = safeObj(__WM_CURRENTS__());
    WORLDMODEL_PRESSURE = safeObj(__WM_PRESSURE__());
    WORLDMODEL_POLICY = safeObj(__WM_POLICY__());
    WORLDMODEL_DIRECTIONALITY = safeObj(__WM_DIR__());
    WORLDMODEL_OCEAN_SEPARATION = safeObj(__WM_OSEPARATION__());
}
/* -----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */
/**
 * Ensure we always return a frozen object of the expected shape for TS consumers.
 * Falls back to an empty frozen object when input is null/undefined or not an object.
 * @template T
 * @param {any} v
 * @returns {Readonly<T>}
 */
function safeObj(v) {
    if (!v || typeof v !== "object")
        return /** @type {Readonly<T>} */ (Object.freeze({}));
    return /** @type {Readonly<T>} */ (v);
}
/* -----------------------------------------------------------------------------
 * Module-load bootstrap
 * -------------------------------------------------------------------------- */
// Perform an initial bind so imports have sane values even if callers forget to rebind().
// Callers should still rebind() at the start of each GenerateMap to ensure the
// snapshot reflects the active entry’s presets and overrides.
try {
    rebind();
}
catch {
    // Keep imports resilient even if resolution fails very early in a cold VM.
    // Bindings already hold conservative defaults above.
}
export default {
    rebind,
    // expose current group snapshots (optional convenience mirror)
    get LANDMASS() {
        return LANDMASS_CFG;
    },
    get CORRIDORS() {
        return CORRIDORS_CFG;
    },
    get WORLD_MODEL() {
        return WORLDMODEL_CFG;
    },
};
```

## File: mod/maps/core/utils.js
```javascript
// @ts-nocheck
/**
 * Core utilities for the Epic Diverse Huge map generator.
 * These helpers centralize common operations so layers can share consistent logic.
 *
 * Exports:
 *  - clamp(v, min, max)
 *  - inBounds(x, y)
 *  - storyKey(x, y)
 *  - isAdjacentToLand(x, y, radius)
 *  - getFeatureTypeIndex(name)
 */
/**
 * Clamp a number between min and max (inclusive).
 * @param {number} v
 * @param {number} [min=0]
 * @param {number} [max=200]
 * @returns {number}
 */
export function clamp(v, min = 0, max = 200) {
    if (v < min)
        return min;
    if (v > max)
        return max;
    return v;
}
/**
 * Check if coordinates are within the current map bounds.
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function inBounds(x, y) {
    // GameplayMap is provided by the game engine at runtime.
    const width = GameplayMap && typeof GameplayMap.getGridWidth === "function" ? GameplayMap.getGridWidth() : 0;
    const height = GameplayMap && typeof GameplayMap.getGridHeight === "function" ? GameplayMap.getGridHeight() : 0;
    return x >= 0 && x < width && y >= 0 && y < height;
}
/**
 * Produce a stable string key for a tile coordinate.
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
export function storyKey(x, y) {
    return `${x},${y}`;
}
/**
 * Determine whether any tile within a Chebyshev radius of (x, y) is land.
 * Radius of 1 checks 8-neighborhood; larger radii expand the search square.
 * @param {number} x
 * @param {number} y
 * @param {number} [radius=1]
 * @returns {boolean}
 */
export function isAdjacentToLand(x, y, radius = 1) {
    if (radius <= 0)
        return false;
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0)
                continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (!GameplayMap.isWater(nx, ny)) {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Resolve a feature type index from its ruleset name using engine lookups.
 * Returns -1 if the feature is not found (caller should then skip placement).
 * @param {string} name
 * @returns {number}
 */
export function getFeatureTypeIndex(name) {
    if (!name || !GameInfo || !GameInfo.Features || typeof GameInfo.Features.lookup !== "function") {
        return -1;
    }
    const def = GameInfo.Features.lookup(name);
    if (def && typeof def.$index === "number") {
        return def.$index;
    }
    return -1;
}
```

## File: mod/maps/layers/biomes.js
```javascript
// @ts-nocheck
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
import { designateBiomes as baseDesignateBiomes } from "/base-standard/maps/feature-biome-generator.js";
import * as globals from "/base-standard/maps/map-globals.js";
import { StoryTags } from "../story/tags.js";
import { STORY_ENABLE_RIFTS, BIOMES_CFG, CORRIDOR_POLICY, CORRIDOR_KINDS, } from "../config/tunables.js";
/**
 * Enhanced biome designation with gentle, readable nudges.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function designateEnhancedBiomes(iWidth, iHeight) {
    console.log("Creating enhanced biome diversity (climate-aware)...");
    // Start with vanilla-consistent biomes
    baseDesignateBiomes(iWidth, iHeight);
    // Apply small, climate-aware preferences
    const _bcfg = BIOMES_CFG || {};
    const _tundra = _bcfg.tundra || {};
    const TUNDRA_LAT_MIN = Number.isFinite(_tundra.latMin)
        ? _tundra.latMin
        : 70;
    const TUNDRA_ELEV_MIN = Number.isFinite(_tundra.elevMin)
        ? _tundra.elevMin
        : 850;
    const TUNDRA_RAIN_MAX = Number.isFinite(_tundra.rainMax)
        ? _tundra.rainMax
        : 90;
    const _tcoast = _bcfg.tropicalCoast || {};
    const TCOAST_LAT_MAX = Number.isFinite(_tcoast.latMax)
        ? _tcoast.latMax
        : 18;
    const TCOAST_RAIN_MIN = Number.isFinite(_tcoast.rainMin)
        ? _tcoast.rainMin
        : 105;
    const _rv = _bcfg.riverValleyGrassland || {};
    const RV_LAT_MAX = Number.isFinite(_rv.latMax) ? _rv.latMax : 50;
    const RV_RAIN_MIN = Number.isFinite(_rv.rainMin) ? _rv.rainMin : 75;
    const _rs = _bcfg.riftShoulder || {};
    const RS_GRASS_LAT_MAX = Number.isFinite(_rs.grasslandLatMax)
        ? _rs.grasslandLatMax
        : 50;
    const RS_GRASS_RAIN_MIN = Number.isFinite(_rs.grasslandRainMin)
        ? _rs.grasslandRainMin
        : 75;
    const RS_TROP_LAT_MAX = Number.isFinite(_rs.tropicalLatMax)
        ? _rs.tropicalLatMax
        : 18;
    const RS_TROP_RAIN_MIN = Number.isFinite(_rs.tropicalRainMin)
        ? _rs.tropicalRainMin
        : 100;
    const LAND_BIAS_STRENGTH = Math.max(0, Math.min(1, CORRIDOR_POLICY?.land?.biomesBiasStrength ?? 0.6));
    const RIVER_BIAS_STRENGTH = Math.max(0, Math.min(1, CORRIDOR_POLICY?.river?.biomesBiasStrength ?? 0.5));
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y))
                continue;
            const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
            const elevation = GameplayMap.getElevation(x, y);
            const rainfall = GameplayMap.getRainfall(x, y);
            // Tundra restraint: require very high lat or extreme elevation and dryness
            if ((lat > TUNDRA_LAT_MIN || elevation > TUNDRA_ELEV_MIN) &&
                rainfall < TUNDRA_RAIN_MAX) {
                TerrainBuilder.setBiomeType(x, y, globals.g_TundraBiome);
                continue; // lock this decision; skip other nudges
            }
            // Wet, warm coasts near the equator tend tropical
            if (lat < TCOAST_LAT_MAX &&
                GameplayMap.isCoastalLand(x, y) &&
                rainfall > TCOAST_RAIN_MIN) {
                TerrainBuilder.setBiomeType(x, y, globals.g_TropicalBiome);
            }
            // Temperate/warm river valleys prefer grassland for playability
            if (GameplayMap.isAdjacentToRivers(x, y, 1) &&
                rainfall > RV_RAIN_MIN &&
                lat < RV_LAT_MAX) {
                TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
            }
            // Strategic Corridors: land-open corridor tiles gently bias to grassland (policy-scaled)
            if (StoryTags.corridorLandOpen &&
                StoryTags.corridorLandOpen.has(`${x},${y}`)) {
                if (rainfall > 80 &&
                    lat < 55 &&
                    TerrainBuilder.getRandomNumber(100, "Corridor Land-Open Biome") < Math.round(LAND_BIAS_STRENGTH * 100)) {
                    TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
                }
            }
            // Strategic Corridors: river-chain tiles gently bias to grassland (policy-scaled)
            if (StoryTags.corridorRiverChain &&
                StoryTags.corridorRiverChain.has(`${x},${y}`)) {
                if (rainfall > 75 &&
                    lat < 55 &&
                    TerrainBuilder.getRandomNumber(100, "Corridor River-Chain Biome") < Math.round(RIVER_BIAS_STRENGTH * 100)) {
                    TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
                }
            }
            // Edge hints near land/river corridors: light vegetation/mountain rim cues (biome-only)
            // Applies to tiles adjacent to a land-open or river-chain corridor, not the corridor tile itself
            {
                if (!(StoryTags.corridorLandOpen?.has?.(`${x},${y}`) ||
                    StoryTags.corridorRiverChain?.has?.(`${x},${y}`))) {
                    let edgeKind = null;
                    let edgeStyle = null;
                    // Find adjacent corridor neighbor and its style
                    for (let ddy = -1; ddy <= 1 && !edgeKind; ddy++) {
                        for (let ddx = -1; ddx <= 1; ddx++) {
                            if (ddx === 0 && ddy === 0)
                                continue;
                            const nx = x + ddx;
                            const ny = y + ddy;
                            const nk = `${nx},${ny}`;
                            if (!StoryTags || !StoryTags.corridorKind)
                                continue;
                            if (StoryTags.corridorLandOpen?.has?.(nk)) {
                                edgeKind = "land";
                                edgeStyle =
                                    StoryTags.corridorStyle?.get?.(nk) ||
                                        "plainsBelt";
                                break;
                            }
                            if (StoryTags.corridorRiverChain?.has?.(nk)) {
                                edgeKind = "river";
                                edgeStyle =
                                    StoryTags.corridorStyle?.get?.(nk) ||
                                        "riverChain";
                                break;
                            }
                        }
                    }
                    if (edgeKind && edgeStyle && CORRIDOR_KINDS?.[edgeKind]) {
                        const edgeCfg = CORRIDOR_KINDS?.[edgeKind]?.styles?.[edgeStyle]
                            ?.edge || {};
                        // Forest rim: bias toward forest-friendly biomes (grassland/tropical) when moist
                        const forestRimChance = Math.max(0, Math.min(1, edgeCfg.forestRimChance ?? 0));
                        if (forestRimChance > 0 &&
                            rainfall > 90 &&
                            TerrainBuilder.getRandomNumber(100, "Corr Forest Rim") < Math.round(forestRimChance * 100)) {
                            const target = lat < 22 && rainfall > 110
                                ? globals.g_TropicalBiome
                                : globals.g_GrasslandBiome;
                            TerrainBuilder.setBiomeType(x, y, target);
                        }
                        // Hill/mountain rim: suggest drier, relief-friendly biomes (plains/tundra in cold/high)
                        const hillRimChance = Math.max(0, Math.min(1, edgeCfg.hillRimChance ?? 0));
                        const mountainRimChance = Math.max(0, Math.min(1, edgeCfg.mountainRimChance ?? 0));
                        const escarpmentChance = Math.max(0, Math.min(1, edgeCfg.escarpmentChance ?? 0));
                        const reliefChance = Math.max(0, Math.min(1, hillRimChance +
                            mountainRimChance +
                            escarpmentChance));
                        if (reliefChance > 0 &&
                            TerrainBuilder.getRandomNumber(100, "Corr Relief Rim") < Math.round(reliefChance * 100)) {
                            // Prefer tundra when very cold/high, else plains (playable with hills)
                            const elev = GameplayMap.getElevation(x, y);
                            const target = (lat > 62 || elev > 800) && rainfall < 95
                                ? globals.g_TundraBiome
                                : globals.g_PlainsBiome;
                            TerrainBuilder.setBiomeType(x, y, target);
                        }
                    }
                }
            }
            // Strategic Corridors: kind/style biome bias (very gentle; policy-scaled)
            {
                const cKey = `${x},${y}`;
                const cKind = StoryTags.corridorKind && StoryTags.corridorKind.get(cKey);
                const cStyle = StoryTags.corridorStyle &&
                    StoryTags.corridorStyle.get(cKey);
                if ((cKind === "land" || cKind === "river") &&
                    cStyle &&
                    CORRIDOR_KINDS &&
                    CORRIDOR_KINDS[cKind] &&
                    CORRIDOR_KINDS[cKind].styles &&
                    CORRIDOR_KINDS[cKind].styles[cStyle] &&
                    CORRIDOR_KINDS[cKind].styles[cStyle].biomes) {
                    const biomesCfg = CORRIDOR_KINDS[cKind].styles[cStyle].biomes;
                    const strength = cKind === "land"
                        ? LAND_BIAS_STRENGTH
                        : RIVER_BIAS_STRENGTH;
                    if (strength > 0 &&
                        TerrainBuilder.getRandomNumber(100, "Corridor Kind Bias") < Math.round(strength * 100)) {
                        const entries = Object.keys(biomesCfg);
                        let totalW = 0;
                        for (const k of entries)
                            totalW += Math.max(0, biomesCfg[k] || 0);
                        if (totalW > 0) {
                            let roll = TerrainBuilder.getRandomNumber(totalW, "Corridor Kind Pick");
                            let chosen = entries[0];
                            for (const k of entries) {
                                const w = Math.max(0, biomesCfg[k] || 0);
                                if (roll < w) {
                                    chosen = k;
                                    break;
                                }
                                roll -= w;
                            }
                            let target = null;
                            if (chosen === "desert")
                                target = globals.g_DesertBiome;
                            else if (chosen === "plains")
                                target = globals.g_PlainsBiome;
                            else if (chosen === "grassland")
                                target = globals.g_GrasslandBiome;
                            else if (chosen === "tropical")
                                target = globals.g_TropicalBiome;
                            else if (chosen === "tundra")
                                target = globals.g_TundraBiome;
                            else if (chosen === "snow")
                                target = globals.g_SnowBiome;
                            if (target != null) {
                                // Light sanity gates to avoid extreme mismatches
                                let ok = true;
                                if (target === globals.g_DesertBiome &&
                                    rainfall > 110)
                                    ok = false;
                                if (target === globals.g_TropicalBiome &&
                                    !(lat < 25 && rainfall > 95))
                                    ok = false;
                                if (target === globals.g_TundraBiome &&
                                    !(lat > 60 || elevation > 800))
                                    ok = false;
                                if (target === globals.g_SnowBiome &&
                                    !(lat > 70 || elevation > 900))
                                    ok = false;
                                if (ok) {
                                    TerrainBuilder.setBiomeType(x, y, target);
                                }
                            }
                        }
                    }
                }
            }
            // Climate Story: rift shoulder preference (narrow, moisture-aware)
            if (STORY_ENABLE_RIFTS && StoryTags.riftShoulder.size > 0) {
                const key = `${x},${y}`;
                if (StoryTags.riftShoulder.has(key)) {
                    // Temperate/warm shoulders: prefer grassland when sufficiently moist
                    if (lat < RS_GRASS_LAT_MAX &&
                        rainfall > RS_GRASS_RAIN_MIN) {
                        TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
                    }
                    else if (lat < RS_TROP_LAT_MAX &&
                        rainfall > RS_TROP_RAIN_MIN) {
                        // In very warm & wet shoulders, allow tropical bias (still gentle)
                        TerrainBuilder.setBiomeType(x, y, globals.g_TropicalBiome);
                    }
                }
            }
        }
    }
}
export default designateEnhancedBiomes;
```

## File: mod/maps/layers/climate-baseline.js
```javascript
// @ts-nocheck
/**
 * Climate Baseline Layer — buildEnhancedRainfall
 *
 * Purpose
 * - Start from base-standard rainfall, then gently blend in latitude bands
 *   and add small, natural-looking local modifiers.
 *
 * Behavior (unchanged from integrated script logic)
 * - Base rainfall from engine (vanilla expectations preserved)
 * - Latitude bands:
 *     0–10  : very wet
 *     10–20 : wet
 *     20–35 : temperate-dry
 *     35–55 : temperate
 *     55–70 : cool but not barren
 *     70+   : cold/dry
 * - Blend weights: base 60%, band target 40%
 * - Orographic: small elevation-based bonuses
 * - Local water humidity: coastal and shallow-water adjacency boosts
 * - Light noise to break up visible banding
 * - Clamp rainfall to [0, 200] as a hard invariant
 *
 * Performance
 * - O(width × height); single linear pass over tiles.
 */
import { buildRainfallMap } from "/base-standard/maps/elevation-terrain-generator.js";
import { clamp } from "../core/utils.js";
import { CLIMATE_BASELINE_CFG } from "../config/tunables.js";
/**
 * Build the baseline rainfall map with latitude bands and gentle local modifiers.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function buildEnhancedRainfall(iWidth, iHeight) {
    console.log("Building enhanced rainfall patterns...");
    // Start from the engine’s base rainfall to preserve vanilla assumptions.
    buildRainfallMap(iWidth, iHeight);
    // Apply latitude bands + small local adjustments
    const BASE_AREA = 10000;
    const sqrt = Math.min(2.0, Math.max(0.6, Math.sqrt(Math.max(1, iWidth * iHeight) / BASE_AREA)));
    const equatorPlus = Math.round(12 * (sqrt - 1)); // +0..+12 on very large maps
    const cfg = CLIMATE_BASELINE_CFG || {};
    const noiseBase = Number.isFinite(cfg?.noise?.baseSpanSmall)
        ? cfg.noise.baseSpanSmall
        : 3;
    const noiseSpan = sqrt > 1
        ? noiseBase +
            Math.round(Number.isFinite(cfg?.noise?.spanLargeScaleFactor)
                ? cfg.noise.spanLargeScaleFactor
                : 1)
        : noiseBase;
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y))
                continue;
            const base = GameplayMap.getRainfall(x, y);
            const elevation = GameplayMap.getElevation(x, y);
            const lat = Math.abs(GameplayMap.getPlotLatitude(x, y)); // 0 at equator, 90 at poles
            // Band target by absolute latitude (configurable)
            const bands = cfg.bands || {};
            const b0 = Number.isFinite(bands.deg0to10) ? bands.deg0to10 : 120;
            const b1 = Number.isFinite(bands.deg10to20) ? bands.deg10to20 : 104;
            const b2 = Number.isFinite(bands.deg20to35) ? bands.deg20to35 : 75;
            const b3 = Number.isFinite(bands.deg35to55) ? bands.deg35to55 : 70;
            const b4 = Number.isFinite(bands.deg55to70) ? bands.deg55to70 : 60;
            const b5 = Number.isFinite(bands.deg70plus) ? bands.deg70plus : 45;
            let bandRain = 0;
            if (lat < 10)
                bandRain = b0 + equatorPlus;
            else if (lat < 20)
                bandRain = b1 + Math.floor(equatorPlus * 0.6);
            else if (lat < 35)
                bandRain = b2;
            else if (lat < 55)
                bandRain = b3;
            else if (lat < 70)
                bandRain = b4;
            else
                bandRain = b5;
            // Blend: configurable weights (defaults 0.6/0.4)
            const baseW = Number.isFinite(cfg?.blend?.baseWeight)
                ? cfg.blend.baseWeight
                : 0.6;
            const bandW = Number.isFinite(cfg?.blend?.bandWeight)
                ? cfg.blend.bandWeight
                : 0.4;
            let currentRainfall = Math.round(base * baseW + bandRain * bandW);
            // Orographic: mild elevation bonuses (configurable thresholds)
            const oro = cfg.orographic || {};
            const hi1T = Number.isFinite(oro.hi1Threshold)
                ? oro.hi1Threshold
                : 350;
            const hi1B = Number.isFinite(oro.hi1Bonus) ? oro.hi1Bonus : 8;
            const hi2T = Number.isFinite(oro.hi2Threshold)
                ? oro.hi2Threshold
                : 600;
            const hi2B = Number.isFinite(oro.hi2Bonus) ? oro.hi2Bonus : 7;
            if (elevation > hi1T)
                currentRainfall += hi1B;
            if (elevation > hi2T)
                currentRainfall += hi2B;
            // Local water humidity: coast and shallow-water adjacency (configurable)
            const coastalCfg = cfg.coastal || {};
            const coastalBonus = Number.isFinite(coastalCfg.coastalLandBonus)
                ? coastalCfg.coastalLandBonus
                : 24;
            const shallowBonus = Number.isFinite(coastalCfg.shallowAdjBonus)
                ? coastalCfg.shallowAdjBonus
                : 16;
            if (GameplayMap.isCoastalLand(x, y))
                currentRainfall += coastalBonus;
            if (GameplayMap.isAdjacentToShallowWater(x, y))
                currentRainfall += shallowBonus;
            // Light noise to avoid striping/banding artifacts (size-aware jitter)
            currentRainfall +=
                TerrainBuilder.getRandomNumber(noiseSpan * 2 + 1, "Rain Noise") - noiseSpan;
            TerrainBuilder.setRainfall(x, y, clamp(currentRainfall, 0, 200));
        }
    }
}
export default buildEnhancedRainfall;
```

## File: mod/maps/layers/climate-refinement.js
```javascript
// @ts-nocheck
/**
 * Climate Refinement Layer — refineRainfallEarthlike
 *
 * Purpose
 * - Apply earthlike refinements to the baseline rainfall after rivers exist.
 * - Keep adjustments small, localized, and clamped to preserve balance.
 *
 * Passes (A–E)
 * A) Coastal and lake humidity gradient (up to radius 4; stronger at low elevation)
 * B) Orographic rain shadows with latitude-dependent prevailing winds
 * C) River corridor greening and slight low-basin humidity
 * D) Rift humidity boost near StoryTags.riftLine (narrow radius; elevation-aware)
 * E) Hotspot island microclimates (paradise/volcanic centers) with small boosts
 *
 * Invariants
 * - Clamp all rainfall updates to [0, 200].
 * - Keep scans local (radius ≤ 4) and complexity O(width × height).
 * - Do not reorder the broader pipeline (this runs after rivers are modeled).
 */
import { clamp, inBounds } from "../core/utils.js";
import { StoryTags } from "../story/tags.js";
import { OrogenyCache } from "../story/tagging.js";
import { STORY_TUNABLES, STORY_ENABLE_OROGENY, CLIMATE_REFINE_CFG, WORLDMODEL_DIRECTIONALITY, } from "../config/tunables.js";
import { WorldModel } from "../world/model.js";
/**
 * Distance in tiles (Chebyshev radius) to nearest water within maxR; -1 if none.
 * @param {number} x
 * @param {number} y
 * @param {number} maxR
 */
function distanceToNearestWater(x, y, maxR) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    for (let r = 1; r <= maxR; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx === 0 && dy === 0)
                    continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (GameplayMap.isWater(nx, ny))
                        return r;
                }
            }
        }
    }
    return -1;
}
/**
 * Returns number of steps (1..steps) to the first upwind barrier or 0 if none.
 * A barrier is a mountain tile (if engine exposes GameplayMap.isMountain)
 * or a tile with elevation >= 500.
 * @param {number} x
 * @param {number} y
 * @param {number} dx - upwind x-step
 * @param {number} dy - upwind y-step
 * @param {number} steps - how far to scan
 */
function hasUpwindBarrier(x, y, dx, dy, steps) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    for (let s = 1; s <= steps; s++) {
        const nx = x + dx * s;
        const ny = y + dy * s;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height)
            break;
        if (!GameplayMap.isWater(nx, ny)) {
            if (GameplayMap.isMountain && GameplayMap.isMountain(nx, ny))
                return s;
            const elev = GameplayMap.getElevation(nx, ny);
            if (elev >= 500)
                return s;
        }
    }
    return 0;
}
/**
 * Upwind barrier scan using WorldModel wind vectors.
 * Steps along the dominant component of (windU, windV) per tile, normalized to -1/0/1,
 * and returns the number of steps to first barrier (mountain/elev>=500) within 'steps', else 0.
 */
function hasUpwindBarrierWM(x, y, steps) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const U = WorldModel.windU;
    const V = WorldModel.windV;
    if (!U || !V)
        return 0;
    let cx = x;
    let cy = y;
    for (let s = 1; s <= steps; s++) {
        const i = cy * width + cx;
        let ux = 0, vy = 0;
        if (i >= 0 && i < U.length) {
            const u = U[i] | 0;
            const v = V[i] | 0;
            // Choose dominant component; prefer |u| vs |v|, break ties toward u (zonal)
            if (Math.abs(u) >= Math.abs(v)) {
                ux = u === 0 ? 0 : u > 0 ? 1 : -1;
                vy = 0;
            }
            else {
                ux = 0;
                vy = v === 0 ? 0 : v > 0 ? 1 : -1;
            }
            // If both zero, fallback to latitude zonal step
            if (ux === 0 && vy === 0) {
                const lat = Math.abs(GameplayMap.getPlotLatitude(cx, cy));
                ux = lat < 30 || lat >= 60 ? -1 : 1;
                vy = 0;
            }
        }
        else {
            // Out of range safety
            const lat = Math.abs(GameplayMap.getPlotLatitude(cx, cy));
            ux = lat < 30 || lat >= 60 ? -1 : 1;
            vy = 0;
        }
        const nx = cx + ux;
        const ny = cy + vy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height)
            break;
        if (!GameplayMap.isWater(nx, ny)) {
            if (GameplayMap.isMountain && GameplayMap.isMountain(nx, ny))
                return s;
            const elev = GameplayMap.getElevation(nx, ny);
            if (elev >= 500)
                return s;
        }
        cx = nx;
        cy = ny;
    }
    return 0;
}
/**
 * Apply earthlike rainfall refinements in multiple small, clamped passes.
 * Call this after rivers are modeled and named.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function refineRainfallEarthlike(iWidth, iHeight) {
    // Pass A: coastal and lake humidity gradient (decays with distance; configurable)
    {
        const maxR = (CLIMATE_REFINE_CFG?.waterGradient?.radius ?? 5) | 0;
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (GameplayMap.isWater(x, y))
                    continue;
                const dist = distanceToNearestWater(x, y, maxR);
                if (dist >= 0) {
                    // Closer to water -> more humidity; stronger if also low elevation
                    const elev = GameplayMap.getElevation(x, y);
                    let bonus = Math.max(0, maxR - dist) *
                        (CLIMATE_REFINE_CFG?.waterGradient?.perRingBonus ?? 5);
                    if (elev < 150)
                        bonus +=
                            CLIMATE_REFINE_CFG?.waterGradient?.lowlandBonus ??
                                3;
                    const rf = GameplayMap.getRainfall(x, y);
                    TerrainBuilder.setRainfall(x, y, clamp(rf + bonus, 0, 200));
                }
            }
        }
    }
    // Pass B: orographic rain shadows with latitude-dependent prevailing winds (configurable)
    {
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (GameplayMap.isWater(x, y))
                    continue;
                const baseSteps = (CLIMATE_REFINE_CFG?.orographic?.steps ?? 4) | 0;
                let steps = baseSteps;
                try {
                    const DIR = WORLDMODEL_DIRECTIONALITY || {};
                    const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                    const windC = Math.max(0, Math.min(1, DIR?.interplay?.windsFollowPlates ?? 0));
                    // Slight bias: +1 step at high cohesion and wind-plate interplay
                    const extra = Math.round(coh * windC);
                    steps = Math.max(1, baseSteps + extra);
                }
                catch (_) {
                    steps = baseSteps;
                }
                let barrier = 0;
                if (WorldModel?.isEnabled?.() &&
                    WorldModel.windU &&
                    WorldModel.windV) {
                    barrier = hasUpwindBarrierWM(x, y, steps);
                }
                else {
                    const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
                    const dx = lat < 30 || lat >= 60 ? -1 : 1;
                    const dy = 0;
                    barrier = hasUpwindBarrier(x, y, dx, dy, steps);
                }
                if (barrier) {
                    const rf = GameplayMap.getRainfall(x, y);
                    const reduction = (CLIMATE_REFINE_CFG?.orographic?.reductionBase ?? 8) +
                        barrier *
                            (CLIMATE_REFINE_CFG?.orographic?.reductionPerStep ??
                                6);
                    TerrainBuilder.setRainfall(x, y, clamp(rf - reduction, 0, 200));
                }
            }
        }
    }
    // Pass C: river corridor greening and basin humidity (configurable)
    {
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (GameplayMap.isWater(x, y))
                    continue;
                let rf = GameplayMap.getRainfall(x, y);
                const elev = GameplayMap.getElevation(x, y);
                // River adjacency boost (stronger at low elevation)
                if (GameplayMap.isAdjacentToRivers(x, y, 1)) {
                    rf +=
                        elev < 250
                            ? (CLIMATE_REFINE_CFG?.riverCorridor
                                ?.lowlandAdjacencyBonus ?? 14)
                            : (CLIMATE_REFINE_CFG?.riverCorridor
                                ?.highlandAdjacencyBonus ?? 10);
                }
                // Slight wetness in enclosed low basins (surrounded by higher elevation; configurable radius)
                let lowBasin = true;
                for (let dy = -(CLIMATE_REFINE_CFG?.lowBasin?.radius ?? 2); dy <= (CLIMATE_REFINE_CFG?.lowBasin?.radius ?? 2) &&
                    lowBasin; dy++) {
                    for (let dx = -(CLIMATE_REFINE_CFG?.lowBasin?.radius ?? 2); dx <= (CLIMATE_REFINE_CFG?.lowBasin?.radius ?? 2); dx++) {
                        if (dx === 0 && dy === 0)
                            continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (inBounds(nx, ny)) {
                            if (GameplayMap.getElevation(nx, ny) < elev + 20) {
                                lowBasin = false;
                                break;
                            }
                        }
                    }
                }
                if (lowBasin && elev < 200)
                    rf += CLIMATE_REFINE_CFG?.lowBasin?.delta ?? 6;
                TerrainBuilder.setRainfall(x, y, clamp(rf, 0, 200));
            }
        }
    }
    // Pass D: Rift humidity boost (narrow radius, elevation-aware)
    {
        const riftR = STORY_TUNABLES?.rainfall?.riftRadius ?? 2;
        const riftBoost = STORY_TUNABLES?.rainfall?.riftBoost ?? 8;
        if (StoryTags.riftLine.size > 0 && riftR > 0 && riftBoost !== 0) {
            for (let y = 0; y < iHeight; y++) {
                for (let x = 0; x < iWidth; x++) {
                    if (GameplayMap.isWater(x, y))
                        continue;
                    // Quick proximity check: any rift line tile within radius riftR
                    let nearRift = false;
                    for (let dy = -riftR; dy <= riftR && !nearRift; dy++) {
                        for (let dx = -riftR; dx <= riftR; dx++) {
                            if (dx === 0 && dy === 0)
                                continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (!inBounds(nx, ny))
                                continue;
                            if (StoryTags.riftLine.has(`${nx},${ny}`)) {
                                nearRift = true;
                                break;
                            }
                        }
                    }
                    if (nearRift) {
                        const rf = GameplayMap.getRainfall(x, y);
                        const elev = GameplayMap.getElevation(x, y);
                        // Slightly reduce boost at higher elevation
                        const penalty = Math.max(0, Math.floor((elev - 200) / 150));
                        const delta = Math.max(0, riftBoost - penalty);
                        TerrainBuilder.setRainfall(x, y, clamp(rf + delta, 0, 200));
                    }
                }
            }
        }
    }
    // Pass E: Orogeny belts (windward/lee amplification — size-aware, clamped)
    {
        if (STORY_ENABLE_OROGENY && typeof OrogenyCache === "object") {
            const hasWindward = OrogenyCache.windward && OrogenyCache.windward.size > 0;
            const hasLee = OrogenyCache.lee && OrogenyCache.lee.size > 0;
            if (hasWindward || hasLee) {
                const windwardBoost = STORY_TUNABLES?.orogeny?.windwardBoost ?? 5;
                const leeAmp = STORY_TUNABLES?.orogeny?.leeDrynessAmplifier ?? 1.2;
                for (let y = 0; y < iHeight; y++) {
                    for (let x = 0; x < iWidth; x++) {
                        if (GameplayMap.isWater(x, y))
                            continue;
                        let rf = GameplayMap.getRainfall(x, y);
                        const key = `${x},${y}`;
                        // Apply windward boost (small, positive)
                        if (hasWindward && OrogenyCache.windward.has(key)) {
                            rf = clamp(rf + windwardBoost, 0, 200);
                        }
                        // Apply lee dryness by amplifying a small baseline subtraction
                        if (hasLee && OrogenyCache.lee.has(key)) {
                            const baseSubtract = 8; // slightly stronger lee-side dryness to accentuate relief
                            const extra = Math.max(0, Math.round(baseSubtract * (leeAmp - 1)));
                            rf = clamp(rf - (baseSubtract + extra), 0, 200);
                        }
                        TerrainBuilder.setRainfall(x, y, rf);
                    }
                }
            }
        }
    }
    // Pass F: Hotspot island microclimates (paradise/volcanic centers)
    {
        const paradiseDelta = STORY_TUNABLES?.rainfall?.paradiseDelta ?? 6;
        const volcanicDelta = STORY_TUNABLES?.rainfall?.volcanicDelta ?? 8;
        const radius = 2;
        const hasParadise = StoryTags.hotspotParadise.size > 0;
        const hasVolcanic = StoryTags.hotspotVolcanic.size > 0;
        if (hasParadise || hasVolcanic) {
            for (let y = 0; y < iHeight; y++) {
                for (let x = 0; x < iWidth; x++) {
                    if (GameplayMap.isWater(x, y))
                        continue;
                    let nearParadise = false;
                    let nearVolcanic = false;
                    for (let dy = -radius; dy <= radius && (!nearParadise || !nearVolcanic); dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            if (dx === 0 && dy === 0)
                                continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (!inBounds(nx, ny))
                                continue;
                            const key = `${nx},${ny}`;
                            if (!nearParadise &&
                                hasParadise &&
                                StoryTags.hotspotParadise.has(key))
                                nearParadise = true;
                            if (!nearVolcanic &&
                                hasVolcanic &&
                                StoryTags.hotspotVolcanic.has(key))
                                nearVolcanic = true;
                            if (nearParadise && nearVolcanic)
                                break;
                        }
                    }
                    if (nearParadise || nearVolcanic) {
                        const rf = GameplayMap.getRainfall(x, y);
                        let delta = 0;
                        if (nearParadise)
                            delta += paradiseDelta;
                        if (nearVolcanic)
                            delta += volcanicDelta;
                        TerrainBuilder.setRainfall(x, y, clamp(rf + delta, 0, 200));
                    }
                }
            }
        }
    }
}
export default refineRainfallEarthlike;
```

## File: mod/maps/layers/coastlines.js
```javascript
// @ts-nocheck
/**
 * Coastlines Layer — addRuggedCoasts
 *
 * Light-touch coastal reshaping that carves occasional bays and creates sparse
 * fjord-like peninsulas while preserving open sea lanes. Uses a low-frequency
 * fractal mask and conservative randomness to avoid chokepoint proliferation.
 *
 * Dependencies: engine-provided GameplayMap, TerrainBuilder, FractalBuilder, and globals.
 */
import * as globals from "/base-standard/maps/map-globals.js";
import { isAdjacentToLand } from "../core/utils.js";
import { StoryTags } from "../story/tags.js";
import { COASTLINES_CFG, CORRIDOR_POLICY, CORRIDOR_KINDS, } from "../config/tunables.js";
/**
 * Ruggedize coasts in a sparse, performance-friendly pass.
 * - Occasionally converts coastal land to shallow water (bays).
 * - Occasionally converts adjacent ocean to coast (peninsulas/fjords).
 * - Only operates near current coastlines; does not perform heavy flood fills.
 *
 * Invariants:
 * - Keeps oceans truly open; very low probabilities to avoid chokepoints.
 * - O(width × height) with constant-time local checks.
 *
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function addRuggedCoasts(iWidth, iHeight) {
    // Size-aware modifiers (gentle; keep lanes open)
    const area = Math.max(1, iWidth * iHeight);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    // Use hill fractal as a sparse noise mask to drive rare edits
    FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 4, 0);
    // Probability tuning: on larger maps, allow a touch more edits
    const cfg = COASTLINES_CFG || {};
    const cfgBay = (cfg && cfg.bay) || {};
    const cfgFjord = (cfg && cfg.fjord) || {};
    const bayNoiseExtra = (sqrtScale > 1 ? 1 : 0) +
        (Number.isFinite(cfgBay.noiseGateAdd) ? cfgBay.noiseGateAdd : 0);
    const fjordBaseDenom = Math.max(6, (Number.isFinite(cfgFjord.baseDenom) ? cfgFjord.baseDenom : 12) -
        (sqrtScale > 1.3 ? 1 : 0));
    const fjordActiveBonus = Number.isFinite(cfgFjord.activeBonus)
        ? cfgFjord.activeBonus
        : 1;
    const fjordPassiveBonus = Number.isFinite(cfgFjord.passiveBonus)
        ? cfgFjord.passiveBonus
        : 2;
    const bayRollDenActive = Number.isFinite(cfgBay.rollDenActive)
        ? cfgBay.rollDenActive
        : 4;
    const bayRollDenDefault = Number.isFinite(cfgBay.rollDenDefault)
        ? cfgBay.rollDenDefault
        : 5;
    const minSeaLaneWidth = Number.isFinite(cfg.minSeaLaneWidth)
        ? cfg.minSeaLaneWidth
        : 4; // reserved for future shelf/trench guards
    // Sea-lane policy (hard skip vs. soft probability reduction)
    const seaPolicy = (CORRIDOR_POLICY && CORRIDOR_POLICY.sea) || {};
    const SEA_PROTECTION = seaPolicy.protection || "hard";
    const SOFT_MULT = Math.max(0, Math.min(1, seaPolicy.softChanceMultiplier ?? 0.5));
    for (let y = 1; y < iHeight - 1; y++) {
        for (let x = 1; x < iWidth - 1; x++) {
            // Sea-lane policy: hard skip or soft probability reduction
            const _k = `${x},${y}`;
            const _onSeaLane = StoryTags.corridorSeaLane && StoryTags.corridorSeaLane.has(_k);
            const _softMult = _onSeaLane && SEA_PROTECTION === "soft" ? SOFT_MULT : 1;
            if (_onSeaLane && SEA_PROTECTION === "hard") {
                continue;
            }
            // Carve bays: coastal land -> coast water (very sparse)
            if (GameplayMap.isCoastalLand(x, y)) {
                const h = FractalBuilder.getHeight(globals.g_HillFractal, x, y);
                // Margin-aware: slightly stronger bay carving on ACTIVE_MARGIN
                const isActive = StoryTags.activeMargin.has(`${x},${y}`);
                const noiseGate = 2 + bayNoiseExtra + (isActive ? 1 : 0);
                const bayRollDen = isActive
                    ? bayRollDenActive
                    : bayRollDenDefault;
                let bayRollDenUsed = _softMult !== 1
                    ? Math.max(1, Math.round(bayRollDen / _softMult))
                    : bayRollDen;
                // Corridor edge effect: if near a sea-lane, apply style-based bay carve bias
                const __laneStyle = (function () {
                    for (let ddy = -1; ddy <= 1; ddy++) {
                        for (let ddx = -1; ddx <= 1; ddx++) {
                            if (ddx === 0 && ddy === 0)
                                continue;
                            const k = `${x + ddx},${y + ddy}`;
                            if (StoryTags.corridorSeaLane &&
                                StoryTags.corridorSeaLane.has(k)) {
                                return (StoryTags.corridorStyle?.get?.(k) || null);
                            }
                        }
                    }
                    return null;
                })();
                if (__laneStyle) {
                    const edgeCfg = CORRIDOR_KINDS?.sea?.styles?.[__laneStyle]?.edge || {};
                    const bayMult = Number.isFinite(edgeCfg.bayCarveMultiplier)
                        ? edgeCfg.bayCarveMultiplier
                        : 1;
                    if (bayMult && bayMult !== 1) {
                        bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / bayMult));
                    }
                }
                if (h % 97 < noiseGate &&
                    TerrainBuilder.getRandomNumber(bayRollDenUsed, "Carve Bay") === 0) {
                    TerrainBuilder.setTerrainType(x, y, globals.g_CoastTerrain);
                    continue; // Avoid double-touching same tile in this pass
                }
            }
            // Fjord-like peninsulas: turn some adjacent ocean into coast (very sparse)
            if (GameplayMap.isWater(x, y)) {
                // Keep to near-land ocean only; deep ocean remains untouched
                if (isAdjacentToLand(x, y, 1)) {
                    {
                        // Margin-aware: widen shelf near PASSIVE_SHELF, deepen cuts near ACTIVE_MARGIN
                        let nearActive = false, nearPassive = false;
                        for (let ddy = -1; ddy <= 1 && (!nearActive || !nearPassive); ddy++) {
                            for (let ddx = -1; ddx <= 1; ddx++) {
                                if (ddx === 0 && ddy === 0)
                                    continue;
                                const nx = x + ddx, ny = y + ddy;
                                if (nx <= 0 ||
                                    nx >= iWidth - 1 ||
                                    ny <= 0 ||
                                    ny >= iHeight - 1)
                                    continue;
                                const k = `${nx},${ny}`;
                                if (!nearActive &&
                                    StoryTags.activeMargin.has(k))
                                    nearActive = true;
                                if (!nearPassive &&
                                    StoryTags.passiveShelf.has(k))
                                    nearPassive = true;
                            }
                        }
                        const denom = Math.max(4, fjordBaseDenom -
                            (nearPassive ? fjordPassiveBonus : 0) -
                            (nearActive ? fjordActiveBonus : 0));
                        let denomUsed = _softMult !== 1
                            ? Math.max(1, Math.round(denom / _softMult))
                            : denom;
                        // Corridor edge effect: if adjacent to a sea-lane tile, increase fjord/coast conversion chance
                        {
                            let __style = null;
                            for (let my = -1; my <= 1 && !__style; my++) {
                                for (let mx = -1; mx <= 1; mx++) {
                                    if (mx === 0 && my === 0)
                                        continue;
                                    const kk = `${x + mx},${y + my}`;
                                    if (StoryTags.corridorSeaLane &&
                                        StoryTags.corridorSeaLane.has(kk)) {
                                        __style =
                                            StoryTags.corridorStyle?.get?.(kk) || null;
                                        break;
                                    }
                                }
                            }
                            if (__style) {
                                const edgeCfg = CORRIDOR_KINDS?.sea?.styles?.[__style]
                                    ?.edge || {};
                                const fj = Number.isFinite(edgeCfg.fjordChance)
                                    ? edgeCfg.fjordChance
                                    : 0;
                                const cliffs = Number.isFinite(edgeCfg.cliffsChance)
                                    ? edgeCfg.cliffsChance
                                    : 0;
                                // Convert combined edge effect into a denom multiplier (cap to avoid aggression)
                                const effect = Math.max(0, Math.min(0.5, fj + cliffs * 0.5));
                                if (effect > 0) {
                                    denomUsed = Math.max(1, Math.round(denomUsed * (1 - effect)));
                                }
                            }
                        }
                        if (TerrainBuilder.getRandomNumber(denomUsed, "Fjord Coast") === 0) {
                            TerrainBuilder.setTerrainType(x, y, globals.g_CoastTerrain);
                        }
                    }
                }
            }
        }
    }
}
export default addRuggedCoasts;
```

## File: mod/maps/layers/features.js
```javascript
// @ts-nocheck
/**
 * Features Layer — addDiverseFeatures
 *
 * Purpose
 * - Run base-standard feature generation, then apply small, validated, and
 *   climate-aware embellishments that strengthen the narrative:
 *   - Paradise reefs near hotspot paradise centers
 *   - Volcanic vegetation around volcanic centers (forests in warm/wet, taiga in cold/wet)
 *   - Gentle density tweaks for rainforest/forest/taiga in appropriate biomes
 *
 * Guardrails
 * - Always validate placements via TerrainBuilder.canHaveFeature
 * - Resolve feature indices via lookups; skip if unavailable
 * - Keep probabilities conservative and local; never create chokepoints
 * - O(width × height); small neighborhood scans only
 */
import { addFeatures as baseAddFeatures } from "/base-standard/maps/feature-biome-generator.js";
import * as globals from "/base-standard/maps/map-globals.js";
import { StoryTags } from "../story/tags.js";
import { STORY_ENABLE_HOTSPOTS, STORY_TUNABLES, FEATURES_DENSITY_CFG, } from "../config/tunables.js";
import { getFeatureTypeIndex, inBounds } from "../core/utils.js";
/**
 * Add diverse features with conservative, validated tweaks.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function addDiverseFeatures(iWidth, iHeight) {
    console.log("Adding diverse terrain features...");
    // 1) Base-standard features (vanilla-compatible baseline)
    baseAddFeatures(iWidth, iHeight);
    // 2) Paradise reefs near hotspot paradise centers
    const reefIndex = getFeatureTypeIndex("FEATURE_REEF");
    const paradiseReefChance = STORY_TUNABLES?.features?.paradiseReefChance ?? 18;
    if (STORY_ENABLE_HOTSPOTS &&
        reefIndex !== -1 &&
        StoryTags.hotspotParadise.size > 0 &&
        paradiseReefChance > 0) {
        for (const key of StoryTags.hotspotParadise) {
            const [cx, cy] = key.split(",").map(Number);
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (!inBounds(nx, ny))
                        continue;
                    if (!GameplayMap.isWater(nx, ny))
                        continue;
                    if (GameplayMap.getFeatureType(nx, ny) !==
                        FeatureTypes.NO_FEATURE)
                        continue;
                    if (TerrainBuilder.getRandomNumber(100, "Paradise Reef") <
                        paradiseReefChance) {
                        if (TerrainBuilder.canHaveFeature(nx, ny, reefIndex)) {
                            TerrainBuilder.setFeatureType(nx, ny, {
                                Feature: reefIndex,
                                Direction: -1,
                                Elevation: 0,
                            });
                        }
                    }
                }
            }
        }
    }
    // 2b) Reefs along passive shelves (margin-aware, modest chance)
    if (reefIndex !== -1 &&
        StoryTags.passiveShelf &&
        StoryTags.passiveShelf.size > 0) {
        // Keep this lower than paradise reefs to stay subtle.
        const shelfMult = FEATURES_DENSITY_CFG?.shelfReefMultiplier ?? 0.6;
        const shelfReefChance = Math.max(1, Math.min(100, Math.floor((paradiseReefChance || 18) * shelfMult)));
        for (const key of StoryTags.passiveShelf) {
            const [sx, sy] = key.split(",").map(Number);
            // Tight radius; shelves are linear and we don't want clutter.
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = sx + dx;
                    const ny = sy + dy;
                    if (!inBounds(nx, ny))
                        continue;
                    if (!GameplayMap.isWater(nx, ny))
                        continue;
                    if (GameplayMap.getFeatureType(nx, ny) !==
                        FeatureTypes.NO_FEATURE)
                        continue;
                    if (TerrainBuilder.getRandomNumber(100, "Shelf Reef") <
                        shelfReefChance) {
                        if (TerrainBuilder.canHaveFeature(nx, ny, reefIndex)) {
                            TerrainBuilder.setFeatureType(nx, ny, {
                                Feature: reefIndex,
                                Direction: -1,
                                Elevation: 0,
                            });
                        }
                    }
                }
            }
        }
    }
    // 3) Per-tile post-pass for gentle density tweaks and volcanic vegetation
    const baseVolcanicForestChance = STORY_TUNABLES?.features?.volcanicForestChance ?? 22;
    const baseVolcanicTaigaChance = STORY_TUNABLES?.features?.volcanicTaigaChance ?? 25;
    // Slight boost to rugged vegetation near volcanic centers (kept conservative)
    const volcanicForestChance = Math.min(100, baseVolcanicForestChance + 6);
    const volcanicTaigaChance = Math.min(100, baseVolcanicTaigaChance + 5);
    const rainforestIdx = getFeatureTypeIndex("FEATURE_RAINFOREST");
    const forestIdx = getFeatureTypeIndex("FEATURE_FOREST");
    const taigaIdx = getFeatureTypeIndex("FEATURE_TAIGA");
    const rainforestExtraChance = FEATURES_DENSITY_CFG?.rainforestExtraChance ?? 55;
    const forestExtraChance = FEATURES_DENSITY_CFG?.forestExtraChance ?? 30;
    const taigaExtraChance = FEATURES_DENSITY_CFG?.taigaExtraChance ?? 35;
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y))
                continue;
            if (GameplayMap.getFeatureType(x, y) !== FeatureTypes.NO_FEATURE)
                continue;
            const biome = GameplayMap.getBiomeType(x, y);
            const elevation = GameplayMap.getElevation(x, y);
            const rainfall = GameplayMap.getRainfall(x, y);
            const plat = Math.abs(GameplayMap.getPlotLatitude(x, y));
            // 3a) Volcanic vegetation near volcanic hotspot centers (radius 1)
            if (STORY_ENABLE_HOTSPOTS && StoryTags.hotspotVolcanic.size > 0) {
                let nearVolcanic = false;
                for (let vdy = -1; vdy <= 1 && !nearVolcanic; vdy++) {
                    for (let vdx = -1; vdx <= 1; vdx++) {
                        if (vdx === 0 && vdy === 0)
                            continue;
                        const vx = x + vdx;
                        const vy = y + vdy;
                        if (!inBounds(vx, vy))
                            continue;
                        if (StoryTags.hotspotVolcanic.has(`${vx},${vy}`)) {
                            nearVolcanic = true;
                            break;
                        }
                    }
                }
                if (nearVolcanic) {
                    // Warm/wet: bias forest on eligible land
                    if (forestIdx !== -1 &&
                        rainfall > 95 &&
                        (biome === globals.g_GrasslandBiome ||
                            biome === globals.g_TropicalBiome)) {
                        if (TerrainBuilder.getRandomNumber(100, "Volcanic Forest") < volcanicForestChance) {
                            if (TerrainBuilder.canHaveFeature(x, y, forestIdx)) {
                                TerrainBuilder.setFeatureType(x, y, {
                                    Feature: forestIdx,
                                    Direction: -1,
                                    Elevation: 0,
                                });
                                continue; // placed a feature; skip other tweaks on this tile
                            }
                        }
                    }
                    // Cold/wet: bias taiga in suitable tundra pockets
                    if (taigaIdx !== -1 &&
                        plat >= 55 &&
                        biome === globals.g_TundraBiome &&
                        elevation < 400 &&
                        rainfall > 60) {
                        if (TerrainBuilder.getRandomNumber(100, "Volcanic Taiga") < volcanicTaigaChance) {
                            if (TerrainBuilder.canHaveFeature(x, y, taigaIdx)) {
                                TerrainBuilder.setFeatureType(x, y, {
                                    Feature: taigaIdx,
                                    Direction: -1,
                                    Elevation: 0,
                                });
                                continue;
                            }
                        }
                    }
                }
            }
            // 3b) Gentle density tweaks (validated)
            // Enhanced jungle in tropical high-rainfall areas
            if (rainforestIdx !== -1 &&
                biome === globals.g_TropicalBiome &&
                rainfall > 130) {
                if (TerrainBuilder.getRandomNumber(100, "Extra Jungle") <
                    rainforestExtraChance) {
                    if (TerrainBuilder.canHaveFeature(x, y, rainforestIdx)) {
                        TerrainBuilder.setFeatureType(x, y, {
                            Feature: rainforestIdx,
                            Direction: -1,
                            Elevation: 0,
                        });
                        continue;
                    }
                }
            }
            // Enhanced forests in temperate grasslands
            if (forestIdx !== -1 &&
                biome === globals.g_GrasslandBiome &&
                rainfall > 100) {
                if (TerrainBuilder.getRandomNumber(100, "Extra Forest") <
                    forestExtraChance) {
                    if (TerrainBuilder.canHaveFeature(x, y, forestIdx)) {
                        TerrainBuilder.setFeatureType(x, y, {
                            Feature: forestIdx,
                            Direction: -1,
                            Elevation: 0,
                        });
                        continue;
                    }
                }
            }
            // Taiga in cold areas (low elevation)
            if (taigaIdx !== -1 &&
                biome === globals.g_TundraBiome &&
                elevation < 300) {
                if (TerrainBuilder.getRandomNumber(100, "Extra Taiga") <
                    taigaExtraChance) {
                    if (TerrainBuilder.canHaveFeature(x, y, taigaIdx)) {
                        TerrainBuilder.setFeatureType(x, y, {
                            Feature: taigaIdx,
                            Direction: -1,
                            Elevation: 0,
                        });
                        continue;
                    }
                }
            }
        }
    }
}
export default addDiverseFeatures;
```

## File: mod/maps/layers/islands.js
```javascript
// @ts-nocheck
/**
 * Islands Layer — addIslandChains
 *
 * Seeds tiny offshore island clusters using a sparse fractal mask, with
 * additional alignment/bias along previously tagged hotspot trails to create
 * legible chains. Some hotspot centers are classified as “paradise” (reef‑friendly,
 * lusher), others as “volcanic” (occasional cone peeking above the sea; tougher
 * vegetation nearby). Feature/biome micro-tweaks occur in other layers; this
 * module only handles terrain placement and StoryTag classification.
 *
 * Guardrails
 * - Preserves open sea lanes by avoiding tiles within a small radius of land.
 * - Keeps clusters tiny (1–3 tiles; 1–2 when hotspot‑biased).
 * - Leaves heavy validation to feature layers (reefs/vegetation are validated there).
 * - O(width × height) with constant-time local checks.
 */
import * as globals from "/base-standard/maps/map-globals.js";
import { StoryTags } from "../story/tags.js";
import { STORY_TUNABLES, ISLANDS_CFG, CORRIDORS_CFG, } from "../config/tunables.js";
import { isAdjacentToLand, storyKey } from "../core/utils.js";
/**
 * Place small island clusters in deep water, with hotspot bias.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function addIslandChains(iWidth, iHeight) {
    // Sparse mask: use mountain fractal as a high-threshold trigger
    FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 5, 0);
    const fracPct = (ISLANDS_CFG?.fractalThresholdPercent ?? 90) | 0;
    const threshold = FractalBuilder.getHeightFromPercent(globals.g_HillFractal, Math.max(0, Math.min(100, fracPct)));
    // Tunables for hotspot classification and cone “peeking”
    const paradiseWeight = (STORY_TUNABLES?.hotspot?.paradiseBias ?? 2) | 0; // default 2
    const volcanicWeight = (STORY_TUNABLES?.hotspot?.volcanicBias ?? 1) | 0; // default 1
    const peakPercent = Math.max(0, Math.min(100, Math.round((STORY_TUNABLES?.hotspot?.volcanicPeakChance ?? 0.33) * 100) + 10));
    for (let y = 2; y < iHeight - 2; y++) {
        for (let x = 2; x < iWidth - 2; x++) {
            if (!GameplayMap.isWater(x, y))
                continue;
            // Keep islands away from existing land to preserve lanes
            const minDist = (ISLANDS_CFG?.minDistFromLandRadius ?? 2) | 0;
            if (isAdjacentToLand(x, y, Math.max(0, minDist)))
                continue;
            // Respect strategic sea-lane corridors: skip tiles near protected lanes
            const laneRadius = (CORRIDORS_CFG?.sea?.avoidRadius ?? 2) | 0;
            if (laneRadius > 0 &&
                StoryTags.corridorSeaLane &&
                StoryTags.corridorSeaLane.size > 0) {
                let nearSeaLane = false;
                for (let my = -laneRadius; my <= laneRadius && !nearSeaLane; my++) {
                    for (let mx = -laneRadius; mx <= laneRadius; mx++) {
                        const kk = storyKey(x + mx, y + my);
                        if (StoryTags.corridorSeaLane.has(kk)) {
                            nearSeaLane = true;
                            break;
                        }
                    }
                }
                if (nearSeaLane)
                    continue;
            }
            const v = FractalBuilder.getHeight(globals.g_HillFractal, x, y);
            const isHotspot = StoryTags.hotspot.has(storyKey(x, y));
            // Margin context (adjacent coastal segments tagged by margins)
            let nearActive = false;
            let nearPassive = false;
            for (let my = -1; my <= 1 && (!nearActive || !nearPassive); my++) {
                for (let mx = -1; mx <= 1; mx++) {
                    if (mx === 0 && my === 0)
                        continue;
                    const k = storyKey(x + mx, y + my);
                    if (!nearActive &&
                        StoryTags.activeMargin &&
                        StoryTags.activeMargin.has(k))
                        nearActive = true;
                    if (!nearPassive &&
                        StoryTags.passiveShelf &&
                        StoryTags.passiveShelf.has(k))
                        nearPassive = true;
                }
            }
            // Base sparse placement vs. hotspot- and margin-biased placement
            const denActive = (ISLANDS_CFG?.baseIslandDenNearActive ?? 5) | 0;
            const denElse = (ISLANDS_CFG?.baseIslandDenElse ?? 7) | 0;
            const baseIslandDen = nearActive ? denActive : denElse; // slightly more islands along active margins
            const baseAllowed = v > threshold &&
                TerrainBuilder.getRandomNumber(baseIslandDen, "Island Seed") ===
                    0;
            const hotspotAllowed = isHotspot &&
                TerrainBuilder.getRandomNumber(Math.max(1, (ISLANDS_CFG?.hotspotSeedDenom ?? 2) | 0), "Hotspot Island Seed") === 0;
            if (!(baseAllowed || hotspotAllowed))
                continue;
            // Default to coast water; occasionally let a volcanic center “peek” as land
            let centerTerrain = globals.g_CoastTerrain;
            let classifyParadise = false;
            if (isHotspot) {
                // Along passive shelves, slightly bias toward "paradise" centers
                const pWeight = paradiseWeight + (nearPassive ? 1 : 0);
                const vWeight = volcanicWeight;
                const bucket = pWeight + vWeight;
                const roll = TerrainBuilder.getRandomNumber(bucket || 1, "HotspotKind");
                classifyParadise = roll < pWeight;
                if (!classifyParadise) {
                    // Volcanic: rare cone peeking above sea level
                    if (TerrainBuilder.getRandomNumber(100, "HotspotPeak") <
                        peakPercent) {
                        centerTerrain = globals.g_FlatTerrain;
                    }
                }
            }
            // Place center tile
            TerrainBuilder.setTerrainType(x, y, centerTerrain);
            // Classify center for downstream microclimates/features
            if (isHotspot) {
                if (classifyParadise) {
                    StoryTags.hotspotParadise.add(storyKey(x, y));
                }
                else {
                    StoryTags.hotspotVolcanic.add(storyKey(x, y));
                }
            }
            // Create a tiny cluster around the center (smaller for hotspot-biased)
            const maxCluster = Math.max(1, (ISLANDS_CFG?.clusterMax ?? 3) | 0);
            const count = 1 + TerrainBuilder.getRandomNumber(maxCluster, "Island Size");
            for (let n = 0; n < count; n++) {
                const dx = TerrainBuilder.getRandomNumber(3, "dx") - 1;
                const dy = TerrainBuilder.getRandomNumber(3, "dy") - 1;
                const nx = x + dx;
                const ny = y + dy;
                if (nx <= 0 || nx >= iWidth - 1 || ny <= 0 || ny >= iHeight - 1)
                    continue;
                if (!GameplayMap.isWater(nx, ny))
                    continue;
                TerrainBuilder.setTerrainType(nx, ny, globals.g_CoastTerrain);
            }
        }
    }
}
export default addIslandChains;
```

## File: mod/maps/layers/placement.js
```javascript
// @ts-nocheck
/**
 * Placement Layer — Wonders, Floodplains, Snow, Resources, Starts, Discoveries, Fertility, Advanced Start
 *
 * Purpose
 * - Encapsulate all late-stage placement and finalization passes into a single, reusable function.
 * - Keep behavior compatible with the existing pipeline while enabling clean orchestration.
 *
 * Responsibilities
 * - Natural wonders (+1 vs. map defaults unless overridden)
 * - Floodplains
 * - Snow generation
 * - Resources
 * - Start position assignment (vanilla-compatible)
 * - Discoveries (post-starts to seed exploration)
 * - Fertility recalculation
 * - Advanced start region assignment
 *
 * Usage
 *   import { runPlacement } from "./layers/placement.js";
 *   const startPositions = runPlacement(iWidth, iHeight, {
 *     mapInfo,
 *     wondersPlusOne: true, // default true
 *     floodplains: { minLength: 4, maxLength: 10 },
 *     starts: {
 *       playersLandmass1, playersLandmass2,
 *       westContinent, eastContinent,
 *       startSectorRows, startSectorCols,
 *       startSectors
 *     }
 *   });
 *
 * Notes
 * - All external engine/module calls are wrapped in light defensive try/catch where sensible.
 * - Returns the computed startPositions array for downstream consumers (e.g., discoveries).
 */
import { addNaturalWonders } from "/base-standard/maps/natural-wonder-generator.js";
import { generateResources } from "/base-standard/maps/resource-generator.js";
import { assignAdvancedStartRegions } from "/base-standard/maps/assign-advanced-start-region.js";
import { generateDiscoveries } from "/base-standard/maps/discovery-generator.js";
import { generateSnow } from "/base-standard/maps/snow-generator.js";
import { assignStartPositions } from "/base-standard/maps/assign-starting-plots.js";
import { PLACEMENT_CFG } from "../config/tunables.js";
/**
 * Compute the number of natural wonders to place.
 * Default behavior mirrors the main script: +1 vs map defaults (but never below default).
 * @param {any} mapInfo
 * @param {boolean} wondersPlusOne
 * @returns {number}
 */
function resolveNaturalWonderCount(mapInfo, wondersPlusOne = true) {
    if (!mapInfo || typeof mapInfo.NumNaturalWonders !== "number") {
        return 1;
    }
    if (wondersPlusOne) {
        return Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
    }
    return mapInfo.NumNaturalWonders;
}
/**
 * Run late-stage placement and finalization passes.
 * @param {number} iWidth
 * @param {number} iHeight
 * @param {object} params
 * @param {any} params.mapInfo - GameInfo.Maps row (used to derive defaults).
 * @param {boolean} [params.wondersPlusOne=true] - Whether to add +1 to map default wonders.
 * @param {{minLength:number,maxLength:number}} [params.floodplains] - Floodplains config (defaults: {4, 10}).
 * @param {object} params.starts - Start placement inputs.
 * @param {number} params.starts.playersLandmass1
 * @param {number} params.starts.playersLandmass2
 * @param {{west:number,east:number,south:number,north:number,continent:number}} params.starts.westContinent
 * @param {{west:number,east:number,south:number,north:number,continent:number}} params.starts.eastContinent
 * @param {number} params.starts.startSectorRows
 * @param {number} params.starts.startSectorCols
 * @param {Array<any>} params.starts.startSectors
 * @returns {Array<any>} startPositions
 */
export function runPlacement(iWidth, iHeight, { mapInfo, wondersPlusOne = true, floodplains = { minLength: 4, maxLength: 10 }, starts, } = {}) {
    const startPositions = [];
    // 1) Natural Wonders
    try {
        const wonders = resolveNaturalWonderCount(mapInfo, typeof wondersPlusOne === "boolean"
            ? wondersPlusOne
            : PLACEMENT_CFG &&
                typeof PLACEMENT_CFG.wondersPlusOne === "boolean"
                ? PLACEMENT_CFG.wondersPlusOne
                : true);
        addNaturalWonders(iWidth, iHeight, wonders);
    }
    catch (err) {
        console.log("[Placement] addNaturalWonders failed:", err);
    }
    // 2) Floodplains
    try {
        const minLen = floodplains && typeof floodplains.minLength === "number"
            ? floodplains.minLength
            : PLACEMENT_CFG &&
                PLACEMENT_CFG.floodplains &&
                typeof PLACEMENT_CFG.floodplains.minLength === "number"
                ? PLACEMENT_CFG.floodplains.minLength
                : 4;
        const maxLen = floodplains && typeof floodplains.maxLength === "number"
            ? floodplains.maxLength
            : PLACEMENT_CFG &&
                PLACEMENT_CFG.floodplains &&
                typeof PLACEMENT_CFG.floodplains.maxLength === "number"
                ? PLACEMENT_CFG.floodplains.maxLength
                : 10;
        TerrainBuilder.addFloodplains(minLen, maxLen);
    }
    catch (err) {
        console.log("[Placement] addFloodplains failed:", err);
    }
    // 3) Snow (post-water/terrain stabilization)
    try {
        generateSnow(iWidth, iHeight);
    }
    catch (err) {
        console.log("[Placement] generateSnow failed:", err);
    }
    // 4) Resources (after snow)
    try {
        generateResources(iWidth, iHeight);
    }
    catch (err) {
        console.log("[Placement] generateResources failed:", err);
    }
    // 5) Start positions (vanilla-compatible)
    try {
        if (!starts) {
            console.log("[Placement] Start placement skipped (no starts config provided).");
        }
        else {
            const { playersLandmass1, playersLandmass2, westContinent, eastContinent, startSectorRows, startSectorCols, startSectors, } = starts;
            const pos = assignStartPositions(playersLandmass1, playersLandmass2, westContinent, eastContinent, startSectorRows, startSectorCols, startSectors);
            if (Array.isArray(pos)) {
                startPositions.push(...pos);
            }
            console.log("[Placement] Start positions assigned successfully");
        }
    }
    catch (err) {
        console.log("[Placement] assignStartPositions failed:", err);
    }
    // 6) Discoveries (post-starts to seed exploration)
    try {
        generateDiscoveries(iWidth, iHeight, startPositions);
        console.log("[Placement] Discoveries generated successfully");
    }
    catch (err) {
        console.log("[Placement] generateDiscoveries failed:", err);
    }
    // 7) Fertility + Advanced Start
    try {
        FertilityBuilder.recalculate();
    }
    catch (err) {
        console.log("[Placement] FertilityBuilder.recalculate failed:", err);
    }
    try {
        assignAdvancedStartRegions();
    }
    catch (err) {
        console.log("[Placement] assignAdvancedStartRegions failed:", err);
    }
    return startPositions;
}
export default runPlacement;
```

## File: mod/maps/story/corridors.js
```javascript
// @ts-nocheck
/**
 * Strategic Corridors — lightweight, gameplay‑focused path tagging
 *
 * Tags sparse “corridors” that other layers respect to preserve or emphasize
 * traversal routes:
 *  - Sea lanes: long open water lanes across the map (don’t obstruct with coasts/islands)
 *  - Island‑hop lanes: promote hotspot trails as navigable arcs (avoid clutter)
 *  - Land open corridors: long rift‑shoulder runs get gentle grassland bias
 *  - River chains: post‑rivers, lowland river‑adjacent cross‑continent paths
 *
 * Invariants and constraints:
 *  - Pure tagging; no heavy flood fills. All passes are O(width × height) with small constants.
 *  - Consumers must remain lane‑safe: do not create chokepoints or dense clutter.
 *  - Does not modify rainfall or terrain here; those effects belong to other layers.
 */
import { StoryTags } from "./tags.js";
import { inBounds, storyKey, isAdjacentToLand } from "../core/utils.js";
import { STORY_ENABLE_CORRIDORS, CORRIDORS_CFG, WORLDMODEL_DIRECTIONALITY, } from "../config/tunables.js";
import { devLogIf } from "../config/dev.js";
/**
 * Safe random helper (engine provided).
 * @param {number} n
 * @param {string} label
 * @returns {number}
 */
function rand(n, label) {
    return TerrainBuilder.getRandomNumber(Math.max(1, n | 0), label || "Corr");
}
/**
 * Compute the longest contiguous run of water along a fixed column x.
 * @param {number} x
 * @param {number} height
 * @returns {{start:number,end:number,len:number}}
 */
function longestWaterRunColumn(x, height) {
    let bestStart = -1, bestEnd = -1, bestLen = 0;
    let curStart = -1, curLen = 0;
    for (let y = 0; y < height; y++) {
        if (GameplayMap.isWater(x, y)) {
            if (curLen === 0)
                curStart = y;
            curLen++;
            if (curLen > bestLen) {
                bestLen = curLen;
                bestStart = curStart;
                bestEnd = y;
            }
        }
        else {
            curLen = 0;
        }
    }
    return { start: bestStart, end: bestEnd, len: bestLen };
}
/**
 * Compute the longest contiguous run of water along a fixed row y.
 * @param {number} y
 * @param {number} width
 * @returns {{start:number,end:number,len:number}}
 */
function longestWaterRunRow(y, width) {
    let bestStart = -1, bestEnd = -1, bestLen = 0;
    let curStart = -1, curLen = 0;
    for (let x = 0; x < width; x++) {
        if (GameplayMap.isWater(x, y)) {
            if (curLen === 0)
                curStart = x;
            curLen++;
            if (curLen > bestLen) {
                bestLen = curLen;
                bestStart = curStart;
                bestEnd = x;
            }
        }
        else {
            curLen = 0;
        }
    }
    return { start: bestStart, end: bestEnd, len: bestLen };
}
/**
 * Tag long open water “sea lanes” across the map.
 * We prefer a handful of long, straight segments (columns/rows) that clear a large span.
 */
function tagSeaLanes() {
    const cfg = (CORRIDORS_CFG && CORRIDORS_CFG.sea) || {};
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const maxLanes = Math.max(0, (cfg.maxLanes ?? 3) | 0);
    const stride = Math.max(2, (cfg.scanStride ?? 6) | 0);
    const minLenFrac = Math.min(1, Math.max(0.4, cfg.minLengthFrac ?? 0.7));
    const preferDiagonals = !!cfg.preferDiagonals;
    const laneSpacing = Math.max(0, (cfg.laneSpacing ?? 6) | 0);
    const requiredMinWidth = Math.max(1, (cfg.minChannelWidth ?? 3) | 0);
    // Helper: check perpendicular water width around (x,y) for given orientation
    // Orient: 'col' (vertical), 'row' (horizontal), 'diagNE' (x+y const), 'diagNW' (x-y const)
    function hasPerpWidth(x, y, orient, minWidth) {
        const r = Math.floor((minWidth - 1) / 2);
        if (r <= 0)
            return GameplayMap.isWater(x, y);
        if (!GameplayMap.isWater(x, y))
            return false;
        // Check along perpendicular line
        if (orient === "col") {
            // Perpendicular to vertical is horizontal — vary dx, fixed y
            for (let dx = -r; dx <= r; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= width)
                    return false;
                if (!GameplayMap.isWater(nx, y))
                    return false;
            }
            return true;
        }
        else if (orient === "row") {
            // Perpendicular to horizontal is vertical — vary dy, fixed x
            for (let dy = -r; dy <= r; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height)
                    return false;
                if (!GameplayMap.isWater(x, ny))
                    return false;
            }
            return true;
        }
        else if (orient === "diagNE") {
            // Lane along NE-SW (x+y = const); perpendicular is NW-SE (x+=t, y+=t)
            for (let t = -r; t <= r; t++) {
                const nx = x + t, ny = y + t;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height)
                    return false;
                if (!GameplayMap.isWater(nx, ny))
                    return false;
            }
            return true;
        }
        else if (orient === "diagNW") {
            // Lane along NW-SE (x-y = const); perpendicular is NE-SW (x+=t, y-=t)
            for (let t = -r; t <= r; t++) {
                const nx = x + t, ny = y - t;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height)
                    return false;
                if (!GameplayMap.isWater(nx, ny))
                    return false;
            }
            return true;
        }
        return false;
    }
    // Helpers for diagonals
    function longestWaterRunDiagSum(k) {
        // NE-SW family: x+y = k
        const xs = Math.max(0, k - (height - 1));
        const xe = Math.min(width - 1, k);
        let bestStartX = -1, bestEndX = -1, bestLen = 0;
        let curStartX = -1, curLen = 0;
        for (let x = xs; x <= xe; x++) {
            const y = k - x;
            if (GameplayMap.isWater(x, y)) {
                if (curLen === 0)
                    curStartX = x;
                curLen++;
                if (curLen > bestLen) {
                    bestLen = curLen;
                    bestStartX = curStartX;
                    bestEndX = x;
                }
            }
            else {
                curLen = 0;
            }
        }
        return {
            xs,
            xe,
            startX: bestStartX,
            endX: bestEndX,
            len: bestLen,
            axisLen: xe - xs + 1,
        };
    }
    function longestWaterRunDiagDiff(d) {
        // NW-SE family: x - y = d
        const ys = Math.max(0, -d);
        const ye = Math.min(height - 1, width - 1 - d);
        let bestStartY = -1, bestEndY = -1, bestLen = 0;
        let curStartY = -1, curLen = 0;
        for (let y = ys; y <= ye; y++) {
            const x = d + y;
            if (GameplayMap.isWater(x, y)) {
                if (curLen === 0)
                    curStartY = y;
                curLen++;
                if (curLen > bestLen) {
                    bestLen = curLen;
                    bestStartY = curStartY;
                    bestEndY = y;
                }
            }
            else {
                curLen = 0;
            }
        }
        return {
            ys,
            ye,
            startY: bestStartY,
            endY: bestEndY,
            len: bestLen,
            axisLen: ye - ys + 1,
        };
    }
    // Build candidates with simple scores and spacing metadata
    // Directionality bias setup (uses WorldModel directionality config; safe fallbacks)
    const DIR = WORLDMODEL_DIRECTIONALITY || {};
    const COH = Math.max(0, Math.min(1, DIR.cohesion ?? 0));
    const plateAxisDeg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
    let windAxisDeg = (DIR?.primaryAxes?.windBiasDeg ?? 0) | 0;
    let currentAxisDeg = (DIR?.primaryAxes?.currentBiasDeg ?? 0) | 0;
    const windsFollowPlates = Math.max(0, Math.min(1, DIR?.interplay?.windsFollowPlates ?? 0)) * COH;
    const currentsFollowWinds = Math.max(0, Math.min(1, DIR?.interplay?.currentsFollowWinds ?? 0)) *
        COH;
    windAxisDeg += Math.round(plateAxisDeg * windsFollowPlates);
    currentAxisDeg += Math.round(plateAxisDeg * windsFollowPlates * 0.5);
    // Vector helpers
    function axisVec(deg) {
        const r = (deg * Math.PI) / 180;
        return { x: Math.cos(r), y: Math.sin(r) };
    }
    function laneVec(orient) {
        if (orient === "col")
            return { x: 0, y: 1 };
        if (orient === "row")
            return { x: 1, y: 0 };
        if (orient === "diagNE")
            return { x: 1 / Math.SQRT2, y: -1 / Math.SQRT2 }; // NE-SW
        if (orient === "diagNW")
            return { x: 1 / Math.SQRT2, y: 1 / Math.SQRT2 }; // NW-SE
        return { x: 1, y: 0 };
    }
    const WV = axisVec(windAxisDeg);
    const CV = axisVec(currentAxisDeg);
    function directionalityBias(orient) {
        if (COH <= 0)
            return 0;
        const L = laneVec(orient);
        const dotWind = Math.abs(WV.x * L.x + WV.y * L.y); // 0..1
        const dotCurr = Math.abs(CV.x * L.x + CV.y * L.y); // 0..1
        // Weight wind higher; currents gain from interplay with winds
        const wW = 1.0;
        const wC = 0.8 + 0.6 * currentsFollowWinds;
        const align = (dotWind * wW + dotCurr * wC) / (wW + wC);
        // Scale modestly to keep lane selection conservative
        return Math.round(align * 25 * COH);
    }
    /** @type {Array<{orient:'col'|'row'|'diagNE'|'diagNW', index:number, start:number, end:number, len:number, minWidth:number, score:number}>} */
    const candidates = [];
    // Columns
    const minCol = Math.floor(height * minLenFrac);
    for (let x = 1; x < width - 1; x += stride) {
        const run = longestWaterRunColumn(x, height);
        if (run.len >= minCol) {
            // Sample perpendicular width at a few points
            const step = Math.max(1, Math.floor(run.len / 10));
            let ok = true;
            for (let y = run.start; y <= run.end; y += step) {
                if (!hasPerpWidth(x, y, "col", requiredMinWidth)) {
                    ok = false;
                    break;
                }
            }
            const minW = ok ? requiredMinWidth : 1;
            const coverage = run.len / height;
            let score = run.len + 3 * minW + Math.round(coverage * 10);
            score += directionalityBias("col");
            candidates.push({
                orient: "col",
                index: x,
                start: run.start,
                end: run.end,
                len: run.len,
                minWidth: minW,
                score,
            });
        }
    }
    // Rows
    const minRow = Math.floor(width * minLenFrac);
    for (let y = 1; y < height - 1; y += stride) {
        const run = longestWaterRunRow(y, width);
        if (run.len >= minRow) {
            const step = Math.max(1, Math.floor(run.len / 10));
            let ok = true;
            for (let x = run.start; x <= run.end; x += step) {
                if (!hasPerpWidth(x, y, "row", requiredMinWidth)) {
                    ok = false;
                    break;
                }
            }
            const minW = ok ? requiredMinWidth : 1;
            const coverage = run.len / width;
            let score = run.len + 3 * minW + Math.round(coverage * 10);
            score += directionalityBias("row");
            candidates.push({
                orient: "row",
                index: y,
                start: run.start,
                end: run.end,
                len: run.len,
                minWidth: minW,
                score,
            });
        }
    }
    // Diagonals (optional)
    if (preferDiagonals) {
        // NE-SW: k = x+y in [0, width-1+height-1]
        const kMax = width - 1 + (height - 1);
        for (let k = 0; k <= kMax; k += Math.max(2, stride)) {
            const run = longestWaterRunDiagSum(k);
            const minDiag = Math.floor(run.axisLen * minLenFrac);
            if (run.len >= minDiag && run.startX !== -1) {
                const step = Math.max(1, Math.floor(run.len / 10));
                let ok = true;
                for (let x = run.startX; x <= run.endX; x += step) {
                    const y = k - x;
                    if (!hasPerpWidth(x, y, "diagNE", requiredMinWidth)) {
                        ok = false;
                        break;
                    }
                }
                const minW = ok ? requiredMinWidth : 1;
                const coverage = run.len / run.axisLen;
                let score = run.len + 2 * minW + Math.round(coverage * 10);
                score += directionalityBias("diagNE");
                candidates.push({
                    orient: "diagNE",
                    index: k,
                    start: run.startX,
                    end: run.endX,
                    len: run.len,
                    minWidth: minW,
                    score,
                });
            }
        }
        // NW-SE: d = x - y in [-(height-1)..(width-1)]
        const dMin = -(height - 1);
        const dMax = width - 1;
        for (let d = dMin; d <= dMax; d += Math.max(2, stride)) {
            const run = longestWaterRunDiagDiff(d);
            const minDiag = Math.floor(run.axisLen * minLenFrac);
            if (run.len >= minDiag && run.startY !== -1) {
                const step = Math.max(1, Math.floor(run.len / 10));
                let ok = true;
                for (let y = run.startY; y <= run.endY; y += step) {
                    const x = d + y;
                    if (!hasPerpWidth(x, y, "diagNW", requiredMinWidth)) {
                        ok = false;
                        break;
                    }
                }
                const minW = ok ? requiredMinWidth : 1;
                const coverage = run.len / run.axisLen;
                let score = run.len + 2 * minW + Math.round(coverage * 10);
                score += directionalityBias("diagNW");
                candidates.push({
                    orient: "diagNW",
                    index: d,
                    start: run.startY,
                    end: run.endY,
                    len: run.len,
                    minWidth: minW,
                    score,
                });
            }
        }
    }
    // Select top-K by score while enforcing spacing within the same orientation family
    candidates.sort((a, b) => b.score - a.score);
    /** @type {{col:number[],row:number[],diagNE:number[],diagNW:number[]}} */
    const chosenIdx = { col: [], row: [], diagNE: [], diagNW: [] };
    let lanes = 0;
    function spaced(orient, index) {
        const arr = chosenIdx[orient];
        for (let i = 0; i < arr.length; i++) {
            if (Math.abs(arr[i] - index) < laneSpacing)
                return false;
        }
        return true;
    }
    for (const c of candidates) {
        if (lanes >= maxLanes)
            break;
        if (!spaced(c.orient, c.index))
            continue;
        chosenIdx[c.orient].push(c.index);
        // Tag tiles for this lane
        if (c.orient === "col") {
            const x = c.index;
            for (let y = c.start; y <= c.end; y++) {
                if (GameplayMap.isWater(x, y)) {
                    const kk = storyKey(x, y);
                    StoryTags.corridorSeaLane.add(kk);
                    StoryTags.corridorKind.set(kk, "sea");
                    const style = isAdjacentToLand(x, y, 2)
                        ? "coastal"
                        : "ocean";
                    StoryTags.corridorStyle.set(kk, style);
                }
            }
        }
        else if (c.orient === "row") {
            const y = c.index;
            for (let x = c.start; x <= c.end; x++) {
                if (GameplayMap.isWater(x, y)) {
                    const kk = storyKey(x, y);
                    StoryTags.corridorSeaLane.add(kk);
                    StoryTags.corridorKind.set(kk, "sea");
                    const style = isAdjacentToLand(x, y, 2)
                        ? "coastal"
                        : "ocean";
                    StoryTags.corridorStyle.set(kk, style);
                }
            }
        }
        else if (c.orient === "diagNE") {
            const k = c.index;
            for (let x = c.start; x <= c.end; x++) {
                const y = k - x;
                if (x >= 0 &&
                    x < width &&
                    y >= 0 &&
                    y < height &&
                    GameplayMap.isWater(x, y)) {
                    const kk = storyKey(x, y);
                    StoryTags.corridorSeaLane.add(kk);
                    StoryTags.corridorKind.set(kk, "sea");
                    const style = isAdjacentToLand(x, y, 2)
                        ? "coastal"
                        : "ocean";
                    StoryTags.corridorStyle.set(kk, style);
                }
            }
        }
        else if (c.orient === "diagNW") {
            const d = c.index;
            for (let y = c.start; y <= c.end; y++) {
                const x = d + y;
                if (x >= 0 &&
                    x < width &&
                    y >= 0 &&
                    y < height &&
                    GameplayMap.isWater(x, y)) {
                    const kk = storyKey(x, y);
                    StoryTags.corridorSeaLane.add(kk);
                    StoryTags.corridorKind.set(kk, "sea");
                    const style = isAdjacentToLand(x, y, 2)
                        ? "coastal"
                        : "ocean";
                    StoryTags.corridorStyle.set(kk, style);
                }
            }
        }
        lanes++;
    }
    // Log a compact summary of selected sea lanes
    devLogIf &&
        devLogIf("LOG_STORY_TAGS", `[Corridors] Sea lanes selected: ${lanes} (col:${chosenIdx.col.length}, row:${chosenIdx.row.length}, diagNE:${chosenIdx.diagNE.length}, diagNW:${chosenIdx.diagNW.length}); tiles=${StoryTags.corridorSeaLane.size}`);
}
/**
 * Promote hotspot trail points to “island‑hop” lanes (avoid clutter, just tag proximity).
 * We select up to N arcs from existing StoryTags.hotspot points.
 */
function tagIslandHopFromHotspots() {
    const cfg = (CORRIDORS_CFG && CORRIDORS_CFG.islandHop) || {};
    if (!cfg.useHotspots)
        return;
    const maxArcs = Math.max(0, (cfg.maxArcs ?? 2) | 0);
    if (maxArcs === 0)
        return;
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    // Gather hotspot keys for indexed access
    const keys = Array.from(StoryTags.hotspot);
    if (!keys.length)
        return;
    // Randomly sample up to maxArcs seeds from the hotspot set
    const picked = new Set();
    let arcs = 0, attempts = 0;
    while (arcs < maxArcs && attempts < 100 && attempts < keys.length * 2) {
        attempts++;
        const idx = rand(keys.length, "IslandHopPick");
        const key = keys[idx % keys.length];
        if (picked.has(key))
            continue;
        picked.add(key);
        arcs++;
        // Tag the seed and a tight neighborhood to “promote” the trail locally
        const [sx, sy] = key.split(",").map(Number);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = sx + dx, ny = sy + dy;
                if (!inBounds(nx, ny))
                    continue;
                if (!GameplayMap.isWater(nx, ny))
                    continue;
                {
                    const kk = storyKey(nx, ny);
                    StoryTags.corridorIslandHop.add(kk);
                    StoryTags.corridorKind.set(kk, "islandHop");
                    StoryTags.corridorStyle.set(kk, "archipelago");
                }
            }
        }
    }
}
/**
 * Promote long rift‑shoulder runs as “land‑open” corridors (plains/grass bias consumers).
 * MVP: tag shoulder tiles that form sufficiently long contiguous row segments.
 */
function tagLandCorridorsFromRifts() {
    const cfg = (CORRIDORS_CFG && CORRIDORS_CFG.land) || {};
    if (!cfg.useRiftShoulders)
        return;
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const maxCorridors = Math.max(0, (cfg.maxCorridors ?? 2) | 0);
    const minRun = Math.max(12, (cfg.minRunLength ?? 24) | 0);
    if (maxCorridors === 0 || StoryTags.riftShoulder.size === 0)
        return;
    let corridors = 0;
    const spacing = Math.max(0, (cfg.spacing ?? 0) | 0);
    const usedRows = [];
    // Sweep rows; find shoulder segments of sufficient length, tag them until budget exhausted
    for (let y = 1; y < height - 1 && corridors < maxCorridors; y++) {
        let x = 1;
        while (x < width - 1 && corridors < maxCorridors) {
            // Skip non‑shoulder
            while (x < width - 1 && !StoryTags.riftShoulder.has(storyKey(x, y)))
                x++;
            if (x >= width - 1)
                break;
            const start = x;
            while (x < width - 1 && StoryTags.riftShoulder.has(storyKey(x, y)))
                x++;
            const end = x - 1;
            const len = end - start + 1;
            if (len >= minRun) {
                // Enforce row spacing between chosen corridors
                let tooClose = false;
                for (let i = 0; i < usedRows.length; i++) {
                    if (Math.abs(usedRows[i] - y) < spacing) {
                        tooClose = true;
                        break;
                    }
                }
                if (!tooClose) {
                    // Determine corridor style for this segment using simple context heuristics
                    let totalElev = 0, totalRain = 0, samples = 0, reliefHits = 0;
                    for (let cx = start; cx <= end; cx++) {
                        if (GameplayMap.isWater(cx, y))
                            continue;
                        const e = GameplayMap.getElevation(cx, y);
                        const r = GameplayMap.getRainfall(cx, y);
                        totalElev += e;
                        totalRain += r;
                        samples++;
                        // simple local relief check (4-neighborhood)
                        const eN = GameplayMap.getElevation(cx, Math.max(0, y - 1));
                        const eS = GameplayMap.getElevation(cx, Math.min(GameplayMap.getGridHeight() - 1, y + 1));
                        const eW = GameplayMap.getElevation(Math.max(0, cx - 1), y);
                        const eE = GameplayMap.getElevation(Math.min(GameplayMap.getGridWidth() - 1, cx + 1), y);
                        const dMax = Math.max(Math.abs(e - eN), Math.abs(e - eS), Math.abs(e - eW), Math.abs(e - eE));
                        if (dMax >= 60)
                            reliefHits++;
                    }
                    const avgElev = samples > 0 ? Math.round(totalElev / samples) : 0;
                    const avgRain = samples > 0 ? Math.round(totalRain / samples) : 0;
                    const reliefFrac = samples > 0 ? reliefHits / samples : 0;
                    const latDeg = Math.abs(GameplayMap.getPlotLatitude(0, y));
                    // Baseline style from local context
                    let style = "plainsBelt";
                    if (reliefFrac > 0.35 && avgRain < 95) {
                        style = "canyon";
                    }
                    else if (avgElev > 650 && reliefFrac < 0.2) {
                        style = "plateau";
                    }
                    else if (avgElev > 550 && reliefFrac < 0.35) {
                        style = "flatMtn";
                    }
                    else if (avgRain < 85 && latDeg < 35) {
                        style = "desertBelt";
                    }
                    else if (avgRain > 115) {
                        style = "grasslandBelt";
                    }
                    // Directionality-influenced steering (cohesive macro alignment)
                    // Lanes here are row-oriented (east-west). Use global axes to nudge style.
                    try {
                        const DIR = WORLDMODEL_DIRECTIONALITY || {};
                        const cohesion = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                        if (cohesion > 0) {
                            const plateDeg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
                            const windDeg = (DIR?.primaryAxes?.windBiasDeg ?? 0) | 0;
                            // Unit vectors for axes and this corridor orientation (row → east-west)
                            const radP = (plateDeg * Math.PI) / 180;
                            const radW = (windDeg * Math.PI) / 180;
                            const PV = { x: Math.cos(radP), y: Math.sin(radP) };
                            const WV = { x: Math.cos(radW), y: Math.sin(radW) };
                            const L = { x: 1, y: 0 }; // row-aligned
                            // Alignment 0..1 (absolute dot; we care about parallelism)
                            const alignPlate = Math.abs(PV.x * L.x + PV.y * L.y);
                            const alignWind = Math.abs(WV.x * L.x + WV.y * L.y);
                            // Heuristic thresholds scaled by cohesion
                            const hiAlign = 0.75 * cohesion + 0.1; // ~0.85 at cohesion 1.0
                            const midAlign = 0.5 * cohesion + 0.1;
                            // Plate-aligned corridors: bias toward structural styles
                            if (alignPlate >= hiAlign) {
                                if (avgElev > 650 && reliefFrac < 0.28) {
                                    style = "plateau";
                                }
                                else if (reliefFrac > 0.3 && avgRain < 100) {
                                    style = "canyon";
                                }
                                else if (avgElev > 560 && reliefFrac < 0.35) {
                                    style = "flatMtn";
                                }
                            }
                            else if (alignPlate >= midAlign) {
                                if (avgElev > 600 && reliefFrac < 0.25) {
                                    style = "plateau";
                                }
                            }
                            // Wind-aligned corridors: bias toward open belts (desert/grassland)
                            if (alignWind >= hiAlign) {
                                if (avgRain > 110 ||
                                    (latDeg < 25 && avgRain > 100)) {
                                    style = "grasslandBelt";
                                }
                                else if (avgRain < 90 && latDeg < 35) {
                                    style = "desertBelt";
                                }
                            }
                            else if (alignWind >= midAlign) {
                                if (avgRain > 120) {
                                    style = "grasslandBelt";
                                }
                            }
                        }
                    }
                    catch (_) {
                        // Keep baseline style on any error
                    }
                    for (let cx = start; cx <= end; cx++) {
                        if (!GameplayMap.isWater(cx, y)) {
                            const kk = storyKey(cx, y);
                            StoryTags.corridorLandOpen.add(kk);
                            StoryTags.corridorKind.set(kk, "land");
                            StoryTags.corridorStyle.set(kk, style);
                        }
                    }
                    usedRows.push(y);
                    corridors++;
                }
            }
        }
    }
}
/**
 * After rivers are modeled, tag “river‑chain” corridors:
 * - Start near a coast and near rivers
 * - Greedily step to adjacent tiles that remain river‑adjacent and prefer lowlands/downhill
 */
function tagRiverChainsPostRivers() {
    const cfg = (CORRIDORS_CFG && CORRIDORS_CFG.river) || {};
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const maxChains = Math.max(0, (cfg.maxChains ?? 2) | 0);
    const maxSteps = Math.max(20, (cfg.maxSteps ?? 80) | 0);
    const lowlandThresh = Math.max(0, (cfg.preferLowlandBelow ?? 300) | 0);
    const coastSeedR = Math.max(1, (cfg.coastSeedRadius ?? 2) | 0);
    if (maxChains === 0)
        return;
    let chains = 0, tries = 0;
    while (chains < maxChains && tries < 300) {
        tries++;
        const sx = rand(width, "RiverChainSX");
        const sy = rand(height, "RiverChainSY");
        if (!inBounds(sx, sy))
            continue;
        if (!GameplayMap.isCoastalLand(sx, sy))
            continue;
        if (!GameplayMap.isAdjacentToRivers(sx, sy, coastSeedR))
            continue;
        let x = sx, y = sy, steps = 0;
        const pathKeys = [];
        while (steps < maxSteps) {
            if (!GameplayMap.isWater(x, y) &&
                GameplayMap.isAdjacentToRivers(x, y, 1)) {
                pathKeys.push(storyKey(x, y));
            }
            // Greedy move: prefer neighbor that’s river‑adjacent and lower/similar elevation,
            // with a mild preference for lowlands
            let bx = x, by = y, be = GameplayMap.getElevation(x, y);
            let improved = false;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0)
                        continue;
                    const nx = x + dx, ny = y + dy;
                    if (!inBounds(nx, ny) || GameplayMap.isWater(nx, ny))
                        continue;
                    if (!GameplayMap.isAdjacentToRivers(nx, ny, 1))
                        continue;
                    const e = GameplayMap.getElevation(nx, ny);
                    const prefer = e <= be || // downhill or level near river
                        (e < lowlandThresh && be >= lowlandThresh); // moving toward lowland
                    if (prefer) {
                        // Soft tie‑break with slight randomness to avoid loops
                        if (!improved || rand(3, "RiverChainTie") === 0) {
                            bx = nx;
                            by = ny;
                            be = e;
                            improved = true;
                        }
                    }
                }
            }
            if (!improved)
                break;
            x = bx;
            y = by;
            steps++;
        }
        const minTiles = Math.max(0, (cfg.minTiles ?? 0) | 0);
        const mustEndNearCoast = !!cfg.mustEndNearCoast;
        let endOK = true;
        if (mustEndNearCoast) {
            endOK =
                GameplayMap.isCoastalLand(x, y) ||
                    GameplayMap.isAdjacentToShallowWater(x, y);
        }
        if (pathKeys.length >= minTiles && endOK) {
            for (let i = 0; i < pathKeys.length; i++) {
                const kk = pathKeys[i];
                StoryTags.corridorRiverChain.add(kk);
                StoryTags.corridorKind.set(kk, "river");
                StoryTags.corridorStyle.set(kk, "riverChain");
            }
            chains++;
        }
    }
}
/**
 * Entrypoint for corridor tagging.
 * Call with:
 *  - stage="preIslands": After coast/margin shaping, before island seeding
 *  - stage="postRivers": After modelRivers/defineNamedRivers
 * @param {"preIslands"|"postRivers"} stage
 */
export function storyTagStrategicCorridors(stage) {
    if (!STORY_ENABLE_CORRIDORS)
        return;
    if (stage === "preIslands") {
        tagSeaLanes();
        tagIslandHopFromHotspots();
        tagLandCorridorsFromRifts();
        backfillCorridorKinds();
    }
    else if (stage === "postRivers") {
        tagRiverChainsPostRivers();
        backfillCorridorKinds();
    }
}
function backfillCorridorKinds() {
    // Sea lanes: classify as coastal when adjacent to shallow water; else ocean
    for (const key of StoryTags.corridorSeaLane) {
        if (!StoryTags.corridorKind.has(key)) {
            StoryTags.corridorKind.set(key, "sea");
        }
        if (!StoryTags.corridorStyle.has(key)) {
            const [sx, sy] = key.split(",").map(Number);
            const style = GameplayMap.isAdjacentToShallowWater(sx, sy)
                ? "coastal"
                : "ocean";
            StoryTags.corridorStyle.set(key, style);
        }
    }
    // Island-hop lanes: archipelago style
    for (const key of StoryTags.corridorIslandHop) {
        if (!StoryTags.corridorKind.has(key)) {
            StoryTags.corridorKind.set(key, "islandHop");
        }
        if (!StoryTags.corridorStyle.has(key)) {
            StoryTags.corridorStyle.set(key, "archipelago");
        }
    }
    // Land-open corridors: default to plainsBelt style (playable open land)
    for (const key of StoryTags.corridorLandOpen) {
        if (!StoryTags.corridorKind.has(key)) {
            StoryTags.corridorKind.set(key, "land");
        }
        if (!StoryTags.corridorStyle.has(key)) {
            StoryTags.corridorStyle.set(key, "plainsBelt");
        }
    }
    // River-chain corridors: riverChain style
    for (const key of StoryTags.corridorRiverChain) {
        if (!StoryTags.corridorKind.has(key)) {
            StoryTags.corridorKind.set(key, "river");
        }
        if (!StoryTags.corridorStyle.has(key)) {
            StoryTags.corridorStyle.set(key, "riverChain");
        }
    }
    // Dev: style distribution summary (counts by kind:style)
    try {
        const styleCounts = {};
        for (const [k, kind] of StoryTags.corridorKind) {
            const st = StoryTags.corridorStyle.get(k) || "unknown";
            const bucket = `${kind}:${st}`;
            styleCounts[bucket] = (styleCounts[bucket] || 0) + 1;
        }
        devLogIf &&
            devLogIf("LOG_STORY_TAGS", `[Corridors] Style distribution: ${JSON.stringify(styleCounts)}`);
    }
    catch (_) {
        /* safe log */
    }
}
export default {
    storyTagStrategicCorridors,
};
```

## File: mod/maps/story/tagging.js
```javascript
// @ts-nocheck
/**
 * Climate Story — Tagging functions
 *
 * This module generates lightweight, sparse tags (“StoryTags”) that imprint
 * narrative motifs onto the map without heavy simulation. Tags are consumed by
 * other layers (coast/island shaping, rainfall refinement, biome/feature nudges).
 *
 * Exports:
 *  - storyTagHotspotTrails(ctx?): Tag deep‑ocean hotspot polylines.
 *  - storyTagRiftValleys(ctx?): Tag inland rift centerlines and shoulder tiles.
 *
 * Notes:
 *  - Tags are stored in StoryTags as "x,y" string keys for simplicity.
 *  - ctx is optional; functions will query GameplayMap directly if omitted.
 *  - All tunables are conservative; guardrails are preserved by consumers.
 *  - Climate tuning (baseline and refinement) is configured via map_config and consumed in the climate layers; this module only tags, while consumers preserve clamps.
 */
import { StoryTags } from "./tags.js";
import { STORY_TUNABLES, STORY_ENABLE_SWATCHES, STORY_ENABLE_PALEO, MARGINS_CFG, WORLDMODEL_DIRECTIONALITY, } from "../config/tunables.js";
import { inBounds, storyKey, isAdjacentToLand } from "../core/utils.js";
import { WorldModel } from "../world/model.js";
/**
 * Tag deep‑ocean hotspot trails as sparse polylines.
 * Trails are later used to bias offshore island placement and microclimates.
 *
 * Rules:
 *  - Keep trails far from land (minDistFromLand).
 *  - Enforce minimum separation between different trails.
 *  - March a fixed number of steps with occasional gentle bends.
 *
 * @param {object} [ctx] - Optional context (unused; present for future parity).
 * @returns {{ trails:number, points:number }} summary counts
 */
export function storyTagHotspotTrails(ctx) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const baseHot = STORY_TUNABLES.hotspot;
    const areaHot = Math.max(1, width * height);
    const sqrtHot = Math.min(2.0, Math.max(0.6, Math.sqrt(areaHot / 10000)));
    const maxTrails = Math.max(1, Math.round(baseHot.maxTrails * (0.9 + 0.6 * sqrtHot)));
    const steps = Math.round(baseHot.steps * (0.9 + 0.4 * sqrtHot));
    const stepLen = baseHot.stepLen;
    const minDistFromLand = baseHot.minDistFromLand;
    const minTrailSeparation = baseHot.minTrailSeparation;
    // Helper: ensure a candidate is far enough from any previously tagged hotspot point
    function farFromExisting(x, y) {
        for (const key of StoryTags.hotspot) {
            const [sx, sy] = key.split(",").map(Number);
            const d = Math.abs(sx - x) + Math.abs(sy - y); // Manhattan is cheap/sufficient
            if (d < minTrailSeparation)
                return false;
        }
        return true;
    }
    let trailsMade = 0;
    let totalPoints = 0;
    let attempts = 0;
    while (trailsMade < maxTrails && attempts < 200) {
        attempts++;
        const sx = TerrainBuilder.getRandomNumber(width, "HotspotSeedX");
        const sy = TerrainBuilder.getRandomNumber(height, "HotspotSeedY");
        if (!inBounds(sx, sy))
            continue;
        if (!GameplayMap.isWater(sx, sy))
            continue;
        if (isAdjacentToLand(sx, sy, minDistFromLand))
            continue;
        if (!farFromExisting(sx, sy))
            continue;
        // Choose one of 8 compass directions; we’ll allow small bends as we march.
        const dirs = [
            [1, 0],
            [1, 1],
            [0, 1],
            [-1, 1],
            [-1, 0],
            [-1, -1],
            [0, -1],
            [1, -1],
        ];
        let dIndex = TerrainBuilder.getRandomNumber(dirs.length, "HotspotDir");
        let [dx, dy] = dirs[dIndex];
        let x = sx;
        let y = sy;
        let taggedThisTrail = 0;
        for (let s = 0; s < steps; s++) {
            x += dx * stepLen;
            y += dy * stepLen;
            if (!inBounds(x, y))
                break;
            if (!GameplayMap.isWater(x, y))
                continue;
            if (isAdjacentToLand(x, y, minDistFromLand))
                continue;
            StoryTags.hotspot.add(storyKey(x, y));
            taggedThisTrail++;
            totalPoints++;
            // Gentle bend with small probability (creates subtle arcs)
            if (TerrainBuilder.getRandomNumber(5, "HotspotBend") === 0) {
                dIndex =
                    (dIndex +
                        (TerrainBuilder.getRandomNumber(3, "HotspotTurn") - 1) +
                        dirs.length) %
                        dirs.length;
                [dx, dy] = dirs[dIndex];
            }
        }
        if (taggedThisTrail > 0) {
            trailsMade++;
        }
    }
    return { trails: trailsMade, points: totalPoints };
}
/**
 * Tag inland rift valleys using WorldModel.riftPotential where available.
 * Fallback: legacy random-marching rifts when WorldModel is disabled.
 *
 * @param {object} [ctx]
 * @returns {{ rifts:number, lineTiles:number, shoulderTiles:number }}
 */
export function storyTagRiftValleys(ctx) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const baseRift = STORY_TUNABLES.rift;
    const areaRift = Math.max(1, width * height);
    const sqrtRift = Math.min(2.0, Math.max(0.6, Math.sqrt(areaRift / 10000)));
    const maxRiftsPerMap = Math.max(1, Math.round(baseRift.maxRiftsPerMap * (0.8 + 0.6 * sqrtRift)));
    const lineSteps = Math.round(baseRift.lineSteps * (0.9 + 0.4 * sqrtRift));
    const stepLen = Math.max(1, baseRift.stepLen | 0);
    const shoulderWidth = baseRift.shoulderWidth + (sqrtRift > 1.5 ? 1 : 0);
    const useWM = !!(WorldModel?.isEnabled?.() &&
        WorldModel.riftPotential &&
        WorldModel.boundaryType &&
        WorldModel.boundaryCloseness);
    const idx = (x, y) => y * width + x;
    const inb = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
    const latDegAt = (y) => Math.abs(GameplayMap.getPlotLatitude(0, y));
    if (useWM) {
        const RP = WorldModel.riftPotential;
        const BT = WorldModel.boundaryType; // 1=convergent, 2=divergent
        const BC = WorldModel.boundaryCloseness;
        // 1) Find sparse seeds: local maxima on divergent boundaries over land
        const seeds = [];
        let thr = 192;
        let attempts = 0;
        while (attempts++ < 6) {
            seeds.length = 0;
            for (let y = 1; y < height - 1; y++) {
                if (latDegAt(y) > 70)
                    continue;
                for (let x = 1; x < width - 1; x++) {
                    if (GameplayMap.isWater(x, y))
                        continue;
                    const i = idx(x, y);
                    if (BT[i] !== 2 || BC[i] <= 32 || RP[i] < thr)
                        continue;
                    // Local-maximum test
                    const v = RP[i];
                    let isPeak = true;
                    for (let dy = -1; dy <= 1 && isPeak; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0)
                                continue;
                            if (RP[idx(x + dx, y + dy)] > v) {
                                isPeak = false;
                                break;
                            }
                        }
                    }
                    if (isPeak)
                        seeds.push({ x, y, v });
                }
            }
            if (seeds.length >= maxRiftsPerMap * 2 || thr <= 112)
                break;
            thr -= 16;
        }
        seeds.sort((a, b) => b.v - a.v);
        // Space seeds out by Manhattan distance
        const chosen = [];
        const minSeedSep = Math.round(sqrtRift > 1.5 ? 18 : 14);
        for (const s of seeds) {
            if (chosen.length >= maxRiftsPerMap)
                break;
            const farEnough = chosen.every((c) => Math.abs(c.x - s.x) + Math.abs(c.y - s.y) >= minSeedSep);
            if (farEnough)
                chosen.push(s);
        }
        let riftsMade = 0;
        let lineCount = 0;
        let shoulderCount = 0;
        function tagShoulders(x, y, sdx, sdy) {
            for (let off = 1; off <= shoulderWidth; off++) {
                const px = x + -sdy * off;
                const py = y + sdx * off;
                const qx = x + sdy * off;
                const qy = y + -sdx * off;
                if (inb(px, py) && !GameplayMap.isWater(px, py)) {
                    const pk = storyKey(px, py);
                    if (!StoryTags.riftShoulder.has(pk)) {
                        StoryTags.riftShoulder.add(pk);
                        shoulderCount++;
                    }
                }
                if (inb(qx, qy) && !GameplayMap.isWater(qx, qy)) {
                    const qk = storyKey(qx, qy);
                    if (!StoryTags.riftShoulder.has(qk)) {
                        StoryTags.riftShoulder.add(qk);
                        shoulderCount++;
                    }
                }
            }
        }
        for (const seed of chosen) {
            let x = seed.x, y = seed.y;
            if (latDegAt(y) > 70)
                continue;
            // Initialize step direction toward highest neighboring RP
            let sdx = 1, sdy = 0;
            {
                let best = -1, bdx = 1, bdy = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0)
                            continue;
                        const nx = x + dx, ny = y + dy;
                        if (!inb(nx, ny) || GameplayMap.isWater(nx, ny))
                            continue;
                        const p = RP[idx(nx, ny)];
                        if (p > best) {
                            best = p;
                            bdx = dx;
                            bdy = dy;
                        }
                    }
                }
                sdx = bdx;
                sdy = bdy;
            }
            let placedAny = false;
            for (let s = 0; s < lineSteps; s++) {
                if (!inb(x, y) || GameplayMap.isWater(x, y) || latDegAt(y) > 70)
                    break;
                const k = storyKey(x, y);
                if (!StoryTags.riftLine.has(k)) {
                    StoryTags.riftLine.add(k);
                    lineCount++;
                }
                placedAny = true;
                tagShoulders(x, y, sdx, sdy);
                // Helper: directionality bias toward plateAxisDeg (cohesion × riftsFollowPlates)
                function stepDirBias(tx, ty) {
                    try {
                        const DIR = WORLDMODEL_DIRECTIONALITY || {};
                        const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                        const follow = Math.max(0, Math.min(1, DIR?.interplay?.riftsFollowPlates ?? 0)) * coh;
                        if (follow <= 0)
                            return 0;
                        const deg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
                        const rad = (deg * Math.PI) / 180;
                        const ax = Math.cos(rad);
                        const ay = Math.sin(rad);
                        const vlen = Math.max(1, Math.hypot(tx, ty));
                        const vx = tx / vlen;
                        const vy = ty / vlen;
                        const dot = ax * vx + ay * vy; // -1..1
                        // Scale to a small, safe bonus
                        return Math.round(10 * follow * dot);
                    }
                    catch {
                        return 0;
                    }
                }
                // Choose next step by RP gradient with straightness + directionality preference
                let bestScore = -1, ndx = sdx, ndy = sdy, nx = x, ny = y;
                for (let ty = -1; ty <= 1; ty++) {
                    for (let tx = -1; tx <= 1; tx++) {
                        if (tx === 0 && ty === 0)
                            continue;
                        const cx = x + tx * stepLen, cy = y + ty * stepLen;
                        if (!inb(cx, cy) || GameplayMap.isWater(cx, cy))
                            continue;
                        const p = RP[idx(cx, cy)];
                        const align = tx === sdx && ty === sdy
                            ? 16
                            : tx === -sdx && ty === -sdy
                                ? -12
                                : 0;
                        const score = p + align + stepDirBias(tx, ty);
                        if (score > bestScore) {
                            bestScore = score;
                            ndx = tx;
                            ndy = ty;
                            nx = cx;
                            ny = cy;
                        }
                    }
                }
                // Stop if leaving divergent boundary band or very weak RP
                const ii = inb(nx, ny) ? idx(nx, ny) : -1;
                if (ii < 0 || BT[ii] !== 2 || BC[ii] <= 16 || RP[ii] < 64)
                    break;
                x = nx;
                y = ny;
                sdx = ndx;
                sdy = ndy;
            }
            if (placedAny)
                riftsMade++;
            if (riftsMade >= maxRiftsPerMap)
                break;
        }
        return {
            rifts: riftsMade,
            lineTiles: lineCount,
            shoulderTiles: shoulderCount,
        };
    }
    // Legacy fallback: original random marching implementation
    {
        // Two families of headings to get “continental-scale” lines without zig-zag
        const dirsNS = [
            [0, 1],
            [0, -1],
            [1, 1],
            [-1, -1],
        ];
        const dirsEW = [
            [1, 0],
            [-1, 0],
            [1, 1],
            [-1, -1],
        ];
        let riftsMade = 0;
        let lineCount = 0;
        let shoulderCount = 0;
        let tries = 0;
        while (riftsMade < maxRiftsPerMap && tries < 300) {
            tries++;
            const sx = TerrainBuilder.getRandomNumber(width, "RiftSeedX");
            const sy = TerrainBuilder.getRandomNumber(height, "RiftSeedY");
            if (!inBounds(sx, sy))
                continue;
            if (GameplayMap.isWater(sx, sy))
                continue;
            const plat = Math.abs(GameplayMap.getPlotLatitude(sx, sy));
            if (plat > 70)
                continue; // avoid extreme polar artifacts
            const elev = GameplayMap.getElevation(sx, sy);
            if (elev > 500)
                continue; // seed away from high mountains
            // Pick axis family and a particular direction
            const useNS = TerrainBuilder.getRandomNumber(2, "RiftAxis") === 0;
            let dir = useNS
                ? dirsNS[TerrainBuilder.getRandomNumber(dirsNS.length, "RiftDirNS")]
                : dirsEW[TerrainBuilder.getRandomNumber(dirsEW.length, "RiftDirEW")];
            let [dx, dy] = dir;
            let x = sx;
            let y = sy;
            let placedAny = false;
            for (let s = 0; s < lineSteps; s++) {
                x += dx * stepLen;
                y += dy * stepLen;
                if (!inBounds(x, y))
                    break;
                if (GameplayMap.isWater(x, y))
                    continue;
                const k = storyKey(x, y);
                if (!StoryTags.riftLine.has(k)) {
                    StoryTags.riftLine.add(k);
                    lineCount++;
                }
                placedAny = true;
                // Tag shoulder tiles on both sides (perpendicular offset)
                for (let off = 1; off <= shoulderWidth; off++) {
                    const px = x + -dy * off;
                    const py = y + dx * off;
                    const qx = x + dy * off;
                    const qy = y + -dx * off;
                    if (inBounds(px, py) && !GameplayMap.isWater(px, py)) {
                        const pk = storyKey(px, py);
                        if (!StoryTags.riftShoulder.has(pk)) {
                            StoryTags.riftShoulder.add(pk);
                            shoulderCount++;
                        }
                    }
                    if (inBounds(qx, qy) && !GameplayMap.isWater(qx, qy)) {
                        const qk = storyKey(qx, qy);
                        if (!StoryTags.riftShoulder.has(qk)) {
                            StoryTags.riftShoulder.add(qk);
                            shoulderCount++;
                        }
                    }
                }
                // Occasional, small bend to avoid ruler-straight lines
                if (TerrainBuilder.getRandomNumber(6, "RiftBend") === 0) {
                    if (useNS) {
                        dir =
                            dirsNS[TerrainBuilder.getRandomNumber(dirsNS.length, "RiftDirNS2")];
                    }
                    else {
                        dir =
                            dirsEW[TerrainBuilder.getRandomNumber(dirsEW.length, "RiftDirEW2")];
                    }
                    [dx, dy] = dir;
                }
            }
            if (placedAny) {
                riftsMade++;
            }
        }
        return {
            rifts: riftsMade,
            lineTiles: lineCount,
            shoulderTiles: shoulderCount,
        };
    }
}
export const OrogenyCache = {
    belts: new Set(),
    windward: new Set(),
    lee: new Set(),
};
/**
 * Tag Orogeny belts using WorldModel uplift/tectonic stress near convergent boundaries.
 * Fallback: legacy elevation-density heuristic when WorldModel is disabled.
 *
 * Returns simple counts; results stored in OrogenyCache for consumers.
 */
export function storyTagOrogenyBelts(ctx) {
    // Clear previous cache
    OrogenyCache.belts.clear();
    OrogenyCache.windward.clear();
    OrogenyCache.lee.clear();
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const area = Math.max(1, width * height);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    const cfg = STORY_TUNABLES?.orogeny || {};
    const baseRadius = (cfg.radius ?? 2) | 0;
    const radius = baseRadius + (sqrtScale > 1.5 ? 1 : 0);
    const minLenSoft = Math.max(10, Math.round((cfg.beltMinLength ?? 30) * (0.9 + 0.4 * sqrtScale)));
    const useWM = !!(WorldModel?.isEnabled?.() &&
        WorldModel.upliftPotential &&
        WorldModel.tectonicStress &&
        WorldModel.boundaryType &&
        WorldModel.boundaryCloseness);
    if (useWM) {
        const U = WorldModel.upliftPotential;
        const S = WorldModel.tectonicStress;
        const BT = WorldModel.boundaryType; // 1=convergent
        const BC = WorldModel.boundaryCloseness;
        // Pass 1: seed belts from convergent boundaries with high uplift/stress combo
        // Combined metric: 0.7*U + 0.3*S; threshold search to keep belts sparse
        let thr = 180;
        let attempts = 0;
        while (attempts++ < 5) {
            OrogenyCache.belts.clear();
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    if (GameplayMap.isWater(x, y))
                        continue;
                    const i = y * width + x;
                    if (BT[i] !== 1 || BC[i] < 48)
                        continue;
                    const metric = Math.round(0.7 * U[i] + 0.3 * S[i]);
                    if (metric >= thr) {
                        // Light neighborhood density check to avoid salt-and-pepper
                        let dense = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0)
                                    continue;
                                const j = (y + dy) * width + (x + dx);
                                if (j >= 0 && j < width * height) {
                                    const m2 = Math.round(0.7 * U[j] + 0.3 * S[j]);
                                    if (m2 >= thr)
                                        dense++;
                                }
                            }
                        }
                        if (dense >= 2) {
                            OrogenyCache.belts.add(`${x},${y}`);
                        }
                    }
                }
            }
            if (OrogenyCache.belts.size >= minLenSoft || thr <= 128)
                break;
            thr -= 12;
        }
        // Soft reject trivial belts
        if (OrogenyCache.belts.size < minLenSoft) {
            return { belts: 0, windward: 0, lee: 0 };
        }
        // Prevailing wind step using WorldModel winds (fallback to zonal if unavailable)
        function windStepXY(x, y) {
            try {
                if (WorldModel?.windU && WorldModel?.windV) {
                    const width = GameplayMap.getGridWidth();
                    const i = y * width + x;
                    const u = WorldModel.windU[i] | 0;
                    const v = WorldModel.windV[i] | 0;
                    if (Math.abs(u) >= Math.abs(v)) {
                        return { dx: u === 0 ? 0 : u > 0 ? 1 : -1, dy: 0 };
                    }
                    else {
                        return { dx: 0, dy: v === 0 ? 0 : v > 0 ? 1 : -1 };
                    }
                }
            }
            catch {
                /* fall back to zonal below */
            }
            const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
            return { dx: lat < 30 || lat >= 60 ? -1 : 1, dy: 0 };
        }
        // Pass 2: expand flanks on both sides of each belt tile
        for (const key of OrogenyCache.belts) {
            const [sx, sy] = key.split(",").map(Number);
            const { dx, dy } = windStepXY(sx, sy);
            const upwindX = -dx, upwindY = -dy;
            const downX = dx, downY = dy;
            for (let r = 1; r <= radius; r++) {
                const wx = sx + upwindX * r, wy = sy + upwindY * r;
                const lx = sx + downX * r, ly = sy + downY * r;
                if (inBounds(wx, wy) && !GameplayMap.isWater(wx, wy)) {
                    OrogenyCache.windward.add(storyKey(wx, wy));
                }
                if (inBounds(lx, ly) && !GameplayMap.isWater(lx, ly)) {
                    OrogenyCache.lee.add(storyKey(lx, ly));
                }
            }
        }
        return {
            belts: OrogenyCache.belts.size,
            windward: OrogenyCache.windward.size,
            lee: OrogenyCache.lee.size,
        };
    }
    // Legacy fallback: elevation-density heuristic
    {
        // Helper: elevation predicate (prefer GameplayMap.isMountain when exposed)
        function isHighElev(x, y) {
            if (!inBounds(x, y))
                return false;
            if (GameplayMap.isMountain && GameplayMap.isMountain(x, y))
                return true;
            return GameplayMap.getElevation(x, y) >= 500;
        }
        // Pass 1: collect belt candidates by local mountain density
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!isHighElev(x, y))
                    continue;
                // Count high-elevation neighbors (8-neighborhood)
                let hi = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0)
                            continue;
                        const nx = x + dx, ny = y + dy;
                        if (isHighElev(nx, ny))
                            hi++;
                    }
                }
                if (hi >= 2) {
                    OrogenyCache.belts.add(storyKey(x, y));
                }
            }
        }
        // Soft reject trivial belts (very small mountain presence)
        if (OrogenyCache.belts.size < minLenSoft) {
            return { belts: 0, windward: 0, lee: 0 };
        }
        // Prevailing wind vector by latitude (zonal)
        function windDX(x, y) {
            const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
            return lat < 30 || lat >= 60 ? -1 : 1; // E→W else W→E
        }
        // Pass 2: expand flanks on both sides of each belt tile
        for (const key of OrogenyCache.belts) {
            const [x, y] = key.split(",").map(Number);
            const dx = windDX(x, y);
            const dy = 0;
            const upwindX = -dx, upwindY = -dy;
            const downX = dx, downY = dy;
            for (let r = 1; r <= radius; r++) {
                const wx = x + upwindX * r, wy = y + upwindY * r;
                const lx = x + downX * r, ly = y + downY * r;
                if (inBounds(wx, wy) && !GameplayMap.isWater(wx, wy)) {
                    OrogenyCache.windward.add(storyKey(wx, wy));
                }
                if (inBounds(lx, ly) && !GameplayMap.isWater(lx, ly)) {
                    OrogenyCache.lee.add(storyKey(lx, ly));
                }
            }
        }
        return {
            belts: OrogenyCache.belts.size,
            windward: OrogenyCache.windward.size,
            lee: OrogenyCache.lee.size,
        };
    }
}
/**
 * Tag ACTIVE_MARGIN and PASSIVE_SHELF coast segments.
 * Heuristic (lane-safe, size-aware):
 * - Scan rows to collect contiguous coastal-land segments (cheap linear pass).
 * - Choose sparse, long segments for margins using target fractions and a minimum segment length.
 * - Targets scale gently with map size (sqrt(area/base)).
 * Notes
 * - Works without continent IDs; segments stay local and sparse to avoid noisy toggling.
 * - Consumers (coastlines/islands/features) must preserve minimum sea-lane width.
 */
export function storyTagContinentalMargins() {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    // Size-aware fractions (configurable with safe defaults)
    const area = Math.max(1, width * height);
    const sqrt = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    const mcfg = MARGINS_CFG || {};
    const baseActiveFrac = Number.isFinite(mcfg.activeFraction)
        ? mcfg.activeFraction
        : 0.25;
    const basePassiveFrac = Number.isFinite(mcfg.passiveFraction)
        ? mcfg.passiveFraction
        : 0.25;
    const activeFrac = Math.min(0.35, baseActiveFrac + 0.05 * (sqrt - 1));
    const passiveFrac = Math.min(0.35, basePassiveFrac + 0.05 * (sqrt - 1));
    const baseMinSeg = Number.isFinite(mcfg.minSegmentLength)
        ? mcfg.minSegmentLength
        : 12;
    const minSegLen = Math.max(10, Math.round(baseMinSeg * (0.9 + 0.4 * sqrt))); // size-aware minimum
    // First pass: count total coastal land to derive quotas
    let totalCoast = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (GameplayMap.isCoastalLand(x, y))
                totalCoast++;
        }
    }
    const targetActive = Math.floor(totalCoast * activeFrac);
    const targetPassive = Math.floor(totalCoast * passiveFrac);
    let markedActive = 0;
    let markedPassive = 0;
    // Helper to mark a segment safely
    function markSegment(y, x0, x1, active) {
        for (let x = x0; x <= x1; x++) {
            const k = `${x},${y}`;
            if (active) {
                if (markedActive >= targetActive)
                    break;
                if (!StoryTags.activeMargin.has(k) &&
                    GameplayMap.isCoastalLand(x, y)) {
                    StoryTags.activeMargin.add(k);
                    markedActive++;
                }
            }
            else {
                if (markedPassive >= targetPassive)
                    break;
                if (!StoryTags.passiveShelf.has(k) &&
                    GameplayMap.isCoastalLand(x, y)) {
                    StoryTags.passiveShelf.add(k);
                    markedPassive++;
                }
            }
        }
    }
    // Row sweep: build contiguous coastal-land segments and select some
    // Alternate selections to avoid clustering too many active or passive in a row.
    let preferActive = true;
    for (let y = 1; y < height - 1; y++) {
        let x = 1;
        while (x < width - 1) {
            // Find start of a coastal segment
            while (x < width - 1 && !GameplayMap.isCoastalLand(x, y))
                x++;
            if (x >= width - 1)
                break;
            const start = x;
            while (x < width - 1 && GameplayMap.isCoastalLand(x, y))
                x++;
            const end = x - 1;
            const segLen = end - start + 1;
            if (segLen >= minSegLen) {
                // Coin flip with bias toward the currently preferred type
                const roll = TerrainBuilder.getRandomNumber(100, "MarginSelect");
                const pickActive = (preferActive && roll < 60) || (!preferActive && roll < 40);
                if (pickActive && markedActive < targetActive) {
                    markSegment(y, start, end, true);
                }
                else if (markedPassive < targetPassive) {
                    markSegment(y, start, end, false);
                }
                // Alternate preference to reduce long runs of the same type
                preferActive = !preferActive;
            }
        }
        // Reset scanning x for next row
        x = 1;
    }
    return {
        active: markedActive,
        passive: markedPassive,
        targetActive,
        targetPassive,
        minSegLen,
    };
}
// -------------------------------- Climate Swatches --------------------------------
/**
 * storyTagClimateSwatches — Paint one guaranteed macro swatch with soft edges.
 * - Selects one swatch type (weighted) and applies rainfall deltas with gentle falloff.
 * - Uses sqrt(area/base) to scale width/length modestly on large maps.
 * - Keeps all adjustments clamped to [0, 200] and local (single O(W×H) pass).
 *
 * Swatch types (see STORY_TUNABLES.swatches.types):
 *  - macroDesertBelt: subtract rainfall around ~20° lat with soft bleed.
 *  - equatorialRainbelt: add rainfall around 0° lat with generous bleed.
 *  - rainforestArchipelago: add rainfall near warm coasts/islands (tropics).
 *  - mountainForests: add on orogeny windward, subtract a touch on lee.
 *  - greatPlains: lowland mid-lat dry bias (broad plains feel).
 */
export function storyTagClimateSwatches() {
    if (!STORY_ENABLE_SWATCHES)
        return { applied: false, kind: "disabled" };
    const cfg = STORY_TUNABLES?.swatches;
    if (!cfg)
        return { applied: false, kind: "missing-config" };
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const area = Math.max(1, width * height);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    // Helper clamp
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    // Choose one type by weight
    const types = cfg.types || {};
    let entries = Object.keys(types).map((k) => ({
        key: k,
        w: Math.max(0, types[k].weight | 0),
    }));
    // Directionality-aligned swatch weighting (cohesive, conservative)
    try {
        const DIR = WORLDMODEL_DIRECTIONALITY || {};
        const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
        if (COH > 0) {
            const windDeg = (DIR?.primaryAxes?.windBiasDeg ?? 0) | 0;
            const plateDeg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
            const wRad = (windDeg * Math.PI) / 180;
            const pRad = (plateDeg * Math.PI) / 180;
            const alignZonal = Math.abs(Math.cos(wRad)); // alignment with E–W
            const alignPlate = Math.abs(Math.cos(pRad)); // coarse proxy
            entries = entries.map((e) => {
                let mul = 1;
                if (e.key === "macroDesertBelt") {
                    mul *= 1 + 0.4 * COH * alignZonal;
                }
                else if (e.key === "equatorialRainbelt") {
                    mul *= 1 + 0.25 * COH * alignZonal;
                }
                else if (e.key === "mountainForests") {
                    mul *= 1 + 0.2 * COH * alignPlate;
                }
                else if (e.key === "greatPlains") {
                    mul *= 1 + 0.2 * COH * alignZonal;
                }
                return { key: e.key, w: Math.max(0, Math.round(e.w * mul)) };
            });
        }
    }
    catch (_) {
        /* keep default weights on any error */
    }
    const totalW = entries.reduce((s, e) => s + e.w, 0) || 1;
    let roll = TerrainBuilder.getRandomNumber(totalW, "SwatchType");
    let chosenKey = entries[0]?.key || "macroDesertBelt";
    for (const e of entries) {
        if (roll < e.w) {
            chosenKey = e.key;
            break;
        }
        roll -= e.w;
    }
    const kind = chosenKey;
    const t = types[chosenKey] || {};
    // Scaling knobs
    const widthMul = 1 + (cfg.sizeScaling?.widthMulSqrt || 0) * (sqrtScale - 1);
    const lengthMul = 1 + (cfg.sizeScaling?.lengthMulSqrt || 0) * (sqrtScale - 1);
    // Per-kind helpers
    function latBandCenter() {
        return t.latitudeCenterDeg ?? 0;
    }
    function halfWidthDeg() {
        return Math.max(4, Math.round((t.halfWidthDeg ?? 10) * widthMul));
    }
    function degAt(y) {
        return Math.abs(GameplayMap.getPlotLatitude(0, y));
    }
    function falloff(v, r) {
        return Math.max(0, 1 - v / Math.max(1, r));
    } // linear falloff 0..1
    let applied = 0;
    // Pass over map once; apply deltas per-kind with soft edges
    for (let y = 0; y < height; y++) {
        const latDeg = degAt(y);
        for (let x = 0; x < width; x++) {
            if (GameplayMap.isWater(x, y))
                continue;
            let rf = GameplayMap.getRainfall(x, y);
            const elev = GameplayMap.getElevation(x, y);
            if (kind === "macroDesertBelt") {
                // Center at ~20°, subtract with falloff across halfWidthDeg and add tiny lee dryness
                const center = latBandCenter(); // ~20
                const hw = halfWidthDeg(); // ~12 → widened with size
                const dDeg = Math.abs(latDeg - center);
                const f = falloff(dDeg, hw);
                if (f > 0) {
                    const base = t.drynessDelta ?? 28;
                    const bleed = t.bleedRadius ?? 2; // latitude-driven only; kept small
                    // Lowlands dry more
                    const lowlandBonus = elev < 250 ? 4 : 0;
                    const delta = Math.round((base + lowlandBonus) * f);
                    rf = clamp(rf - delta, 0, 200);
                    applied++;
                }
            }
            else if (kind === "equatorialRainbelt") {
                const center = latBandCenter(); // 0
                const hw = halfWidthDeg(); // ~10 → wider on large
                const dDeg = Math.abs(latDeg - center);
                const f = falloff(dDeg, hw);
                if (f > 0) {
                    const base = t.wetnessDelta ?? 24;
                    // Extra near coast
                    let coastBoost = 0;
                    if (GameplayMap.isCoastalLand(x, y))
                        coastBoost += 6;
                    if (GameplayMap.isAdjacentToShallowWater(x, y))
                        coastBoost += 4;
                    const delta = Math.round((base + coastBoost) * f);
                    rf = clamp(rf + delta, 0, 200);
                    applied++;
                }
            }
            else if (kind === "rainforestArchipelago") {
                // Tropics-only; require near coast or island-y zones
                const fTropics = latDeg < 23 ? 1 : latDeg < 30 ? 0.5 : 0;
                if (fTropics > 0) {
                    let islandy = 0;
                    if (GameplayMap.isCoastalLand(x, y))
                        islandy += 1;
                    if (GameplayMap.isAdjacentToShallowWater(x, y))
                        islandy += 0.5;
                    if (islandy > 0) {
                        const base = t.wetnessDelta ?? 18;
                        const delta = Math.round(base * fTropics * islandy);
                        rf = clamp(rf + delta, 0, 200);
                        applied++;
                    }
                }
            }
            else if (kind === "mountainForests") {
                // Couple to orogeny windward if available; small lee penalty
                const inWindward = !!(typeof OrogenyCache === "object" &&
                    OrogenyCache.windward?.has?.(`${x},${y}`));
                const inLee = !!(typeof OrogenyCache === "object" &&
                    OrogenyCache.lee?.has?.(`${x},${y}`));
                if (inWindward) {
                    const base = t.windwardBonus ?? 6;
                    const delta = base + (elev < 300 ? 2 : 0);
                    rf = clamp(rf + delta, 0, 200);
                    applied++;
                }
                else if (inLee) {
                    const base = t.leePenalty ?? 2;
                    rf = clamp(rf - base, 0, 200);
                    applied++;
                }
            }
            else if (kind === "greatPlains") {
                // Mid-lat plains; prefer lowlands
                const center = t.latitudeCenterDeg ?? 45;
                const hw = Math.max(6, Math.round((t.halfWidthDeg ?? 8) * widthMul));
                const dDeg = Math.abs(latDeg - center);
                const f = falloff(dDeg, hw);
                if (f > 0) {
                    const dry = t.dryDelta ?? 12;
                    if (elev <= (t.lowlandMaxElevation ?? 300)) {
                        const delta = Math.round(dry * f);
                        rf = clamp(rf - delta, 0, 200);
                        applied++;
                    }
                }
            }
            if (applied > 0) {
                TerrainBuilder.setRainfall(x, y, rf);
            }
        }
    }
    // Monsoon tweak (directionality-aligned, coastal onshore bias; conservative)
    try {
        const DIR = WORLDMODEL_DIRECTIONALITY || {};
        const monsoonBias = Math.max(0, Math.min(1, DIR?.hemispheres?.monsoonBias ?? 0));
        const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
        const eqBand = Math.max(0, (DIR?.hemispheres?.equatorBandDeg ?? 12) | 0);
        if (monsoonBias > 0 &&
            COH > 0 &&
            WorldModel?.isEnabled?.() &&
            WorldModel.windU &&
            WorldModel.windV) {
            const width = GameplayMap.getGridWidth();
            const height = GameplayMap.getGridHeight();
            const baseDelta = Math.max(1, Math.round(3 * COH * monsoonBias));
            for (let y = 0; y < height; y++) {
                const lat = GameplayMap.getPlotLatitude(0, y);
                // Focus effect near equatorial/monsoon band
                if (Math.abs(lat) > eqBand + 18)
                    continue;
                for (let x = 0; x < width; x++) {
                    if (GameplayMap.isWater(x, y))
                        continue;
                    // Coastal adjacency
                    if (!GameplayMap.isCoastalLand(x, y) &&
                        !GameplayMap.isAdjacentToShallowWater(x, y))
                        continue;
                    const i = y * width + x;
                    const u = WorldModel.windU[i] | 0;
                    const v = WorldModel.windV[i] | 0;
                    // Upwind unit step from dominant component
                    let ux = 0, vy = 0;
                    if (Math.abs(u) >= Math.abs(v)) {
                        ux = u === 0 ? 0 : u > 0 ? 1 : -1;
                        vy = 0;
                    }
                    else {
                        ux = 0;
                        vy = v === 0 ? 0 : v > 0 ? 1 : -1;
                    }
                    // Upwind is opposite of wind direction
                    const upX = x - ux;
                    const upY = y - vy;
                    const dnX = x + ux;
                    const dnY = y + vy;
                    let delta = 0;
                    if (upX >= 0 &&
                        upX < width &&
                        upY >= 0 &&
                        upY < height &&
                        GameplayMap.isWater(upX, upY)) {
                        // Onshore flow -> small wet boost
                        delta = baseDelta;
                    }
                    else if (dnX >= 0 &&
                        dnX < width &&
                        dnY >= 0 &&
                        dnY < height &&
                        GameplayMap.isWater(dnX, dnY)) {
                        // Offshore flow -> tiny dry penalty
                        delta = -Math.max(1, Math.floor(baseDelta / 2));
                    }
                    if (delta !== 0) {
                        const rf0 = GameplayMap.getRainfall(x, y);
                        const rf1 = Math.max(0, Math.min(200, rf0 + delta));
                        TerrainBuilder.setRainfall(x, y, rf1);
                    }
                }
            }
        }
    }
    catch (_) {
        /* keep resilient */
    }
    let _swatchResult = { applied: applied > 0, kind, tiles: applied };
    // Opportunistically run Paleo‑Hydrology after swatch+monsoon so its overlays blend
    if (STORY_ENABLE_PALEO) {
        try {
            const paleoResult = storyTagPaleoHydrology();
            _swatchResult.paleo = paleoResult;
        }
        catch (_) {
            /* keep generation resilient */
        }
    }
    return _swatchResult;
}
// -------------------------------- Paleo‑Hydrology --------------------------------
/**
 * storyTagPaleoHydrology — elevation‑aware paleo motifs:
 *  - Deltas: slight humidity fans near river mouths (lowland, coastal).
 *  - Oxbows: a handful of lowland river‑adjacent wet pockets (no rivers added).
 *  - Fossil channels: short polylines across dry lowlands toward local basins.
 * Elevation cues:
 *  - Canyon/bed dryness on the fossil centerline (small).
 *  - Optional bluff/rim hint via minor adjustments on immediate flanks.
 * Invariants:
 *  - All rainfall ops clamped [0, 200]. No broad flood‑fills. Strict caps.
 */
export function storyTagPaleoHydrology() {
    const cfg = STORY_TUNABLES?.paleo;
    if (!cfg)
        return { deltas: 0, oxbows: 0, fossils: 0 };
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const area = Math.max(1, width * height);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    // Helpers
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const nearStartGuard = ( /*x,y*/) => true; // reserved; we don't have start positions here
    const rand = (n, lbl) => TerrainBuilder.getRandomNumber(n, lbl || "Paleo");
    let deltas = 0, oxbows = 0, fossils = 0;
    // --- Deltas (coastal river mouths) ---
    if (cfg.maxDeltas > 0) {
        for (let y = 1; y < height - 1 && deltas < cfg.maxDeltas; y++) {
            for (let x = 1; x < width - 1 && deltas < cfg.maxDeltas; x++) {
                if (!GameplayMap.isCoastalLand(x, y))
                    continue;
                // Use "river adjacency" to approximate mouths.
                if (!GameplayMap.isAdjacentToRivers(x, y, 1))
                    continue;
                // Favor lowland deltas
                if (GameplayMap.getElevation(x, y) > 300)
                    continue;
                // Landward fan (radius 1)
                const fanR = Math.max(0, cfg.deltaFanRadius | 0);
                for (let dy = -fanR; dy <= fanR; dy++) {
                    for (let dx = -fanR; dx <= fanR; dx++) {
                        const nx = x + dx, ny = y + dy;
                        if (!inBounds(nx, ny))
                            continue;
                        if (GameplayMap.isWater(nx, ny))
                            continue;
                        let rf = GameplayMap.getRainfall(nx, ny);
                        // Modest humidity bump; validated features would be added in features layer.
                        if (rand(100, "DeltaMarsh") <
                            Math.round((cfg.deltaMarshChance || 0.35) * 100)) {
                            rf = clamp(rf + 6, 0, 200);
                        }
                        else {
                            rf = clamp(rf + 3, 0, 200);
                        }
                        TerrainBuilder.setRainfall(nx, ny, rf);
                    }
                }
                deltas++;
            }
        }
    }
    // --- Oxbows (lowland meander pockets) ---
    if (cfg.maxOxbows > 0) {
        let attempts = 0;
        while (oxbows < cfg.maxOxbows && attempts < 300) {
            attempts++;
            const x = rand(width, "OxbowX");
            const y = rand(height, "OxbowY");
            if (!inBounds(x, y))
                continue;
            if (GameplayMap.isWater(x, y))
                continue;
            const elev = GameplayMap.getElevation(x, y);
            if (elev > (cfg.oxbowElevationMax ?? 280))
                continue;
            if (!GameplayMap.isAdjacentToRivers(x, y, 1))
                continue;
            if (!nearStartGuard(x, y))
                continue;
            // Small wet pocket; keep single‑tile to avoid noise.
            let rf = GameplayMap.getRainfall(x, y);
            TerrainBuilder.setRainfall(x, y, clamp(rf + 8, 0, 200));
            oxbows++;
        }
    }
    // --- Fossil channels (dryland green lines toward basins) ---
    if (cfg.maxFossilChannels > 0) {
        const baseLen = Math.max(6, cfg.fossilChannelLengthTiles | 0);
        const step = Math.max(1, cfg.fossilChannelStep | 0);
        const len = Math.round(baseLen *
            (1 + (cfg.sizeScaling?.lengthMulSqrt || 0) * (sqrtScale - 1)));
        const hum = cfg.fossilChannelHumidity | 0;
        const minDistFromRivers = Math.max(0, cfg.fossilChannelMinDistanceFromCurrentRivers | 0);
        const canyonCfg = cfg.elevationCarving || {};
        const rimW = Math.max(0, canyonCfg.rimWidth | 0);
        const canyonDryBonus = Math.max(0, canyonCfg.canyonDryBonus | 0);
        let tries = 0;
        while (fossils < cfg.maxFossilChannels && tries < 120) {
            tries++;
            // Seed in relatively dry, lowland tiles, not adjacent to rivers.
            let sx = rand(width, "FossilX");
            let sy = rand(height, "FossilY");
            if (!inBounds(sx, sy))
                continue;
            if (GameplayMap.isWater(sx, sy))
                continue;
            const startElev = GameplayMap.getElevation(sx, sy);
            if (startElev > 320)
                continue;
            if (GameplayMap.isAdjacentToRivers(sx, sy, minDistFromRivers))
                continue;
            // March toward local basins by greedily stepping to lowest neighbor every "step".
            let x = sx, y = sy;
            let used = 0;
            while (used < len) {
                // Apply fossil humidity on the centerline with small canyon dryness.
                if (inBounds(x, y) && !GameplayMap.isWater(x, y)) {
                    let rf = GameplayMap.getRainfall(x, y);
                    rf = clamp(rf + hum, 0, 200);
                    if ((canyonCfg.enableCanyonRim ?? true) &&
                        canyonDryBonus > 0) {
                        rf = clamp(rf - canyonDryBonus, 0, 200); // canyon floor is a touch drier
                    }
                    TerrainBuilder.setRainfall(x, y, rf);
                    // Optional immediate “rim” hint (very subtle; width 1).
                    if ((canyonCfg.enableCanyonRim ?? true) && rimW > 0) {
                        for (let ry = -rimW; ry <= rimW; ry++) {
                            for (let rx = -rimW; rx <= rimW; rx++) {
                                if (rx === 0 && ry === 0)
                                    continue;
                                const nx = x + rx, ny = y + ry;
                                if (!inBounds(nx, ny) ||
                                    GameplayMap.isWater(nx, ny))
                                    continue;
                                const e0 = GameplayMap.getElevation(x, y);
                                const e1 = GameplayMap.getElevation(nx, ny);
                                if (e1 > e0 + 15) {
                                    // Slight contrast; leave rf mostly intact to avoid large brush.
                                    const rfn = clamp(GameplayMap.getRainfall(nx, ny) -
                                        (cfg.bluffWetReduction ?? 0), 0, 200);
                                    TerrainBuilder.setRainfall(nx, ny, rfn);
                                }
                            }
                        }
                    }
                }
                // Step toward a local minimum
                let bestNX = x, bestNY = y, bestElev = GameplayMap.getElevation(x, y);
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0)
                            continue;
                        const nx = x + dx, ny = y + dy;
                        if (!inBounds(nx, ny) || GameplayMap.isWater(nx, ny))
                            continue;
                        const e = GameplayMap.getElevation(nx, ny);
                        if (e < bestElev) {
                            bestElev = e;
                            bestNX = nx;
                            bestNY = ny;
                        }
                    }
                }
                // If no descent, introduce a gentle lateral nudge
                if (bestNX === x && bestNY === y) {
                    const dir = rand(4, "FossilNudge");
                    if (dir === 0 && inBounds(x + step, y))
                        x += step;
                    else if (dir === 1 && inBounds(x - step, y))
                        x -= step;
                    else if (dir === 2 && inBounds(x, y + step))
                        y += step;
                    else if (dir === 3 && inBounds(x, y - step))
                        y -= step;
                }
                else {
                    x = bestNX;
                    y = bestNY;
                }
                used += step;
            }
            fossils++;
        }
    }
    return { deltas, oxbows, fossils };
}
export default {
    storyTagHotspotTrails,
    storyTagRiftValleys,
    storyTagOrogenyBelts,
    storyTagContinentalMargins,
    storyTagClimateSwatches,
    storyTagPaleoHydrology,
    OrogenyCache,
};
```

## File: mod/maps/story/tags.js
```javascript
// @ts-nocheck
/**
 * Climate Story — StoryTags
 *
 * A tiny singleton that holds sparse tag sets used to imprint narrative motifs
 * onto the map (e.g., hotspot trails, rift lines, shoulders, etc.). The object
 * itself is frozen to prevent reassignment, but the contained Sets are mutable.
 *
 * Usage:
 *   import { StoryTags, resetStoryTags } from './story/tags.js';
 *   StoryTags.hotspot.add(`${x},${y}`);
 *   resetStoryTags(); // clears all tag sets between generations
 */
/** @typedef {Set<string>} TagSet */
/**
 * StoryTags — singleton container for sparse tag sets.
 * Keys are tile-coordinate strings in the form "x,y".
 */
export const StoryTags = Object.freeze({
    /** @type {TagSet} Deep-ocean hotspot trail points */
    hotspot: new Set(),
    /** @type {TagSet} Centers of hotspot islands classified as "paradise" */
    hotspotParadise: new Set(),
    /** @type {TagSet} Centers of hotspot islands classified as "volcanic" */
    hotspotVolcanic: new Set(),
    /** @type {TagSet} Linear rift centerline tiles (inland) */
    riftLine: new Set(),
    /** @type {TagSet} Lateral shoulder tiles adjacent to rift lines */
    riftShoulder: new Set(),
    /** @type {TagSet} Active continental margin segments (trenchy/fjordy coast) */
    activeMargin: new Set(),
    /** @type {TagSet} Passive shelf segments (broad shallow shelf) */
    passiveShelf: new Set(),
    /** @type {TagSet} Naval open-water lanes (protected sea lanes) */
    corridorSeaLane: new Set(),
    /** @type {TagSet} Hotspot-based island-hop arcs (promoted trails) */
    corridorIslandHop: new Set(),
    /** @type {TagSet} Land open corridors (plains/grass bias zones) */
    corridorLandOpen: new Set(),
    /** @type {TagSet} River chain corridors (river-adjacent lowland paths) */
    corridorRiverChain: new Set(),
    /**
     * Corridor metadata — kind and style
     * - kind: high-level corridor family (e.g., "sea", "islandHop", "land", "river")
     * - style: sub-variant or motif (e.g., "ocean", "coastal", "canyon", "plateau", "flatMtn")
     * Keys match StoryTags tile keys ("x,y"). These maps are sparse like the tag sets.
     */
    /** @type {Map<string, string>} */
    corridorKind: new Map(),
    /** @type {Map<string, string>} */
    corridorStyle: new Map(),
});
/**
 * Clears all StoryTags sets. Call once per generation (or when rebuilding tags)
 * to ensure callers never operate on stale data.
 */
export function resetStoryTags() {
    StoryTags.hotspot.clear();
    StoryTags.hotspotParadise.clear();
    StoryTags.hotspotVolcanic.clear();
    StoryTags.riftLine.clear();
    StoryTags.riftShoulder.clear();
    StoryTags.activeMargin.clear();
    StoryTags.passiveShelf.clear();
    StoryTags.corridorSeaLane.clear();
    StoryTags.corridorIslandHop.clear();
    StoryTags.corridorLandOpen.clear();
    StoryTags.corridorRiverChain.clear();
    // Corridor metadata maps
    StoryTags.corridorKind.clear();
    StoryTags.corridorStyle.clear();
}
export default StoryTags;
```

## File: mod/maps/world/model.js
```javascript
// @ts-nocheck
/**
 * WorldModel — Earth Forces scaffolding (lightweight; placeholders; no consumers yet)
 *
 * Purpose
 * - Precompute global "world fields" (plates, plate boundaries, uplift/rift potentials,
 *   winds, ocean currents, mantle pressure) in a single O(W×H) pass per field with small constants.
 * - These fields are read-only for other layers (tagging, climate, coasts, corridors) to use later.
 * - Keep conservative defaults; remain fully optional via config toggle.
 *
 * Invariants
 * - Never mutate engine surfaces from here; this module only computes arrays/fields.
 * - Guard against missing engine APIs; fail gracefully with no-ops if not available.
 * - Keep complexity O(width × height) with small constants; no flood fills.
 *
 * Status
 * - Phase 0 bootstrap: placeholder but coherent fields; no consumers wired yet.
 */
import { STORY_ENABLE_WORLDMODEL, WORLDMODEL_CFG as __WORLDMODEL_CFG, WORLDMODEL_PLATES as __WORLDMODEL_PLATES, WORLDMODEL_WIND as __WORLDMODEL_WIND, WORLDMODEL_CURRENTS as __WORLDMODEL_CURRENTS, WORLDMODEL_PRESSURE as __WORLDMODEL_PRESSURE, WORLDMODEL_DIRECTIONALITY as __WORLDMODEL_DIRECTIONALITY, } from "../config/tunables.js";
const WORLDMODEL_CFG = __WORLDMODEL_CFG;
const WORLDMODEL_PLATES = __WORLDMODEL_PLATES;
const WORLDMODEL_WIND = __WORLDMODEL_WIND;
const WORLDMODEL_CURRENTS = __WORLDMODEL_CURRENTS;
const WORLDMODEL_PRESSURE = __WORLDMODEL_PRESSURE;
const WORLDMODEL_DIRECTIONALITY = __WORLDMODEL_DIRECTIONALITY;
import { devLogIf } from "../config/dev.js";
/** @typedef {"none" | "convergent" | "divergent" | "transform"} BoundaryType */
const ENUM_BOUNDARY = Object.freeze({
    none: 0,
    convergent: 1,
    divergent: 2,
    transform: 3,
});
/** Internal state holder (module singletons) */
const _state = {
    initialized: false,
    width: 0,
    height: 0,
    // Plates
    plateId: /** @type {Int16Array|null} */ (null),
    boundaryCloseness: /** @type {Uint8Array|null} */ (null), // 0..255 (higher = closer to boundary)
    boundaryType: /** @type {Uint8Array|null} */ (null), // ENUM_BOUNDARY
    tectonicStress: /** @type {Uint8Array|null} */ (null), // 0..255
    upliftPotential: /** @type {Uint8Array|null} */ (null), // 0..255
    riftPotential: /** @type {Uint8Array|null} */ (null), // 0..255
    shieldStability: /** @type {Uint8Array|null} */ (null), // 0..255 (higher = more interior/stable)
    // Winds (per tile, basic vector)
    windU: /** @type {Int8Array|null} */ (null), // -127..127
    windV: /** @type {Int8Array|null} */ (null),
    // Ocean currents (only meaningful on water tiles)
    currentU: /** @type {Int8Array|null} */ (null),
    currentV: /** @type {Int8Array|null} */ (null),
    // Mantle pressure/bumps (0..255)
    pressure: /** @type {Uint8Array|null} */ (null),
};
/**
 * Public singleton API
 */
export const WorldModel = {
    /**
     * Returns true if WorldModel is toggled on and successfully initialized for this map.
     */
    isEnabled() {
        return !!STORY_ENABLE_WORLDMODEL && !!_state.initialized;
    },
    /**
     * Initialize world fields. Safe to call multiple times; subsequent calls are no-ops.
     * Does nothing if the toggle is disabled or engine APIs are unavailable.
     */
    init() {
        if (!STORY_ENABLE_WORLDMODEL)
            return false;
        if (_state.initialized)
            return true;
        // Guard: engine-provided API
        const ok = typeof GameplayMap?.getGridWidth === "function" &&
            typeof GameplayMap?.getGridHeight === "function" &&
            typeof GameplayMap?.isWater === "function" &&
            typeof GameplayMap?.getPlotLatitude === "function";
        if (!ok) {
            devLogIf &&
                devLogIf("LOG_STORY_TAGS", "[WorldModel] Engine APIs unavailable; skipping initialization.");
            return false;
        }
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        _state.width = width | 0;
        _state.height = height | 0;
        const size = Math.max(0, width * height) | 0;
        // Allocate arrays
        _state.plateId = new Int16Array(size);
        _state.boundaryCloseness = new Uint8Array(size);
        _state.boundaryType = new Uint8Array(size);
        _state.tectonicStress = new Uint8Array(size);
        _state.upliftPotential = new Uint8Array(size);
        _state.riftPotential = new Uint8Array(size);
        _state.shieldStability = new Uint8Array(size);
        _state.windU = new Int8Array(size);
        _state.windV = new Int8Array(size);
        _state.currentU = new Int8Array(size);
        _state.currentV = new Int8Array(size);
        _state.pressure = new Uint8Array(size);
        // Compute placeholder fields (fast, coherent)
        computePlates(width, height);
        computePressure(width, height);
        computeWinds(width, height);
        computeCurrents(width, height);
        _state.initialized = true;
        devLogIf &&
            devLogIf("LOG_STORY_TAGS", "[WorldModel] Initialized fields for this map.", {
                width,
                height,
                plates: WORLDMODEL_PLATES?.count ?? 0,
            });
        return true;
    },
    /**
     * Utility to fetch typed arrays (read-only by convention).
     * Returns null if not initialized or disabled.
     */
    get plateId() {
        return _state.plateId;
    },
    get boundaryCloseness() {
        return _state.boundaryCloseness;
    },
    get boundaryType() {
        return _state.boundaryType;
    },
    get tectonicStress() {
        return _state.tectonicStress;
    },
    get upliftPotential() {
        return _state.upliftPotential;
    },
    get riftPotential() {
        return _state.riftPotential;
    },
    get shieldStability() {
        return _state.shieldStability;
    },
    get windU() {
        return _state.windU;
    },
    get windV() {
        return _state.windV;
    },
    get currentU() {
        return _state.currentU;
    },
    get currentV() {
        return _state.currentV;
    },
    get pressure() {
        return _state.pressure;
    },
};
/* ---------------------------------- helpers ---------------------------------- */
function idx(x, y, width) {
    return y * width + x;
}
/**
 * Compute plate assignment (Voronoi seeds with simple movement vectors),
 * boundary closeness (0..255), boundary type (enum), and coarse potentials.
 * - Conservative and fast: O(W×H×P) where P ≤ ~10 on Huge.
 * - Boundary closeness is higher near plate interfaces (visual mask for belts/rifts).
 */
function computePlates(width, height) {
    const count = Math.max(2, WORLDMODEL_PLATES?.count | 0 || 8);
    const seedJitter = WORLDMODEL_PLATES?.seedJitter | 0 || 2;
    const angles = Array.isArray(WORLDMODEL_PLATES?.axisAngles)
        ? WORLDMODEL_PLATES.axisAngles
        : [0, 30, -20];
    // Seed plate centers on a coarse grid with jitter for performance
    const seeds = [];
    const rows = Math.max(1, Math.floor(Math.sqrt(count)));
    const cols = Math.max(1, Math.ceil(count / rows));
    const cellW = Math.max(1, Math.floor(width / cols));
    const cellH = Math.max(1, Math.floor(height / rows));
    let placed = 0;
    for (let ry = 0; ry < rows && placed < count; ry++) {
        for (let cx = 0; cx < cols && placed < count; cx++) {
            const baseX = Math.min(width - 1, cx * cellW + Math.floor(cellW / 2));
            const baseY = Math.min(height - 1, ry * cellH + Math.floor(cellH / 2));
            const jx = (TerrainBuilder?.getRandomNumber?.(seedJitter * 2 + 1, "PlateJX") ?? 0) - seedJitter;
            const jy = (TerrainBuilder?.getRandomNumber?.(seedJitter * 2 + 1, "PlateJY") ?? 0) - seedJitter;
            const sx = clampInt(baseX + jx, 0, width - 1);
            const sy = clampInt(baseY + jy, 0, height - 1);
            // Movement vector from angle (small magnitude) with directionality bias
            const baseDeg = angles[TerrainBuilder?.getRandomNumber?.(angles.length || 1, "PlateAng") ?? 0] ?? 0;
            const DIR = WORLDMODEL_DIRECTIONALITY || {};
            const plateAxisDeg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
            const cohesion = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
            const jitterSpan = Math.max(0, (DIR?.variability?.angleJitterDeg ?? 0) | 0);
            const jitter = ((TerrainBuilder?.getRandomNumber?.(jitterSpan * 2 + 1, "PlateDirJit") ?? 0) -
                jitterSpan) *
                (DIR?.variability?.magnitudeVariance ?? 0.35);
            const angleDeg = baseDeg * (1 - cohesion) + plateAxisDeg * cohesion + jitter;
            const a = (angleDeg * Math.PI) / 180;
            const mvx = Math.cos(a);
            const mvy = Math.sin(a);
            seeds.push({ x: sx, y: sy, mvx, mvy });
            placed++;
        }
    }
    // Assign nearest/second nearest seed and compute closeness to boundary
    const closeness = _state.boundaryCloseness;
    const plateId = _state.plateId;
    const bType = _state.boundaryType;
    const stress = _state.tectonicStress;
    const uplift = _state.upliftPotential;
    const rift = _state.riftPotential;
    const shield = _state.shieldStability;
    const convMix = Math.max(0, Math.min(1, WORLDMODEL_PLATES?.convergenceMix ?? 0.5));
    const convBias = Math.round(convMix * 100);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Find nearest and second nearest seed centers (small P — OK)
            let best = Infinity, bestIdx = -1;
            let snd = Infinity, sndIdx = -1;
            for (let p = 0; p < seeds.length; p++) {
                const dx = x - seeds[p].x;
                const dy = y - seeds[p].y;
                const d2 = dx * dx + dy * dy;
                if (d2 < best) {
                    snd = best;
                    sndIdx = bestIdx;
                    best = d2;
                    bestIdx = p;
                }
                else if (d2 < snd) {
                    snd = d2;
                    sndIdx = p;
                }
            }
            const i = idx(x, y, width);
            plateId[i] = bestIdx;
            // Boundary closeness heuristic: higher near midline between nearest and second-nearest
            // Use a normalized inverse of (snd-best) gap; clamp to [0..255].
            const gap = Math.max(1, snd - best);
            let c = 1 - Math.min(1, gap / (gap + best + 1));
            // Enhance boundary band (raise to accentuate near-border)
            c = Math.pow(c, 0.65);
            closeness[i] = toByte(c);
            // Boundary type — placeholder:
            // If near boundary (closeness high), randomly choose convergent vs. divergent with convMix;
            // occasionally classify as transform.
            let bt = ENUM_BOUNDARY.none;
            if (closeness[i] > 32 && sndIdx >= 0) {
                const roll = TerrainBuilder?.getRandomNumber?.(100, "PlateBT") ?? 0;
                if (roll < Math.max(0, convBias - 5))
                    bt = ENUM_BOUNDARY.convergent;
                else if (roll < Math.min(100, convBias + 35))
                    bt = ENUM_BOUNDARY.divergent;
                else
                    bt = ENUM_BOUNDARY.transform;
            }
            bType[i] = bt;
            // Potentials (0..255): coarse, local to boundary type
            // Stress tracks boundary closeness; uplift for convergent; rift for divergent.
            const s255 = closeness[i];
            stress[i] = s255;
            uplift[i] = bt === ENUM_BOUNDARY.convergent ? s255 : s255 >> 2;
            rift[i] = bt === ENUM_BOUNDARY.divergent ? s255 : s255 >> 2;
            shield[i] = 255 - s255;
        }
    }
}
/**
 * Mantle pressure: small number of Gaussian bumps (very low frequency) + normalization.
 * Output: pressure 0..255
 */
function computePressure(width, height) {
    const size = width * height;
    const pressure = _state.pressure;
    if (!pressure)
        return;
    // Params
    const bumps = Math.max(1, WORLDMODEL_PRESSURE?.bumps | 0 || 4);
    const amp = Math.max(0.1, WORLDMODEL_PRESSURE?.amplitude ?? 0.6);
    const scl = Math.max(0.1, WORLDMODEL_PRESSURE?.scale ?? 0.4);
    const sigma = Math.max(4, Math.floor(Math.min(width, height) * scl));
    // Random bump centers
    const centers = [];
    for (let i = 0; i < bumps; i++) {
        const cx = TerrainBuilder?.getRandomNumber?.(width, "PressCX") ??
            (i * width) / bumps;
        const cy = TerrainBuilder?.getRandomNumber?.(height, "PressCY") ??
            (i * height) / bumps;
        const a = amp *
            (0.75 +
                (TerrainBuilder?.getRandomNumber?.(50, "PressA") ?? 0) / 100);
        centers.push({ x: Math.floor(cx), y: Math.floor(cy), a });
    }
    // Accumulate Gaussian bumps
    const acc = new Float32Array(size);
    const inv2s2 = 1.0 / (2 * sigma * sigma);
    let maxVal = 1e-6;
    for (let k = 0; k < centers.length; k++) {
        const { x: cx, y: cy, a } = centers[k];
        const yMin = Math.max(0, cy - sigma * 2);
        const yMax = Math.min(height - 1, cy + sigma * 2);
        const xMin = Math.max(0, cx - sigma * 2);
        const xMax = Math.min(width - 1, cx + sigma * 2);
        for (let y = yMin; y <= yMax; y++) {
            const dy = y - cy;
            for (let x = xMin; x <= xMax; x++) {
                const dx = x - cx;
                const e = Math.exp(-(dx * dx + dy * dy) * inv2s2);
                const v = a * e;
                const i = idx(x, y, width);
                acc[i] += v;
                if (acc[i] > maxVal)
                    maxVal = acc[i];
            }
        }
    }
    // Normalize 0..255
    for (let i = 0; i < size; i++) {
        pressure[i] = toByte(acc[i] / maxVal);
    }
}
/**
 * Winds: zonal baseline by latitude band + a few jet streaks; tiny V component.
 * Output: windU, windV in approximate tile-units (-127..127)
 */
function computeWinds(width, height) {
    const U = _state.windU;
    const V = _state.windV;
    if (!U || !V)
        return;
    const streaks = Math.max(0, WORLDMODEL_WIND?.jetStreaks | 0 || 3);
    const jetStrength = Math.max(0, WORLDMODEL_WIND?.jetStrength ?? 1.0);
    const variance = Math.max(0, WORLDMODEL_WIND?.variance ?? 0.6);
    // Build jet streak latitude centers (absolute degrees)
    const streakLats = [];
    for (let s = 0; s < streaks; s++) {
        const base = 30 + s * (30 / Math.max(1, streaks - 1)); // between 30 and ~60
        const jitter = (TerrainBuilder?.getRandomNumber?.(12, "JetJit") ?? 0) - 6;
        streakLats.push(Math.max(15, Math.min(75, base + jitter)));
    }
    for (let y = 0; y < height; y++) {
        const latDeg = Math.abs(GameplayMap.getPlotLatitude(0, y));
        // Zonal baseline (Coriolis): 0–30 and 60–90 E→W (-), 30–60 W→E (+)
        let u = latDeg < 30 || latDeg >= 60 ? -80 : 80;
        let v = 0;
        // Jet amplification near streak latitudes
        for (let k = 0; k < streakLats.length; k++) {
            const d = Math.abs(latDeg - streakLats[k]);
            const f = Math.max(0, 1 - d / 12); // within ~12° band
            if (f > 0) {
                const boost = Math.round(32 * jetStrength * f);
                u += latDeg < streakLats[k] ? boost : -boost; // simple shear orientation
            }
        }
        // Per-row variance
        const varU = Math.round(((TerrainBuilder?.getRandomNumber?.(21, "WindUVar") ?? 0) -
            10) *
            variance) | 0;
        const varV = Math.round(((TerrainBuilder?.getRandomNumber?.(11, "WindVVar") ?? 0) - 5) *
            variance) | 0;
        for (let x = 0; x < width; x++) {
            const i = idx(x, y, width);
            // Directionality bias for winds (cohesive global control)
            (function applyWindBias() {
                try {
                    const DIR = WORLDMODEL_DIRECTIONALITY || {};
                    const cohesion = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                    const followPlates = Math.max(0, Math.min(1, DIR?.interplay?.windsFollowPlates ?? 0));
                    let biasDeg = DIR?.primaryAxes?.windBiasDeg ?? 0;
                    biasDeg +=
                        (DIR?.primaryAxes?.plateAxisDeg ?? 0) *
                            followPlates *
                            cohesion;
                    // Optional hemisphere flip around equator
                    const rawLat = GameplayMap.getPlotLatitude(0, y);
                    if ((DIR?.hemispheres?.southernFlip ?? false) &&
                        rawLat < 0) {
                        biasDeg = -biasDeg;
                    }
                    const angleJitter = (DIR?.variability?.angleJitterDeg ?? 0) | 0;
                    const jitter = (TerrainBuilder?.getRandomNumber?.(angleJitter * 2 + 1, "WindDirJit") ?? 0) - angleJitter;
                    const rad = ((biasDeg + jitter) * Math.PI) / 180;
                    const biasMag = Math.round(30 * cohesion);
                    const bu = Math.round(biasMag * Math.cos(rad));
                    const bv = Math.round(biasMag * Math.sin(rad));
                    U[i] = clampInt(u + varU + bu, -127, 127);
                    V[i] = clampInt(v + varV + bv, -127, 127);
                    return;
                }
                catch (_) {
                    /* fall back to baseline below */
                }
                U[i] = clampInt(u + varU, -127, 127);
                V[i] = clampInt(v + varV, -127, 127);
            })();
        }
    }
}
/**
 * Ocean currents: placeholder banded flows.
 * - Equatorial westward current near 0–12°
 * - Weak subpolar east/west hints at high latitudes
 */
function computeCurrents(width, height) {
    const U = _state.currentU;
    const V = _state.currentV;
    if (!U || !V)
        return;
    for (let y = 0; y < height; y++) {
        const latDeg = Math.abs(GameplayMap.getPlotLatitude(0, y));
        let baseU = 0;
        let baseV = 0;
        if (latDeg < 12) {
            baseU = -50; // westward
        }
        else if (latDeg >= 45 && latDeg < 60) {
            baseU = 20; // modest eastward mid-lat
        }
        else if (latDeg >= 60) {
            baseU = -15; // weak westward near polar
        }
        for (let x = 0; x < width; x++) {
            const i = idx(x, y, width);
            if (GameplayMap.isWater(x, y)) {
                // Directionality bias for currents + interplay with winds
                let cu = baseU;
                let cv = baseV;
                (function applyCurrentBias() {
                    try {
                        const DIR = WORLDMODEL_DIRECTIONALITY || {};
                        const cohesion = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                        const windsFactor = Math.max(0, Math.min(1, DIR?.interplay?.currentsFollowWinds ?? 0)) * cohesion;
                        // Sample prevailing wind vector at the row center (cheap proxy)
                        let wu = 0, wv = 0;
                        if (_state.windU && _state.windV) {
                            const wi = idx(Math.floor(width / 2), y, width);
                            wu = _state.windU[wi] | 0;
                            wv = _state.windV[wi] | 0;
                        }
                        cu += Math.round(wu * windsFactor);
                        cv += Math.round(wv * windsFactor);
                        // Add global current bias (optionally nudged toward plate axis via winds-follow-plates)
                        let biasDeg = DIR?.primaryAxes?.currentBiasDeg ?? 0;
                        biasDeg +=
                            (DIR?.interplay?.windsFollowPlates ?? 0) *
                                (DIR?.primaryAxes?.plateAxisDeg ?? 0) *
                                cohesion *
                                0.5;
                        const angleJitter = (DIR?.variability?.angleJitterDeg ?? 0) | 0;
                        const jitter = (TerrainBuilder?.getRandomNumber?.(angleJitter * 2 + 1, "CurrentDirJit") ?? 0) - angleJitter;
                        // Optional hemisphere flip around equator
                        const rawLat = GameplayMap.getPlotLatitude(0, y);
                        if ((DIR?.hemispheres?.southernFlip ?? false) &&
                            rawLat < 0) {
                            biasDeg = -biasDeg;
                        }
                        const rad = ((biasDeg + jitter) * Math.PI) / 180;
                        const biasMag = Math.round(25 * cohesion);
                        cu += Math.round(biasMag * Math.cos(rad));
                        cv += Math.round(biasMag * Math.sin(rad));
                    }
                    catch (_) {
                        /* keep baseline cu/cv */
                    }
                })();
                U[i] = clampInt(cu, -127, 127);
                V[i] = clampInt(cv, -127, 127);
            }
            else {
                U[i] = 0;
                V[i] = 0;
            }
        }
    }
}
/* --------------------------------- utilities -------------------------------- */
function clampInt(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v | 0;
}
function toByte01(f) {
    const v = Math.max(0, Math.min(1, f));
    return Math.round(v * 255) | 0;
}
function toByte(v) {
    // Accept 0..1 or raw float values; clamp to [0..255]
    if (v <= 1 && v >= 0)
        return toByte01(v);
    return clampInt(Math.round(v), 0, 255);
}
export default WorldModel;
```

## File: mod/maps/epic-diverse-huge-kahula.js
```javascript
// @ts-nocheck
/**
 * Epic Diverse Huge — Kahula (Entry Variant)
 *
 * A dramatically different tectonic configuration built entirely via config:
 * - One large, central “blobular” continent
 * - A massive convergent ridge running roughly north–south across the interior
 * - Divergent rifts flanking the central mass (east and west sides)
 * - Outer bands are mostly open ocean with only small island chains
 *
 * Notes:
 * - Listed as a separate <Row> in config/config.xml.
 * - Uses the standard generator; only presets/overrides differ.
 */
console.log("[EpicDiverseHuge:Kahula] Loading entry...");
import { bootstrap } from "./config/entry.js";
// @ts-check
/** @typedef {import("../maps/config/map_config.d.ts").MapConfig} Config */
bootstrap({
    // Start from conservative defaults
    presets: ["classic"],
    // Kahula-specific overrides to bias plate layout and band geometry
    /** @type Config */
    overrides: {
        toggles: {
            STORY_ENABLE_HOTSPOTS: true,
            STORY_ENABLE_RIFTS: true,
            STORY_ENABLE_OROGENY: true,
            STORY_ENABLE_WORLDMODEL: true,
            STORY_ENABLE_SWATCHES: true,
            STORY_ENABLE_CORRIDORS: true,
        },
        // Landmass geometry: wide central band (blob continent), narrow outer bands
        landmass: {
            baseWaterPercent: 65,
            waterThumbOnScale: -5,
            curveAmpFrac: 0.35,
            geometry: {
                mode: "plates",
            },
        },
        biomes: {
            tundra: {
                elevMin: 100,
            },
        },
        climateBaseline: {
            bands: {
                deg0to10: 200,
                deg10to20: 150,
                deg70plus: 50,
            },
            orographic: {
                hi1Threshold: 280,
                hi2Threshold: 380,
                hi2Bonus: 200,
            },
        },
        islands: {
            minDistFromLandRadius: 3,
        },
        // Tectonics and directionality tuned for a central ridge with flanking rifts
        worldModel: {
            enabled: true,
            wind: {
                coriolisZonalScale: 2.3,
                jetStreaks: 3,
            },
            plates: {
                count: 5,
                axisAngles: [23, -17],
                convergenceMix: 2,
                seedJitter: 2,
                interiorSmooth: 3,
            },
            directionality: {
                cohesion: 0.9,
                primaryAxes: {
                    // East–west plate motion tends to produce north–south belts
                    plateAxisDeg: 70,
                    windBiasDeg: 130,
                    currentBiasDeg: 70,
                },
                interplay: {
                    windsFollowPlates: 0.7,
                    currentsFollowWinds: 0.8,
                    riftsFollowPlates: 0.9,
                    orogenyOpposesRifts: 0.6,
                },
                hemispheres: {
                    southernFlip: true,
                    equatorBandDeg: 38,
                    monsoonBias: 1.3,
                },
                variability: {
                    angleJitterDeg: 5,
                    magnitudeVariance: 0.2,
                    seedOffset: 1,
                },
            },
            policy: {
                // Ensure open oceans around the central landmass and keep lanes open
                oceanSeparation: {
                    enabled: true,
                    bandPairs: [
                        [0, 1],
                        [1, 2],
                    ],
                    baseSeparationTiles: 3,
                    boundaryClosenessMultiplier: 1.5,
                    maxPerRowDelta: 3,
                    respectSeaLanes: true,
                    minChannelWidth: 5,
                    edgeWest: {
                        enabled: true,
                        baseTiles: 1,
                        boundaryClosenessMultiplier: 1.0,
                        maxPerRowDelta: 6,
                    },
                    edgeEast: {
                        enabled: true,
                        baseTiles: 1,
                        boundaryClosenessMultiplier: 1.0,
                        maxPerRowDelta: 6,
                    },
                },
            },
        },
        // Encourage a pair of long rifts and a prominent orogenic belt
        story: {
            rift: {
                maxRiftsPerMap: 3,
                lineSteps: 20,
                stepLen: 3,
                shoulderWidth: 6,
            },
            orogeny: {
                beltMaxPerContinent: 1,
                beltMinLength: 60,
                radius: 3,
                windwardBoost: 180,
                leeDrynessAmplifier: 1.4,
            },
            swatches: {
                forceAtLeastOne: true,
                maxPerMap: 7,
                sizeScaling: {
                    lengthMulSqrt: 5,
                    widthMulSqrt: 2,
                },
                types: {
                    macroDesertBelt: {
                        weight: 10,
                        bleedRadius: 4,
                    },
                    mountainForests: {
                        coupleToOrogeny: true,
                        weight: 10,
                    },
                },
            },
        },
    },
});
import "./map_orchestrator.js";
console.log("[EpicDiverseHuge:Kahula] Ready (delegating to Epic Diverse Huge generator).");
```

## File: mod/maps/epic-diverse-huge-temperate.js
```javascript
// @ts-nocheck
/**
 * Epic Diverse Huge — Temperate (Sibling Entry)
 *
 * Minimal sibling map that reuses the working Epic Diverse Huge generator
 * by statically importing it. The imported script registers the necessary
 * engine listeners (RequestMapInitData/GenerateMap), so this file stays tiny.
 *
 * Notes:
 * - This file is listed as a separate <Row> in config/config.xml.
 * - To customize behavior later (e.g., different tunables), introduce a
 *   variant tunables module and point the original generator to it via a
 *   small indirection. For now, this simply reuses the default setup.
 */
console.log("[EpicDiverseHuge:Temperate] Loading sibling map entry...");
import { bootstrap } from "./config/entry.js";
bootstrap({
    presets: ["temperate"],
});
import "./map_orchestrator.js";
console.log("[EpicDiverseHuge:Temperate] Ready (delegating to Epic Diverse Huge generator).");
```

## File: mod/maps/epic-diverse-huge.js
```javascript
// @ts-nocheck
/**
 * Epic Diverse Huge — Base Map Entry
 *
 * Minimal entry: set a default per‑map config, then import the orchestrator.
 * The orchestrator registers engine listeners on load and reads config at runtime.
 */
import { bootstrap } from "./config/entry.js";
bootstrap({
    presets: ["classic"],
});
import "./map_orchestrator.js";
```

## File: mod/maps/map_orchestrator.js
```javascript
// Epic Diverse Huge Map Generator
/**
 * Custom map script - Produces diverse terrain with cliffs, inland lakes,
 * coastal regions, mountains, jungle, tundra, and all biome variety on huge maps.
 * @packageDocumentation
 */
console.log("Loading Epic Diverse Huge Map Generator");
console.log("[SWOOPER_MOD] ========================================");
console.log("[SWOOPER_MOD] Map orchestrator loaded - v1.0");
console.log("[SWOOPER_MOD] Plate-aware mountain tuning enabled");
console.log("[SWOOPER_MOD] Diagnostics enabled");
console.log("[SWOOPER_MOD] ========================================");
import { chooseStartSectors } from "/base-standard/maps/assign-starting-plots.js";
import { expandCoasts, generateLakes } from "/base-standard/maps/elevation-terrain-generator.js";
import { layerAddMountainsPhysics } from "./layers/mountains.js";
import * as globals from "/base-standard/maps/map-globals.js";
import * as utilities from "/base-standard/maps/map-utilities.js";
import { STORY_ENABLE_HOTSPOTS, STORY_ENABLE_RIFTS, STORY_ENABLE_OROGENY, STORY_ENABLE_WORLDMODEL, LANDMASS_CFG, LANDMASS_GEOMETRY, MOUNTAINS_CFG, VOLCANOES_CFG, rebind, } from "./bootstrap/tunables.js";
import { StoryTags, resetStoryTags } from "./story/tags.js";
import { storyTagStrategicCorridors } from "./story/corridors.js";
import { storyTagHotspotTrails, storyTagRiftValleys, storyTagOrogenyBelts, storyTagContinentalMargins, storyTagClimateSwatches, OrogenyCache, } from "./story/tagging.js";
import { layerAddVolcanoesPlateAware } from "./layers/volcanoes.js";
import { generateVoronoiLandmasses } from "./layers/landmass_voronoi.js";
import { createPlateDrivenLandmasses } from "./layers/landmass_plate.js";
import { applyLandmassPostAdjustments, applyPlateAwareOceanSeparation } from "./layers/landmass_utils.js";
import { addRuggedCoasts as layerAddRuggedCoasts } from "./layers/coastlines.js";
import { addIslandChains as layerAddIslandChains } from "./layers/islands.js";
import { buildEnhancedRainfall as layerBuildEnhancedRainfall } from "./layers/climate-baseline.js";
import { refineRainfallEarthlike as layerRefineRainfallEarthlike } from "./layers/climate-refinement.js";
import { designateEnhancedBiomes as layerDesignateEnhancedBiomes } from "./layers/biomes.js";
import { addDiverseFeatures as layerAddDiverseFeatures } from "./layers/features.js";
import { runPlacement as layerRunPlacement } from "./layers/placement.js";
import { devLogIf, timeStart, timeEnd, logStoryTagsSummary, logRainfallHistogram, logRainfallStats, logCorridorAsciiOverlay, logWorldModelSummary, logWorldModelHistograms, logWorldModelAscii, logBoundaryMetrics, logLandmassAscii, logTerrainReliefAscii, logRainfallAscii, logBiomeAscii, logBiomeSummary, } from "./bootstrap/dev.js";
import { WorldModel } from "./world/model.js";
// Phase 1 Refactoring: Context + Adapter layer
import { createMapContext } from "./core/types.js";
import { CivEngineAdapter } from "./core/adapters.js";

// Maintain compatibility with dev helpers that expect StoryTags on the global scope.
try {
    globalThis.StoryTags = StoryTags;
}
catch (_err) {
    // Swallow silently; the game VM should always expose globalThis but guard just in case.
}
/**
 * Climate Story v0.1 — StoryTags scaffolding and toggles
 * Tags are sparse: store as "x,y" strings in Sets.
 * Per-map config is read at runtime from getConfig().
 */
// StoryTags are now imported from ./story/tags.js
function requestMapData(initParams) {
    console.log("=== EPIC DIVERSE HUGE GENERATOR STARTING ===");
    console.log(`Map dimensions: ${initParams.width} x ${initParams.height}`);
    console.log(`Latitude range: ${initParams.bottomLatitude} to ${initParams.topLatitude}`);
    engine.call("SetMapInitData", initParams);
}
function generateMap() {
    console.log("[SWOOPER_MOD] === generateMap() CALLED ===");
    console.log("Generating Epic Diverse Map with maximum terrain variety!");
    // Ensure tunables reflect the active entry config for this run.
    rebind();
    const mountainsConfig = MOUNTAINS_CFG || {};
    const mountainOptions = {
        mountainPercent: mountainsConfig.mountainPercent ?? 3,
        hillPercent: mountainsConfig.hillPercent ?? 8,
        upliftWeight: mountainsConfig.upliftWeight ?? 0.75,
        fractalWeight: mountainsConfig.fractalWeight ?? 0.25,
        riftDepth: mountainsConfig.riftDepth ?? 0.3,
        variance: mountainsConfig.variance ?? 2.0,
        boundaryWeight: mountainsConfig.boundaryWeight ?? 0.6,
        boundaryExponent: mountainsConfig.boundaryExponent ?? 1.4,
        interiorPenaltyWeight: mountainsConfig.interiorPenaltyWeight ?? 0.2,
        convergenceBonus: mountainsConfig.convergenceBonus ?? 0.9,
        transformPenalty: mountainsConfig.transformPenalty ?? 0.3,
        riftPenalty: mountainsConfig.riftPenalty ?? 0.75,
        hillBoundaryWeight: mountainsConfig.hillBoundaryWeight ?? 0.45,
        hillRiftBonus: mountainsConfig.hillRiftBonus ?? 0.5,
        hillConvergentFoothill: mountainsConfig.hillConvergentFoothill ?? 0.25,
        hillInteriorFalloff: mountainsConfig.hillInteriorFalloff ?? 0.2,
        hillUpliftWeight: mountainsConfig.hillUpliftWeight ?? 0.25,
    };
    const volcanoConfig = VOLCANOES_CFG || {};
    const volcanoOptions = {
        enabled: volcanoConfig.enabled ?? true,
        baseDensity: volcanoConfig.baseDensity ?? (1 / 170),
        minSpacing: volcanoConfig.minSpacing ?? 3,
        boundaryThreshold: volcanoConfig.boundaryThreshold ?? 0.35,
        boundaryWeight: volcanoConfig.boundaryWeight ?? 1.2,
        convergentMultiplier: volcanoConfig.convergentMultiplier ?? 2.4,
        transformMultiplier: volcanoConfig.transformMultiplier ?? 1.1,
        divergentMultiplier: volcanoConfig.divergentMultiplier ?? 0.35,
        hotspotWeight: volcanoConfig.hotspotWeight ?? 0.12,
        shieldPenalty: volcanoConfig.shieldPenalty ?? 0.6,
        randomJitter: volcanoConfig.randomJitter ?? 0.08,
        minVolcanoes: volcanoConfig.minVolcanoes ?? 5,
        maxVolcanoes: volcanoConfig.maxVolcanoes ?? 40,
    };
    console.log("[SWOOPER_MOD] Tunables rebound successfully");
    console.log(
        `[SWOOPER_MOD] Mountain target: ${mountainOptions.mountainPercent}% | Hills: ${mountainOptions.hillPercent}%`
    );
    console.log(
        `[SWOOPER_MOD] Volcano config — base density ${(volcanoOptions.baseDensity ?? 0).toFixed(4)}, spacing ${volcanoOptions.minSpacing}`
    );
    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    let uiMapSize = GameplayMap.getMapSize();
    let startPositions = [];
    let mapInfo = GameInfo.Maps.lookup(uiMapSize);
    if (mapInfo == null)
        return;

    // Phase 1 Refactoring: Create MapContext with adapter
    console.log("[Refactoring] Creating MapContext with CivEngineAdapter...");
    const adapter = new CivEngineAdapter(iWidth, iHeight);
    const ctx = createMapContext(
        { width: iWidth, height: iHeight },
        adapter,
        {
            STORY_ENABLE_WORLDMODEL,
            STORY_ENABLE_HOTSPOTS,
            STORY_ENABLE_RIFTS,
            STORY_ENABLE_OROGENY,
            LANDMASS_GEOMETRY,
        }
    );

    // Initialize WorldModel (optional) and attach to context
    if (STORY_ENABLE_WORLDMODEL) {
        try {
            if (WorldModel.init()) {
                ctx.worldModel = WorldModel;
                devLogIf("LOG_STORY_TAGS", "[WorldModel] Initialized and attached to context");
                logWorldModelSummary(WorldModel);
                logWorldModelAscii(WorldModel);
            }
        }
        catch (err) {
            devLogIf("LOG_STORY_TAGS", "[WorldModel] init error");
        }
    }
    let iNumNaturalWonders = Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
    let iTilesPerLake = Math.max(10, mapInfo.LakeGenerationFrequency * 2); // fewer lakes than base script used
    let iNumPlayers1 = mapInfo.PlayersLandmass1;
    let iNumPlayers2 = mapInfo.PlayersLandmass2;
    let iStartSectorRows = mapInfo.StartSectorRows;
    let iStartSectorCols = mapInfo.StartSectorCols;
    // Set up start sectors first (before terrain generation)
    let bHumanNearEquator = utilities.needHumanNearEquator();
    let startSectors = chooseStartSectors(iNumPlayers1, iNumPlayers2, iStartSectorRows, iStartSectorCols, bHumanNearEquator);
    console.log("Start sectors chosen successfully");
    // Create continent boundaries for start position assignment (simplified for compatibility)
    let westContinent = {
        west: globals.g_AvoidSeamOffset,
        east: iWidth / 2 - globals.g_AvoidSeamOffset,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0,
    };
    let eastContinent = {
        west: iWidth / 2 + globals.g_AvoidSeamOffset,
        east: iWidth - globals.g_AvoidSeamOffset,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0,
    };
    let landmassSource = null;
    let landmaskDebug = null;
    // Create more complex continent boundaries for our diverse terrain generation
    // Compute band windows from per-map geometry config (if provided)
    {
        const GEOM = LANDMASS_GEOMETRY || /**/ {};
        const geomMode = typeof GEOM.mode === "string" ? GEOM.mode : "auto";
        const worldModelActive = !!(WorldModel?.isEnabled?.() && WorldModel.isEnabled());
        const preferVoronoi = geomMode === "voronoi" || geomMode === "auto" || !worldModelActive;
        const allowPlate = geomMode !== "voronoi" && worldModelActive;
        let landmassWindows;
        let derivedStartRegions;
        let activeLandMask = null;
        if (preferVoronoi) {
            const voronoiResult = generateVoronoiLandmasses(iWidth, iHeight, ctx, mapInfo, GEOM);
            if (voronoiResult && Array.isArray(voronoiResult.windows) && voronoiResult.windows.length > 0) {
                landmassSource = "voronoi";
                landmassWindows = voronoiResult.windows;
                derivedStartRegions = voronoiResult.startRegions;
                activeLandMask = voronoiResult.landMask || null;
                landmaskDebug = activeLandMask;
            }
        }
        if (!landmassWindows && allowPlate) {
            const plateResult = createPlateDrivenLandmasses(iWidth, iHeight, ctx, {
                landmassCfg: LANDMASS_CFG,
                geometry: GEOM,
            });
            if (plateResult && Array.isArray(plateResult.windows) && plateResult.windows.length > 0) {
                landmassSource = "plate";
                landmassWindows = plateResult.windows;
                derivedStartRegions = plateResult.startRegions;
                activeLandMask = plateResult.landMask || null;
                landmaskDebug = activeLandMask;
            }
        }
        if (!landmassWindows) {
            console.log("[SWOOPER_MOD] ERROR: Landmass generation failed — no Voronoi or plate windows returned.");
            return;
        }
        const separationResult = applyPlateAwareOceanSeparation({
            width: iWidth,
            height: iHeight,
            windows: landmassWindows,
            landMask: activeLandMask,
            adapter: ctx?.adapter,
            worldModel: WorldModel,
        });
        landmassWindows = separationResult.windows;
        if (separationResult.landMask) {
            activeLandMask = separationResult.landMask;
            landmaskDebug = activeLandMask;
        }
        landmassWindows = applyLandmassPostAdjustments(landmassWindows, GEOM, iWidth, iHeight);
        if (!derivedStartRegions && Array.isArray(landmassWindows) && landmassWindows.length >= 2) {
            const first = landmassWindows[0];
            const last = landmassWindows[landmassWindows.length - 1];
            derivedStartRegions = {
                westContinent: Object.assign({}, first),
                eastContinent: Object.assign({}, last),
            };
        }
        if (derivedStartRegions?.westContinent && derivedStartRegions?.eastContinent) {
            westContinent = {
                west: derivedStartRegions.westContinent.west,
                east: derivedStartRegions.westContinent.east,
                south: derivedStartRegions.westContinent.south,
                north: derivedStartRegions.westContinent.north,
                continent: derivedStartRegions.westContinent.continent ?? 0,
            };
            eastContinent = {
                west: derivedStartRegions.eastContinent.west,
                east: derivedStartRegions.eastContinent.east,
                south: derivedStartRegions.eastContinent.south,
                north: derivedStartRegions.eastContinent.north,
                continent: derivedStartRegions.eastContinent.continent ?? 1,
            };
        }
        var landmassWindowsFinal = landmassWindows;
    }
    // Generate landmasses without creating a hard horizontal ocean band
    {
        const t = timeStart("Landmass");
        if (landmassSource === "plate") {
            console.log("[SWOOPER_MOD] Applied plate-driven landmass mask");
        }
        else if (landmassSource === "voronoi") {
            console.log("[SWOOPER_MOD] Applied Voronoi landmass mask");
        }
        timeEnd(t);
    }
    if (Array.isArray(landmassWindowsFinal) && landmassWindowsFinal.length) {
        const windowSummary = landmassWindowsFinal.map((win, idx) => {
            if (!win)
                return { index: idx };
            const spanX = Number.isFinite(win.east) && Number.isFinite(win.west) ? win.east - win.west + 1 : null;
            const spanY = Number.isFinite(win.north) && Number.isFinite(win.south) ? win.north - win.south + 1 : null;
            return {
                index: idx,
                continent: win.continent ?? idx,
                west: win.west,
                east: win.east,
                south: win.south,
                north: win.north,
                width: spanX,
                height: spanY,
                area: spanX && spanY ? spanX * spanY : null,
            };
        });
        devLogIf("LOG_LANDMASS_WINDOWS", "[Landmass] windows summary", windowSummary);
    }
    else {
        devLogIf("LOG_LANDMASS_WINDOWS", "[Landmass] windows summary", "no plate windows");
    }
    logLandmassAscii(landmassSource || "unknown", {
        windows: Array.isArray(landmassWindowsFinal) ? landmassWindowsFinal : [],
        landMask: landmaskDebug || undefined,
    });
    TerrainBuilder.validateAndFixTerrain();
    {
        const t = timeStart("ExpandCoasts");
        expandCoasts(iWidth, iHeight);
        timeEnd(t);
    }
    // Reset StoryTags and tag continental margins before coast shaping
    resetStoryTags();
    console.log("Imprinting continental margins (active/passive)...");
    storyTagContinentalMargins();
    // Add post-processing to make coasts more rugged (margin-aware) and place a few islands
    {
        const t = timeStart("RuggedCoasts");
        layerAddRuggedCoasts(iWidth, iHeight, ctx);
        timeEnd(t);
    }
    // Climate Story v0.1: Tag narrative motifs after coasts exist
    if (STORY_ENABLE_HOTSPOTS || STORY_ENABLE_RIFTS) {
        resetStoryTags();
    }
    if (STORY_ENABLE_HOTSPOTS) {
        console.log("Drawing hotspot trails...");
        storyTagHotspotTrails(iWidth, iHeight);
    }
    if (STORY_ENABLE_RIFTS) {
        console.log("Marking rift lines and shoulders...");
        storyTagRiftValleys(iWidth, iHeight);
    }
    if (STORY_ENABLE_OROGENY) {
        console.log("Tagging orogenic belts...");
        storyTagOrogenyBelts();
        logWorldModelHistograms(WorldModel, {
            riftSet: StoryTags.riftLine,
            beltSet: OrogenyCache.belts,
            bins: 12,
        });
    }
    // Re-tag continental margins for downstream consumers (islands/features) after reset
    storyTagContinentalMargins();
    // Strategic Corridors: tag pre-islands lanes and land corridors
    storyTagStrategicCorridors("preIslands");
    logCorridorAsciiOverlay();
    devLogIf("LOG_STORY_TAGS", "StoryTags summary follows");
    logStoryTagsSummary(StoryTags, OrogenyCache);
    {
        const t = timeStart("IslandChains");
        layerAddIslandChains(iWidth, iHeight, ctx);
        timeEnd(t);
    }
    // Remove aggressive cliff systems for playability
    AreaBuilder.recalculateAreas();
    TerrainBuilder.stampContinents();
    // Restore plot tags (west/east landmass, corridor water, etc.) for downstream placement logic.
    utilities.addPlotTags(iHeight, iWidth, eastContinent.west);
    // Mountains & Hills – Phase 2: Physics-based placement using plate boundaries
    {
        const t = timeStart("Mountains & Hills (Physics)");
        layerAddMountainsPhysics(ctx, mountainOptions);
        timeEnd(t);
    }
    logBoundaryMetrics(WorldModel, { stage: "post-mountains" });
    {
        const t = timeStart("Volcanoes");
        layerAddVolcanoesPlateAware(ctx, volcanoOptions);
        timeEnd(t);
    }
    logBoundaryMetrics(WorldModel, { stage: "post-volcanoes" });
    logTerrainReliefAscii("post-volcanoes");
    // Lakes – fewer than before
    {
        const t = timeStart("Lakes");
        generateLakes(iWidth, iHeight, iTilesPerLake);
        timeEnd(t);
    }
    // MAP STATISTICS LOGGING - Diagnostic for start placement failures
    console.log("[SWOOPER_MOD] About to calculate MAP_STATS...");
    {
        let waterCount = 0, mountainCount = 0, hillCount = 0, flatCount = 0;
        const totalTiles = iWidth * iHeight;
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (GameplayMap.isWater(x, y))
                    waterCount++;
                else if (GameplayMap.isMountain(x, y))
                    mountainCount++;
                else if (GameplayMap.getTerrainType(x, y) === globals.g_HillTerrain)
                    hillCount++;
                else
                    flatCount++;
            }
        }
        const landCount = totalTiles - waterCount;
        const waterPct = ((waterCount / totalTiles) * 100).toFixed(1);
        const landPct = ((landCount / totalTiles) * 100).toFixed(1);
        const mtnPct = landCount > 0 ? ((mountainCount / landCount) * 100).toFixed(1) : 0;
        const hillPct = landCount > 0 ? ((hillCount / landCount) * 100).toFixed(1) : 0;
        const flatPct = landCount > 0 ? ((flatCount / landCount) * 100).toFixed(1) : 0;
        console.log(`[MAP_STATS] Total tiles: ${totalTiles}, Water: ${waterCount} (${waterPct}%), Land: ${landCount} (${landPct}%)`);
        console.log(`[MAP_STATS] Land breakdown: Mountains: ${mountainCount} (${mtnPct}%), Hills: ${hillCount} (${hillPct}%), Flat: ${flatCount} (${flatPct}%)`);
    }
    AreaBuilder.recalculateAreas();
    // Create moderated rainfall patterns (keep enhanced but gentle)
    {
        const t = timeStart("Climate: Baseline");
        layerBuildEnhancedRainfall(iWidth, iHeight);
        timeEnd(t);
    }
    logRainfallAscii("baseline");
    logRainfallStats("baseline", iWidth, iHeight);
    {
        const t = timeStart("Climate: Swatches");
        const swatchResult = storyTagClimateSwatches();
        if (swatchResult && swatchResult.kind) {
            devLogIf("LOG_STORY_TAGS", `Climate Swatch: ${swatchResult.kind} (${swatchResult.tiles} tiles)`);
        }
        devLogIf("LOG_SWATCHES", "[Swatches] result", swatchResult || null);
        timeEnd(t);
    }
    // Rivers – closer to base values for balance
    {
        const t = timeStart("Rivers");
        TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
        timeEnd(t);
    }
    TerrainBuilder.validateAndFixTerrain();
    TerrainBuilder.defineNamedRivers();
    // Strategic Corridors: tag river-chain corridors post-rivers
    storyTagStrategicCorridors("postRivers");
    logCorridorAsciiOverlay();
    // Refine rainfall with earthlike dynamics after rivers exist
    {
        const t = timeStart("Climate: Earthlike Refinements");
        // Phase 1: Pass context to refactored layer
        layerRefineRainfallEarthlike(iWidth, iHeight, ctx);
        timeEnd(t);
    }
    logRainfallAscii("refined");
    logRainfallStats("refined", iWidth, iHeight);
    // Enhanced biome diversity
    {
        const t = timeStart("Biomes");
        layerDesignateEnhancedBiomes(iWidth, iHeight);
        timeEnd(t);
    }
    logBiomeAscii("final");
    logBiomeSummary("final", iWidth, iHeight);
    // Add extensive feature variety
    {
        const t = timeStart("Features");
        layerAddDiverseFeatures(iWidth, iHeight, ctx);
        timeEnd(t);
    }
    TerrainBuilder.validateAndFixTerrain();
    AreaBuilder.recalculateAreas();
    devLogIf("RAINFALL_HISTOGRAM", "Rainfall histogram (land tiles)");
    logRainfallHistogram(iWidth, iHeight, 12);
    TerrainBuilder.storeWaterData();
    // Placement phase (wonders, floodplains, snow, resources, starts, discoveries, fertility, advanced starts)
    {
        const t = timeStart("Placement");
        startPositions = layerRunPlacement(iWidth, iHeight, {
            mapInfo,
            wondersPlusOne: true,
            floodplains: { minLength: 4, maxLength: 10 },
            starts: {
                playersLandmass1: iNumPlayers1,
                playersLandmass2: iNumPlayers2,
                westContinent,
                eastContinent,
                startSectorRows: iStartSectorRows,
                startSectorCols: iStartSectorCols,
                startSectors,
            },
        });
        timeEnd(t);
    }
    console.log("=== EPIC DIVERSE HUGE GENERATOR COMPLETED ===");
}
// Register listeners
engine.on("RequestMapInitData", requestMapData);
engine.on("GenerateMap", generateMap);
console.log("Epic Diverse Huge Map Generator loaded and ready!");

```
```
