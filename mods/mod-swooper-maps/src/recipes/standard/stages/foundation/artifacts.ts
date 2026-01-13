import { TypedArraySchemas, Type, defineArtifact } from "@swooper/mapgen-core/authoring";
import {
  FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
  FOUNDATION_CRUST_ARTIFACT_TAG,
  FOUNDATION_MESH_ARTIFACT_TAG,
  FOUNDATION_PLATE_GRAPH_ARTIFACT_TAG,
  FOUNDATION_PLATES_ARTIFACT_TAG,
  FOUNDATION_SEED_ARTIFACT_TAG,
  FOUNDATION_TECTONICS_ARTIFACT_TAG,
} from "@swooper/mapgen-core";

const FoundationPlatesArtifactSchema = Type.Object(
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
);

const FoundationMeshArtifactSchema = Type.Object(
  {
    cellCount: Type.Integer({ minimum: 1, description: "Number of mesh cells." }),
    siteX: TypedArraySchemas.f32({ shape: null, description: "X coordinate per mesh cell." }),
    siteY: TypedArraySchemas.f32({ shape: null, description: "Y coordinate per mesh cell." }),
    neighborsOffsets: TypedArraySchemas.i32({
      shape: null,
      description: "CSR offsets into neighbors array (length = cellCount + 1).",
    }),
    neighbors: TypedArraySchemas.i32({ shape: null, description: "CSR neighbor indices." }),
    areas: TypedArraySchemas.f32({ shape: null, description: "Cell area per mesh cell (units: bbox space)." }),
    bbox: Type.Object(
      {
        xl: Type.Number(),
        xr: Type.Number(),
        yt: Type.Number(),
        yb: Type.Number(),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

const FoundationCrustArtifactSchema = Type.Object(
  {
    type: TypedArraySchemas.u8({
      shape: null,
      description: "Crust type per mesh cell (0=oceanic, 1=continental).",
    }),
    age: TypedArraySchemas.u8({
      shape: null,
      description: "Crust age per mesh cell (0=new, 255=ancient).",
    }),
  },
  { additionalProperties: false }
);

const FoundationPlateGraphArtifactSchema = Type.Object(
  {
    cellToPlate: TypedArraySchemas.i16({ shape: null, description: "Plate id per mesh cell." }),
    plates: Type.Array(
      Type.Object(
        {
          id: Type.Integer({ minimum: 0 }),
          kind: Type.Union([Type.Literal("major"), Type.Literal("minor")]),
          seedX: Type.Number(),
          seedY: Type.Number(),
          velocityX: Type.Number(),
          velocityY: Type.Number(),
          rotation: Type.Number(),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

const FoundationTectonicsArtifactSchema = Type.Object(
  {
    boundaryType: TypedArraySchemas.u8({
      shape: null,
      description: "Boundary type per mesh cell (BOUNDARY_TYPE values; 0 when non-boundary/unknown).",
    }),
    upliftPotential: TypedArraySchemas.u8({ shape: null, description: "Uplift potential per mesh cell (0..255)." }),
    riftPotential: TypedArraySchemas.u8({ shape: null, description: "Rift potential per mesh cell (0..255)." }),
    shearStress: TypedArraySchemas.u8({ shape: null, description: "Shear stress per mesh cell (0..255)." }),
    volcanism: TypedArraySchemas.u8({ shape: null, description: "Volcanism per mesh cell (0..255)." }),
    fracture: TypedArraySchemas.u8({ shape: null, description: "Fracture potential per mesh cell (0..255)." }),
    cumulativeUplift: TypedArraySchemas.u8({
      shape: null,
      description: "Accumulated uplift per mesh cell (0..255).",
    }),
  },
  { additionalProperties: false }
);


export const foundationArtifacts = {
  mesh: defineArtifact({
    name: "foundationMesh",
    id: FOUNDATION_MESH_ARTIFACT_TAG,
    schema: FoundationMeshArtifactSchema,
  }),
  crust: defineArtifact({
    name: "foundationCrust",
    id: FOUNDATION_CRUST_ARTIFACT_TAG,
    schema: FoundationCrustArtifactSchema,
  }),
  plateGraph: defineArtifact({
    name: "foundationPlateGraph",
    id: FOUNDATION_PLATE_GRAPH_ARTIFACT_TAG,
    schema: FoundationPlateGraphArtifactSchema,
  }),
  tectonics: defineArtifact({
    name: "foundationTectonics",
    id: FOUNDATION_TECTONICS_ARTIFACT_TAG,
    schema: FoundationTectonicsArtifactSchema,
  }),
  plates: defineArtifact({
    name: "foundationPlates",
    id: FOUNDATION_PLATES_ARTIFACT_TAG,
    schema: FoundationPlatesArtifactSchema,
  }),
  seed: defineArtifact({
    name: "foundationSeed",
    id: FOUNDATION_SEED_ARTIFACT_TAG,
    schema: Type.Any(),
  }),
  diagnostics: defineArtifact({
    name: "foundationDiagnostics",
    id: FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
    schema: Type.Any(),
  }),
} as const;
