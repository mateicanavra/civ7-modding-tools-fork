import type {
  HydrologyDrynessKnob,
  HydrologyLakeinessKnob,
  HydrologyOceanCouplingKnob,
  HydrologyRiverDensityKnob,
  HydrologySeasonalityKnob,
  HydrologyTemperatureKnob,
} from "./knobs.js";

export const HYDROLOGY_DRYNESS_WETNESS_SCALE = {
  wet: 1.15,
  mix: 1.0,
  dry: 0.85,
} as const satisfies Record<HydrologyDrynessKnob, number>;

export const HYDROLOGY_TEMPERATURE_BASE_TEMPERATURE_C = {
  cold: 6,
  temperate: 14,
  hot: 22,
} as const satisfies Record<HydrologyTemperatureKnob, number>;

export const HYDROLOGY_SEASONALITY_WIND_JET_STREAKS = {
  low: 2,
  normal: 3,
  high: 4,
} as const satisfies Record<HydrologySeasonalityKnob, number>;

export const HYDROLOGY_SEASONALITY_WIND_VARIANCE = {
  low: 0.45,
  normal: 0.6,
  high: 0.75,
} as const satisfies Record<HydrologySeasonalityKnob, number>;

export const HYDROLOGY_SEASONALITY_PRECIP_NOISE_AMPLITUDE = {
  low: 5,
  normal: 6,
  high: 8,
} as const satisfies Record<HydrologySeasonalityKnob, number>;

export const HYDROLOGY_SEASONALITY_DEFAULTS = {
  low: { modeCount: 2 as const, axialTiltDeg: 12 },
  normal: { modeCount: 2 as const, axialTiltDeg: 18 },
  high: { modeCount: 4 as const, axialTiltDeg: 23.44 },
} as const satisfies Record<
  HydrologySeasonalityKnob,
  Readonly<{ modeCount: 2 | 4; axialTiltDeg: number }>
>;

export const HYDROLOGY_OCEAN_COUPLING_WIND_JET_STRENGTH = {
  off: 0.85,
  simple: 1.0,
  earthlike: 1.05,
} as const satisfies Record<HydrologyOceanCouplingKnob, number>;

export const HYDROLOGY_OCEAN_COUPLING_CURRENT_STRENGTH = {
  off: 0,
  simple: 0.75,
  earthlike: 1.0,
} as const satisfies Record<HydrologyOceanCouplingKnob, number>;

export const HYDROLOGY_OCEAN_COUPLING_MOISTURE_TRANSPORT_ITERATIONS = {
  off: 18,
  simple: 24,
  earthlike: 28,
} as const satisfies Record<HydrologyOceanCouplingKnob, number>;

export const HYDROLOGY_OCEAN_COUPLING_WATER_GRADIENT_RADIUS = {
  off: 4,
  simple: 5,
  earthlike: 6,
} as const satisfies Record<HydrologyOceanCouplingKnob, number>;

export const HYDROLOGY_WATER_GRADIENT_PER_RING_BONUS_BASE = {
  off: 3,
  simple: 4,
  earthlike: 4,
} as const satisfies Record<HydrologyOceanCouplingKnob, number>;

export const HYDROLOGY_EVAPORATION_OCEAN_STRENGTH_BASE = 1.0 as const;
export const HYDROLOGY_EVAPORATION_LAND_STRENGTH_BASE = 0.2 as const;
export const HYDROLOGY_BASELINE_RAINFALL_SCALE = 180 as const;
export const HYDROLOGY_OROGRAPHIC_REDUCTION_BASE = 8 as const;
export const HYDROLOGY_OROGRAPHIC_REDUCTION_PER_STEP = 6 as const;
export const HYDROLOGY_WATER_GRADIENT_LOWLAND_BONUS_BASE = 2 as const;

export const HYDROLOGY_LAKEINESS_TILES_PER_LAKE_MULTIPLIER = {
  few: 1.5,
  normal: 1.0,
  many: 0.7,
} as const satisfies Record<HydrologyLakeinessKnob, number>;

export const HYDROLOGY_RIVER_DENSITY_RUNOFF_SCALE_MULTIPLIER = {
  sparse: 0.8,
  normal: 1.0,
  dense: 1.25,
} as const satisfies Record<HydrologyRiverDensityKnob, number>;

export const HYDROLOGY_RIVERS_DEFAULT_MIN_LENGTH = 5 as const;
export const HYDROLOGY_RIVERS_DEFAULT_MAX_LENGTH = 15 as const;
export const HYDROLOGY_PROJECT_RIVER_NETWORK_MINOR_PERCENTILE_DEFAULT = 0.85 as const;
export const HYDROLOGY_PROJECT_RIVER_NETWORK_MAJOR_PERCENTILE_DEFAULT = 0.95 as const;

export const HYDROLOGY_REFINE_RIVER_CORRIDOR_LOWLAND_ADJACENCY_BONUS_BASE = 14 as const;
export const HYDROLOGY_REFINE_RIVER_CORRIDOR_HIGHLAND_ADJACENCY_BONUS_BASE = 10 as const;
export const HYDROLOGY_REFINE_LOW_BASIN_DELTA_BASE = 6 as const;
