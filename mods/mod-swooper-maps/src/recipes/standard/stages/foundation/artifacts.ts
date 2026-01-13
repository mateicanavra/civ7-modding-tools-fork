import { TypedArraySchemas, Type, defineArtifact } from "@swooper/mapgen-core/authoring";
import {
  FOUNDATION_CONFIG_ARTIFACT_TAG,
  FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
  FOUNDATION_DYNAMICS_ARTIFACT_TAG,
  FOUNDATION_PLATES_ARTIFACT_TAG,
  FOUNDATION_SEED_ARTIFACT_TAG,
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

const FoundationDynamicsArtifactSchema = Type.Object(
  {
    windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
    windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
    currentU: TypedArraySchemas.i8({ description: "Current U component per tile (-127..127)." }),
    currentV: TypedArraySchemas.i8({ description: "Current V component per tile (-127..127)." }),
    pressure: TypedArraySchemas.u8({ description: "Mantle pressure per tile (0..255)." }),
  },
  { additionalProperties: false }
);

export const foundationArtifacts = {
  plates: defineArtifact({
    name: "foundationPlates",
    id: FOUNDATION_PLATES_ARTIFACT_TAG,
    schema: FoundationPlatesArtifactSchema,
  }),
  dynamics: defineArtifact({
    name: "foundationDynamics",
    id: FOUNDATION_DYNAMICS_ARTIFACT_TAG,
    schema: FoundationDynamicsArtifactSchema,
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
  config: defineArtifact({
    name: "foundationConfig",
    id: FOUNDATION_CONFIG_ARTIFACT_TAG,
    schema: Type.Any(),
  }),
} as const;
