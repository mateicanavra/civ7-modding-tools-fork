import {
    ACTION_GROUP_BUNDLE,
    BIOME,
    CIVILIZATION_DOMAIN,
    COLLECTION,
    CONSTRUCTIBLE_TYPE_TAG,
    DISTRICT,
    EFFECT,
    FEATURE,
    FEATURE_CLASS,
    ImportFileBuilder,
    Mod,
    REQUIREMENT,
    RESOURCE,
    TAG_TRAIT,
    TERRAIN,
    TRAIT,
    UNIT_CLASS,
    YIELD,
    AGE,
} from "civ7-modding-tools";

// Create the mod instance
export const mod = new Mod({
    id: "macnsqueeze-dacia",
    version: "1",
    name: "Dacia",
    description:
        "Adds the ancient Dacian civilization with unique units and buildings to Civilization VII",
    authors: "macnqueeze",
});

export { ACTION_GROUP_BUNDLE, REQUIREMENT, COLLECTION, EFFECT }; 