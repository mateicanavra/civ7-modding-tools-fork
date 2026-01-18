import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const BaselineSchema = Type.Object(
  {
    rainfallScale: Type.Number({
      default: 180,
      minimum: 0,
      maximum: 400,
      description: "Scales humidity into rainfall (0..200 clamp happens at output).",
    }),
    humidityExponent: Type.Number({
      default: 1,
      minimum: 0.1,
      maximum: 6,
      description: "Non-linear scaling applied to humidity before rainfall mapping.",
    }),
    noiseAmplitude: Type.Number({
      default: 6,
      minimum: 0,
      maximum: 40,
      description: "Perlin noise amplitude added to baseline rainfall.",
    }),
    noiseScale: Type.Number({
      default: 0.12,
      minimum: 0.01,
      maximum: 1,
      description: "Perlin noise frequency for rainfall texture.",
    }),
    waterGradient: Type.Object(
      {
        radius: Type.Integer({
          default: 5,
          minimum: 1,
          maximum: 20,
          description: "How far inland to apply coastal moisture/precip bonus (tiles).",
        }),
        perRingBonus: Type.Number({
          default: 4,
          minimum: 0,
          maximum: 40,
          description: "Bonus rainfall per ring closer to water.",
        }),
        lowlandBonus: Type.Number({
          default: 2,
          minimum: 0,
          maximum: 40,
          description: "Extra rainfall bonus for low-elevation coastal land.",
        }),
        lowlandElevationMax: Type.Integer({
          default: 150,
          minimum: -2000,
          maximum: 8000,
          description: "Maximum elevation to qualify for lowlandBonus.",
        }),
      },
      { additionalProperties: false }
    ),
    orographic: Type.Object(
      {
        steps: Type.Integer({
          default: 4,
          minimum: 1,
          maximum: 16,
          description: "How far upwind to scan for blocking terrain (tiles).",
        }),
        reductionBase: Type.Number({
          default: 8,
          minimum: 0,
          maximum: 80,
          description: "Base rainfall reduction when a barrier exists upwind.",
        }),
        reductionPerStep: Type.Number({
          default: 6,
          minimum: 0,
          maximum: 80,
          description: "Additional reduction per upwind barrier step.",
        }),
        barrierElevationM: Type.Integer({
          default: 500,
          minimum: 0,
          maximum: 9000,
          description: "Elevation threshold treated as a barrier if terrain is not mountainous.",
        }),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

const RefineSchema = Type.Object(
  {
    riverCorridor: Type.Object(
      {
        adjacencyRadius: Type.Integer({
          default: 1,
          minimum: 1,
          maximum: 6,
          description: "Adjacency radius (in tiles) used to treat tiles as near a river.",
        }),
        lowlandAdjacencyBonus: Type.Number({
          default: 14,
          minimum: 0,
          maximum: 80,
          description: "Rainfall bonus for low-elevation tiles near rivers.",
        }),
        highlandAdjacencyBonus: Type.Number({
          default: 10,
          minimum: 0,
          maximum: 80,
          description: "Rainfall bonus for high-elevation tiles near rivers.",
        }),
        lowlandElevationMax: Type.Integer({
          default: 250,
          minimum: -2000,
          maximum: 9000,
          description: "Maximum elevation to qualify for lowlandAdjacencyBonus.",
        }),
      },
      { additionalProperties: false }
    ),
    lowBasin: Type.Object(
      {
        radius: Type.Integer({
          default: 2,
          minimum: 1,
          maximum: 10,
          description: "Radius used to detect enclosed low basins (tiles).",
        }),
        delta: Type.Number({
          default: 6,
          minimum: 0,
          maximum: 60,
          description: "Rainfall delta added to enclosed low basins.",
        }),
        elevationMax: Type.Integer({
          default: 200,
          minimum: -2000,
          maximum: 9000,
          description: "Maximum elevation to qualify as a low basin.",
        }),
        openThresholdM: Type.Integer({
          default: 20,
          minimum: 0,
          maximum: 500,
          description: "If any neighbor is below elev+openThresholdM, basin is considered open.",
        }),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

const ComputePrecipitationContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-precipitation",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
      elevation: TypedArraySchemas.i16({ description: "Elevation (meters) per tile." }),
      terrain: TypedArraySchemas.u8({ description: "Terrain classification per tile." }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
      windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
      windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
      humidityF32: TypedArraySchemas.f32({ description: "Humidity proxy (0..1) per tile." }),
      rainfallIn: TypedArraySchemas.u8({ description: "Input rainfall (0..200) per tile." }),
      humidityIn: TypedArraySchemas.u8({ description: "Input humidity (0..255) per tile." }),
      riverAdjacency: TypedArraySchemas.u8({
        description: "River adjacency mask per tile (1=adjacent, 0=not adjacent).",
      }),
      perlinSeed: Type.Integer({
        minimum: 0,
        maximum: 2_147_483_647,
        description: "Deterministic Perlin seed (derived in the step; pure data).",
      }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
      humidity: TypedArraySchemas.u8({ description: "Humidity (0..255) per tile." }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: BaselineSchema,
    refine: RefineSchema,
  },
});

export default ComputePrecipitationContract;
