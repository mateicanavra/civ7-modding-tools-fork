# Civ7 Modding Documentation Gap Analysis

## Purpose

Comparison of the community modding references with the official Civ7 resources to identify discrepancies and areas needing updates.

> The `civ7-official-resources` archive is generated with `scripts/zip-civ-resources.sh` using the `default` profile in `scripts/civ-zip-config.json`, which omits large media assets and binaries such as `Assets/`, `movies/`, `data/icons/`, `fonts/`, and common media extensions (`.mp4`, `.ogg`, `.dds`, `.png`, `.ttf`). Their absence in this repository is expected.

## Findings

### 1. ModInfo structure differs from official modules
- Community reference describes `<FrontEndActions>` and `<InGameActions>` blocks with `<File>` elements for assets and data files.
- Official modules use `<ActionGroups>` and `<Actions>` with `<Item>` entries for updates such as icons, art, colors, database, and text.
- **Gap:** Documentation should be updated to reflect the `<ActionGroups>` pattern and use of `<Item>` instead of `<File>`.

### 2. Referenced asset/schema paths are absent or pruned
- The file-paths reference lists an `<GAME_RESOURCES>/Base/Assets/` tree with schema folders (gameplay, ui, loc, modding, icons).
- The zip script excludes any `Assets` directories along with `data/icons`, `movies`, and `fonts`, so the pruned resources here contain only `Civ7.dep` and `modules` under `Base`.
- Schema files cited in the community reference (`schema-modding-10.sql`, `IconManager.sql`) reside under `Assets` and are therefore missing from the archive.
- **Gap:** Documentation should clarify that these large asset directories are intentionally excluded and direct modders to the full game installation if they need the schemas or media.

### 3. Dependency files are undocumented
- Official data includes `.dep` files (e.g., `Civ7.dep` in the base game and `<module>.dep` in DLC folders) that define package dependencies.
- Community references omit these files entirely.
- **Gap:** Add guidance on the purpose of `.dep` files and how mods should reference or include them.

### 4. Module directory layout varies
- Community guide recommends separating content into `civilizations/`, `leaders/`, `units/`, `constructibles/`, `text/`, and `assets/` directories.
- Official modules group content under `data/`, `text/`, and related subdirectories within each module.
- **Gap:** Clarify the recommended structure versus the official module layout so modders can align their projects with the SDK conventions.

## Suggested Next Steps
- Update community documentation to mirror the official modinfo format and module directory structure.
- Note which asset directories are pruned from the shared archive and explain how to obtain them from a full game installation.
- Document the role of `.dep` files in module loading and dependencies.
- Provide examples from official modules to demonstrate the expected folder hierarchy and action configuration.

