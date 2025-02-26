# izica`s civ7 modding tools
Mod generation tool for Civilization 7.

- [Usage](#usage)
- [Previews](#previews)
    - [Use builders for easy and faster mod creating](#use-builders-for-easy-and-faster-mod-creating)
    - [Full strong typed](#full-strong-typed)
    - [Full control of generation](#full-control-of-generation)
    - [Possibility to full manually creation](#possibility-to-full-manually-creation)
- [Features](#features)
- [Modding covering / TODO](#modding-covering--todo)
- [Full example](#full-example)

## Usage
Copy example from examples folder to build.ts,

then run commands

```bash
yarn install
yarn build
```

## Previews
#### Use builders for easy and faster mod creating
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

#### Full strong typed
![Typed](previews/typed.png)

#### Full control of generation
![Controllable](previews/controllable.png)

#### Possibility to full manually creation
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

## Features
* written in typescript
* typed entities
* easy mod creation

## Modding covering / TODO
- [x] Mod info
- - [x] Properties
- - [x] Autogenerate Criteria
- - [x] Autogenerate ActionGroups
- - [x] Import custom icons
- [x] Localization tool
- - [x] English
- - [ ] Internalization (help wanted)
- [x] Units
- - [x] Creating
- - [x] Stats
- - [x] Costs
- - [x] Visual remap
- - [x] Icons
- - [x] Replace
- - [x] Texts
- - [ ] Game effects
- - [ ] ...and more
- [x] Civilizations
- - [x] Creating
- - [x] Civilization items
- - [x] Texts
- - [x] Binding unique units
- - [x] Binding unique constructibles
- - [x] Icons
- - [x] City names
- - [x] Start biases
- - [x] Visual arts
- - [x] Game effects
- - [ ] Civics
- - [ ] ...and more
- [x] Constructibles
- - [x] Creating
- - [x] Tags
- - [x] Yield Changes
- - [x] Valid Districts
- - [x] Maintenances
- - [x] Cost
- - [x] Texts
- - [x] Icons
- - [ ] Remap (don't work at the time)
- - [ ] as Improvement
- - [ ] as Quarter
- - [ ] Game effects
- - [ ] ...and more
- [ ] Named places
- [ ] Resources
- [ ] Techs
- [ ] Civics
- [ ] Legacies

### Full example
```typescript

import { ACTION_GROUP_BUNDLE, CivilizationBuilder, ImportFileBuilder, Mod, TAG_TRAIT, UNIT, UNIT_CLASS, UnitBuilder } from "./src";

let mod = new Mod({
    id: 'mod-test',
    version: '1',
});

const civilizationIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/civ-icon.png',
    name: 'civ_sym_gondor'
});

const civilization = new CivilizationBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    civilization: {
        domain: 'AntiquityAgeCivilizations',
        civilizationType: 'CIVILIZATION_GONDOR'
    },
    civilizationTags: [TAG_TRAIT.CULTURAL, TAG_TRAIT.ECONOMIC],
    icon: {
        path: `fs://game/${mod.id}/${civilizationIcon.name}`
    },
    localizations: [
        { name: 'Custom civilization', description: 'test description', fullName: 'test full name', adjective: 'test adjective', cityNames: ['Gondor'] }
    ]
});

const unitIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './assets/unit-icon.png',
    name: 'scout.png'
});

const unit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    typeTags: [UNIT_CLASS.RECON, UNIT_CLASS.RECON_ABILITIES],
    unit: {
        unitType: 'UNIT_CUSTOM_SCOUT',
        baseMoves: 2,
        baseSightRange: 10,
    },
    icon: {
        path: `fs://game/${mod.id}/${unitIcon.name}`
    },
    unitCost: { cost: 20 },
    unitStat: { combat: 0 },
    unitReplace: { replacesUnitType: UNIT.SCOUT },
    visualRemap: { to: UNIT.ARMY_COMMANDER },
    localizations: [
        { name: 'Custom scout', description: 'test description' },
    ],
});

civilization.bind([
    unit
]);

mod = mod.add([
    civilization,
    civilizationIcon,
    unit,
    unitIcon
]);

mod.build('./dist');

```
