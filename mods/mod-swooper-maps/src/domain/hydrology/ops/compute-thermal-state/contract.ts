import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Computes a surface temperature proxy from insolation + elevation + land/ocean mask.
 *
 * Practical guidance:
 * - If mountains are too cold/hot: adjust `lapseRateCPerM` magnitude (more negative = colder at altitude).
 * - If land feels too continental: adjust `landCoolingC` (higher = cooler land relative to oceans).
 * - If the entire world is too warm/cold: adjust `baseTemperatureC`.
 */
const ComputeThermalStateInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Insolation proxy (0..1) per tile. */
    insolation: TypedArraySchemas.f32({ description: "Insolation proxy (0..1) per tile." }),
    /** Elevation (meters) per tile. */
    elevation: TypedArraySchemas.i16({ description: "Elevation (meters) per tile." }),
    /** Land mask per tile (1=land, 0=water). */
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
  },
  {
    additionalProperties: false,
    description: "Inputs for surface temperature proxy computation (deterministic, data-only).",
  }
);

/**
 * Surface temperature proxy output, expressed in Celsius.
 */
const ComputeThermalStateOutputSchema = Type.Object(
  {
    /** Surface temperature proxy (Celsius) per tile. */
    surfaceTemperatureC: TypedArraySchemas.f32({
      description: "Surface temperature proxy (Celsius) per tile.",
    }),
  },
  {
    additionalProperties: false,
    description: "Surface temperature proxy output per tile (Celsius).",
  }
);

/**
 * Default thermal-state parameters.
 */
const ComputeThermalStateDefaultStrategySchema = Type.Object(
  {
    /** Global baseline temperature at sea level and mid-insolation. */
    baseTemperatureC: Type.Number({
      default: 14,
      minimum: -40,
      maximum: 60,
      description: "Global baseline temperature at sea level and mid-insolation.",
    }),
    /** Temperature delta contributed by insolation forcing. */
    insolationScaleC: Type.Number({
      default: 28,
      minimum: 0,
      maximum: 80,
      description: "Temperature delta contributed by insolation forcing.",
    }),
    /** Temperature change per meter of elevation (negative cools with altitude). */
    lapseRateCPerM: Type.Number({
      default: -0.0065,
      minimum: -0.02,
      maximum: 0,
      description: "Temperature change per meter of elevation (negative cools with altitude).",
    }),
    /** Extra cooling applied to land tiles (continentality proxy). */
    landCoolingC: Type.Number({
      default: 2,
      minimum: 0,
      maximum: 15,
      description: "Extra cooling applied to land tiles (continentality proxy).",
    }),
    /** Minimum allowed output temperature (C). */
    minC: Type.Number({
      default: -40,
      minimum: -120,
      maximum: 60,
      description: "Minimum allowed output temperature (C).",
    }),
    /** Maximum allowed output temperature (C). */
    maxC: Type.Number({
      default: 50,
      minimum: -40,
      maximum: 120,
      description: "Maximum allowed output temperature (C).",
    }),
  },
  {
    additionalProperties: false,
    description: "Thermal-state parameters (default strategy).",
  }
);

const ComputeThermalStateContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-thermal-state",
  input: ComputeThermalStateInputSchema,
  output: ComputeThermalStateOutputSchema,
  strategies: {
    default: ComputeThermalStateDefaultStrategySchema,
  },
});

export default ComputeThermalStateContract;
