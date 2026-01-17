import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Computes rainfall and humidity fields from humidity transport + terrain/orography signals.
 *
 * This op is the primary “wet/dry” field generator. It is intentionally mechanism-driven:
 * coastal gradients, orographic rain shadows, and deterministic noise provide believable regional structure.
 *
 * Determinism:
 * - All randomness is seeded via `perlinSeed` (pure data). The op must not smuggle RNG functions across the boundary.
 */

/**
 * Coastal moisture gradient parameters (continentality proxy).
 */
const ComputePrecipitationWaterGradientSchema = Type.Object(
  {
    /** How far inland to apply coastal moisture/precip bonus (tiles). */
    radius: Type.Integer({
      default: 5,
      minimum: 1,
      maximum: 20,
      description: "How far inland to apply coastal moisture/precip bonus (tiles).",
    }),
    /** Bonus rainfall per ring closer to water. */
    perRingBonus: Type.Number({
      default: 4,
      minimum: 0,
      maximum: 40,
      description: "Bonus rainfall per ring closer to water.",
    }),
    /** Extra rainfall bonus for low-elevation coastal land. */
    lowlandBonus: Type.Number({
      default: 2,
      minimum: 0,
      maximum: 40,
      description: "Extra rainfall bonus for low-elevation coastal land.",
    }),
    /** Maximum elevation to qualify for lowlandBonus. */
    lowlandElevationMax: Type.Integer({
      default: 150,
      minimum: -2000,
      maximum: 8000,
      description: "Maximum elevation to qualify for lowlandBonus.",
    }),
  },
  {
    additionalProperties: false,
    description: "Coastal moisture gradient parameters (continentality proxy).",
  }
);

/**
 * Orographic rain shadow parameters (windward uplift and leeward drying proxy).
 */
const ComputePrecipitationOrographicSchema = Type.Object(
  {
    /** How far upwind to scan for blocking terrain (tiles). */
    steps: Type.Integer({
      default: 4,
      minimum: 1,
      maximum: 16,
      description: "How far upwind to scan for blocking terrain (tiles).",
    }),
    /** Base rainfall reduction when a barrier exists upwind. */
    reductionBase: Type.Number({
      default: 8,
      minimum: 0,
      maximum: 80,
      description: "Base rainfall reduction when a barrier exists upwind.",
    }),
    /** Additional reduction per upwind barrier step. */
    reductionPerStep: Type.Number({
      default: 6,
      minimum: 0,
      maximum: 80,
      description: "Additional reduction per upwind barrier step.",
    }),
    /** Elevation threshold treated as a barrier if terrain is not mountainous. */
    barrierElevationM: Type.Integer({
      default: 500,
      minimum: 0,
      maximum: 9000,
      description: "Elevation threshold treated as a barrier if terrain is not mountainous.",
    }),
  },
  {
    additionalProperties: false,
    description: "Orographic rain shadow parameters (windward uplift and leeward drying proxy).",
  }
);

/**
 * Baseline rainfall mapping parameters.
 */
const ComputePrecipitationBaselineStrategySchema = Type.Object(
  {
    /**
     * Scales humidity into rainfall (0..200 clamp happens at output).
     *
     * Practical guidance:
     * - If the world is globally too wet/dry: adjust this (or prefer the `dryness` knob upstream).
     */
    rainfallScale: Type.Number({
      default: 180,
      minimum: 0,
      maximum: 400,
      description: "Scales humidity into rainfall (0..200 clamp happens at output).",
    }),
    /**
     * Non-linear scaling applied to humidity before rainfall mapping.
     *
     * Practical guidance:
     * - Higher values concentrate rainfall into fewer “wet cores” (sharper gradients).
     * - Lower values spread rainfall more evenly (flatter gradients).
     */
    humidityExponent: Type.Number({
      default: 1,
      minimum: 0.1,
      maximum: 6,
      description: "Non-linear scaling applied to humidity before rainfall mapping.",
    }),
    /**
     * Perlin noise amplitude added to baseline rainfall.
     *
     * Practical guidance:
     * - Increase for more local rainfall texture (more patchiness).
     * - Decrease for smoother, more banded rainfall.
     */
    noiseAmplitude: Type.Number({
      default: 6,
      minimum: 0,
      maximum: 40,
      description: "Perlin noise amplitude added to baseline rainfall.",
    }),
    /**
     * Perlin noise frequency for rainfall texture.
     *
     * Practical guidance:
     * - Increase for smaller-scale texture.
     * - Decrease for larger-scale blobs/bands.
     */
    noiseScale: Type.Number({
      default: 0.12,
      minimum: 0.01,
      maximum: 1,
      description: "Perlin noise frequency for rainfall texture.",
    }),
    /** Continental effect (distance from ocean impacts humidity/precip). */
    waterGradient: ComputePrecipitationWaterGradientSchema,
    /** Orographic rain shadow simulation (leeward drying effect). */
    orographic: ComputePrecipitationOrographicSchema,
  },
  {
    additionalProperties: false,
    description: "Precipitation baseline parameters (default strategy).",
  }
);

/**
 * River corridor refinement parameters.
 */
