import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static, TSchema } from "@swooper/mapgen-core/authoring";

import { FoundationMeshSchema } from "../compute-mesh/contract.js";
import { FoundationCrustSchema } from "../compute-crust/contract.js";
import { FoundationPlateGraphSchema } from "../compute-plate-graph/contract.js";
import { FoundationTectonicsSchema } from "../compute-tectonic-history/contract.js";

function withDescription<T extends TSchema>(schema: T, description: string) {
  const { additionalProperties: _additionalProperties, default: _default, ...rest } = schema as any;
  return Type.Unsafe<Static<T>>({ ...rest, description } as any);
}

/** Default strategy configuration for computing tile-space plate tensors. */
const StrategySchema = Type.Object(
  {
    /** Tile-distance influence radius for boundary closeness. */
    boundaryInfluenceDistance: Type.Integer({
      default: 5,
      minimum: 1,
      maximum: 32,
      description: "Tile-distance influence radius for boundary closeness.",
    }),
    /** Exponential decay applied to boundary closeness by distance. */
    boundaryDecay: Type.Number({
      default: 0.55,
      minimum: 0.05,
      maximum: 1,
      description: "Exponential decay applied to boundary closeness by distance.",
    }),
    /** Scale factor mapping plate velocity to int8 tile fields. */
    movementScale: Type.Number({
      default: 100,
      minimum: 1,
      maximum: 200,
      description: "Scale factor mapping plate velocity to int8 tile fields.",
    }),
    /** Scale factor mapping plate rotation to int8 tile fields. */
    rotationScale: Type.Number({
      default: 100,
      minimum: 1,
      maximum: 200,
      description: "Scale factor mapping plate rotation to int8 tile fields.",
    }),
  },
  { description: "Default strategy configuration for computing tile-space plate tensors." }
);

/** Input payload for foundation/compute-plates-tensors. */
const InputSchema = Type.Object(
  {
    /** Map width in tiles. */
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    /** Map height in tiles. */
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    /** Foundation mesh (cells, adjacency, site coordinates). */
    mesh: withDescription(FoundationMeshSchema, "Foundation mesh (cells, adjacency, site coordinates)."),
    /** Crust drivers (type/age/buoyancy/baseElevation/strength) per mesh cell. */
    crust: withDescription(
      FoundationCrustSchema,
      "Crust drivers (type/age/buoyancy/baseElevation/strength) per mesh cell."
    ),
    /** Plate graph per mesh cell (cellToPlate + per-plate metadata). */
    plateGraph: withDescription(
      FoundationPlateGraphSchema,
      "Plate graph per mesh cell (cellToPlate + per-plate metadata)."
    ),
    /** Tectonic drivers per mesh cell (boundary regime + stress/potential tensors). */
    tectonics: withDescription(
      FoundationTectonicsSchema,
      "Tectonic drivers per mesh cell (boundary regime + stress/potential tensors)."
    ),
  },
  { description: "Input payload for foundation/compute-plates-tensors." }
);

/** Crust drivers per tile, sampled via tileToCellIndex. */
const CrustTilesSchema = Type.Object(
  {
    /** Crust type per tile (0=oceanic, 1=continental), sampled via tileToCellIndex. */
    type: TypedArraySchemas.u8({
      description: "Crust type per tile (0=oceanic, 1=continental), sampled via tileToCellIndex.",
    }),
    /** Crust age per tile (0=new, 255=ancient), sampled via tileToCellIndex. */
    age: TypedArraySchemas.u8({
      description: "Crust age per tile (0=new, 255=ancient), sampled via tileToCellIndex.",
    }),
    /** Crust buoyancy proxy per tile (0..1), sampled via tileToCellIndex. */
    buoyancy: TypedArraySchemas.f32({
      description: "Crust buoyancy proxy per tile (0..1), sampled via tileToCellIndex.",
    }),
    /** Isostatic base elevation proxy per tile (0..1), sampled via tileToCellIndex. */
    baseElevation: TypedArraySchemas.f32({
      description: "Isostatic base elevation proxy per tile (0..1), sampled via tileToCellIndex.",
    }),
    /** Lithospheric strength proxy per tile (0..1), sampled via tileToCellIndex. */
    strength: TypedArraySchemas.f32({
      description: "Lithospheric strength proxy per tile (0..1), sampled via tileToCellIndex.",
    }),
  },
  { description: "Crust drivers per tile, sampled via tileToCellIndex." }
);

/** Plate tensors per tile (id + boundary regime + potentials + motion fields). */
const PlatesTilesSchema = Type.Object(
  {
    /** Plate id per tile. */
    id: TypedArraySchemas.i16({ description: "Plate id per tile." }),
    /** Boundary proximity per tile (0..255). */
    boundaryCloseness: TypedArraySchemas.u8({ description: "Boundary proximity per tile (0..255)." }),
    /** Boundary regime per tile (BOUNDARY_TYPE values), sampled from mesh-space Foundation tectonics. */
    boundaryType: TypedArraySchemas.u8({
      description:
        "Boundary regime per tile (BOUNDARY_TYPE values), sampled from mesh-space Foundation tectonics.",
    }),
    /** Tectonic stress per tile (0..255). */
    tectonicStress: TypedArraySchemas.u8({ description: "Tectonic stress per tile (0..255)." }),
    /** Uplift potential per tile (0..255). */
    upliftPotential: TypedArraySchemas.u8({ description: "Uplift potential per tile (0..255)." }),
    /** Rift potential per tile (0..255). */
    riftPotential: TypedArraySchemas.u8({ description: "Rift potential per tile (0..255)." }),
    /** Shield stability per tile (0..255). */
    shieldStability: TypedArraySchemas.u8({ description: "Shield stability per tile (0..255)." }),
    /** Volcanism per tile (0..255). */
    volcanism: TypedArraySchemas.u8({ description: "Volcanism per tile (0..255)." }),
    /** Plate movement U component per tile (-127..127). */
    movementU: TypedArraySchemas.i8({ description: "Plate movement U component per tile (-127..127)." }),
    /** Plate movement V component per tile (-127..127). */
    movementV: TypedArraySchemas.i8({ description: "Plate movement V component per tile (-127..127)." }),
    /** Plate rotation per tile (-127..127). */
    rotation: TypedArraySchemas.i8({ description: "Plate rotation per tile (-127..127)." }),
  },
  { description: "Plate tensors per tile (id + boundary regime + potentials + motion fields)." }
);

/** Output payload for foundation/compute-plates-tensors. */
const OutputSchema = Type.Object(
  {
    /** Nearest mesh cellIndex per tileIndex (canonical mesh→tile projection mapping). */
    tileToCellIndex: TypedArraySchemas.i32({
      description: "Nearest mesh cellIndex per tileIndex (canonical mesh→tile projection mapping).",
    }),
    /** Crust drivers per tile, sampled via tileToCellIndex. */
    crustTiles: CrustTilesSchema,
    /** Plate tensors per tile (id + boundary regime + potentials + motion fields). */
    plates: PlatesTilesSchema,
  },
  { description: "Output payload for foundation/compute-plates-tensors." }
);

const ComputePlatesTensorsContract = defineOp({
  kind: "compute",
  id: "foundation/compute-plates-tensors",
  input: InputSchema,
  output: OutputSchema,
  strategies: {
    default: StrategySchema,
  },
});

export default ComputePlatesTensorsContract;
export type ComputePlatesTensorsConfig = Static<typeof StrategySchema>;
