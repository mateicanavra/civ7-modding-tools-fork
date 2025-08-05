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

## Local SDK development

This project uses a local clone of the `civ7-modding-tools` SDK. To set up for development, clone the SDK repository as a sibling directory and install dependencies:

```bash
git clone https://github.com/izica/civ7-modding-tools.git ../civ7-modding-tools
pnpm install
pnpm build
```

Now you can author and build the Dacia mod against the local SDK.

## Scripts

Use these npm scripts to build and deploy your mod in one step:

```bash
pnpm run build          # generate XML in dist/
pnpm run deploy         # deploys mod via deploy.sh
pnpm run build:deploy   # build and deploy
```

## Credits

- Mod created by: Mod Author
- Special thanks to the Civilization VII Modding Community

## Version History

- 1.0.0: Initial release
