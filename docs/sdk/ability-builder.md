# AbilityBuilder

The `AbilityBuilder` allows you to create unit abilities for Civilization VII, with support for both regular and charged abilities. This builder generates all necessary XML files including ability types, ability definitions, unit bindings, and localizations.

## Usage

```typescript
import { 
    AbilityBuilder, 
    UnitBuilder,
    ModifierBuilder, 
    ACTION_GROUP_BUNDLE 
} from "@civ7/sdk";

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

// Create a unit
const resourceClaimerUnit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    // unit properties...
});

// Method 1: Bind using the standard bind() method (recommended)
claimResourceAbility.bind([resourceClaimerUnit]);

// Method 2: Bind directly with unit type
claimResourceAbility.bindToUnit("UNIT_MURUS_ENGINEER");

// Add to mod
mod.add([claimResourceAbility]);
```

## Options

The `AbilityBuilder` accepts the following options:

```typescript
{
    actionGroupBundle: ActionGroupBundle;
    ability: {
        abilityType: string;
        name?: string;
        description?: string;
    };
    chargedAbility?: {
        enabled: boolean;
        rechargeTurns?: number;
    };
}
```

| Option | Description |
|--------|-------------|
| `actionGroupBundle` | Controls which age the ability belongs to (e.g., `ACTION_GROUP_BUNDLE.AGE_ANTIQUITY`) |
| `ability.abilityType` | The unique identifier for the ability (e.g., `"ABILITY_CLAIM_RESOURCE"`) |
| `ability.name` | The displayed name of the ability (will be localized) |
| `ability.description` | The description text of the ability (will be localized) |
| `chargedAbility.enabled` | Whether this ability uses charges |
| `chargedAbility.rechargeTurns` | How many turns it takes to recharge, if applicable (default: 5) |

## Methods

### bind(entities: BaseBuilder[]): AbilityBuilder

Binds this ability to other entities. Currently supports binding to UnitBuilder instances.

```typescript
// Create a unit
const claimerUnit = new UnitBuilder({ /* options */ });

// Bind ability to unit using standard bind method
claimResourceAbility.bind([claimerUnit]);
```

This is the recommended method for binding abilities as it follows the standard binding pattern used throughout the toolkit.

### bindToUnit(unitType: string): AbilityBuilder

Binds this ability to a specific unit type directly (without requiring a UnitBuilder instance).

```typescript
// Bind to a unit directly by type
claimResourceAbility.bindToUnit("UNIT_MURUS_ENGINEER");

// Bind to another unit
claimResourceAbility.bindToUnit("UNIT_WORKER");
```

### build(): BaseFile[]

Generates all necessary XML files for the ability. This is automatically called when you add the ability to a mod.

## Generated Files

For an ability named `"ABILITY_CLAIM_RESOURCE"`, the builder will generate:

1. **Types File**: `/abilities/ability_claim_resource-types.xml`
   - Defines the ability type(s)

2. **Ability Definition**: `/abilities/ability_claim_resource.xml`
   - Contains the ability definition

3. **Charged Ability** (if enabled): `/abilities/charged_ability_claim_resource.xml`
   - Contains the charged ability definition

4. **Unit Binding Files**: `/units/unit_name-abilities.xml`
   - One file per bound unit type, connecting the unit to the ability

5. **Localization File**: `/text/en_US/ability_claim_resource_text.xml`
   - Contains localized strings for the ability

## Using with Modifiers

To grant charges of an ability to a unit, you should use a modifier:

```typescript
// Create a modifier that grants ability charges
const grantAbilityModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        id: "UNIT_MOD_GRANT_ABILITY_CHARGE",
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.GRANT_UNIT_ABILITY_CHARGE,
        permanent: true,
        requirements: [{
            type: REQUIREMENT.UNIT_TYPE_MATCHES,
            arguments: [{ name: "UnitType", value: "UNIT_MURUS_ENGINEER" }]
        }],
        arguments: [
            { name: "AbilityType", value: "ABILITY_CLAIM_RESOURCE" },
            { name: "ChargedAbilityType", value: "CHARGED_ABILITY_CLAIM_RESOURCE" },
            { name: "Amount", value: 3 }
        ]
    }
});

// Add to mod
mod.add([grantAbilityModifier]);
```

## Complete Example

See a complete example in the `examples/ability-example.ts` file. 