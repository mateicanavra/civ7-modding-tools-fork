# Civ7 Modding Tools and Resources

This repository is a community-maintained fork of [izica/civ7-modding-tools](https://github.com/izica/civ7-modding-tools). The original project focused on generating Civilization VII mods programmatically. This fork extends that SDK with community documentation and utilities for browsing the official game data. It remains a mod generation toolkit for Civilization VII.

- [Features](#features)
- [Installation](#installation)
- [Civ7 Resource Archives](#civ7-resource-archives)
- [Getting Started](#getting-started)
- [Status](#status)
- [Examples](#examples)
- [Previews](#previews)
- [Differences from upstream](#differences-from-upstream)

## Features
- Strongly typed builders for units, civilizations, constructibles, and more
- Scripts to extract or archive Civ7 resources (`pnpm run unzip-civ`, `pnpm run zip-civ`)
- Configurable extraction profiles (default/full/assets) via `scripts/civ-zip-config.json`
- Embedded documentation under `docs/` with guides and gap analyses
- pnpm workspace setup

## Installation
Clone this repository, then install dependencies and build the toolkit:

```bash
pnpm install
pnpm run build
```

## Civ7 Resource Archives
By default `pnpm run unzip-civ` extracts game data into `civ7-official-resources/` using the `default` profile, which retains database schemas but omits large media such as movies, icons, fonts, and common media extensions (`.mp4`, `.dds`, `.png`, `.ttf`, etc.). Use `-- full` for a complete extraction or `-- assets` for only the media directories. `pnpm run zip-civ` creates archives following the same profiles.

## Getting Started
[`build.ts`](build.ts) contains starter code. Copy an example from the [`examples`](examples) directory or write your own script and run:

```bash
tsx build.ts
```

## Status
### Done
- Mod info
- Import custom files
- Localization (English, Internalization)
- Units
- Civilizations
  - Civilization unlocks
  - Leader unlocks
- Constructibles
  - Base building
  - Improvement
  - Unique quarter
- City names
- Civics
- Traditions
- Game Effects

### Working on
- Great People nodes (+builder?)

### Todo
- AI nodes (+builder?)
- Unit abilities nodes (+builder?)
- Wonder nodes (+builder?)
- ???

## Examples
- [Init and create civilization](examples/civilization.ts)
- [Create unit](examples/unit.ts)
- [Import sql file](examples/import-sql-file.ts)
- [Import custom icon](examples/import-custom-icon.ts)
- [Create civics progression tree](examples/progression-tree.ts)
- [Unique quarter](examples/unique-quarter.ts)

## Previews
#### Use builders for easier and faster mod creation
```typescript
const mod = new Mod({
    id: 'mod-test',
    version: '1',
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
        { name: 'Custom scout', description: 'test description' }
    ],
});


mod.add([unit]).build('./dist');
```

#### Full strongly typed
![Typed](previews/typed.png)

#### Full control of generation
![Controllable](previews/controllable.png)

#### Possibility of fully manual creation
```typescript
const mod = new Mod({
    id: 'mod-test',
    version: '1',
});

const unit = new UnitNode({
    unitType: 'UNIT_CUSTOM_SCOUT',
    baseMoves: 2,
    baseSightRange: 10,
})

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

mod.addFiles([unitFile]).build('./dist');
```

## Differences from upstream
This fork diverges from the original in several ways:
- Uses `pnpm` instead of `npm` for workspace management.
- Includes `docs/` with community guides, gap analyses, and session notes.
- Ships scripts and configuration to zip or unzip official Civ7 resources.
- Adds extra builders, constants, and resource classes to cover more modding features.
- Provides `AGENTS.md` with workspace guidance and XML verification tips.
