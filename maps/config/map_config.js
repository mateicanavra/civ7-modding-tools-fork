/**
 * @file epic-diverse-huge-map/maps/config/map_config.js
 * @description
 * Central configuration data for the Epic Diverse Huge map generator.
 * This file exports a single object containing all tunable parameters.
 * For schema validation and editor tooltips, see map_config.schema.json.
 */

export const MAP_CONFIG = Object.freeze({
    // $schema: "./map_config.schema.json", // For editor validation

    // --- Master Feature Toggles ---
    // Enable or disable major Climate Story systems. Set to false to skip a layer entirely.
    toggles: Object.freeze({
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
    }),

    // --- Climate Story Tunables ---
    // Detailed parameters for each narrative motif.
    story: Object.freeze({
        // Deep-ocean hotspot trails (aligned island chains)
        hotspot: Object.freeze({
            maxTrails: 3, // total trails on a Huge map
            steps: 10, // polyline steps per trail
            stepLen: 4, // tiles advanced per step
            minDistFromLand: 4, // keep trails away from coasts
            minTrailSeparation: 12, // avoid parallel clutter between trails
            paradiseBias: 2, // 2:1 paradise:volcanic selection weight
            volcanicBias: 1,
            volcanicPeakChance: 0.33, // chance a volcanic center "peeks" as land
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
            maxPerMap: 1,
            forceAtLeastOne: true,
            sizeScaling: Object.freeze({
                widthMulSqrt: 0.3,
                lengthMulSqrt: 0.4,
            }),
            types: Object.freeze({
                macroDesertBelt: Object.freeze({
                    weight: 3,
                    latitudeCenterDeg: 20,
                    halfWidthDeg: 12,
                    drynessDelta: 28,
                    bleedRadius: 2,
                }),
                equatorialRainbelt: Object.freeze({
                    weight: 3,
                    latitudeCenterDeg: 0,
                    halfWidthDeg: 10,
                    wetnessDelta: 24,
                    bleedRadius: 3,
                }),
                rainforestArchipelago: Object.freeze({
                    weight: 2,
                    islandBias: 2,
                    reefBias: 1,
                    wetnessDelta: 18,
                    bleedRadius: 2,
                }),
                mountainForests: Object.freeze({
                    weight: 2,
                    coupleToOrogeny: true,
                    windwardBonus: 6,
                    leePenalty: 2,
                    bleedRadius: 1,
                }),
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

        // Paleo‑Hydrology (deltas, oxbows, fossil channels)
        paleo: Object.freeze({
            maxDeltas: 4,
            deltaFanRadius: 1,
            deltaMarshChance: 0.35,
            maxOxbows: 6,
            oxbowElevationMax: 280,
            maxFossilChannels: 3,
            fossilChannelLengthTiles: 12,
            fossilChannelStep: 2,
            fossilChannelHumidity: 5,
            fossilChannelMinDistanceFromCurrentRivers: 4,
            minDistanceFromStarts: 9,
            sizeScaling: Object.freeze({
                lengthMulSqrt: 0.4,
            }),
            elevationCarving: Object.freeze({
                enableCanyonRim: true,
                rimWidth: 1,
                canyonDryBonus: 2,
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
            paradiseReefChance: 18, // % chance
            volcanicForestChance: 22, // % chance
            volcanicTaigaChance: 25, // % chance
        }),
    }),
});
