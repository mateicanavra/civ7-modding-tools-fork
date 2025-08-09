# Civ7 Modding SDK

A TypeScript SDK for programmatically generating Civilization VII mods with strongly-typed builders and comprehensive game data modeling.

## Features

- **Strongly typed builders** for units, civilizations, constructibles, and more
- **Full control** over XML generation and mod structure
- **Comprehensive constants** for game entities (units, abilities, effects, etc.)
- **Localization support** with multiple language options
- **Import utilities** for SQL files and custom assets

## Installation

```bash
npm install @civ7/sdk
# or
pnpm add @civ7/sdk
```

## Quick Start

```typescript
import { Mod, UnitBuilder, ACTION_GROUP_BUNDLE, UNIT_CLASS, UNIT } from '@civ7/sdk';

const mod = new Mod({
    id: 'my-first-mod',
    version: '1.0.0',
});

const unit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    typeTags: [UNIT_CLASS.RECON, UNIT_CLASS.RECON_ABILITIES],
    unit: {
        unitType: 'UNIT_CUSTOM_SCOUT',
        baseMoves: 2,
        baseSightRange: 10,
    },
    unitCost: { cost: 20 },
    unitStat: { combat: 0 },
    unitReplace: { replacesUnitType: UNIT.SCOUT },
    visualRemap: { to: UNIT.ARMY_COMMANDER },
    localizations: [
        { name: 'Custom Scout', description: 'An enhanced scout unit' }
    ],
});

mod.add([unit]).build('./my-mod');
```

## Builder API

### Available Builders

#### Completed
- `UnitBuilder` - Create custom units with stats, costs, and abilities
- `CivilizationBuilder` - Define new civilizations with unique traits
- `CivilizationUnlockBuilder` - Set civilization-specific unlocks
- `LeaderUnlockBuilder` - Configure leader bonuses and abilities
- `ConstructibleBuilder` - Create buildings and improvements
- `UniqueQuarterBuilder` - Design unique districts
- `ProgressionTreeBuilder` - Build civic and tech trees
- `TraditionBuilder` - Add new policy cards
- `ModifierBuilder` - Create game modifiers and effects
- `ImportFileBuilder` - Import SQL files and custom assets

#### In Progress
- Great People builders
- Wonder builders
- Unit ability builders

### Builder Pattern

All builders follow a consistent pattern:

```typescript
const builder = new SomeBuilder({
    // Configuration options
});

// Add to mod
mod.add([builder]);

// Or get the generated nodes for manual manipulation
const nodes = builder.getNodes();
```

## Low-Level API

For complete control, you can work directly with nodes:

```typescript
import { 
    Mod, 
    UnitNode, 
    DatabaseNode, 
    TypeNode, 
    XmlFile,
    KIND,
    ACTION_GROUP,
    ACTION_GROUP_ACTION
} from '@civ7/sdk';

const mod = new Mod({
    id: 'manual-mod',
    version: '1.0.0',
});

const unit = new UnitNode({
    unitType: 'UNIT_CUSTOM_SCOUT',
    baseMoves: 2,
    baseSightRange: 10,
});

const database = new DatabaseNode({
    types: [
        new TypeNode({ type: unit.unitType, kind: KIND.UNIT })
    ],
    units: [unit]
});

const unitFile = new XmlFile({
    path: `/units/${unit.unitType}.xml`,
    name: 'unit.xml',
    content: database.toXmlElement(),
    actionGroups: [ACTION_GROUP.AGE_ANTIQUITY_CURRENT],
    actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
});

mod.addFiles([unitFile]).build('./my-mod');
```

## Examples

### Create a Civilization
```typescript
import { CivilizationBuilder } from '@civ7/sdk';

const gondor = new CivilizationBuilder({
    civilization: {
        civilizationType: 'CIVILIZATION_GONDOR',
        name: 'Gondor',
        // ... configuration
    },
    // ... traits, city names, etc.
});
```

### Import Custom Icons
```typescript
import { ImportFileBuilder } from '@civ7/sdk';

const icon = new ImportFileBuilder({
    source: './assets/my-icon.png',
    destination: 'UI/Icons/my-icon.dds',
});
```

### Create a Progression Tree
```typescript
import { ProgressionTreeBuilder } from '@civ7/sdk';

const civicsTree = new ProgressionTreeBuilder({
    tree: {
        treeType: 'PROGRESSIONTREE_CIVICS_GONDOR',
        age: 'AGE_ANTIQUITY',
        // ... configuration
    },
    nodes: [
        // ... tree nodes
    ],
});
```

## Type Safety

The SDK provides comprehensive type definitions for all game constants:

```typescript
import { 
    UNIT,           // All unit types
    ABILITY,        // All abilities
    EFFECT,         // All effects
    TERRAIN,        // All terrain types
    RESOURCE,       // All resources
    CIVILIZATION_DOMAIN,  // Civilization domains
    // ... many more
} from '@civ7/sdk';
```

## Localization

Built-in support for multiple languages:

```typescript
const builder = new UnitBuilder({
    // ... configuration
    localizations: [
        { language: 'en_US', name: 'Custom Unit', description: 'Description' },
        { language: 'fr_FR', name: 'Unité Personnalisée', description: 'Description' },
    ],
});
```

## API Reference

For detailed API documentation, see:
- [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md) - In-depth technical documentation
- [TypeScript API](./src/index.ts) - Full type definitions

## Contributing

This SDK is part of the [civ7-modding-tools](https://github.com/your-org/civ7-modding-tools) monorepo. Contributions are welcome!

## License

MIT