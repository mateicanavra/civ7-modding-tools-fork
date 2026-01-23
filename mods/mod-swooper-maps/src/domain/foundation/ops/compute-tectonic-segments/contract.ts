import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";
import { FoundationCrustSchema } from "../compute-crust/contract.js";
import { FoundationMeshSchema } from "../compute-mesh/contract.js";
import { FoundationPlateGraphSchema } from "../compute-plate-graph/contract.js";

const StrategySchema = Type.Object(
  {
    intensityScale: Type.Number({
      default: 180,
      minimum: 1,
      maximum: 10_000,
      description: "Scale factor applied to relative motion components to produce 0..255 segment intensities.",
    }),
    regimeMinIntensity: Type.Integer({
      default: 4,
      minimum: 0,
      maximum: 255,
      description: "Minimum max-intensity required to classify a segment as a non-none regime.",
    }),
  },
  { additionalProperties: false }
);

export const FoundationTectonicSegmentsSchema = Type.Object(
  {
    segmentCount: Type.Integer({ minimum: 0 }),
    aCell: TypedArraySchemas.i32({ shape: null, description: "Mesh cell A per boundary segment." }),
    bCell: TypedArraySchemas.i32({ shape: null, description: "Mesh cell B per boundary segment." }),
    plateA: TypedArraySchemas.i16({ shape: null, description: "Plate id for cell A per segment." }),
    plateB: TypedArraySchemas.i16({ shape: null, description: "Plate id for cell B per segment." }),
    regime: TypedArraySchemas.u8({
      shape: null,
      description: "Boundary regime per segment (0=none, 1=convergent, 2=divergent, 3=transform).",
    }),
    polarity: TypedArraySchemas.i8({
      shape: null,
      description:
        "Polarity for convergent segments (-1=plateA subducts, +1=plateB subducts, 0=unknown/non-convergent).",
    }),
    compression: TypedArraySchemas.u8({ shape: null, description: "Compression intensity per segment (0..255)." }),
    extension: TypedArraySchemas.u8({ shape: null, description: "Extension intensity per segment (0..255)." }),
    shear: TypedArraySchemas.u8({ shape: null, description: "Shear intensity per segment (0..255)." }),
    volcanism: TypedArraySchemas.u8({ shape: null, description: "Volcanism potential per segment (0..255)." }),
    fracture: TypedArraySchemas.u8({ shape: null, description: "Fracture potential per segment (0..255)." }),
    driftU: TypedArraySchemas.i8({
      shape: null,
      description: "Normalized drift direction U per segment (-127..127), used for pseudo-evolution across eras.",
    }),
    driftV: TypedArraySchemas.i8({
      shape: null,
      description: "Normalized drift direction V per segment (-127..127), used for pseudo-evolution across eras.",
    }),
  },
  { additionalProperties: false }
);

const ComputeTectonicSegmentsContract = defineOp({
  kind: "compute",
  id: "foundation/compute-tectonic-segments",
  input: Type.Object(
    {
      mesh: FoundationMeshSchema,
      crust: FoundationCrustSchema,
      plateGraph: FoundationPlateGraphSchema,
    },
    { additionalProperties: false }
  ),
  output: Type.Object({ segments: FoundationTectonicSegmentsSchema }, { additionalProperties: false }),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputeTectonicSegmentsContract;
export type ComputeTectonicSegmentsConfig = Static<typeof StrategySchema>;
export type FoundationTectonicSegments = Static<typeof FoundationTectonicSegmentsSchema>;

