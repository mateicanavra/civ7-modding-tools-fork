# izica`s civ7 modding tools
Mod generation tool for Civilization 7.

- [Usage](#usage)
- [Currently state](#currently-state)
    - [Done](#done)
    - [Working on](#working-on)
    - [TODO](#todo)
- [Getting started](#getting-started)
    - [Install from repository](#install-from-repository)
    - [Install from NPM](#install-from-npm)
- [Previews](#previews)
    - [Use builders for easier and faster mod creation](#use-builders-for-easy-and-faster-mod-creating)
    - [Full strongly typed](#full-strongly-typed)
    - [Full control of generation](#full-control-of-generation)
    - [Possibility of fully manual creation](#possibility-of-full-manually-creation)
- [Examples](https://github.com/izica/civ7-modding-tools/tree/main/examples)
    - [Init and create civilization](https://github.com/izica/civ7-modding-tools/blob/main/examples/civilization.ts)
    - [Create unit](https://github.com/izica/civ7-modding-tools/blob/main/examples/unit.ts)
    - [Import sql file](https://github.com/izica/civ7-modding-tools/blob/main/examples/import-sql-file.ts)
    - [Import custom icon](https://github.com/izica/civ7-modding-tools/blob/main/examples/import-custom-icon.ts)
    - [Create civics progression tree](https://github.com/izica/civ7-modding-tools/blob/main/examples/progression-tree.ts)
    - [Unique-quarter](https://github.com/izica/civ7-modding-tools/blob/main/examples/unique-quarter.ts)

## Currently state
### Done
- [x] Mod info
- [x] Import custom files
- [x] Localization
    - [x] English
- [x] Units
- [x] Civilizations
- [x] Constructibles
    - [x] Base building
    - [x] Improvement
    - [x] Unique quarter 
- [x] City names
- [x] Civics
- [x] Traditions
- [x] Game Effects

### Working on
- [ ] Great People nodes(+builder?)
- [ ] New civ unlock system(+builder?)

### Todo
- [ ] AI nodes(+builder?)
- [ ] Localization/Internalization
- [ ] Unit abilities nodes(+builder?)
- [ ] Wonder nodes(+builder?)
- [ ] ???

      
## Getting started
### Install from repository
Download repo ZIP file or clone:

```bash
clone https://github.com/izica/civ7-modding-tools
```

[build.ts](https://github.com/izica/civ7-modding-tools/blob/main/build.ts) contains all the necessary code to get started, so you can begin by modifying it to fit your needs.
Also you can copy an example from the [examples](https://github.com/izica/civ7-modding-tools/tree/main/examples) folder into [build.ts](https://github.com/izica/civ7-modding-tools/blob/main/build.ts).

Then, run the following commands:

```bash
npm install
npm run build
```

### Install from npm

```bash
npm install civ7-modding-tools
```

```typescript
import { Mod } from 'civ7-modding-tools';
// or you can import from 'civ7-modding-tools/src' for full typescript source

let mod = new Mod({
    id: 'test-mod',
    version: '1',
});
/* ... */
mod.build('./dist');
```

To build mod you need to run your script with `node.js` or `tsx`;
```bash
tsx build.ts
```


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
