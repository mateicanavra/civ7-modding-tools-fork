# Civ7 Modding Tools and Resources

This repository is a community-maintained fork of [izica/civ7-modding-tools](https://github.com/izica/civ7-modding-tools). It is now structured as a pnpm-powered monorepo.

## Monorepo structure
- `packages/sdk` – reusable Civ7 SDK
- `packages/cli` – command line interface
- `packages/docs-plugins` – local docs plugins
- `packages/config` – shared TS/ESLint/Prettier presets
- `apps/docs` – docs app serving content from `docs/`
- `apps/playground` – example scripts using the SDK
- `docs/` – markdown content for contributors
## Development
- `pnpm build` – run package builds through Turbo
- `pnpm dev` – run dev tasks
- `pnpm docs` – serve the docs app
- `pnpm -F @civ7/cli dev` – work on the CLI
- `pnpm -F @civ7/playground dev` – run the playground scripts


- [Installation and Setup](#installation-and-setup)
- [Using the CLI](#using-the-cli)
- [Getting Started with Mod Generation](#getting-started-with-mod-generation)
- [Status](#status)
- [Examples](#examples)
- [Previews](#previews)
- [Differences from upstream](#differences-from-upstream)

## Features
- A command-line interface (CLI) to extract or archive Civ7 resources (`civ7 zip`, `civ7 unzip`).
- Configurable extraction profiles (default/full/assets) via `civ.config.jsonc` in the project root.
- Strongly typed builders for units, civilizations, constructibles, and more.
- Embedded documentation under `docs/` with guides and gap analyses.
- pnpm workspace setup for easy package management.

## Installation and Setup

Setting up this project is a two-step process. First, you install the project dependencies and the CLI. Second, you use the newly installed CLI to pull in the game data.

### Step 1: Install Dependencies and Link the CLI

This command will install all necessary dependencies, build the CLI, and create a global link to the `civ7` executable, making it available everywhere in your terminal.

```bash
pnpm refresh
```
You only need to run this command once for the initial setup, or whenever you pull changes that affect dependencies or the CLI source code.

**Note:** After running this command, you may need to open a new terminal session or source your shell's profile file (e.g., `source ~/.zshrc`) for the `civ7` command to become available.

### Step 2: Refresh Game Data

After the `civ7` command is available, you can use it to populate the repository with the official game data from your local Civilization VII installation. This script runs `civ7 zip` and `civ7 unzip` in sequence using the `default` profile.

```bash
pnpm refresh:data
```

You can run this command whenever you want to ensure the local resource data is up-to-date with your game files.

## Using the CLI

Once set up, you can use the `civ7` command directly to manage game resource archives. Its behavior is configured by the `civ.config.jsonc` file located in the project root. You can customize the default profiles or add your own.

### Unzipping Resources
```bash
# Unzip using the 'default' profile
civ7 unzip

# Unzip using the 'full' profile
civ7 unzip full

# Override the source archive and destination directory
civ7 unzip default ./my-archive.zip ./my-output-dir
```

### Zipping Resources
```bash
# Zip using the 'default' profile
civ7 zip

# Zip using the 'assets' profile with verbose output
civ7 zip --verbose assets

# Use a custom config file instead of the one in the project root
civ7 zip --config ./my-custom-config.jsonc default
```

### Profiles
- **default**: Includes core gameplay data and excludes large assets. Ideal for quick, focused modding tasks.
- **full**: Includes almost all game resources, suitable for comprehensive analysis.
- **assets**: Includes only media like icons, fonts, and movies.


## Getting Started with Mod Generation
The core of this repository is the mod generation library. `build.ts` contains starter code. Copy an example from the [`examples`](examples) directory or write your own script and run:

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
- **Ships a dedicated CLI** and configuration to zip or unzip official Civ7 resources.
- Adds extra builders, constants, and resource classes to cover more modding features.
- Provides `AGENTS.md` with workspace guidance and XML verification tips.

## Docs authoring (Docsify)

We render documentation with Docsify. To embed XML/SQL examples directly from files without copy‑pasting:

- Use the include syntax inside a fenced block. Example:

  ```xml
  %[{ examples/fxs-new-narrative-event/data/antiquity-discovery.xml }]%
  ```

- To show only a subset of lines, add a `lines=START-END` hint in the fence info:

  ```xml lines=1-80
  %[{ examples/fxs-new-narrative-event/data/antiquity-discovery.xml }]%
  ```

- Wrap large snippets in a collapsible toggle to keep pages tidy:

  <details class="code-example">
  <summary>antiquity-discovery.xml (excerpt)</summary>

  ```xml lines=1-80
  %[{ examples/fxs-new-narrative-event/data/antiquity-discovery.xml }]%
  ```
  </details>

Notes
- Syntax highlighting is via Prism (XML/SQL enabled).
- Includes are handled with `docsify-include-template`; line slicing is provided by a small local plugin `plugins/code-slicer.js` (loaded by the docs site).
- Keep paths relative to the docs site root so they work with `pnpm run docs:all` and per‑site servers.

Reference: Docsify Embed files [link](https://docsify.js.org/#/embed-files)