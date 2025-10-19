# AGENTS

## Civ7 Resources Quick Access
- Run `pnpm run unzip-civ` to extract the official Civ7 data into `civ7-official-resources/`, placing the game files directly under that folder.
- Age-specific XML definitions live under `civ7-official-resources/Base/modules/age-*/data/`.
  - `resources.xml` – resource modifiers by age
  - `units.xml` – unit definitions
  - `constructibles.xml` – buildings and other constructibles
- Replace `*` with the desired age (`age-antiquity`, `age-exploration`, `age-modern`, ...).
- Use `rg` to search across ages, e.g. `rg Cotton civ7-official-resources/Base/modules`.
- The default `pnpm run unzip-civ` profile excludes large media (movies/, data/icons/, fonts/, common media extensions) but keeps `Assets/schema` for reference. Use `pnpm run unzip-civ -- full` for a full extraction or `pnpm run unzip-civ -- assets` for only assets.

## Plugins architecture
- Reusable logic lives under `packages/plugins/*` (e.g., `plugin-files`, `plugin-graph`).
- `plugin-mapgen` sources are written in TypeScript with legacy JS copies under `js-archive/` for verification.
- CLI commands should remain thin wrappers around these plugins.
- Status-style CLI commands now accept `--json` for machine-readable output.
 - Subtree-based CLI commands expose only relevant flags; missing `slug` or `repoUrl` values are prompted interactively during setup, import, or update. Repo URL, remote name, and default branch are stored during setup and reused by downstream commands.

## Mod: Swooper Maps
- The huge-plate baseline entry now lives at `mods/mod-swooper-maps/mod/maps/swooper-desert-mountains.js`, with config and localization rows using the same `desert-mountains` slug.
- `mods/mod-swooper-maps/mod/maps/bootstrap/dev.js` now emits ASCII diagnostics for landmass windows, relief (mountains/hills/volcanoes), rainfall buckets, and biome distribution in addition to plate boundaries/corridors. Toggle them with `DEV.LOG_LANDMASS_ASCII`, `DEV.LOG_RELIEF_ASCII`, `DEV.LOG_RAINFALL_ASCII`, and `DEV.LOG_BIOME_ASCII`.
- `mods/mod-swooper-maps/DESIGN.md` captures the current layer stack and forward-looking physics roadmap; `SWOOPER_MAPS_ARCHITECTURE_AUDIT.md` now includes Section 7 for Earth-system expansion ideas.
- Stage execution is coordinated through `stageManifest` (defaults in `mods/mod-swooper-maps/mod/maps/bootstrap/defaults/base.js`). The resolver normalizes dependencies, mirrors legacy `STORY_ENABLE_*` toggles, and logs `[StageManifest]` warnings when prerequisites are missing. Use `tunables.stageEnabled()` instead of raw toggles when gating layers.
- The manifest now exposes `foundation` and `landmassPlates` as the default early stages. The legacy landmass stub has been removed, so presets and orchestration must target the Voronoi physics pipeline exclusively.
- Landmass generation now flows Voronoi → plate mask; ocean separation lives in `layers/landmass_utils.js::applyPlateAwareOceanSeparation` and the legacy three-band generator has been removed.
- Deterministic Voronoi seeds are captured through `mod/maps/world/plate_seed.js::PlateSeedManager`; `WorldModel` publishes the frozen snapshot via `plateSeed` for diagnostics and context consumers.
- Entries and named presets can declare a `stageConfig` map to indicate which stages they supply overrides for; the resolver warns when those stages are disabled or missing so presets can prune dead config.
- `bootstrap/tunables.js` exposes a `CLIMATE` helper (`CLIMATE.drivers`, `CLIMATE.moistureAdjustments`) that climate layers and story overlays consume instead of reading raw config blocks.
- Climate layers stage rainfall via `MapContext.buffers.climate`; prefer `writeClimateField` / `syncClimateField` when mutating or syncing rainfall rather than writing to `GameplayMap` directly.
- Baseline, swatch, and refinement rainfall logic live in `layers/climate-engine.js`; stage wrappers delegate to this module so edits stay centralized.

### Testing imports
- Prefer importing from a package's public entry point (e.g., `@civ7/plugin-graph`) in tests rather than deep paths like `../src/*`. This keeps tests resilient to internal refactors (such as folder renames like `pipelines/` → `workflows/`) and validates the surface that external consumers use.

## Contributing
- When modifying scripts or TypeScript sources, run `pnpm run build` before committing.
- Run `pnpm lint` to ensure code style and `pnpm test` for unit tests across workspaces.
- Verify XML examples in docs against `civ7-official-resources` so that `<ActionGroups>` and `<Item>` tags match the SDK output.
- Configuration utilities and schema are documented in `packages/config/README.md` and `packages/config/TESTING.md`. Unit tests live under `packages/config/test/` and are included in the root Vitest projects.
- Use `pnpm test` to execute the Vitest suites across all workspaces and ensure basic smoke tests pass.
- Use `pnpm test:ui` to open the interactive Vitest UI when visualizing test runs.
- When adding CLI command tests, mock filesystem and configuration interactions to avoid touching real resources.
- If tests or builds fail with missing workspace packages (e.g. `@civ7/plugin-git` or `lodash-es`), run `pnpm install` to link all workspace dependencies before retrying.

### Repository and PR policy
- We now push branches and open pull requests exclusively against the `fork` remote (`mateicanavra/civ7-modding-tools-fork`). Do not target the original `origin` upstream, as it has diverged and no longer receives updates.

## Task tracking
- See `TASKS.md` for outstanding follow-up items.
- Past planning documents are archived under `.ai/archive/plans/`.
