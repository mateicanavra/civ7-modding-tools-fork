import { Type, type Static } from "typebox";

export const ContinentBoundsSchema = Type.Object(
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

export type ContinentBounds = Static<typeof ContinentBoundsSchema>;

export const StartsConfigSchema = Type.Object(
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

export type StartsConfig = Static<typeof StartsConfigSchema>;

export const StartsOverrideSchema = Type.Partial(StartsConfigSchema, {
  default: {},
  additionalProperties: false,
});

export type StartsOverride = Static<typeof StartsOverrideSchema>;

export const PlanStartsInputSchema = Type.Object(
  {
    baseStarts: StartsConfigSchema,
  },
  { additionalProperties: false }
);

export type PlanStartsInput = Static<typeof PlanStartsInputSchema>;

export const PlanStartsConfigSchema = Type.Object(
  {
    overrides: Type.Optional(StartsOverrideSchema),
  },
  { additionalProperties: false, default: {} }
);

export type PlanStartsConfig = Static<typeof PlanStartsConfigSchema>;

export const PlanStartsOutputSchema = StartsConfigSchema;

export type PlanStartsOutput = Static<typeof PlanStartsOutputSchema>;
