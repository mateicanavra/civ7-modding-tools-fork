import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Computes land water budget proxies (PET and aridity).
 *
 * This op derives gameplay-oriented, deterministic indices from rainfall/humidity/temperature.
 * Consumers should treat these outputs as advisory indices (use them, don’t re-derive ad hoc variants).
 */
const ComputeLandWaterBudgetInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Land mask per tile (1=land, 0=water). */
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    /** Rainfall (0..200) per tile. */
    rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
    /** Humidity (0..255) per tile. */
    humidity: TypedArraySchemas.u8({ description: "Humidity (0..255) per tile." }),
    /** Surface temperature proxy (C). */
    surfaceTemperatureC: TypedArraySchemas.f32({ description: "Surface temperature proxy (C)." }),
  },
  {
    additionalProperties: false,
    description: "Inputs for land water budget proxies (deterministic, data-only).",
  }
);

/**
 * Land water budget outputs (PET + aridity index).
 */
const ComputeLandWaterBudgetOutputSchema = Type.Object(
  {
    /** Potential evapotranspiration proxy (rainfall units, advisory). */
    pet: TypedArraySchemas.f32({
      description: "Potential evapotranspiration proxy (rainfall units, advisory).",
    }),
    /** Aridity index (0..1) derived from precipitation vs PET (advisory). */
    aridityIndex: TypedArraySchemas.f32({
      description: "Aridity index (0..1) derived from precipitation vs PET (advisory).",
    }),
  },
  {
    additionalProperties: false,
    description: "Land water budget outputs (PET proxy and aridity index).",
  }
);

/**
 * Default land water budget parameters.
 *
 * Practical guidance:
 * - If PET feels too strong/weak globally: adjust `petBase` and `petTemperatureWeight`.
 * - If humid climates should suppress PET more: increase `humidityDampening`.
 */
const ComputeLandWaterBudgetDefaultStrategySchema = Type.Object(
  {
    /** Minimum temperature for PET scaling (C). */
    tMinC: Type.Number({
      default: 0,
      minimum: -60,
      maximum: 40,
      description: "Minimum temperature for PET scaling (C).",
    }),
    /** Maximum temperature for PET scaling (C). */
    tMaxC: Type.Number({
      default: 35,
      minimum: -10,
      maximum: 80,
      description: "Maximum temperature for PET scaling (C).",
    }),
    /** Baseline PET value (rainfall units). */
    petBase: Type.Number({
      default: 18,
      minimum: 0,
      maximum: 200,
      description: "Baseline PET value (rainfall units).",
    }),
    /** Temperature contribution to PET scaling. */
    petTemperatureWeight: Type.Number({
      default: 75,
      minimum: 0,
      maximum: 400,
      description: "Temperature contribution to PET scaling.",
    }),
    /** How much humidity reduces PET (0..1). */
    humidityDampening: Type.Number({
      default: 0.55,
      minimum: 0,
      maximum: 1,
      description: "How much humidity reduces PET (0..1).",
    }),
  },
  {
    additionalProperties: false,
    description: "Land water budget parameters (default strategy).",
  }
);

const ComputeLandWaterBudgetContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-land-water-budget",
  input: ComputeLandWaterBudgetInputSchema,
  output: ComputeLandWaterBudgetOutputSchema,
  strategies: {
    default: ComputeLandWaterBudgetDefaultStrategySchema,
  },
});

export default ComputeLandWaterBudgetContract;
