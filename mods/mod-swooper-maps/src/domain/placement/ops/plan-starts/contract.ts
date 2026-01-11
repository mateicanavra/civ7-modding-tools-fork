import { Type, defineOpContract } from "@swooper/mapgen-core/authoring";

const ContinentBoundsSchema = Type.Object(
  {
    west: Type.Number({ description: "Western bound for the continent placement window." }),
    east: Type.Number({ description: "Eastern bound for the continent placement window." }),
    south: Type.Number({ description: "Southern bound for the continent placement window." }),
    north: Type.Number({ description: "Northern bound for the continent placement window." }),
    continent: Type.Optional(
      Type.Number({ description: "Continent identifier used by the adapter for start placement." })
    ),
  },
  { additionalProperties: false }
);

const StartsConfigSchema = Type.Object(
  {
    playersLandmass1: Type.Number({
      description: "Player count allocated to the primary landmass band.",
    }),
    playersLandmass2: Type.Number({
      description: "Player count allocated to the secondary landmass band (if present).",
    }),
    westContinent: ContinentBoundsSchema,
    eastContinent: ContinentBoundsSchema,
    startSectorRows: Type.Number({
      description: "Number of sector rows used when partitioning the map for starts.",
    }),
    startSectorCols: Type.Number({
      description: "Number of sector columns used when partitioning the map for starts.",
    }),
    startSectors: Type.Array(Type.Unknown(), {
      default: [],
      description: "Explicit start sector descriptors passed directly to placement logic.",
    }),
  },
  { additionalProperties: false }
);

const StartsOverrideSchema = Type.Partial(StartsConfigSchema, {
  additionalProperties: false,
});

const StartsConfigWrapperSchema = Type.Object(
  {
    overrides: Type.Optional(StartsOverrideSchema),
  },
  { additionalProperties: false }
);

const StartsInputSchema = Type.Object(
  {
    baseStarts: StartsConfigSchema,
  },
  { additionalProperties: false }
);

const StartsOutputSchema = StartsConfigSchema;

const PlanStartsContract = defineOpContract({
  kind: "plan",
  id: "placement/plan-starts",
  input: StartsInputSchema,
  output: StartsOutputSchema,
  strategies: {
    default: StartsConfigWrapperSchema,
  },
});

export default PlanStartsContract;
