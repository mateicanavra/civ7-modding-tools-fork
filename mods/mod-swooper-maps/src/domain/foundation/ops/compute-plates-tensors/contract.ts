import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import { FoundationMeshSchema } from "../compute-mesh/contract.js";
import { FoundationPlateGraphSchema } from "../compute-plate-graph/contract.js";
import { FoundationTectonicsSchema } from "../compute-tectonics/contract.js";

const StrategySchema = Type.Object(
  {
    boundaryInfluenceDistance: Type.Optional(
      Type.Integer({
        default: 5,
        minimum: 1,
        maximum: 32,
        description: "Tile-distance influence radius for boundary closeness.",
      })
    ),
    boundaryDecay: Type.Optional(
      Type.Number({
        default: 0.55,
        minimum: 0.05,
        maximum: 1,
        description: "Exponential decay applied to boundary closeness by distance.",
      })
    ),
    movementScale: Type.Optional(
      Type.Number({
        default: 100,
        minimum: 1,
        maximum: 200,
        description: "Scale factor mapping plate velocity to int8 tile fields.",
      })
    ),
    rotationScale: Type.Optional(
      Type.Number({
        default: 100,
        minimum: 1,
        maximum: 200,
        description: "Scale factor mapping plate rotation to int8 tile fields.",
      })
    ),
  },
  { additionalProperties: false }
);

const ComputePlatesTensorsContract = defineOp({
  kind: "compute",
  id: "foundation/compute-plates-tensors",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      mesh: FoundationMeshSchema,
      plateGraph: FoundationPlateGraphSchema,
      tectonics: FoundationTectonicsSchema,
      trace: Type.Optional(Type.Any()),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      plates: Type.Object(
        {
          id: TypedArraySchemas.i16({ description: "Plate id per tile." }),
          boundaryCloseness: TypedArraySchemas.u8({ description: "Boundary proximity per tile (0..255)." }),
          boundaryType: TypedArraySchemas.u8({ description: "Boundary type per tile (BOUNDARY_TYPE values)." }),
          tectonicStress: TypedArraySchemas.u8({ description: "Tectonic stress per tile (0..255)." }),
          upliftPotential: TypedArraySchemas.u8({ description: "Uplift potential per tile (0..255)." }),
          riftPotential: TypedArraySchemas.u8({ description: "Rift potential per tile (0..255)." }),
          shieldStability: TypedArraySchemas.u8({ description: "Shield stability per tile (0..255)." }),
          movementU: TypedArraySchemas.i8({ description: "Plate movement U component per tile (-127..127)." }),
          movementV: TypedArraySchemas.i8({ description: "Plate movement V component per tile (-127..127)." }),
          rotation: TypedArraySchemas.i8({ description: "Plate rotation per tile (-127..127)." }),
        },
        { additionalProperties: false }
      ),
      plateSeed: Type.Any(),
      diagnostics: Type.Any(),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputePlatesTensorsContract;
export type ComputePlatesTensorsConfig = Static<typeof StrategySchema>;
