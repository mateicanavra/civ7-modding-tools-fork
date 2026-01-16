import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { MountainsConfigSchema } from "../../config.js";

const PlanRidgesAndFoothillsContract = defineOp({
  kind: "plan",
  id: "morphology/plan-ridges-and-foothills",
  input: Type.Object({
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    boundaryCloseness: TypedArraySchemas.u8({ description: "Boundary proximity per tile (0..255)." }),
    boundaryType: TypedArraySchemas.u8({ description: "Boundary type per tile (1=conv,2=div,3=trans)." }),
    upliftPotential: TypedArraySchemas.u8({ description: "Uplift potential per tile (0..255)." }),
    riftPotential: TypedArraySchemas.u8({ description: "Rift potential per tile (0..255)." }),
    tectonicStress: TypedArraySchemas.u8({ description: "Tectonic stress per tile (0..255)." }),
    fractalMountain: TypedArraySchemas.i16({ description: "Fractal noise for mountain scores." }),
    fractalHill: TypedArraySchemas.i16({ description: "Fractal noise for hill scores." }),
  }),
  output: Type.Object({
    mountainMask: TypedArraySchemas.u8({ description: "Mask (1/0): mountain tiles." }),
    hillMask: TypedArraySchemas.u8({ description: "Mask (1/0): hill tiles (excluding mountains)." }),
  }),
  strategies: {
    default: MountainsConfigSchema,
  },
});

export default PlanRidgesAndFoothillsContract;
