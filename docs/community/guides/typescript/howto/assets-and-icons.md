# TypeScript Modding Tools: Assets and Icons

This guide covers how to incorporate custom assets and icons into your Civilization VII mods using the TypeScript Modding Tools.

## Overview of Assets in Civilization VII

Assets are the visual elements of your mod, including icons, portraits, textures, and other graphical resources. Properly importing and referencing these assets is crucial for creating polished and professional-looking mods. The TypeScript Modding Tools provide a streamlined workflow for importing and using custom assets.

## Importing Assets

The first step in using custom assets is importing them into your mod. This is done using the `ImportFileBuilder` class:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    ImportFileBuilder,
    Mod
} from "@civ7/sdk";

const mod = new Mod({
    id: 'my-assets-mod',
    version: '1.0',
});

// Import a single icon
const unitIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/unit-icon.png',  // Path to your asset file
    name: 'unit_icon_custom'  // Name to reference the asset in the game
});

// Add to mod
mod.add([unitIcon]);

// Build the mod
mod.build('./dist');
```

## Common Asset Types

Different game elements require different types of assets. Here's how to import various common asset types:

```typescript
// Civilization icon (displayed in the civilization selection screen)
const civIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/civ-icon.png',
    name: 'civ_sym_custom'
});

// Leader portrait (displayed in diplomacy screens)
const leaderPortrait = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/leader-portrait.png',
    name: 'leader_custom'
});

// Unit icon (displayed in the unit panel)
const unitIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/unit-icon.png',
    name: 'unit_icon_custom'
});

// Building icon (displayed in city production panel)
const buildingIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/building-icon.png',
    name: 'building_icon_custom'
});

// Tradition icon (displayed in tradition tree)
const traditionIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/tradition-icon.png',
    name: 'tradition_icon_custom'
});

// Add all assets to mod
mod.add([civIcon, leaderPortrait, unitIcon, buildingIcon, traditionIcon]);
```

## Referencing Assets in Game Elements

After importing assets, you need to reference them in your game elements. Here's how to do that for different elements:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    CivilizationBuilder,
    ImportFileBuilder,
    Mod,
    UnitBuilder
} from "@civ7/sdk";

const mod = new Mod({
    id: 'my-assets-mod',
    version: '1.0',
});

// Import assets
const civIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/civ-icon.png',
    name: 'civ_sym_custom'
});

const unitIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/unit-icon.png',
    name: 'unit_icon_custom'
});

// Create civilization with icon reference
const civilization = new CivilizationBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    civilization: {
        type: 'CIVILIZATION_CUSTOM',
        name: 'Custom Civilization',
        icon: {
            path: `fs://game/${mod.id}/${civIcon.name}`  // Reference to imported asset
        }
        // Other properties...
    }
});

// Create unit with icon reference
const unit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    unit: {
        unitType: 'UNIT_CUSTOM',
        name: 'Custom Unit',
        icon: {
            path: `fs://game/${mod.id}/${unitIcon.name}`  // Reference to imported asset
        }
        // Other properties...
    }
});

// Add to mod
mod.add([civIcon, unitIcon, civilization, unit]);
```

## Understanding File Paths

When referencing assets, you need to use the correct file path format:

```typescript
// Standard format for referencing imported assets
const assetPath = `fs://game/${mod.id}/${assetName}`;

// Examples
const civIconPath = `fs://game/my-assets-mod/civ_sym_custom`;
const unitIconPath = `fs://game/my-assets-mod/unit_icon_custom`;
```

The path format breaks down as:
- `fs://game/` - Prefix for game assets
- `${mod.id}/` - Your mod ID (creates a namespace)
- `${assetName}` - The name you specified when importing the asset

## Asset Requirements and Best Practices

For the best results, follow these guidelines for your assets:

1. **File Formats**: Use PNG for icons and JPEG for larger images
2. **Resolution**: 
   - Civilization icons: 256x256 pixels
   - Unit icons: 128x128 pixels
   - Leader portraits: 512x768 pixels
   - Building icons: 128x128 pixels
3. **Transparency**: Use transparency (alpha channel) for icons that should not be rectangular
4. **Naming Convention**: Use descriptive, lowercase names with underscores
5. **Organization**: Keep assets in an organized folder structure

## Age-Specific Assets

For mods that span multiple ages, you can import age-specific assets:

```typescript
// Antiquity Age icon
const antiquityIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/unit-antiquity.png',
    name: 'unit_icon_antiquity'
});

// Exploration Age icon
const explorationIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    content: './assets/unit-exploration.png',
    name: 'unit_icon_exploration'
});

// Modern Age icon
const modernIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_MODERN,
    content: './assets/unit-modern.png',
    name: 'unit_icon_modern'
});

// Reference in age-specific units
const antiquityUnit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    unit: {
        unitType: 'UNIT_CUSTOM_ANTIQUITY',
        name: 'Antiquity Custom Unit',
        icon: {
            path: `fs://game/${mod.id}/${antiquityIcon.name}`
        }
        // Other properties...
    }
});
```

## Importing Other Asset Types

Besides icons, you can import other asset types:

```typescript
// Sound effect
const soundEffect = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/custom-sound.wav',
    name: 'sound_custom'
});

// 3D model (if supported by the game)
const modelAsset = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/custom-model.glb',
    name: 'model_custom'
});

// Add to mod
mod.add([soundEffect, modelAsset]);
```

## Troubleshooting Asset Issues

If you encounter issues with your assets, check these common problems:

1. **Incorrect File Path**: Verify that the path to your asset file is correct
2. **Missing Asset File**: Ensure the asset file exists at the specified location
3. **Unsupported Format**: Check that you're using a supported file format
4. **Wrong Action Group**: Ensure the asset's action group matches where it's used
5. **Naming Conflict**: Make sure asset names don't conflict with existing game assets
6. **File Size Too Large**: Overly large assets may cause performance issues

## Complete Example: Creating a Mod with Custom Assets

Here's a complete example of a mod that uses custom assets:

```typescript
import {
    ACTION_GROUP_BUNDLE,
    CivilizationBuilder,
    ImportFileBuilder,
    Mod,
    UnitBuilder
} from "@civ7/sdk";

const mod = new Mod({
    id: 'dacia-assets-mod',
    version: '1.0',
});

// Import assets
const civIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/dacia-icon.png',
    name: 'civ_sym_dacia'
});

const leaderPortrait = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/decebalus-portrait.png',
    name: 'leader_decebalus'
});

const unitIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/falx-warrior-icon.png',
    name: 'unit_icon_falx_warrior'
});

// Create civilization with icon reference
const dacia = new CivilizationBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    civilization: {
        type: 'CIVILIZATION_DACIA',
        name: 'Dacia',
        icon: {
            path: `fs://game/${mod.id}/${civIcon.name}`
        }
        // Other properties...
    }
});

// Create unit with icon reference
const falxWarrior = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    unit: {
        unitType: 'UNIT_FALX_WARRIOR',
        name: 'Falx Warrior',
        icon: {
            path: `fs://game/${mod.id}/${unitIcon.name}`
        }
        // Other properties...
    }
});

// Add to mod
mod.add([civIcon, leaderPortrait, unitIcon, dacia, falxWarrior]);

// Build the mod
mod.build('./dist');
```

## Conclusion

Assets and icons are essential elements that bring your mod to life visually. By following the guidelines in this guide, you can create professional-looking mods with custom assets that enhance the player experience. Remember to keep asset files organized and use consistent naming conventions to make your mod development process smoother. 