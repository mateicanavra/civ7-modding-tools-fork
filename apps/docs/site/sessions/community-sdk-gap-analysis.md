# Civ7 Modding Documentation Gap Analysis

## Purpose

Comparison of the community modding references with the official Civ7 resources to identify discrepancies and areas needing updates.

> The `civ7-official-resources` archive is generated with `scripts/zip-civ-resources.sh` using the `default` profile in `scripts/civ-zip-config.json`, which omits movies, `data/icons/`, `fonts/`, and common media extensions (`.mp4`, `.ogg`, `.dds`, `.png`, `.ttf`). Database schemas under `Assets/schema` are included, while large textures and audio are pruned.

## Findings

### 1. ModInfo structure differs from official modules
- Community reference previously described `<FrontEndActions>` and `<InGameActions>` blocks with `<File>` elements for assets and data files.
- Official modules use `<ActionGroups>` and `<Actions>` with `<Item>` entries for updates such as icons, art, colors, database, and text.
- **Resolution:** Community documentation now demonstrates the `<ActionGroups>` structure with `<Item>` elements.

### 2. Referenced asset/schema paths are partially pruned
- The file-paths reference lists an `<GAME_RESOURCES>/Base/Assets/` tree with schema folders (gameplay, ui, loc, modding, icons).
- The zip script excludes movies, `data/icons`, `fonts`, and common media extensions, so textures and audio files are absent, but `Assets/schema` directories remain.
- **Resolution:** Documentation now specifies which media directories are excluded by default and clarifies that schema SQL files are available in the shared archive; full installations are still required for large art assets.

### 3. Dependency files are undocumented
- Official data includes `.dep` files (e.g., `Civ7.dep` in the base game and `<module>.dep` in DLC folders) that define package dependencies.
- Community references omitted these files.
- **Resolution:** Documentation now introduces `.dep` files and advises including them when mods rely on custom art or libraries.

### 4. Module directory layout varies
- Community guide recommends separating content into `civilizations/`, `leaders/`, `units/`, `constructibles/`, `text/`, and `assets/` directories.
- Official modules group content under `data/`, `text/`, and related subdirectories within each module.
- **Resolution:** Reference documentation now clarifies the official module layout and how it differs from community conventions.

## Suggested Next Steps
- Update community documentation to mirror the official modinfo format and module directory structure.
- Note which asset directories are pruned from the shared archive and explain how to obtain them from a full game installation.
- Document the role of `.dep` files in module loading and dependencies.
- Provide examples from official modules to demonstrate the expected folder hierarchy and action configuration.

