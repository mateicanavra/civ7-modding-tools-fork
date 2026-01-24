import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Computes radiative forcing proxies (insolation) from latitude.
 *
 * This op is intentionally simple: it provides a deterministic forcing layer that downstream thermal/wind/moisture
 * ops can consume without re-deriving latitude bands ad hoc.
 */
const ComputeRadiativeForcingInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Latitude by row in degrees; length must equal `height`. */
    latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
  },
  {
    additionalProperties: false,
    description: "Inputs for radiative forcing computation (deterministic, data-only).",
  }
);

/**
 * Insolation proxy output used as a forcing input for thermal state and circulation.
 */
const ComputeRadiativeForcingOutputSchema = Type.Object(
  {
    /** Insolation proxy (0..1) per tile. */
    insolation: TypedArraySchemas.f32({ description: "Insolation proxy (0..1) per tile." }),
  },
  {
    additionalProperties: false,
    description: "Radiative forcing output (insolation proxy) per tile.",
  }
);

/**
 * Default forcing parameters.
 *
 * Practical guidance:
 * - If you want stronger equator-to-pole contrast: decrease `poleInsolation` or increase `latitudeExponent`.
 * - If you want a generally “warmer planet”: increase `equatorInsolation` and/or `poleInsolation`.
 */
const ComputeRadiativeForcingDefaultStrategySchema = Type.Object(
  {
    /** Insolation proxy at the equator (baseline scale). */
    equatorInsolation: Type.Number({
      default: 1,
      minimum: 0,
      maximum: 2,
      description: "Insolation proxy at the equator.",
    }),
    /** Insolation proxy at the poles (baseline scale). */
    poleInsolation: Type.Number({
      default: 0.25,
      minimum: 0,
      maximum: 2,
      description: "Insolation proxy at the poles.",
    }),
    /** Controls how sharply forcing falls off with latitude (higher = sharper falloff). */
    latitudeExponent: Type.Number({
      default: 1.2,
      minimum: 0.1,
      maximum: 6,
      description: "Controls how sharply forcing falls off with latitude.",
    }),
  },
  {
    additionalProperties: false,
    description: "Radiative forcing parameters (default strategy).",
  }
);

const ComputeRadiativeForcingContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-radiative-forcing",
  input: ComputeRadiativeForcingInputSchema,
  output: ComputeRadiativeForcingOutputSchema,
  strategies: {
    default: ComputeRadiativeForcingDefaultStrategySchema,
  },
});

export default ComputeRadiativeForcingContract;
