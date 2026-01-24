import { TypedArraySchemas, Type, defineArtifact } from "@swooper/mapgen-core/authoring";
import {
  FOUNDATION_CRUST_ARTIFACT_TAG,
  FOUNDATION_CRUST_TILES_ARTIFACT_TAG,
  FOUNDATION_MESH_ARTIFACT_TAG,
  FOUNDATION_PLATE_GRAPH_ARTIFACT_TAG,
  FOUNDATION_PLATES_ARTIFACT_TAG,
  FOUNDATION_TECTONICS_ARTIFACT_TAG,
  FOUNDATION_TILE_TO_CELL_INDEX_ARTIFACT_TAG,
} from "@swooper/mapgen-core";

const FOUNDATION_TECTONIC_SEGMENTS_ARTIFACT_TAG = "artifact:foundation.tectonicSegments";
const FOUNDATION_TECTONIC_HISTORY_ARTIFACT_TAG = "artifact:foundation.tectonicHistory";
const FOUNDATION_PLATE_TOPOLOGY_ARTIFACT_TAG = "artifact:foundation.plateTopology";

/** Bounding box in mesh-space units. */
const BoundingBoxSchema = Type.Object(
  {
    /** Left X coordinate of the bounding box (mesh space). */
    xl: Type.Number({ description: "Left X coordinate of the bounding box (mesh space)." }),
    /** Right X coordinate of the bounding box (mesh space). */
    xr: Type.Number({ description: "Right X coordinate of the bounding box (mesh space)." }),
    /** Top Y coordinate of the bounding box (mesh space). */
    yt: Type.Number({ description: "Top Y coordinate of the bounding box (mesh space)." }),
    /** Bottom Y coordinate of the bounding box (mesh space). */
    yb: Type.Number({ description: "Bottom Y coordinate of the bounding box (mesh space)." }),
  },
  { description: "Bounding box in mesh-space units." }
);

/** Plate metadata entry (seed + kinematics + classification). */
const FoundationPlateMetadataSchema = Type.Object(
  {
    /** Plate id (0..plateCount-1). */
    id: Type.Integer({ minimum: 0, description: "Plate id (0..plateCount-1)." }),
    /** Plate role classification. */
    role: Type.Union([Type.Literal("polarCap"), Type.Literal("polarMicroplate"), Type.Literal("tectonic")], {
      description: "Plate role classification.",
    }),
    /** Plate size classification. */
    kind: Type.Union([Type.Literal("major"), Type.Literal("minor")], { description: "Plate size classification." }),
    /** Plate seed X coordinate in mesh space. */
    seedX: Type.Number({ description: "Plate seed X coordinate in mesh space." }),
    /** Plate seed Y coordinate in mesh space. */
    seedY: Type.Number({ description: "Plate seed Y coordinate in mesh space." }),
    /** Plate velocity X component. */
    velocityX: Type.Number({ description: "Plate velocity X component." }),
    /** Plate velocity Y component. */
    velocityY: Type.Number({ description: "Plate velocity Y component." }),
    /** Plate angular rotation rate. */
    rotation: Type.Number({ description: "Plate angular rotation rate." }),
  },
  { description: "Plate metadata entry (seed + kinematics + classification)." }
);

/** Plate centroid in mesh-space coordinates. */
const FoundationPlateCentroidSchema = Type.Object(
  {
    /** Plate centroid X coordinate (mesh space). */
    x: Type.Number({ description: "Plate centroid X coordinate (mesh space)." }),
    /** Plate centroid Y coordinate (mesh space). */
    y: Type.Number({ description: "Plate centroid Y coordinate (mesh space)." }),
  },
  { description: "Plate centroid in mesh-space coordinates." }
);

