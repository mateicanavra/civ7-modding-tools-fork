# Spike: M4 Phase G — Legacy Deprecation & Mod-Structure Audit

**Date:** 2025-12-24  
**Branch:** `spike-m4-phase-g` (base: `civ-72-m4-placement-inputs-2-cutover-fix`)  

## 1) Objective

Review the remaining work in **M4 Phase G** plus what has already landed on the current M4 stack, and answer:

- Will M4 end with **zero legacy code/paths/shims/deprecation-only surfaces**?
- Will the **standard mod** (steps + domain logic + domain lib) be ported into the expected “mod contains its own logic” structure?

This is an exploratory audit, not integration planning.

## 2) Assumptions and Unknowns

**Assumptions**
- “Work already landed” means “present on the current long-running M4 stack” (as seen via `gt ls`), not necessarily merged to `main`.
- “No legacy” includes *compat stubs* and *deprecated/no-op schema fields*, not just “not on the runtime path”.

**Unknowns**
- Whether out-of-repo consumers depend on legacy entrypoints/surfaces (e.g., the `MapOrchestrator` stub export, deprecated config keys). This affects whether deletion is acceptable within M4 vs a breaking change reserved for later.

## 3) What We Learned

### Phase G plan (what remains)

The milestone plan defines Phase G as:
- **CIV-73**: narrative producers → canonical `artifact:narrative.*`
- **CIV-74**: narrative consumer migration + StoryTags/cache removal
- **CIV-67**: remove/fence engine-global dependency surfaces (`GameplayMap`, module-load `GameInfo`, `PlotTags`/`LandmassRegion`)

Source: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md:281`.

### Current “landed” state (in this stack)

The current stack includes CIV-55/56/57/58/59/60/61/62/68/69/71/72/75/76, but does **not** include:
- **CIV-67**, **CIV-73**, **CIV-74** (Phase G)
- **CIV-70** (“remove `state:engine.*`” in Phase F)

Source: `gt ls` (from this worktree) and milestone Phase F/G listing in `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md:244`.

### Phase G legacy surfaces still exist in code today

**StoryTags still exists and is used as a correctness dependency surface:**
- Orchestrator resets/logs StoryTags: `packages/mapgen-core/src/orchestrator/task-graph.ts:7`.
- Cross-domain consumers still read StoryTags directly:
  - `packages/mapgen-core/src/domain/ecology/features/index.ts:20`
  - `packages/mapgen-core/src/domain/hydrology/climate/refine/index.ts:6`
  - `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts:4`

**Engine-global dependency surfaces still exist:**
- `GameplayMap` fallback for dims: `packages/mapgen-core/src/domain/narrative/utils/dims.ts:7`.
- Module-load-time `GameInfo` lookup: `packages/mapgen-core/src/core/terrain-constants.ts:31`.
- `PlotTags`/`LandmassRegion` globals with runtime fallback logic: `packages/mapgen-core/src/core/plot-tags.ts:26`.

These are exactly the kinds of things CIV-67 targets.

### M4 is not yet “no legacy” even beyond Phase G

**`state:engine.*` remains part of the standard dependency spine (CIV-70 not yet landed):**
- `packages/mapgen-core/src/pipeline/standard.ts:39` uses `M3_DEPENDENCY_TAGS.state.*` for requires/provides.

The milestone plan explicitly places CIV-70 in Phase F before Phase G:
`docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md:274`.

### Additional legacy/deprecation surfaces outside Phase G scope

Even if Phase G completed, there are still “legacy artifact” surfaces that do not appear to be directly owned by Phase G:

- **Legacy stub entrypoint:** `packages/mapgen-core/src/MapOrchestrator.ts:1` (export exists but throws).
- **Deprecated/no-op schema fields:** `packages/mapgen-core/src/config/schema.ts:2774` defines legacy top-level diagnostics toggles as deprecated and no-op, and `packages/mapgen-core/src/config/schema.ts:2849` still includes them in `MapGenConfigSchema`.

If the milestone bar is “no shims, no deprecation-only surfaces”, these would need explicit decisions and cleanup work.

## 4) Standard Mod Structure vs. Expected Structure

### What the SPEC expects

The target architecture SPEC sketches a richer “standard mod” structure:
- `packages/mapgen-core/src/mods/standard/registry/<phase>/**/<name>.entry.ts` (one entry per step file)
- `packages/mapgen-core/src/mods/standard/lib/**` (domain logic used by the mod’s steps)

Source: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md:411`.

### What exists today

The current “standard mod” is primarily packaging + recipe ownership, not step/domain ownership:
- `packages/mapgen-core/src/mods/standard/mod.ts` exports `{ id, registry, recipes }`.
- `packages/mapgen-core/src/mods/standard/registry/index.ts:14` delegates to `registerStandardLibrary(...)` (which registers the existing layer steps).
- `packages/mapgen-core/src/mods/standard/recipes/default.ts:3` defines the default step ID list.

There is **no** `mods/standard/lib/**` and no `*.entry.ts` step-per-file structure in this state.

**Conclusion (for this audit):** M4 (as represented by current landed work + Phase G plans) achieves “mod-style packaging and recipe ownership”, but does **not** (yet) achieve “standard mod contains all its own logic (steps + mod-local domain lib)” as sketched in the SPEC.

## 5) Minimal Experiment (Optional)

Use a “strict legacy bar” grep pass and decide what must be zero:

- `rg -n "StoryTags|GameplayMap|\\bGameInfo\\b|PlotTags|LandmassRegion|state:engine\\." packages/mapgen-core/src`
- `rg -n "@deprecated|deprecated: true|legacy/no-op|backward(s)? compatibility" packages/mapgen-core/src`

This helps distinguish “still present” vs “fully removed/fenced to dev/test”.

## 6) Risks and Open Questions

- Narrative cleanup (CIV-73/74) crosses multiple domains and has known producer/consumer drift risk (e.g., hotspot categories) per `docs/projects/engine-refactor-v1/issues/CIV-74-M4-narrative-cleanup-2-remove-storytags.md`.
- Engine-global cleanup (CIV-67) likely forces adapter surfaces or stricter context requirements; it can collide with current test patterns that mock globals.
- “No shims” may imply breaking deletions (e.g., removing legacy exports/config keys) depending on external consumers.

## 7) Next Steps

- If the M4 definition of done is “no legacy contract surface”, Phase G work plus CIV-70 are necessary to remove StoryTags/engine-global reads and `state:engine.*`.
- If the bar is “no dead code / no shims / no deprecation-only fields”, that appears to require additional explicit cleanup decisions beyond Phase G (e.g., `MapOrchestrator` stub, deprecated diagnostics schema).
- If the “standard mod contains its own logic” structure is required by end-of-milestone, it likely needs an explicitly scoped slice beyond the currently landed “packaging wrapper” implementation.

