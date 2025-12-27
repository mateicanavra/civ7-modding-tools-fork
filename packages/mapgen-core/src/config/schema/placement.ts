import { Type } from "typebox";
import { ContinentBoundsSchema } from "@mapgen/config/schema/landmass.js";

/**
 * Floodplain generation along rivers.
 */
export const FloodplainsConfigSchema = Type.Object(
  {
    /**
     * Minimum river segment length that can host floodplains.
     * Rivers shorter than this won't generate floodplain terrain.
     * @default 4
     */
    minLength: Type.Optional(
      Type.Number({
        description: "Minimum river segment length that can host floodplains (tiles).",
      })
    ),
    /**
     * Maximum contiguous river length converted to floodplains.
     * Prevents endless floodplain strips along long rivers.
     * @default 10
     */
    maxLength: Type.Optional(
      Type.Number({
        description: "Maximum contiguous river length converted to floodplains to avoid endless strips (tiles).",
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Player start placement configuration.
 * Required when starts config is provided - no default empty object to avoid validation errors.
 */
export const StartsConfigSchema = Type.Object(
  {
    /**
     * Player count allocated to the primary (western) landmass band.
     * The vanilla engine splits players between two major regions.
     */
    playersLandmass1: Type.Number({
      description: "Player count allocated to the primary landmass band.",
    }),
    /**
     * Player count allocated to the secondary (eastern) landmass band.
     * Set to 0 for single-continent maps.
     */
    playersLandmass2: Type.Number({
      description: "Player count allocated to the secondary landmass band (if present).",
    }),
    /** Bounding box for the western continent used by start placement. */
    westContinent: ContinentBoundsSchema,
    /** Bounding box for the eastern continent used by start placement. */
    eastContinent: ContinentBoundsSchema,
    /**
     * Number of sector rows when partitioning the map for starts.
     * Higher values create a finer placement grid.
     */
    startSectorRows: Type.Number({
      description: "Number of sector rows used when partitioning the map for starts.",
    }),
    /**
     * Number of sector columns when partitioning the map for starts.
     * Higher values create a finer placement grid.
     */
    startSectorCols: Type.Number({
      description: "Number of sector columns used when partitioning the map for starts.",
    }),
    /**
     * Explicit start sector descriptors passed to placement logic.
     * Each element describes a candidate region for civilization spawns.
     * @default []
     */
    startSectors: Type.Array(Type.Unknown(), {
      default: [],
      description: "Explicit start sector descriptors passed directly to placement logic.",
    }),
  },
  { additionalProperties: false }
);

/**
 * Late-stage placement controls for wonders, floodplains, and start metadata.
 */
export const PlacementConfigSchema = Type.Object(
  {
    /**
     * Whether to add one extra natural wonder beyond map-size defaults.
     * Diversifies layouts with an additional landmark.
     * @default true
     */
    wondersPlusOne: Type.Optional(
      Type.Boolean({
        description: "Whether to add one extra natural wonder beyond map-size defaults to diversify layouts.",
      })
    ),
    /** Floodplain generation settings along rivers. */
    floodplains: Type.Optional(FloodplainsConfigSchema),
    /** Player start placement configuration (required fields when provided). */
    starts: Type.Optional(StartsConfigSchema),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Consolidated foundation configuration replacing the legacy worldModel split.
 */
