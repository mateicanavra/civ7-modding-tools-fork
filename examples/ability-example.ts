/**
 * Example demonstrating how to create unit abilities using the AbilityBuilder
 * 
 * This example creates a resource claiming ability similar to the one used by
 * the Prospector unit in the base game.
 */

import { 
    AbilityBuilder, 
    ModifierBuilder, 
    UnitBuilder, 
    Mod,
    ACTION_GROUP_BUNDLE,
    COLLECTION,
    EFFECT,
    REQUIREMENT,
    UNIT_CLASS
} from "../src";

// Create a new mod
const mod = new Mod({
    id: "ABILITY_EXAMPLE_MOD",
    version: "1.0.0"
});

// Create a resource claiming ability
const claimResourceAbility = new AbilityBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    ability: {
        abilityType: "ABILITY_CLAIM_RESOURCE",
        name: "Claim Resource",
        description: "Claim an unclaimed resource, adding it to your civilization."
    },
    chargedAbility: {
        enabled: true,
        rechargeTurns: 5
    }
});

// Create a unit that can use the ability
const resourceClaimerUnit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    typeTags: [UNIT_CLASS.RECON],
    unit: {
        unitType: "UNIT_RESOURCE_CLAIMER",
        baseMoves: 2,
        baseSightRange: 2,
        buildCharges: 3,
        canPurchase: true
    },
    localizations: [
        {
            name: "Resource Claimer",
            description: "Civilian unit specialized in claiming resources with 3 charges."
        }
    ]
});

// Create another unit - we'll use the direct binding method for this one
const advancedClaimerUnit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    typeTags: [UNIT_CLASS.RECON],
    unit: {
        unitType: "UNIT_ADVANCED_CLAIMER",
        baseMoves: 3,
        baseSightRange: 3,
        buildCharges: 5,
        canPurchase: true
    },
    localizations: [
        {
            name: "Advanced Claimer",
            description: "Advanced civilian unit specialized in claiming resources with 5 charges."
        }
    ]
});

// METHOD 1: Bind using toolkit standard bind() method with builders
claimResourceAbility.bind([resourceClaimerUnit]);

// METHOD 2: Bind directly with unit type (original method)
claimResourceAbility.bindToUnit("UNIT_ADVANCED_CLAIMER");

// Create a modifier to grant the ability charges
const grantAbilityModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        id: "RESOURCE_CLAIMER_MOD_GRANT_ABILITY_CHARGE",
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.GRANT_UNIT_ABILITY_CHARGE,
        permanent: true,
        requirements: [{
            type: REQUIREMENT.UNIT_TYPE_MATCHES,
            arguments: [{ name: "UnitType", value: "UNIT_RESOURCE_CLAIMER" }]
        }],
        arguments: [
            { name: "AbilityType", value: "ABILITY_CLAIM_RESOURCE" },
            { name: "ChargedAbilityType", value: "CHARGED_ABILITY_CLAIM_RESOURCE" },
            { name: "Amount", value: 3 }
        ]
    }
});

// Create another modifier for the advanced unit
const grantAdvancedAbilityModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        id: "ADVANCED_CLAIMER_MOD_GRANT_ABILITY_CHARGE",
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.GRANT_UNIT_ABILITY_CHARGE,
        permanent: true,
        requirements: [{
            type: REQUIREMENT.UNIT_TYPE_MATCHES,
            arguments: [{ name: "UnitType", value: "UNIT_ADVANCED_CLAIMER" }]
        }],
        arguments: [
            { name: "AbilityType", value: "ABILITY_CLAIM_RESOURCE" },
            { name: "ChargedAbilityType", value: "CHARGED_ABILITY_CLAIM_RESOURCE" },
            { name: "Amount", value: 5 }
        ]
    }
});

// Add everything to the mod
mod.add([claimResourceAbility]);
mod.add([resourceClaimerUnit, advancedClaimerUnit]);
mod.add([grantAbilityModifier, grantAdvancedAbilityModifier]);

// Build the mod
mod.build("./example-generated-mod/ability-example"); 