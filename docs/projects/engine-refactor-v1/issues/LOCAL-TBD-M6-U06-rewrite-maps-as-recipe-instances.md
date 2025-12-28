---
id: LOCAL-TBD-M6-U06
title: "[M6] Rewrite maps as recipe instances"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: [LOCAL-TBD-M6-U05]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Rewrite maps and presets to select a recipe and supply a config instance at runtime.

## Deliverables
- `mods/mod-swooper-maps/src/maps/**` map entrypoints select a recipe and config instance.
- Maps build settings (seed, dimensions) and call `recipe.run(ctx, settings, config)`.
- Mod-owned runtime glue lives under `mods/mod-swooper-maps/src/maps/_runtime/**`.

## Acceptance Criteria
- No map entrypoints call `runTaskGraphGeneration` or legacy bootstrap plumbing.
- Each map instance uses a recipe + config instance + settings.
- At least one map entrypoint compiles and executes through the engine contract.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U05](./LOCAL-TBD-M6-U05-re-author-standard-recipe-as-a-mini-package.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Maps become recipe instances: select a recipe module and supply config values directly.
- Settings construction (seed + dimensions) stays in the map entrypoint or map runtime glue.
- Use the engine contract: `RunRequest = { recipe, settings }` -> `compileExecutionPlan` -> `PipelineExecutor.executePlan`.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Prompts (run before implementation)

#### P1) Map inventory + config instance extraction checklist
- **Goal:** Enumerate all current map entrypoints and the config values they set so we can re-home those values cleanly as recipe-instance configs.
- **Commands:**
  - `find mods/mod-swooper-maps/src -maxdepth 1 -type f -name "*.ts" -print`
  - `rg -n "buildConfig\\(|overrides:" mods/mod-swooper-maps/src -S`
  - `rg -n "applyMapInitData|resolveMapInitData|OrchestratorConfig" mods/mod-swooper-maps/src -S`
- **Output to capture:**
  - A list of map files and where their config object is constructed.
  - A short “config key hotspots” summary (top-level keys like `landmass`, `mountains`, `climate`, etc.).

#### P2) Runner glue extraction plan (mod-owned in M6)
- **Goal:** Define the minimal `_runtime` helper set each map will use (map init + settings + calling recipe).
- **Commands:**
  - `sed -n '1,220p' packages/mapgen-core/src/orchestrator/map-init.ts`
  - `sed -n '1,260p' packages/mapgen-core/src/orchestrator/helpers.ts`
- **Output to capture:**
  - Which functions can be copied/adapted into `mods/mod-swooper-maps/src/maps/_runtime/**` as pure glue.
  - Any remaining legacy coupling to remove (e.g., references to `RecipeV1` overrides).

### Prework Findings (Pending)
_TODO (agent): append findings here; include the definitive list of map entrypoints and the agreed `_runtime` helper surface._
