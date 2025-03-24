import { 
    CivilizationBuilder, 
    TRAIT, 
    TAG_TRAIT, 
    TERRAIN, 
    BIOME, 
    FEATURE_CLASS, 
    RESOURCE 
} from "civ7-modding-tools";
import { ACTION_GROUP_BUNDLE } from "../config";
import { civilizationIcon } from "../imports";
import { mod } from "../config";

export const civilization = new CivilizationBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    civilization: {
        domain: "AntiquityAgeCivilizations",
        civilizationType: "CIVILIZATION_DACIA",
    },
    civilizationTraits: [
        TRAIT.ANTIQUITY_CIV,
        TRAIT.ATTRIBUTE_EXPANSIONIST,
        TRAIT.ATTRIBUTE_MILITARISTIC,
    ],
    civilizationTags: [TAG_TRAIT.CULTURAL, TAG_TRAIT.ECONOMIC],
    icon: {
        path: `fs://game/${mod.id}/${civilizationIcon.name}`,
    },
    startBiasTerrains: [
        { terrainType: TERRAIN.MOUNTAIN },
        { terrainType: TERRAIN.HILL },
    ],
    startBiasBiomes: [
        { biomeType: BIOME.GRASSLAND },
        { biomeType: BIOME.PLAINS },
    ],
    startBiasFeatureClasses: [{ featureClassType: FEATURE_CLASS.VEGETATED }],
    startBiasResources: [
        { resourceType: RESOURCE.GOLD },
        { resourceType: RESOURCE.HORSES },
        { resourceType: RESOURCE.SILVER },
        { resourceType: RESOURCE.WINE },
    ],
    startBiasRiver: 1,
    startBiasAdjacentToCoast: 0,
    localizations: [
        {
            name: "Dacia",
            description:
                "The Dacian kingdom flourished in the Carpathian Mountains, known for its gold mines, unique falx weapons, and mountain fortresses.",
            fullName: "The Dacian Kingdom",
            adjective: "Dacian",
            unlockPlayAs: "Play as [B]Dacia[/B], masters of mountain warfare.",
            cityNames: [
                "Sarmizegetusa",
                "Apulum",
                "Napoca",
                "Piroboridava",
                "Sucidava",
                "Buridava",
                "Cumidava",
                "Porolissum",
                "Genucla",
                "Dierna",
                "Tibiscum",
                "Drobeta",
            ],
            abilityName: "Carpathian Defenders",
            abilityDescription:
                "Units receive +5 [icon:COMBAT_MELEE] Combat Strength when fighting in Hills or Forest terrain. Gold Mines provide +1 [icon:YIELD_PRODUCTION] Production and +1 [icon:YIELD_CULTURE] Culture.",
        },
    ],
}); 