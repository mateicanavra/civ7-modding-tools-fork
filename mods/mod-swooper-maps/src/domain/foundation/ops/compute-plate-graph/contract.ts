import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";
import { FoundationMeshSchema } from "../compute-mesh/contract.js";
import { FoundationCrustSchema } from "../compute-crust/contract.js";

const StrategySchema = Type.Object(
  {
    /** Authored plate count (scaled to the runtime map size in normalization). */
    plateCount: Type.Integer({
      default: 8,
      minimum: 2,
      maximum: 256,
      description:
        "Authored plate count (scaled to the runtime map size in normalization).",
    }),
    /** Reference map area (width*height) used for plateCount scaling. */
    referenceArea: Type.Integer({
      default: 4000,
      minimum: 1,
      description: "Reference map area (width*height) used for plateCount scaling.",
    }),
    /** Exponent applied to (area/referenceArea) when scaling plateCount. */
    plateScalePower: Type.Number({
      default: 0.5,
      minimum: 0,
      maximum: 2,
      description: "Exponent applied to (area/referenceArea) when scaling plateCount.",
    }),
    /** Polar cap + polar microplate policy. */
    polarCaps: Type.Object(
      {
        /** Fraction of mesh Y-span reserved as the locked polar cap in each hemisphere. */
        capFraction: Type.Number({
          default: 0.1,
          minimum: 0.02,
          maximum: 0.25,
          description: "Fraction of mesh Y-span reserved as the locked polar cap in each hemisphere.",
        }),
        /** Fraction of mesh Y-span eligible for polar microplate seeding (outside the locked cap). */
        microplateBandFraction: Type.Number({
          default: 0.2,
          minimum: 0.02,
          maximum: 0.5,
          description:
            "Fraction of mesh Y-span eligible for polar microplate seeding (outside the locked cap).",
        }),
        /** Maximum polar microplates per pole (subject to plateCount and min-plate guards). */
        microplatesPerPole: Type.Integer({
          default: 0,
          minimum: 0,
          maximum: 8,
          description: "Maximum polar microplates per pole (subject to plateCount and min-plate guards).",
        }),
        /** Only enable polar microplates when the normalized plateCount meets this threshold. */
        microplatesMinPlateCount: Type.Integer({
          default: 14,
          minimum: 0,
          maximum: 256,
          description: "Only enable polar microplates when the normalized plateCount meets this threshold.",
        }),
        /** Minimum cell area for a polar microplate (sliver guardrail). */
        microplateMinAreaCells: Type.Integer({
          default: 8,
          minimum: 1,
          maximum: 10_000,
          description: "Minimum cell area for a polar microplate (sliver guardrail).",
        }),
        /** Baseline tangential speed magnitude used for polar caps and polar microplates. */
        tangentialSpeed: Type.Number({
          default: 0.9,
          minimum: 0,
          maximum: 10,
          description: "Baseline tangential speed magnitude used for polar caps and polar microplates.",
        }),
        /** Angle jitter (degrees) applied around tangential direction for polar microplates. */
        tangentialJitterDeg: Type.Number({
          default: 12,
          minimum: 0,
          maximum: 90,
          description: "Angle jitter (degrees) applied around tangential direction for polar microplates.",
        }),
      },
      {
        additionalProperties: false,
        description: "Polar cap + polar microplate policy.",
      }
    ),
  },
  { additionalProperties: false }
);

export const FoundationPlateSchema = Type.Object(
  {
    /** Plate id (0..plateCount-1). */
    id: Type.Integer({
      minimum: 0,
      default: 0,
      description: "Plate id (0..plateCount-1).",
    }),
    /** Plate role classification (polarCap, polarMicroplate, tectonic). */
    role: Type.Union([Type.Literal("polarCap"), Type.Literal("polarMicroplate"), Type.Literal("tectonic")], {
      default: "tectonic",
      description: "Plate role classification (polarCap, polarMicroplate, tectonic).",
    }),
    /** Plate kind classification (major or minor). */
    kind: Type.Union([Type.Literal("major"), Type.Literal("minor")], {
      default: "minor",
      description: "Plate kind classification (major or minor).",
    }),
    /** Seed location X in mesh hex space. */
    seedX: Type.Number({ default: 0, description: "Seed location X in mesh hex space." }),
    /** Seed location Y in mesh hex space. */
    seedY: Type.Number({ default: 0, description: "Seed location Y in mesh hex space." }),
    /** Plate velocity X component in mesh space. */
    velocityX: Type.Number({ default: 0, description: "Plate velocity X component in mesh space." }),
    /** Plate velocity Y component in mesh space. */
    velocityY: Type.Number({ default: 0, description: "Plate velocity Y component in mesh space." }),
    /** Plate angular rotation rate (normalized units). */
    rotation: Type.Number({ default: 0, description: "Plate angular rotation rate (normalized units)." }),
  },
  { additionalProperties: false }
);

export const FoundationPlateGraphSchema = Type.Object(
  {
    /** Plate id per mesh cell. */
    cellToPlate: TypedArraySchemas.i16({ shape: null, description: "Plate id per mesh cell." }),
    /** Plate definitions keyed by id. */
    plates: Type.Immutable(
      Type.Array(FoundationPlateSchema, {
        description: "Plate definitions keyed by id.",
      })
    ),
  },
  { additionalProperties: false }
);

const ComputePlateGraphContract = defineOp({
  kind: "compute",
  id: "foundation/compute-plate-graph",
  input: Type.Object(
    {
      /** Foundation mesh (cells, adjacency, site coordinates). */
      mesh: FoundationMeshSchema,
      /** Crust drivers (type/age/buoyancy/baseElevation/strength) per mesh cell. */
      crust: FoundationCrustSchema,
      /** Deterministic RNG seed (derived in the step; pure data). */
      rngSeed: Type.Integer({
        minimum: 0,
        maximum: 2_147_483_647,
        description: "Deterministic RNG seed (derived in the step; pure data).",
      }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      /** Plate partition + kinematics per mesh cell. */
      plateGraph: FoundationPlateGraphSchema,
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputePlateGraphContract;
export type ComputePlateGraphConfig = Static<typeof StrategySchema>;
export type FoundationPlate = Static<typeof FoundationPlateSchema>;
export type FoundationPlateGraph = Static<typeof FoundationPlateGraphSchema>;
