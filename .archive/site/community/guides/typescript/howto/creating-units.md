# TypeScript Modding Tools: Creating Units

This guide covers how to create custom units using the Civilization VII TypeScript Modding Tools.

## Basic Unit Creation

Here's how to create a custom scout unit:

```typescript
import { 
    ACTION_GROUP_BUNDLE, 
    Mod, 
    UNIT, 
    UNIT_CLASS, 
    UnitBuilder 
} from "civ7-modding-tools";

// Create a new mod
const mod = new Mod({
    id: 'my-unit-mod',
    version: '1.0',
});

// Define a custom scout unit
const customScout = new UnitBuilder({
    // Specify which Age this unit belongs to
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    
    // Add unit type tags (affects what abilities the unit has)
    typeTags: [UNIT_CLASS.RECON, UNIT_CLASS.RECON_ABILITIES],
    
    // Core unit properties
    unit: {
        unitType: 'UNIT_CUSTOM_SCOUT',  // Unique identifier
        baseMoves: 3,                   // Movement points
        baseSightRange: 3,              // Visibility range
    },
    
    // Cost to produce the unit
    unitCost: { 
        cost: 60 
    },
    
    // Combat statistics
    unitStat: { 
        combat: 15 
    },
    
    // Replace an existing unit (optional)
    unitReplace: { 
        replacesUnitType: UNIT.SCOUT 
    },
    
    // Use existing model/assets from another unit
    visualRemap: { 
        to: UNIT.SCOUT
    },
    
    // Text that appears in-game
    localizations: [
        { 
            name: 'Elite Scout', 
            description: 'A faster, stronger scout unit with extended visibility.'
        },
    ],
});

// Add unit to mod and build
mod.add([customScout]).build('./dist');
```

## Key Components

When creating a unit, these are the essential components:

1. **Unit Type Tags**: Define what kind of unit it is (melee, ranged, etc.)
2. **Core Properties**: Set movement, sight range, and unique identifier
3. **Production Cost**: How expensive the unit is to produce
4. **Combat Stats**: How strong the unit is in combat
5. **Localization**: The name and description shown to players
6. **Visual Appearance**: Either custom assets or remapped from existing units

## Additional Configuration Options

### Setting Advanced Unit Properties

```typescript
// Advanced unit with more properties
const advancedUnit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    typeTags: [UNIT_CLASS.MELEE, UNIT_CLASS.HEAVY],
    
    unit: {
        unitType: 'UNIT_ADVANCED_WARRIOR',
        baseMoves: 2,
        baseSightRange: 2,
        targetingRange: 1,         // For ranged attacks
        ignoresZoneOfControl: true, // Can ignore ZOC
        canCapture: true,          // Can capture cities
    },
    
    unitCost: { 
        cost: 80 
    },
    
    // More detailed combat stats
    unitStat: { 
        combat: 25,
        rangedCombat: 0,
        bombardCombat: 0,
        religiousCombat: 0,
        antiAirCombat: 0,
    },
    
    localizations: [
        { 
            name: 'Elite Warrior', 
            description: 'A powerful melee unit with special abilities.'
        },
    ],
});
```

### Using Custom Assets

To use custom art assets for your unit:

```typescript
import { 
    ImportFileBuilder, 
    UnitBuilder 
} from "civ7-modding-tools";

// Import a custom icon
const customUnitIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/my-unit-icon.png',
    name: 'unit_custom_warrior_icon'
});

// Reference the custom icon in your unit
const unitWithCustomIcon = new UnitBuilder({
    // Basic unit properties...
    
    // Reference your custom icon
    icon: 'unit_custom_warrior_icon',
    
    // Other properties...
});

// Add both the unit and the icon to your mod
mod.add([customUnitIcon, unitWithCustomIcon]);
```

## Related Resources

For more information about TypeScript modding in Civilization VII, check:
- [TypeScript Modding Tools Overview](/guides/typescript/typescript-overview.md)
- [Environment Setup](/guides/typescript/howto/environment-setup.md)
- [Creating Buildings](/guides/typescript/howto/creating-buildings.md) 