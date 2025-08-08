# TypeScript Modding Tools: Creating Traditions

This guide covers how to create traditions using the Civilization VII TypeScript Modding Tools.

## Understanding Traditions

Traditions are social policies that can be adopted by civilizations and provide various gameplay benefits. They represent cultural or societal practices that persist across Ages and can be a key part of your civilization's strategy.

## Basic Tradition Creation

Creating a tradition involves several steps:
1. Define the tradition itself
2. Create modifiers that provide gameplay effects
3. Bind the modifiers to the tradition
4. Add the tradition to your mod

Here's a complete example:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    Mod,
    ModifierBuilder,
    TraditionBuilder,
    COLLECTION,
    EFFECT
} from "@civ7/sdk";

const mod = new Mod({
    id: 'my-tradition-mod',
    version: '1.0',
});

// Create a tradition
const mountaintopWatch = new TraditionBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    tradition: {
        traditionType: 'TRADITION_MOUNTAINTOP_WATCH',
    },
    localizations: [
        { 
            name: 'Mountaintop Watch', 
            description: 'Ancient Dacian practice of maintaining watchtowers on strategic mountaintops.'
        },
    ]
});

// Create modifier for the tradition
const mountainSightBonus = new ModifierBuilder({
    modifier: {
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.UNIT_ADJUST_SIGHT,
        arguments: [{ name: 'Amount', value: 1 }],
    },
    localizations: [{
        description: '+1 Sight Range for all units.'
    }]
});

// Bind the modifier to the tradition
mountaintopWatch.bind([mountainSightBonus]);

// Add to mod
mod.add([mountaintopWatch]);

// Build the mod
mod.build('./dist');
```

## Key Components of a Tradition

When creating traditions, these are the essential components:

1. **Tradition Type**: A unique identifier for your tradition
2. **Modifiers**: Gameplay effects that apply when the tradition is adopted
3. **Localization**: Names and descriptions that appear in game
4. **Age Association**: The age(s) in which the tradition is available

## Creating Complex Traditions

For more complex traditions with multiple effects, you can bind multiple modifiers:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    Mod,
    ModifierBuilder,
    TraditionBuilder,
    COLLECTION,
    EFFECT,
    REQUIREMENT,
    UNIT_CLASS,
    YIELD
} from "@civ7/sdk";

const mod = new Mod({
    id: 'my-complex-tradition-mod',
    version: '1.0',
});

// Create a tradition
const warriorCult = new TraditionBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    tradition: {
        traditionType: 'TRADITION_WARRIOR_CULT',
    },
    localizations: [
        { 
            name: 'Warrior Cult', 
            description: 'A society-wide emphasis on martial prowess and warrior values.'
        },
    ]
});

// First effect: Combat bonus for melee units
const meleeBonus = new ModifierBuilder({
    modifier: {
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.UNIT_ADJUST_COMBAT_STRENGTH,
        requirements: [{
            type: REQUIREMENT.UNIT_TAG_MATCHES,
            arguments: [{ name: 'Tag', value: UNIT_CLASS.MELEE }]
        }],
        arguments: [{ name: 'Amount', value: 3 }],
    },
    localizations: [{
        description: '+3 Combat Strength for Melee units.'
    }]
});

// Second effect: Production bonus when training units
const trainingBonus = new ModifierBuilder({
    modifier: {
        collection: COLLECTION.PLAYER_CITIES,
        effect: EFFECT.CITY_ADJUST_YIELD_MODIFIER_FOR_UNIT_TRAINING,
        arguments: [
            { name: 'YieldType', value: YIELD.PRODUCTION },
            { name: 'Amount', value: 15 }
        ],
    },
    localizations: [{
        description: '+15% Production when training units.'
    }]
});

// Bind both modifiers to the tradition
warriorCult.bind([meleeBonus, trainingBonus]);

// Add to mod
mod.add([warriorCult]);
```

## Creating Civilization-Specific Traditions

You can create traditions that are specific to certain civilizations:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    Mod,
    ModifierBuilder,
    TraditionBuilder,
    COLLECTION,
    EFFECT,
    REQUIREMENT
} from "@civ7/sdk";

const mod = new Mod({
    id: 'my-civ-tradition-mod',
    version: '1.0',
});

// Create a tradition
const dacianWolfCult = new TraditionBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    tradition: {
        traditionType: 'TRADITION_WOLF_CULT',
    },
    localizations: [
        { 
            name: 'Wolf Cult', 
            description: 'Dacian religious practices venerating the wolf as a sacred animal.'
        },
    ]
});

// Create modifier with civilization-specific requirement
const wolfCultBonus = new ModifierBuilder({
    modifier: {
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.UNIT_ADJUST_COMBAT_STRENGTH,
        requirements: [{
            type: REQUIREMENT.PLAYER_IS_CIVILIZATION_TYPE,
            arguments: [{ name: 'CivilizationType', value: 'CIVILIZATION_DACIA' }]
        }],
        arguments: [{ name: 'Amount', value: 5 }],
    },
    localizations: [{
        description: '+5 Combat Strength for all units (Dacia only).'
    }]
});

// Bind the modifier to the tradition
dacianWolfCult.bind([wolfCultBonus]);