/** Plate topology entry (area + centroid + adjacency). */
const FoundationPlateTopologySchema = Type.Object(
  {
    /** Plate id (0..plateCount-1). */
    id: Type.Integer({ minimum: 0, description: "Plate id (0..plateCount-1)." }),
    /** Plate area in mesh cells. */
    area: Type.Integer({ minimum: 0, description: "Plate area in mesh cells." }),
    /** Plate centroid in mesh-space coordinates. */
    centroid: FoundationPlateCentroidSchema,
    /** Neighbor plate ids. */
    neighbors: Type.Array(Type.Integer({ minimum: 0, description: "Neighbor plate id." }), {
      default: [],
      description: "Neighbor plate ids.",
    }),
  },
  { description: "Plate topology entry (area + centroid + adjacency)." }
);

/** Foundation tectonic segments artifact payload. */
const FoundationTectonicSegmentsArtifactSchema = Type.Object(
  {
    /** Number of tectonic boundary segments. */
    segmentCount: Type.Integer({ minimum: 0, description: "Number of tectonic boundary segments." }),
    /** Mesh cell index for side A of each segment. */
    aCell: TypedArraySchemas.i32({ shape: null, description: "Mesh cell index for side A of each segment." }),
    /** Mesh cell index for side B of each segment. */
    bCell: TypedArraySchemas.i32({ shape: null, description: "Mesh cell index for side B of each segment." }),
    /** Plate id for side A of each segment. */
    plateA: TypedArraySchemas.i16({ shape: null, description: "Plate id for side A of each segment." }),
    /** Plate id for side B of each segment. */
    plateB: TypedArraySchemas.i16({ shape: null, description: "Plate id for side B of each segment." }),
    /** Boundary regime for each segment (BOUNDARY_TYPE values). */
    regime: TypedArraySchemas.u8({ shape: null, description: "Boundary regime for each segment (BOUNDARY_TYPE values)." }),
    /** Boundary polarity for each segment (signed indicator). */
    polarity: TypedArraySchemas.i8({ shape: null, description: "Boundary polarity for each segment (signed indicator)." }),
    /** Compression component for each segment (0..255). */
    compression: TypedArraySchemas.u8({ shape: null, description: "Compression component for each segment (0..255)." }),
    /** Extension component for each segment (0..255). */
    extension: TypedArraySchemas.u8({ shape: null, description: "Extension component for each segment (0..255)." }),
    /** Shear component for each segment (0..255). */
    shear: TypedArraySchemas.u8({ shape: null, description: "Shear component for each segment (0..255)." }),
    /** Volcanism potential for each segment (0..255). */
    volcanism: TypedArraySchemas.u8({ shape: null, description: "Volcanism potential for each segment (0..255)." }),
    /** Fracture potential for each segment (0..255). */
    fracture: TypedArraySchemas.u8({ shape: null, description: "Fracture potential for each segment (0..255)." }),
    /** Drift vector U component for each segment (-127..127). */
    driftU: TypedArraySchemas.i8({ shape: null, description: "Drift vector U component for each segment (-127..127)." }),
    /** Drift vector V component for each segment (-127..127). */
    driftV: TypedArraySchemas.i8({ shape: null, description: "Drift vector V component for each segment (-127..127)." }),
  },
  { description: "Foundation tectonic segments artifact payload." }
);

/** Foundation tectonic history era payload (per-era tectonic driver tensors). */
const FoundationTectonicHistoryEraArtifactSchema = Type.Object(
  {
    /** Boundary type per mesh cell (BOUNDARY_TYPE values). */
    boundaryType: TypedArraySchemas.u8({ shape: null, description: "Boundary type per mesh cell (BOUNDARY_TYPE values)." }),
    /** Uplift potential per mesh cell (0..255). */
    upliftPotential: TypedArraySchemas.u8({ shape: null, description: "Uplift potential per mesh cell (0..255)." }),
    /** Rift potential per mesh cell (0..255). */
    riftPotential: TypedArraySchemas.u8({ shape: null, description: "Rift potential per mesh cell (0..255)." }),
    /** Shear stress per mesh cell (0..255). */
    shearStress: TypedArraySchemas.u8({ shape: null, description: "Shear stress per mesh cell (0..255)." }),
    /** Volcanism per mesh cell (0..255). */
    volcanism: TypedArraySchemas.u8({ shape: null, description: "Volcanism per mesh cell (0..255)." }),
    /** Fracture potential per mesh cell (0..255). */
    fracture: TypedArraySchemas.u8({ shape: null, description: "Fracture potential per mesh cell (0..255)." }),
  },
  { description: "Foundation tectonic history era payload (per-era tectonic driver tensors)." }
);

