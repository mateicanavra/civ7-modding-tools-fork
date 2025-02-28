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

## Modding covering
- [x] Mod info
- [x] Localization tool
- - [x] English
- - [ ] Internalization
- [x] Units
- [x] Civilizations
- [x] Constructibles
- [x] Named places
- [x] Civics
- [x] Traditions
- [x] Game Effects