// Add to mod
mod.add([dacianWolfCult]);
```

## Advanced Tradition Techniques

### Age-Spanning Traditions

Create traditions that evolve as your civilization transitions between Ages:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    Mod,
    ModifierBuilder,
    TraditionBuilder,
    COLLECTION,
    EFFECT,
    REQUIREMENT,
    AGE
} from "@civ7/sdk";

const mod = new Mod({
    id: 'my-age-tradition-mod',
    version: '1.0',
});

// Create a tradition that exists in multiple Ages
const ancientHeritage = new TraditionBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    tradition: {
        traditionType: 'TRADITION_ANCIENT_HERITAGE',
    },
    localizations: [
        { 
            name: 'Ancient Heritage', 
            description: 'Preserving the ways of the ancients through changing times.'
        },
    ]
});

// Antiquity Age benefit
const antiquityBonus = new ModifierBuilder({
    modifier: {
        collection: COLLECTION.PLAYER_CITIES,
        effect: EFFECT.CITY_ADJUST_YIELD,
        requirements: [{
            type: REQUIREMENT.PLAYER_IS_IN_AGE,
            arguments: [{ name: 'AgeType', value: AGE.ANTIQUITY }]
        }],
        arguments: [
            { name: 'YieldType', value: 'YIELD_CULTURE' },
            { name: 'Amount', value: 3 }
        ],
    },
    localizations: [{
        description: '+3 Culture in the Antiquity Age.'
    }]
});

// Exploration Age benefit
const explorationBonus = new ModifierBuilder({
    modifier: {
        collection: COLLECTION.PLAYER_CITIES,
        effect: EFFECT.CITY_ADJUST_YIELD,
        requirements: [{
            type: REQUIREMENT.PLAYER_IS_IN_AGE,
            arguments: [{ name: 'AgeType', value: AGE.EXPLORATION }]
        }],
        arguments: [
            { name: 'YieldType', value: 'YIELD_CULTURE' },
            { name: 'Amount', value: 5 }
        ],
    },
    localizations: [{
        description: '+5 Culture in the Exploration Age.'
    }]
});

// Bind both modifiers to the tradition
ancientHeritage.bind([antiquityBonus, explorationBonus]);

// Add to mod
mod.add([ancientHeritage]);
```

### Conditional Tradition Benefits

Create traditions with benefits that depend on game conditions:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    Mod,
    ModifierBuilder,
    TraditionBuilder,
    COLLECTION,
    EFFECT,
    REQUIREMENT,
    YIELD
} from "@civ7/sdk";

const mod = new Mod({
    id: 'my-conditional-tradition-mod',
    version: '1.0',
});

// Create a tradition that provides benefits only during wartime
const warPreparation = new TraditionBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    tradition: {
        traditionType: 'TRADITION_WAR_PREPARATION',
    },
    localizations: [
        { 
            name: 'War Preparation', 
            description: 'Society organized for rapid mobilization during times of conflict.'
        },
    ]
});

// Wartime production bonus
const wartimeBonus = new ModifierBuilder({
    modifier: {
        collection: COLLECTION.PLAYER_CITIES,
        effect: EFFECT.CITY_ADJUST_YIELD,
        requirements: [{
            type: REQUIREMENT.PLAYER_IS_AT_WAR
        }],
        arguments: [
            { name: 'YieldType', value: YIELD.PRODUCTION },
            { name: 'Amount', value: 20 },
            { name: 'Percent', value: true }
        ],
    },
    localizations: [{
        description: '+20% Production during wartime.'
    }]
});

// Bind the modifier to the tradition
warPreparation.bind([wartimeBonus]);

// Add to mod
mod.add([warPreparation]);
```

## Creating Tradition Groups

You can organize related traditions into logical groups:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    Mod,
    TraditionBuilder,
    TraditionGroupBuilder
} from "@civ7/sdk";

const mod = new Mod({
    id: 'my-tradition-group-mod',
    version: '1.0',
});

// Create multiple traditions
const tradition1 = new TraditionBuilder({
    // Configuration...
});

const tradition2 = new TraditionBuilder({
    // Configuration...
});

const tradition3 = new TraditionBuilder({
    // Configuration...
});

// Create a tradition group
const militaryTraditions = new TraditionGroupBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    traditionGroup: {
        traditionGroupType: 'TRADITION_GROUP_MILITARY',
    },
    localizations: [
        { 
            name: 'Military Traditions', 
            description: 'Traditions focused on warfare and martial prowess.'
        },
    ]
});

// Associate traditions with the group
militaryTraditions.bind([tradition1, tradition2, tradition3]);

// Add everything to mod
mod.add([militaryTraditions, tradition1, tradition2, tradition3]);
```

## Best Practices

When creating traditions, keep these best practices in mind:

1. **Balance**: Ensure tradition benefits are balanced and not overpowered
2. **Thematic Coherence**: Design traditions with a clear thematic focus
3. **Descriptive Names**: Use evocative, culturally appropriate names
4. **Clear Effects**: Ensure descriptions clearly explain gameplay effects
5. **Age Appropriateness**: Consider which Ages a tradition should be available in
6. **Civilization Fit**: For civilization-specific traditions, ensure they match the civilization's theme

## Conclusion

Traditions offer a powerful way to add flavor and gameplay benefits to your mod. By creating traditions with meaningful effects, you can enhance your civilization's gameplay experience and provide players with interesting strategic choices. 