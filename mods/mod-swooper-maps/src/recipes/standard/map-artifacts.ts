import { Type, TypedArraySchemas, defineArtifact } from "@swooper/mapgen-core/authoring";

const ProjectionMetaArtifactSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    wrapX: Type.Literal(true, { description: "Civ7 topology lock: wrap X is always enabled." }),
    wrapY: Type.Literal(false, { description: "Civ7 topology lock: wrap Y is always disabled." }),
  },
  {
    additionalProperties: false,
    description:
      "Gameplay-owned projection metadata for interpreting tile-indexed rasters under Phase 2 topology locks.",
  }
);

const LandmassRegionSlotByTileArtifactSchema = Type.Object(
  {
    slotByTile: TypedArraySchemas.u8({
      description:
        "Per-tile landmass region slot (0=none, 1=west, 2=east), in tileIndex order.",
    }),
  },
  {
    additionalProperties: false,
    description:
      "Gameplay-owned region slot projection derived from Morphology landmasses (Phase 2: slots, not engine ids).",
  }
);

export const mapArtifacts = {
  projectionMeta: defineArtifact({
    name: "projectionMeta",
    id: "artifact:map.projectionMeta",
    schema: ProjectionMetaArtifactSchema,
  }),
  landmassRegionSlotByTile: defineArtifact({
    name: "landmassRegionSlotByTile",
    id: "artifact:map.landmassRegionSlotByTile",
    schema: LandmassRegionSlotByTileArtifactSchema,
  }),
} as const;

