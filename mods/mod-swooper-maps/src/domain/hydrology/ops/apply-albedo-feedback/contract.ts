import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Applies bounded snow/sea-ice albedo feedback to a base surface temperature proxy.
 *
 * Invariants:
 * - Fixed iteration budget (`iterations`) for deterministic, bounded runtime (no convergence loops).
 * - This op is purely data-driven: no runtime callbacks, views, or trace handles cross the boundary.
 *
 * Practical guidance:
 * - If you want stronger ice-albedo cooling: increase `snowCoolingC` / `seaIceCoolingC`.
 * - If you want to disable feedback: set `iterations` to 0 (the op becomes a no-op on temperature).
 */
const ApplyAlbedoFeedbackInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Land mask per tile (1=land, 0=water). */
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    /** Rainfall (0..200) per tile (used as a precipitation signal for snow accumulation). */
    rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
    /** Base surface temperature proxy (C), before albedo feedback. */
    surfaceTemperatureC: TypedArraySchemas.f32({ description: "Base surface temperature proxy (C)." }),
  },
  {
    additionalProperties: false,
    description: "Inputs for bounded albedo feedback (deterministic, data-only).",
  }
);

/**
 * Surface temperature after bounded albedo feedback.
 */
const ApplyAlbedoFeedbackOutputSchema = Type.Object(
  {
    /** Surface temperature after bounded albedo feedback (C). */
    surfaceTemperatureC: TypedArraySchemas.f32({
      description: "Surface temperature after bounded albedo feedback (C).",
    }),
  },
  {
    additionalProperties: false,
    description: "Albedo-feedback-adjusted surface temperature proxy (C).",
  }
);

/**
 * Default albedo feedback parameters.
 */
const ApplyAlbedoFeedbackDefaultStrategySchema = Type.Object(
  {
    /** Fixed iteration count for bounded feedback (no convergence loops). */
    iterations: Type.Integer({
      default: 4,
      minimum: 0,
      maximum: 20,
      description: "Fixed iteration count for bounded feedback (no convergence loops).",
    }),
    /** Cooling applied at full snow cover (C). */
    snowCoolingC: Type.Number({
      default: 4,
      minimum: 0,
      maximum: 25,
      description: "Cooling applied at full snow cover (C).",
    }),
    /** Cooling applied at full sea ice cover (C). */
    seaIceCoolingC: Type.Number({
      default: 6,
      minimum: 0,
      maximum: 30,
      description: "Cooling applied at full sea ice cover (C).",
    }),
    /** Minimum allowed output temperature (C). */
    minC: Type.Number({
      default: -60,
      minimum: -120,
      maximum: 60,
      description: "Minimum allowed output temperature (C).",
    }),
    /** Maximum allowed output temperature (C). */
    maxC: Type.Number({
      default: 60,
      minimum: -60,
      maximum: 120,
      description: "Maximum allowed output temperature (C).",
    }),
    /** Temperature at which snow starts to accumulate on land (C). */
    landSnowStartC: Type.Number({
      default: 0,
      minimum: -60,
      maximum: 30,
      description: "Temperature at which snow starts to accumulate on land (C).",
    }),
    /** Temperature at which land snow cover is saturated (C). */
    landSnowFullC: Type.Number({
      default: -12,
      minimum: -80,
      maximum: 10,
      description: "Temperature at which land snow cover is saturated (C).",
    }),
    /** Temperature at which sea ice starts to form (C). */
    seaIceStartC: Type.Number({
      default: -1,
      minimum: -60,
      maximum: 10,
      description: "Temperature at which sea ice starts to form (C).",
    }),
    /** Temperature at which sea ice cover is saturated (C). */
    seaIceFullC: Type.Number({
      default: -10,
      minimum: -80,
      maximum: 10,
      description: "Temperature at which sea ice cover is saturated (C).",
    }),
    /** How much rainfall boosts snow cover accumulation (dimensionless). */
    precipitationInfluence: Type.Number({
      default: 0.25,
      minimum: 0,
      maximum: 1,
      description: "How much rainfall boosts snow cover accumulation (dimensionless).",
    }),
  },
  {
    additionalProperties: false,
    description: "Albedo feedback parameters (default strategy).",
  }
);

const ApplyAlbedoFeedbackContract = defineOp({
  kind: "compute",
  id: "hydrology/apply-albedo-feedback",
  input: ApplyAlbedoFeedbackInputSchema,
  output: ApplyAlbedoFeedbackOutputSchema,
  strategies: {
    default: ApplyAlbedoFeedbackDefaultStrategySchema,
  },
});

export default ApplyAlbedoFeedbackContract;
