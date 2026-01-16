import { Type, defineOp } from "@swooper/mapgen-core/authoring";

const StartsConfigSchema = Type.Object(
  {
    playersLandmass1: Type.Number({
      description: "Player count allocated to the primary landmass band.",
    }),
    playersLandmass2: Type.Number({
      description: "Player count allocated to the secondary landmass band (if present).",
    }),
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
  {
    description: "Start placement inputs supplied by runtime + authored overrides.",
  }
);

const StartsOverrideSchema = Type.Partial(StartsConfigSchema);

/**
 * Merges authored start overrides with runtime-provided start allocation inputs.
 */
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
