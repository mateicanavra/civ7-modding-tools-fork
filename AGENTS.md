# AGENTS

## Civ7 Resources Quick Access
- Run `npm run unzip-civ-resources` to extract the official Civ7 data into `civ7-official-resources/`, placing the game files directly under that folder.
- Age-specific XML definitions live under `civ7-official-resources/Base/modules/age-*/data/`.
  - `resources.xml` – resource modifiers by age
  - `units.xml` – unit definitions
  - `constructibles.xml` – buildings and other constructibles
- Replace `*` with the desired age (`age-antiquity`, `age-exploration`, `age-modern`, ...).
- Use `rg` to search across ages, e.g. `rg Cotton civ7-official-resources/Base/modules`.
- The default `npm run unzip-civ-resources` profile excludes large media (movies/, data/icons/, fonts/, common media extensions) but keeps `Assets/schema` for reference. Use `npm run unzip-civ -- full` for a full extraction or `npm run unzip-civ -- assets` for only assets.

## Contributing
- When modifying scripts or TypeScript sources, run `npm run build` before committing.
- Verify XML examples in docs against `civ7-official-resources` so that `<ActionGroups>` and `<Item>` tags match the SDK output.
