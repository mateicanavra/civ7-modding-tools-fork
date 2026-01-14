import { Type, defineOp } from "@swooper/mapgen-core/authoring";

const ContinentBoundsSchema = Type.Object(
  {
    west: Type.Number({
      description: "DEPRECATED: western bound for the continent placement window.",
    }),
    east: Type.Number({
      description: "DEPRECATED: eastern bound for the continent placement window.",
    }),
    south: Type.Number({
      description: "DEPRECATED: southern bound for the continent placement window.",
    }),
    north: Type.Number({
      description: "DEPRECATED: northern bound for the continent placement window.",
    }),
    continent: Type.Optional(
      Type.Number({
        description:
          "DEPRECATED: continent identifier used by the adapter for start placement.",
      })
    ),
  },
  {
    additionalProperties: false,
    description:
      "DEPRECATED: continent bounds are a temporary projection for Civ7 start placement.",
  }
);

const StartsConfigSchema = Type.Object({
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
});

const StartsOverrideSchema = Type.Partial(StartsConfigSchema);

const PlanStartsContract = defineOp({
  kind: "plan",
  id: "placement/plan-starts",
  input: Type.Object({
    baseStarts: StartsConfigSchema,
  }),
  output: Type.Object({
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
  }),
  strategies: {
    default: Type.Object({
      overrides: Type.Optional(StartsOverrideSchema),
    }),
  },
});

export default PlanStartsContract;
