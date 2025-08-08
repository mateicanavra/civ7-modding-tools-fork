/**
 * Resource type constants for Civilization 7
 *
 * Resources are categorized by age (Antiquity, Exploration, Modern)
 * and by class (Bonus, City, Empire)
 */
export const RESOURCE = {
    // Antiquity Age Resources
    /** Provides +1 gold yield */
    COTTON: "RESOURCE_COTTON",
    /** Provides +1 food yield */
    DATES: "RESOURCE_DATES",
    /** Provides +1 culture yield */
    DYES: "RESOURCE_DYES",
    /** Provides +1 food yield */
    FISH: "RESOURCE_FISH",
    /** Provides +1 gold yield */
    GOLD: "RESOURCE_GOLD",
    /** Provides +1 gold yield (distant lands) */
    GOLD_DISTANT_LANDS: "RESOURCE_GOLD_DISTANT_LANDS",
    /** Provides +1 science yield */
    GYPSUM: "RESOURCE_GYPSUM",
    /** Provides +1 science yield */
    INCENSE: "RESOURCE_INCENSE",
    /** Provides +1 culture yield */
    IVORY: "RESOURCE_IVORY",
    /** Provides +1 culture yield */
    JADE: "RESOURCE_JADE",
    /** Provides +1 food yield */
    KAOLIN: "RESOURCE_KAOLIN",
    /** Provides +1 culture yield */
    MARBLE: "RESOURCE_MARBLE",
    /** Provides +1 gold yield */
    PEARLS: "RESOURCE_PEARLS",
    /** Provides +1 food yield */
    SALT: "RESOURCE_SALT",
    /** Provides +1 culture yield */
    SILK: "RESOURCE_SILK",
    /** Provides +1 gold yield */
    SILVER: "RESOURCE_SILVER",
    /** Provides +1 gold yield (distant lands) */
    SILVER_DISTANT_LANDS: "RESOURCE_SILVER_DISTANT_LANDS",
    /** Provides +1 happiness yield */
    WINE: "RESOURCE_WINE",
    /** Provides +1 gold yield with 2 bonus resource slots */
    CAMELS: "RESOURCE_CAMELS",
    /** Provides +1 production yield */
    HIDES: "RESOURCE_HIDES",
    /** Provides +1 production yield */
    HORSES: "RESOURCE_HORSES",
    /** Provides +1 production yield */
    IRON: "RESOURCE_IRON",
    /** Provides +1 production yield */
    TIN: "RESOURCE_TIN",
    /** Provides +1 production yield */
    WOOL: "RESOURCE_WOOL",
    /** Non-tradeable city resource */
    LAPIS_LAZULI: "RESOURCE_LAPIS_LAZULI",
    /** Provides +1 production yield */
    LIMESTONE: "RESOURCE_LIMESTONE",
    /** Provides +1 production yield */
    HARDWOOD: "RESOURCE_HARDWOOD",
    /** Provides +1 production yield */
    CLAY: "RESOURCE_CLAY",
    /** Provides +1 food and production */
    WILD_GAME: "RESOURCE_WILD_GAME",
    /** Provides +1 production yield */
    FLAX: "RESOURCE_FLAX",

    // Exploration Age Resources
    /** Provides +1 gold yield */
    COCOA: "RESOURCE_COCOA",
    /** Provides +1 gold yield */
    FURS: "RESOURCE_FURS",
    /** Provides +1 production yield */
    NITER: "RESOURCE_NITER",
    /** Provides +1 gold yield */
    SPICES: "RESOURCE_SPICES",
    /** Provides +1 food yield */
    SUGAR: "RESOURCE_SUGAR",
    /** Provides +1 science yield */
    TEA: "RESOURCE_TEA",
    /** Provides +1 gold yield */
    TRUFFLES: "RESOURCE_TRUFFLES",
    /** Provides +1 production yield */
    WHALES: "RESOURCE_WHALES",
    /** Non-tradeable city resource */
    CLOVES: "RESOURCE_CLOVES",

    // Modern Age Resources
    /** Provides +1 food yield */
    CITRUS: "RESOURCE_CITRUS",
    /** Provides +1 production yield */
    COAL: "RESOURCE_COAL",
    /** Provides +1 science yield */
    COFFEE: "RESOURCE_COFFEE",
    /** Provides +1 production yield */
    OIL: "RESOURCE_OIL",
    /** Provides +1 food yield */
    QUININE: "RESOURCE_QUININE",
    /** Provides +1 production yield */
    RUBBER: "RESOURCE_RUBBER",
    /** Provides +1 gold yield */
    TOBACCO: "RESOURCE_TOBACCO",
    /** Non-tradeable city resource */
    NICKEL: "RESOURCE_NICKEL",
} as const;
