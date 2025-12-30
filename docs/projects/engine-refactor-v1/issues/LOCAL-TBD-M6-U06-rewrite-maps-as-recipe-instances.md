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

## Remediation (SPIKE alignment)
- [ ] Align with [SPIKE (M6)](../resources/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md) by completing [R4](../resources/PLAN-m6-spike-structure-remediation.md#r4) and [R7](../resources/PLAN-m6-spike-structure-remediation.md#r7).

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

### Prework Findings
#### P1) Map inventory + config instance extraction checklist
- Map entrypoints (top-level `src/*.ts`):
  - `gate-a-continents.ts` (no `buildConfig`; wrapper only)
  - `sundered-archipelago.ts`
  - `swooper-desert-mountains.ts`
  - `swooper-earthlike.ts`
  - `shattered-ring.ts`
- Config builder presence:
  - `buildConfig()` exists in all maps except `gate-a-continents.ts`.
  - All four `buildConfig()` functions use `overrides` with the same top-level keys:
    - `landmass`, `margins`, `coastlines`, `mountains`, `volcanoes`, `foundation`, `climate`, `story`, `oceanSeparation`, `biomes`, `featuresDensity`
- Orchestrator glue usage:
  - `applyMapInitData` + `OrchestratorConfig` used in all four `buildConfig()`-based maps.
  - `resolveMapInitData` is not used in current maps.

#### P2) Runner glue extraction plan (mod-owned in M6)
- From `packages/mapgen-core/src/orchestrator/map-init.ts`:
  - `resolveMapInitData` and `applyMapInitData` can be copied into `mods/mod-swooper-maps/src/maps/_runtime/map-init.ts` with minimal edits.
  - These functions handle map size defaults, init params, and adapter map-info lookup.
- From `packages/mapgen-core/src/orchestrator/helpers.ts`:
  - `createLayerAdapter` and `createDefaultContinentBounds` can be copied into `_runtime/helpers.ts` for map setup.
- Legacy coupling to remove:
  - Replace `runTaskGraphGeneration` calls with `recipe.compile` + `recipe.run` (or `compileExecutionPlan` + `PipelineExecutor.executePlan`) using the same settings derived from map init data.

## Implementation Decisions

### Build recipe config directly from overrides (no bootstrap parsing)
- **Context:** Maps previously called `bootstrap()` to validate/expand overrides into `MapGenConfig`.
- **Options:** (A) keep bootstrap/parseConfig to build `MapGenConfig` and then translate, (B) map overrides directly into recipe config and pass overrides into context without validation.
- **Choice:** Option B — build recipe config directly from overrides and cast overrides into `ExtendedMapContext.config`.
- **Rationale:** Avoids legacy bootstrap plumbing while aligning maps with the recipe instance model.
- **Risk:** Defaults/validation from `parseConfig` are bypassed; missing defaults could surface at runtime if steps rely on them.

### Cache map init resolution from RequestMapInitData
- **Context:** Map init parameters arrive on `RequestMapInitData`, but generation happens later.
- **Options:** (A) resolve map init data only during `GenerateMap`, (B) cache the resolution from `RequestMapInitData` and reuse it if available.
- **Choice:** Option B — store `MapInitResolution` from `applyMapInitData` and fall back to `resolveMapInitData` if missing.
- **Rationale:** Ensures settings/mapInfo are consistent with engine-provided init params while keeping a safe fallback.
- **Risk:** If engine lifecycle changes, stale init data could be reused unintentionally.

### Gate A map runs the standard recipe
- **Context:** Gate A previously imported `/base-standard/maps/continents.js` to validate bundling.
- **Options:** (A) keep the base-standard wrapper, (B) run the standard recipe like other maps.
- **Choice:** Option B — run the standard recipe with empty overrides.
- **Rationale:** Keeps all map entrypoints on the recipe-instance model for M6.
- **Risk:** Gate A no longer validates the base-standard external import path.
