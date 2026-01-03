import { Type, type Static } from "typebox";

/**
 * Bindings from internal biome symbols to Civ7 engine biome globals.
 * These values are resolved during the biomes step to populate `field:biomeId`,
 * which downstream feature placement and engine validity checks depend on.
 */
export const BiomeEngineBindingsSchema = Type.Object(
  {
    /** Engine biome global used for permanent snow/ice biomes (written to field:biomeId). */
    snow: Type.Optional(
      Type.String({
        description: "Engine biome global used for permanent snow/ice biomes.",
        default: "BIOME_TUNDRA",
      })
    ),
    /** Engine biome global used for tundra (cold, sparse vegetation). */
    tundra: Type.Optional(
      Type.String({
        description: "Engine biome global used for tundra (cold, sparse vegetation).",
        default: "BIOME_TUNDRA",
      })
    ),
    /** Engine biome global used for boreal forests (cold conifers). */
    boreal: Type.Optional(
      Type.String({
        description: "Engine biome global used for boreal forests (cold conifers).",
        default: "BIOME_TUNDRA",
      })
    ),
    /** Engine biome global used for dry temperate grasslands/steppes. */
    temperateDry: Type.Optional(
      Type.String({
        description: "Engine biome global used for dry temperate grasslands/steppes.",
        default: "BIOME_PLAINS",
      })
    ),
    /** Engine biome global used for humid temperate plains/forests. */
    temperateHumid: Type.Optional(
      Type.String({
        description: "Engine biome global used for humid temperate plains/forests.",
        default: "BIOME_GRASSLAND",
      })
    ),
    /** Engine biome global used for seasonal tropical savannas. */
    tropicalSeasonal: Type.Optional(
      Type.String({
        description: "Engine biome global used for seasonal tropical savannas.",
        default: "BIOME_GRASSLAND",
      })
    ),
    /** Engine biome global used for tropical rainforest zones. */
    tropicalRainforest: Type.Optional(
      Type.String({
        description: "Engine biome global used for tropical rainforest zones.",
        default: "BIOME_TROPICAL",
      })
    ),
    /** Engine biome global used for hot/cold desert basins. */
    desert: Type.Optional(
      Type.String({
        description: "Engine biome global used for hot/cold desert basins.",
        default: "BIOME_DESERT",
      })
    ),
    /** Engine biome global used for ocean and coastal water tiles (water tiles must resolve to BIOME_MARINE). */
    marine: Type.Optional(
      Type.String({
        description: "Engine biome global used for ocean and coastal water tiles.",
        default: "BIOME_MARINE",
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description:
      "Mappings from biome symbols to Civ7 engine biome globals (used to populate field:biomeId).",
  }
);

export type BiomeEngineBindings = Static<typeof BiomeEngineBindingsSchema>;
