---
id: LOCAL-TBD-M6-U03
title: "[M6] Scaffold standard content package skeleton and exports"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: [LOCAL-TBD-M6-U02]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Create the standard content package skeleton under `mods/mod-swooper-maps` with the required exports and layout.

## Deliverables
- `mods/mod-swooper-maps/src/mod.ts` exports standard recipes.
- `mods/mod-swooper-maps/src/recipes/standard/**` skeleton exists with stage and step layout.
- `mods/mod-swooper-maps/src/domain/**` exists as the mod-local domain root.

## Acceptance Criteria
- Stage layout follows the required template:
  - `stages/<stageId>/index.ts`
  - `stages/<stageId>/steps/index.ts` (named exports only; no `export *`)
  - `stages/<stageId>/steps/*.ts` (one file per step)
- Recipe code imports the authoring SDK (no engine registry access).

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm -C mods/mod-swooper-maps check` (catch path/export mistakes in new skeleton)

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U02](./LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Establish the standard recipe skeleton under `mods/mod-swooper-maps/src/recipes/standard/` with stage folders and explicit step exports.
- Add `mods/mod-swooper-maps/src/mod.ts` as the recipe export surface.
- Create `mods/mod-swooper-maps/src/domain/` as the root for mod-owned domain logic.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Findings
#### P1) Content package build + entrypoint inventory
- Current tsup entry list is five map files at `mods/mod-swooper-maps/src/*.ts`:
  - `gate-a-continents.ts`, `swooper-desert-mountains.ts`, `swooper-earthlike.ts`, `shattered-ring.ts`, `sundered-archipelago.ts`
- No other top-level TS entrypoints exist today (`find mods/mod-swooper-maps/src -maxdepth 1 -type f -name "*.ts"` only returns the five maps).
- Required entry update after moving maps under `src/maps/**`:
  - Replace each entry with `src/maps/<map-name>.ts`.
  - Do not add `src/mod.ts` as an entry unless we need a standalone bundled output; the map entries will include it transitively when imported.

#### P2) Stage skeleton enforcement checklist
- From `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md`:
  - Each step is a file exporting a single `createStep(...)` POJO (default export).
  - Each stage is a folder with:
    - `stages/<stageId>/index.ts` exporting a single `createStage(...)` POJO (ordered step list), and
    - `stages/<stageId>/steps/index.ts` exporting explicit named step exports (no `export *`).
  - Recipe file (`recipes/<recipeId>/recipe.ts`) exports a single `createRecipe(...)` POJO composing stages.
  - Dependency direction: stage index may import from `./steps`; step files must not import `../index.ts` or `./index.ts` to avoid cycles.

## Implementation Decisions

### Scaffold all canonical stages with placeholder steps
- **Context:** The skeleton needs a concrete stage/step layout but the real step inventory migrates later.
- **Options:** (A) create empty stages with no step files, (B) create placeholder steps per stage to satisfy layout expectations.
- **Choice:** Option B — add one placeholder step per stage and wire each stage to its step.
- **Rationale:** Ensures the required `stages/<stageId>/steps/*.ts` layout exists and validates authoring imports without blocking later replacements.
- **Risk:** Placeholder step IDs will be replaced during content migration; downstream references must not treat them as canonical.

### Assign narrative placeholder steps to the morphology phase
- **Context:** `GenerationPhase` does not include a dedicated `narrative` phase.
- **Options:** (A) map narrative placeholders to `morphology`, (B) map to `hydrology`.
- **Choice:** Option A — use `morphology` for narrative placeholders.
- **Rationale:** Keeps placeholder steps valid against the current phase enum while narrative sequencing remains authoring-only.
- **Risk:** If future phases diverge, the placeholder phase choice may need revisiting during real step migration.

### Keep mod checks dependent on built mapgen-core exports
- **Context:** `mods/mod-swooper-maps` imports `@swooper/mapgen-core/*`, but mapgen-core build outputs are missing due to unrelated merge conflicts.
- **Options:** (A) add temporary TS path mappings to source files, (B) keep the check relying on published `dist` exports.
- **Choice:** Option B — avoid source path fallbacks in the mod tsconfig.
- **Rationale:** Keeps the mod contract aligned with the shippable package boundary and avoids bundling core sources into mod builds.
- **Risk:** `pnpm -C mods/mod-swooper-maps check` remains blocked until mapgen-core conflicts are resolved and builds can run.