/** Foundation tectonic history artifact payload (fixed-count eras + cumulative fields). */
const FoundationTectonicHistoryArtifactSchema = Type.Object(
  {
    /** Number of eras included in the history payload. */
    eraCount: Type.Integer({ minimum: 1, description: "Number of eras included in the history payload." }),
    /** Era payloads (length = eraCount). */
    eras: Type.Array(FoundationTectonicHistoryEraArtifactSchema, { description: "Era payloads (length = eraCount)." }),
    /** Accumulated uplift total per mesh cell (0..255). */
    upliftTotal: TypedArraySchemas.u8({ shape: null, description: "Accumulated uplift total per mesh cell (0..255)." }),
    /** Accumulated fracture total per mesh cell (0..255). */
    fractureTotal: TypedArraySchemas.u8({ shape: null, description: "Accumulated fracture total per mesh cell (0..255)." }),
    /** Accumulated volcanism total per mesh cell (0..255). */
    volcanismTotal: TypedArraySchemas.u8({ shape: null, description: "Accumulated volcanism total per mesh cell (0..255)." }),
    /** Fraction of uplift attributable to recent eras per mesh cell (0..255). */
    upliftRecentFraction: TypedArraySchemas.u8({
      shape: null,
      description: "Fraction of uplift attributable to recent eras per mesh cell (0..255).",
    }),
    /** Last active era index per mesh cell (0..255). */
    lastActiveEra: TypedArraySchemas.u8({ shape: null, description: "Last active era index per mesh cell (0..255)." }),
  },
  { description: "Foundation tectonic history artifact payload (fixed-count eras + cumulative fields)." }
);

