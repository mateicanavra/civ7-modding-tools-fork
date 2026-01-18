import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ProjectRiverNetworkContract = defineOp({
  kind: "compute",
  id: "hydrology/project-river-network",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
      discharge: TypedArraySchemas.f32({ description: "Discharge proxy per tile." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      riverClass: TypedArraySchemas.u8({
        description: "River class per tile (0=none, 1=minor, 2=major).",
      }),
      minorThreshold: Type.Number({
        description: "Computed discharge threshold for minor rivers (same units as discharge).",
      }),
      majorThreshold: Type.Number({
        description: "Computed discharge threshold for major rivers (same units as discharge).",
      }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        minorPercentile: Type.Number({
          default: 0.85,
          minimum: 0,
          maximum: 1,
          description: "Discharge percentile used as the minor river threshold (0..1).",
        }),
        majorPercentile: Type.Number({
          default: 0.95,
          minimum: 0,
          maximum: 1,
          description: "Discharge percentile used as the major river threshold (0..1).",
        }),
        minMinorDischarge: Type.Number({
          default: 0,
          minimum: 0,
          maximum: 1e9,
          description: "Minimum discharge allowed for minor rivers (same units as discharge).",
        }),
        minMajorDischarge: Type.Number({
          default: 0,
          minimum: 0,
          maximum: 1e9,
          description: "Minimum discharge allowed for major rivers (same units as discharge).",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ProjectRiverNetworkContract;

