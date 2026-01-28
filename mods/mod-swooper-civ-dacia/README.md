# Dacia Civilization - Civilization VII Mod

This mod adds the Dacia civilization to Civilization VII, including Decebalus as a leader, along with unique abilities, units, and buildings.

## Features

### Dacia Civilization
- **Civilization Ability**: Carpathian Defenders
  - Units receive +5 Combat Strength when fighting in Hills or Forest terrain
  - Gold Mines provide +1 Production and +1 Culture

### Decebalus Leader
- **Leader Ability**: Dacian Cavalry Master
  - Heavy Cavalry units are 20% faster to produce and require 1 less resource

### Unique Units and Buildings
- **Falx Warrior**: Unique Ancient era melee unit that replaces the Swordsman
- **Hill Fortress**: Unique building that provides additional defensive strength to cities
- **Dacian Sanctuary**: Unique improvement that provides Faith and Culture

## Installation

1. Place the mod folder in your Civilization VII Mods directory:
   - Windows: Documents\My Games\Civilization VII\Mods
   - Mac: ~/Library/Application Support/Civilization VII/Mods
   - Linux: ~/.local/share/Civilization VII/Mods

2. Launch Civilization VII and enable the mod in the Additional Content menu.

## SDK dependency

In this monorepo the mod uses the workspace SDK package `@mateicanavra/civ7-sdk`.

If you are using this mod as a standalone repo (e.g., via subtree mirror) and the GitHub package is not available to you yet, use one of the following options:

1) Install the upstream SDK and alias it to the expected name (simple fallback)

```bash
bun add -d civ7-modding-tools
# add this to package.json to alias the upstream to our name
# "overrides": { "@mateicanavra/civ7-sdk": "npm:civ7-modding-tools@^0.0.0" }
```

or

2) Edit this mod's package.json dependencies to point directly at the upstream

```json
{
  "dependencies": {
    "@mateicanavra/civ7-sdk": "npm:civ7-modding-tools@^0.0.0"
  }
}
```

Either approach lets the code import `@mateicanavra/civ7-sdk` while resolving to the upstream `civ7-modding-tools` package when used outside the monorepo.

## Scripts

Use these scripts to build and deploy your mod in one step:

```bash
bun run build          # generate XML in mod/
bun run deploy         # deploys mod via the monorepo CLI
bun run build:deploy   # build and deploy
```

## Credits

- Mod created by: Mod Author
- Special thanks to the Civilization VII Modding Community

## Version History

- 1.0.0: Initial release
