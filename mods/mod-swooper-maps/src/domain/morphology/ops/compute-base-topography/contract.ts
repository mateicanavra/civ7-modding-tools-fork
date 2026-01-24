import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { ReliefConfigSchema } from "../../config.js";

/**
 * Converts crust isostasy baseline + tectonic potentials into the initial elevation field.
 */
const ComputeBaseTopographyContract = defineOp({
  kind: "compute",
  id: "morphology/compute-base-topography",
  input: Type.Object({
    /** Map width in tiles. */
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    /** Map height in tiles. */
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    /** Isostatic base elevation proxy per tile (0..1), projected from mesh crust truth. */
    crustBaseElevation: TypedArraySchemas.f32({
      description: "Isostatic base elevation proxy per tile (0..1), projected from mesh crust truth.",
    }),
    /** Boundary proximity per tile (0..255). */
    boundaryCloseness: TypedArraySchemas.u8({
      description: "Boundary proximity per tile (0..255).",
    }),
    /** Uplift potential per tile (0..255). */
    upliftPotential: TypedArraySchemas.u8({
      description: "Uplift potential per tile (0..255).",
    }),
    /** Rift potential per tile (0..255). */
    riftPotential: TypedArraySchemas.u8({
      description: "Rift potential per tile (0..255).",
    }),
    /** Seed for deterministic base-topography noise. */
    rngSeed: Type.Integer({ description: "Seed for deterministic base-topography noise." }),
  }),
  output: Type.Object({
    /** Base elevation per tile (normalized, scaled to int16). */
    elevation: TypedArraySchemas.i16({
      description: "Base elevation per tile (normalized, scaled to int16).",
    }),
  }),
  strategies: {
    default: ReliefConfigSchema,
  },
});

export default ComputeBaseTopographyContract;
