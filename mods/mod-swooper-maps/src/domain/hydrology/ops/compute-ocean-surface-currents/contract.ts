import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Computes a simplified ocean surface current field from winds and water mask.
 *
 * This is a gameplay-oriented proxy, not a CFD ocean model. It exists to provide ocean coupling signals that
 * influence downstream moisture transport and coastal climate moderation.
 *
 * Practical guidance:
 * - If you want to disable ocean influence entirely, set strategy `strength` to 0 (or select a knob preset that does so).
 */
const ComputeOceanSurfaceCurrentsInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Latitude by row in degrees; length must equal `height`. */
    latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
    /** Water mask per tile (1=water, 0=land). */
    isWaterMask: TypedArraySchemas.u8({ description: "Water mask per tile (1=water, 0=land)." }),
    /** Wind U component per tile (-127..127). */
    windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
    /** Wind V component per tile (-127..127). */
    windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
  },
  {
    additionalProperties: false,
    description: "Inputs for ocean surface current computation (deterministic, data-only).",
  }
);

/**
 * Surface current output (discrete i8 components).
 */
const ComputeOceanSurfaceCurrentsOutputSchema = Type.Object(
  {
    /** Current U component per tile (-127..127). */
    currentU: TypedArraySchemas.i8({ description: "Current U component per tile (-127..127)." }),
    /** Current V component per tile (-127..127). */
    currentV: TypedArraySchemas.i8({ description: "Current V component per tile (-127..127)." }),
  },
  {
    additionalProperties: false,
    description: "Surface current output per tile (U/V components).",
  }
);

/**
 * Default surface current parameters.
 */
const ComputeOceanSurfaceCurrentsDefaultStrategySchema = Type.Object(
  {
    /**
     * Global current strength multiplier.
     *
     * Practical guidance:
     * - Increase for stronger ocean coupling (more coastal moisture/temperature moderation).
     * - Decrease toward 0 to fade out ocean influence.
     */
    strength: Type.Number({
      default: 1,
      minimum: 0,
      maximum: 4,
      description: "Global current strength multiplier.",
    }),
  },
  {
    additionalProperties: false,
    description: "Ocean surface current parameters (default strategy).",
  }
);

const ComputeOceanSurfaceCurrentsContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-ocean-surface-currents",
  input: ComputeOceanSurfaceCurrentsInputSchema,
  output: ComputeOceanSurfaceCurrentsOutputSchema,
  strategies: {
    default: ComputeOceanSurfaceCurrentsDefaultStrategySchema,
  },
});

export default ComputeOceanSurfaceCurrentsContract;