/** Foundation plates artifact payload (tile-space plate tensors). */
const FoundationPlatesArtifactSchema = Type.Object(
  {
    /** Plate id per tile. */
    id: TypedArraySchemas.i16({ description: "Plate id per tile." }),
    /** Boundary proximity per tile (0..255). */
    boundaryCloseness: TypedArraySchemas.u8({ description: "Boundary proximity per tile (0..255)." }),
    /** Boundary type per tile (BOUNDARY_TYPE values). */
    boundaryType: TypedArraySchemas.u8({ description: "Boundary type per tile (BOUNDARY_TYPE values)." }),
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
  { description: "Foundation plates artifact payload (tile-space plate tensors)." }
);

/** Foundation mesh artifact payload (cells + adjacency + site coordinates). */
const FoundationMeshArtifactSchema = Type.Object(
  {
    /** Number of mesh cells. */
    cellCount: Type.Integer({ minimum: 1, description: "Number of mesh cells." }),
    /** Periodic wrap width in mesh-space units (hex space). */
    wrapWidth: Type.Number({ description: "Periodic wrap width in mesh-space units (hex space)." }),
    /** X coordinate per mesh cell (hex space). */
    siteX: TypedArraySchemas.f32({ shape: null, description: "X coordinate per mesh cell (hex space)." }),
    /** Y coordinate per mesh cell (hex space). */
    siteY: TypedArraySchemas.f32({ shape: null, description: "Y coordinate per mesh cell (hex space)." }),
    /** CSR offsets into neighbors array (length = cellCount + 1). */
    neighborsOffsets: TypedArraySchemas.i32({
      shape: null,
      description: "CSR offsets into neighbors array (length = cellCount + 1).",
    }),
    /** CSR neighbor indices. */
    neighbors: TypedArraySchemas.i32({ shape: null, description: "CSR neighbor indices." }),
    /** Cell area per mesh cell (hex-space units). */
    areas: TypedArraySchemas.f32({ shape: null, description: "Cell area per mesh cell (hex-space units)." }),
    /** Bounding box in mesh-space units. */
    bbox: BoundingBoxSchema,
  },
  { description: "Foundation mesh artifact payload (cells + adjacency + site coordinates)." }
);

/** Foundation crust artifact payload (mesh-space crust driver tensors). */
const FoundationCrustArtifactSchema = Type.Object(
  {
    /** Crust type per mesh cell (0=oceanic, 1=continental). */
    type: TypedArraySchemas.u8({
      shape: null,
      description: "Crust type per mesh cell (0=oceanic, 1=continental).",
    }),
    /** Crust age per mesh cell (0=new, 255=ancient). */
    age: TypedArraySchemas.u8({
      shape: null,
      description: "Crust age per mesh cell (0=new, 255=ancient).",
    }),
    /** Crust buoyancy proxy per mesh cell (0..1). */
    buoyancy: TypedArraySchemas.f32({
      shape: null,
      description: "Crust buoyancy proxy per mesh cell (0..1).",
    }),
    /** Isostatic base elevation proxy per mesh cell (0..1). */
    baseElevation: TypedArraySchemas.f32({
      shape: null,
      description: "Isostatic base elevation proxy per mesh cell (0..1).",
    }),
    /** Lithospheric strength proxy per mesh cell (0..1). */
    strength: TypedArraySchemas.f32({
      shape: null,
      description: "Lithospheric strength proxy per mesh cell (0..1).",
    }),
  },
  { description: "Foundation crust artifact payload (mesh-space crust driver tensors)." }
);

/** Nearest mesh cellIndex per tileIndex (canonical mesh→tile projection mapping). */
const FoundationTileToCellIndexArtifactSchema = TypedArraySchemas.i32({
  shape: null,
  description: "Nearest mesh cellIndex per tileIndex (canonical mesh→tile projection mapping).",
});

/** Foundation crust tiles artifact payload (tile-space crust driver tensors). */
const FoundationCrustTilesArtifactSchema = Type.Object(
  {
    /** Crust type per tile (0=oceanic, 1=continental), sampled via tileToCellIndex. */
    type: TypedArraySchemas.u8({
      shape: null,
      description: "Crust type per tile (0=oceanic, 1=continental), sampled via tileToCellIndex.",
    }),
    /** Crust age per tile (0=new, 255=ancient), sampled via tileToCellIndex. */
    age: TypedArraySchemas.u8({
      shape: null,
      description: "Crust age per tile (0=new, 255=ancient), sampled via tileToCellIndex.",
    }),
    /** Crust buoyancy proxy per tile (0..1), sampled via tileToCellIndex. */
    buoyancy: TypedArraySchemas.f32({
      shape: null,
      description: "Crust buoyancy proxy per tile (0..1), sampled via tileToCellIndex.",
    }),
    /** Isostatic base elevation proxy per tile (0..1), sampled via tileToCellIndex. */
    baseElevation: TypedArraySchemas.f32({
      shape: null,
      description: "Isostatic base elevation proxy per tile (0..1), sampled via tileToCellIndex.",
    }),
    /** Lithospheric strength proxy per tile (0..1), sampled via tileToCellIndex. */
    strength: TypedArraySchemas.f32({
      shape: null,
      description: "Lithospheric strength proxy per tile (0..1), sampled via tileToCellIndex.",
    }),
  },
  { description: "Foundation crust tiles artifact payload (tile-space crust driver tensors)." }
);

/** Foundation plate graph artifact payload (mesh-space plate assignment + metadata). */
const FoundationPlateGraphArtifactSchema = Type.Object(
  {
    /** Plate id per mesh cell. */
    cellToPlate: TypedArraySchemas.i16({ shape: null, description: "Plate id per mesh cell." }),
    /** Plate metadata array (indexed by plate id). */
    plates: Type.Immutable(
      Type.Array(FoundationPlateMetadataSchema, { description: "Plate metadata array (indexed by plate id)." })
    ),
  },
  { description: "Foundation plate graph artifact payload (mesh-space plate assignment + metadata)." }
);

/** Foundation plate topology artifact payload (plate adjacency + centroid/area). */
const FoundationPlateTopologyArtifactSchema = Type.Object(
  {
    /** Number of plates included in the topology payload. */
    plateCount: Type.Integer({ minimum: 1, description: "Number of plates included in the topology payload." }),
    /** Plate topology array (indexed by plate id). */
    plates: Type.Immutable(
      Type.Array(FoundationPlateTopologySchema, { description: "Plate topology array (indexed by plate id)." })
    ),
  },
  { description: "Foundation plate topology artifact payload (plate adjacency + centroid/area)." }
);

/** Foundation tectonics artifact payload (mesh-space tectonic driver tensors). */
const FoundationTectonicsArtifactSchema = Type.Object(
  {
    /** Boundary type per mesh cell (BOUNDARY_TYPE values; 0 when non-boundary/unknown). */
    boundaryType: TypedArraySchemas.u8({
      shape: null,
      description: "Boundary type per mesh cell (BOUNDARY_TYPE values; 0 when non-boundary/unknown).",
    }),
    /** Uplift potential per mesh cell (0..255). */
    upliftPotential: TypedArraySchemas.u8({ shape: null, description: "Uplift potential per mesh cell (0..255)." }),
    /** Rift potential per mesh cell (0..255). */
    riftPotential: TypedArraySchemas.u8({ shape: null, description: "Rift potential per mesh cell (0..255)." }),
    /** Shear stress per mesh cell (0..255). */
    shearStress: TypedArraySchemas.u8({ shape: null, description: "Shear stress per mesh cell (0..255)." }),
    /** Volcanism per mesh cell (0..255). */
    volcanism: TypedArraySchemas.u8({ shape: null, description: "Volcanism per mesh cell (0..255)." }),
    /** Fracture potential per mesh cell (0..255). */
    fracture: TypedArraySchemas.u8({ shape: null, description: "Fracture potential per mesh cell (0..255)." }),
    /** Accumulated uplift per mesh cell (0..255). */
    cumulativeUplift: TypedArraySchemas.u8({
      shape: null,
      description: "Accumulated uplift per mesh cell (0..255).",
    }),
  },
  { description: "Foundation tectonics artifact payload (mesh-space tectonic driver tensors)." }
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
  tileToCellIndex: defineArtifact({
    name: "foundationTileToCellIndex",
    id: FOUNDATION_TILE_TO_CELL_INDEX_ARTIFACT_TAG,
    schema: FoundationTileToCellIndexArtifactSchema,
  }),
  crustTiles: defineArtifact({
    name: "foundationCrustTiles",
    id: FOUNDATION_CRUST_TILES_ARTIFACT_TAG,
    schema: FoundationCrustTilesArtifactSchema,
  }),
  plateGraph: defineArtifact({
    name: "foundationPlateGraph",
    id: FOUNDATION_PLATE_GRAPH_ARTIFACT_TAG,
    schema: FoundationPlateGraphArtifactSchema,
  }),
  tectonicSegments: defineArtifact({
    name: "foundationTectonicSegments",
    id: FOUNDATION_TECTONIC_SEGMENTS_ARTIFACT_TAG,
    schema: FoundationTectonicSegmentsArtifactSchema,
  }),
  tectonicHistory: defineArtifact({
    name: "foundationTectonicHistory",
    id: FOUNDATION_TECTONIC_HISTORY_ARTIFACT_TAG,
    schema: FoundationTectonicHistoryArtifactSchema,
  }),
  plateTopology: defineArtifact({
    name: "foundationPlateTopology",
    id: FOUNDATION_PLATE_TOPOLOGY_ARTIFACT_TAG,
    schema: FoundationPlateTopologyArtifactSchema,
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
} as const;
