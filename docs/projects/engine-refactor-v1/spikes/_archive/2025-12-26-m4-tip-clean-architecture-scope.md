# Spike: M4 Tip - Full Migration and Legacy Cleanup Scope

**Date:** 2025-12-26  
**Branch:** `spike-m4-tip-baseline` (base: `feat/narsil-mcp-integration` @ `5064f29c`)

## 1) Objective

Scope what remains to fully complete the mapgen refactor from the M4 tip: remove all legacy consumers and shims, and reach the target clean package structure where domain-level mod behavior lives in mods/plugins and core is generic pipeline + patterns.

## 2) Baseline

- Baseline branch is the top of the current Graphite M4 stack (`feat/narsil-mcp-integration`).
- `CIV-73` is not an ancestor of this baseline (no `artifact:narrative.*` strings in `packages/mapgen-core/src`, and `git merge-base --is-ancestor civ-73 ...` fails). This is a gap vs. the stated assumption that CIV-73 has landed.

## 3) Remaining Workstreams (Issue / Phase Level)

### A) Narrative cleanup (CIV-74, plus CIV-73 if not actually merged)
- StoryTags and overlay hydration are still used as correctness surfaces (e.g. `packages/mapgen-core/src/pipeline/ecology/BiomesStep.ts`, `packages/mapgen-core/src/domain/ecology/features/index.ts`).
- Orchestrator still resets StoryTags/overlays/caches (`packages/mapgen-core/src/orchestrator/task-graph.ts`).
- To reach target architecture, consumers must read `artifact:narrative.*` and StoryTags/overlay caches removed or made explicit non-canonical.

### B) Engine boundary cleanup (CIV-67)
- Engine globals still appear as dependency surfaces:
  - `GameplayMap` fallbacks (`packages/mapgen-core/src/domain/narrative/utils/dims.ts`, `.../water.ts`).
  - `GameInfo` module-load lookups (`packages/mapgen-core/src/core/terrain-constants.ts`).
  - `PlotTags`/`LandmassRegion` globals (`packages/mapgen-core/src/core/plot-tags.ts`).
- Adapter does not yet surface PlotTags/LandmassRegion constants, so this needs adapter + core coordination.

### C) Remove `state:engine.*` dependency surface (CIV-70)
- `state:engine.*` tags still exist in `packages/mapgen-core/src/pipeline/tags.ts` and are used in `packages/mapgen-core/src/pipeline/standard.ts` (e.g., derivePlacementInputs requires `state:engine.*`).
- Requires effect-tag replacements and verification (biomes/features/placement already have `effect:*` hooks; landmass/coastlines/rivers still use `state:*`).

### D) Standard mod as true plugin (beyond CIV-57 packaging)
- Current standard mod is a wrapper around `registerStandardLibrary` (`packages/mapgen-core/src/mods/standard/registry/index.ts`).
- SPEC expects step entries under `mods/standard/registry/<phase>/**` and domain logic under `mods/standard/lib/**` (SPEC appendix §7.1).
- Core still exports domain logic from `packages/mapgen-core/src/index.ts`; this is incompatible with a clean “core-only generic pipeline” target.

### E) Legacy shims / deprecation-only surfaces (cleanup beyond CIV-74)
- `packages/mapgen-core/src/MapOrchestrator.ts` is a stub legacy entrypoint.
- `bootstrap/runtime.ts` re-exports `MapConfig` as a legacy alias; `bootstrap/entry.ts` keeps a no-op `resetBootstrap`.
- Deprecated/no-op diagnostics schema fields remain in `packages/mapgen-core/src/config/schema.ts`.
- Compatibility helpers (e.g. `addMountainsCompat`) remain in domain exports.

### F) Post-M4 deferrals needed for full target architecture
- DEF-010: climate inputs reified (remove hidden engine reads from climate pipeline).
- DEF-011: legacy vs. area mode selection (decide and remove unused mode).
- DEF-014: split monolithic `artifact:foundation` into discrete `artifact:foundation.*` artifacts.
- DEF-016: schema split for domain ownership.
- DEF-017: stronger adapter read-back for `effect:*` verification.

## 4) Complexity x Parallelism Overview

- Narrative cleanup (CIV-74): **Complexity high**, **Parallelism medium-high** (many consumers can migrate independently once artifacts exist).
- Engine boundary cleanup (CIV-67): **Complexity medium**, **Parallelism medium** (adapter + core changes, tests need coordination).
- Remove `state:engine.*` (CIV-70): **Complexity low-medium**, **Parallelism medium** (mechanical replacements + test updates).
- Standard mod pluginization (post-CIV-57): **Complexity high**, **Parallelism medium** (broad refactor + surface changes).
- Legacy shim cleanup: **Complexity low**, **Parallelism high** (mostly deletions, but depends on consumer decisions).
- Post-M4 deferrals: **Complexity medium-high**, **Parallelism mixed** (climate/foundation are heavier, schema split is mechanical).

## 5) Open Questions / Gaps

- The baseline does not include CIV-73; confirm whether to treat civ-73 as merged or to rebase/stack before proceeding.
- Are there out-of-repo consumers relying on legacy exports (MapOrchestrator, MapConfig alias, deprecated config keys)?
- Should dev-only engine introspection utilities remain (fenced), or are they considered legacy surfaces?
- How strictly should the “core only generic pipeline” rule be enforced in M4 vs post-M4?
