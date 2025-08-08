# TypeScript Modding Tools: Complete Guide Collection

This page serves as the primary resource for practical how-to guides for Civilization VII TypeScript modding. While the [main documentation](/guides/typescript/typescript-overview.md) covers general concepts and the [technical implementation guide](/guides/typescript/typescript-technical.md) explains the internal architecture, these how-to guides provide step-by-step instructions for common modding tasks.

## Guide Categories

### Getting Started
- [**Environment Setup**](/guides/typescript/howto/environment-setup.md) - *Start here if you're new to TypeScript modding*
  - Set up your development environment, install necessary tools, and create your first project structure

### Basic Game Elements
- [**Creating Units**](/guides/typescript/howto/creating-units.md) - *For modders adding or modifying military and civilian units*
  - Complete process for designing and implementing custom units with appropriate properties
- [**Creating Buildings**](/guides/typescript/howto/creating-buildings.md) - *For modders adding or modifying buildings and tile improvements*
  - Step-by-step instructions for buildings within districts and map tile improvements

### Civilization Components
- [**Creating Civilizations**](/guides/typescript/howto/creating-civilizations.md) - *For modders creating complete new civilizations*
  - Comprehensive guide to civilization definitions, abilities, and unique elements
- [**Leaders and Ages**](/guides/typescript/howto/leaders-and-ages.md) - *For modders working with leaders or age-specific content*
  - Instructions for leaders, their abilities, and how they interact with age mechanics
- [**Unique Quarters**](/guides/typescript/howto/unique-quarters.md) - *For modders adding specialized districts*
  - Detailed guide to creating civilization-specific districts with unique bonuses

### Game Systems
- [**Traditions**](/guides/typescript/howto/traditions.md) - *For modders expanding the traditions system*
  - Complete process for implementing traditions with various effects and requirements
- [**Progression Trees**](/guides/typescript/howto/progression-trees.md) - *For modders working with technology and civic trees*
  - Guide to creating advanced trees with multiple branches and progression paths

### Technical Implementation
- [**Modifiers and Effects**](/guides/typescript/howto/modifiers-and-effects.md) - *For modders who need to create complex game mechanics*
  - In-depth coverage of the modifier system that powers gameplay effects
- [**Assets and Icons**](/guides/typescript/howto/assets-and-icons.md) - *For modders adding visual elements to their mods*
  - Instructions for importing, referencing, and managing custom visual assets
- [**Advanced Techniques**](/guides/typescript/howto/advanced-techniques.md) - *For experienced modders optimizing complex mods*
  - Advanced strategies for organizing code, optimizing performance, and creating complex game systems

## When to Use Each Guide

| If you want to... | Use this guide |
|-------------------|---------------|
| Start modding with TypeScript | [Environment Setup](/guides/typescript/howto/environment-setup.md) |
| Add a new military or civilian unit | [Creating Units](/guides/typescript/howto/creating-units.md) |
| Create a new building or improvement | [Creating Buildings](/guides/typescript/howto/creating-buildings.md) |
| Add a complete new civilization | [Creating Civilizations](/guides/typescript/howto/creating-civilizations.md) |
| Create or modify leaders | [Leaders and Ages](/guides/typescript/howto/leaders-and-ages.md) |
| Add a specialized district | [Unique Quarters](/guides/typescript/howto/unique-quarters.md) |
| Create new policies or social elements | [Traditions](/guides/typescript/howto/traditions.md) |
| Modify research or civic advancement | [Progression Trees](/guides/typescript/howto/progression-trees.md) |
| Create gameplay effects and bonuses | [Modifiers and Effects](/guides/typescript/howto/modifiers-and-effects.md) |
| Add custom art or icons | [Assets and Icons](/guides/typescript/howto/assets-and-icons.md) |
| Optimize complex mods | [Advanced Techniques](/guides/typescript/howto/advanced-techniques.md) |

## Guide Structure

Each guide follows a consistent structure:
1. **Overview** - Purpose and scope of the guide
2. **Prerequisites** - What you need to know before starting
3. **Step-by-Step Instructions** - Detailed walkthrough
4. **Code Examples** - Practical implementation examples
5. **Best Practices** - Recommendations for quality and compatibility
6. **Troubleshooting** - Solutions to common issues

## Advanced Example: Direct SQL Integration

For advanced modifications, you can also import SQL files directly:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    ImportFileBuilder,
    Mod
} from "@civ7/sdk";

const mod = new Mod({
    id: 'my-sql-mod',
    version: '1.0',
});

// Create the SQL content
const sqlContent = `
-- Increase unit movement for all melee units
UPDATE Units 
SET BaseMoves = BaseMoves + 1 
WHERE UnitType IN (
    SELECT Type 
    FROM TypeTags 
    WHERE Tag = 'MELEE'
);

-- Add new leader trait
INSERT INTO Types (Type, Kind) VALUES ('TRAIT_LEADER_MOUNTAIN_KING', 'KIND_TRAIT');
INSERT INTO LeaderTraits (LeaderType, TraitType) VALUES ('LEADER_DECEBALUS', 'TRAIT_LEADER_MOUNTAIN_KING');
`;

// Import SQL file with the content
const sqlFile = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: sqlContent,
    name: 'custom-mod.sql'
});

mod.add([sqlFile]);
mod.build('./dist');
```

## Next Steps

1. Start with the [Environment Setup](/guides/typescript/howto/environment-setup.md) guide if you're new to TypeScript modding
2. Refer to the [TypeScript overview](/guides/typescript/typescript-overview.md) and [technical implementation guide](/guides/typescript/typescript-technical.md) for more comprehensive information 