const ComputePrecipitationRiverCorridorSchema = Type.Object(
  {
    /** Adjacency radius (in tiles) used to treat tiles as near a river. */
    adjacencyRadius: Type.Integer({
      default: 1,
      minimum: 1,
      maximum: 6,
      description: "Adjacency radius (in tiles) used to treat tiles as near a river.",
    }),
    /** Rainfall bonus for low-elevation tiles near rivers. */
    lowlandAdjacencyBonus: Type.Number({
      default: 14,
      minimum: 0,
      maximum: 80,
      description: "Rainfall bonus for low-elevation tiles near rivers.",
    }),
    /** Rainfall bonus for high-elevation tiles near rivers. */
    highlandAdjacencyBonus: Type.Number({
      default: 10,
      minimum: 0,
      maximum: 80,
      description: "Rainfall bonus for high-elevation tiles near rivers.",
    }),
    /** Maximum elevation to qualify for lowlandAdjacencyBonus. */
    lowlandElevationMax: Type.Integer({
      default: 250,
      minimum: -2000,
      maximum: 9000,
      description: "Maximum elevation to qualify for lowlandAdjacencyBonus.",
    }),
  },
  {
    additionalProperties: false,
    description: "River corridor refinement parameters (local wetness near rivers).",
  }
);

/**
 * Low basin refinement parameters (enclosed basin wetness proxy).
 */
const ComputePrecipitationLowBasinSchema = Type.Object(
  {
    /** Radius used to detect enclosed low basins (tiles). */
    radius: Type.Integer({
      default: 2,
      minimum: 1,
      maximum: 10,
      description: "Radius used to detect enclosed low basins (tiles).",
    }),
    /** Rainfall delta added to enclosed low basins. */
    delta: Type.Number({
      default: 6,
      minimum: 0,
      maximum: 60,
      description: "Rainfall delta added to enclosed low basins.",
    }),
    /** Maximum elevation to qualify as a low basin. */
    elevationMax: Type.Integer({
      default: 200,
      minimum: -2000,
      maximum: 9000,
      description: "Maximum elevation to qualify as a low basin.",
    }),
    /** If any neighbor is below elev+openThresholdM, basin is considered open. */
    openThresholdM: Type.Integer({
      default: 20,
      minimum: 0,
      maximum: 500,
      description: "If any neighbor is below elev+openThresholdM, basin is considered open.",
    }),
  },
  {
    additionalProperties: false,
    description: "Low basin refinement parameters (enclosed basin wetness proxy).",
  }
);

/**
 * Refinement strategy parameters layered on top of baseline precipitation.
 */
const ComputePrecipitationRefineStrategySchema = Type.Object(
  {
    /** River corridor refinement (local wetness near rivers). */
    riverCorridor: ComputePrecipitationRiverCorridorSchema,
    /** Low basin refinement (enclosed basins retain wetness). */
    lowBasin: ComputePrecipitationLowBasinSchema,
  },
  {
    additionalProperties: false,
    description: "Precipitation refinement parameters (refine strategy).",
  }
);

/**
 * Inputs for precipitation computation.
 */
const ComputePrecipitationInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Latitude per row (degrees). */
    latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
    /** Elevation (meters) per tile. */
    elevation: TypedArraySchemas.i16({ description: "Elevation (meters) per tile." }),
    /** Terrain classification per tile. */
    terrain: TypedArraySchemas.u8({ description: "Terrain classification per tile." }),
    /** Land mask per tile (1=land, 0=water). */
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    /** Wind U component per tile (-127..127). */
    windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
    /** Wind V component per tile (-127..127). */
    windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
    /** Humidity proxy (0..1) per tile. */
    humidityF32: TypedArraySchemas.f32({ description: "Humidity proxy (0..1) per tile." }),
    /** Input rainfall (0..200) per tile (optional seed/feedback from prior passes). */
    rainfallIn: TypedArraySchemas.u8({ description: "Input rainfall (0..200) per tile." }),
    /** Input humidity (0..255) per tile (optional seed/feedback from prior passes). */
    humidityIn: TypedArraySchemas.u8({ description: "Input humidity (0..255) per tile." }),
    /** River adjacency mask per tile (1=adjacent, 0=not adjacent). */
    riverAdjacency: TypedArraySchemas.u8({
      description: "River adjacency mask per tile (1=adjacent, 0=not adjacent).",
    }),
    /** Deterministic Perlin seed (derived in the step; pure data). */
    perlinSeed: Type.Integer({
      minimum: 0,
      maximum: 2_147_483_647,
      description: "Deterministic Perlin seed (derived in the step; pure data).",
    }),
  },
  {
    additionalProperties: false,
    description: "Inputs for precipitation/humidity mapping from humidity transport + local modifiers.",
  }
);

/**
 * Precipitation outputs (rainfall + humidity).
 */
const ComputePrecipitationOutputSchema = Type.Object(
  {
    /** Rainfall (0..200) per tile. */
    rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
    /** Humidity (0..255) per tile. */
    humidity: TypedArraySchemas.u8({ description: "Humidity (0..255) per tile." }),
  },
  {
    additionalProperties: false,
    description: "Precipitation outputs (rainfall and humidity fields).",
  }
);

const ComputePrecipitationContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-precipitation",
  input: ComputePrecipitationInputSchema,
  output: ComputePrecipitationOutputSchema,
  strategies: {
    default: ComputePrecipitationBaselineStrategySchema,
    refine: ComputePrecipitationRefineStrategySchema,
  },
});

export default ComputePrecipitationContract;
