# izica`s civ7 modding tools
Mod generation tool for Civilization 7.

## Usage
Copy example from examples folder to build.ts,

then run commands

```bash
yarn install
yarn build
```

## Previews
#### Create mod with builders
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

#### You have full control of generation
![Controllable](previews/controllable.png)

#### or you can do it full manually
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
