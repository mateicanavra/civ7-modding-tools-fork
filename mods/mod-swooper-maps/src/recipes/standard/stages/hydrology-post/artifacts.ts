import { defineArtifact, Type, TypedArraySchemas } from "@swooper/mapgen-core/authoring";

export const HydrologyClimateIndicesSchema = Type.Object(
  {
    surfaceTemperatureC: TypedArraySchemas.f32({ description: "Surface temperature proxy (C)." }),
    pet: TypedArraySchemas.f32({ description: "Potential evapotranspiration proxy (rainfall units)." }),
    aridityIndex: TypedArraySchemas.f32({ description: "Aridity index (0..1) derived from P vs PET." }),
    freezeIndex: TypedArraySchemas.f32({ description: "Freeze persistence index (0..1)." }),
  },
  { additionalProperties: false }
);

export const HydrologyCryosphereSchema = Type.Object(
  {
    snowCover: TypedArraySchemas.u8({ description: "Snow cover fraction (0..255) per tile." }),
    seaIceCover: TypedArraySchemas.u8({ description: "Sea ice cover fraction (0..255) per tile." }),
    albedo: TypedArraySchemas.u8({ description: "Albedo proxy (0..255) per tile." }),
  },
  { additionalProperties: false }
);

export const HydrologyClimateDiagnosticsSchema = Type.Object(
  {
    rainShadowIndex: TypedArraySchemas.f32({
      description: "Advisory rain shadow proxy (0..1) per tile (diagnostic projection; not Hydrology internal truth).",
    }),
    continentalityIndex: TypedArraySchemas.f32({
      description: "Advisory continentality proxy (0..1) per tile (diagnostic projection; not Hydrology internal truth).",
    }),
    convergenceIndex: TypedArraySchemas.f32({
      description: "Advisory convergence proxy (0..1) per tile (diagnostic projection; not Hydrology internal truth).",
    }),
  },
  { additionalProperties: false }
);

export const hydrologyPostArtifacts = {
  climateIndices: defineArtifact({
    name: "climateIndices",
    id: "artifact:hydrology.climateIndices",
    schema: HydrologyClimateIndicesSchema,
  }),
  cryosphere: defineArtifact({
    name: "cryosphere",
    id: "artifact:hydrology.cryosphere",
    schema: HydrologyCryosphereSchema,
  }),
  climateDiagnostics: defineArtifact({
    name: "climateDiagnostics",
    id: "artifact:hydrology.climateDiagnostics",
    schema: HydrologyClimateDiagnosticsSchema,
  }),
} as const;
