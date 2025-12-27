# Spike: M5 Clean Architecture Finalization Scope (Post‑M4)

**Date:** 2025-12-26  
**Updated:** 2025-12-27  
**Baseline (tip of the M4 stack at investigation time):** `dbfde2bc`  
**Related proposal (execution-facing):** `docs/projects/engine-refactor-v1/milestones/M5-proposal-clean-architecture-finalization.md`  
**Note:** This consolidates and supersedes the earlier “M4 Phase G legacy audit” spike; content below reflects the post‑M4 mental model only.

## Why this spike exists (and how it differs from the M5 proposal)

This spike is the evidence-backed gap assessment: what we validated in code at the post‑M4 baseline, what remains to reach the clean target, and what (if anything) is still a real design decision.

The M5 proposal translates that into an execution-shaped scope: how to structure the work so we actually end “super clean.” It now explicitly separates (a) **canonical units of work** (issue candidates with scope/DoD/prework prompts) from (b) **sequencing slices** (groupings/ordering).

## 1) Objective

Scope what remains to fully complete the mapgen refactor from the M4 tip: remove all legacy consumers and shims, and reach the target clean package structure where domain-level mod behavior lives in mods/plugins and core is generic pipeline + patterns.

## 2) Baseline and evidence (Post‑M4 landed)

### Assumptions

- M4 is fully landed in the baseline snapshot, including the previously-missed `CIV-70` work, plus the review/follow-up fixes.
- Any out-of-repo consumers of legacy exports are either nonexistent or are intentionally migrated as part of an explicit breaking change (this spike only validates in-repo consumers).

### Evidence checked in this snapshot

- `state:engine.*` is absent from mapgen-core runtime sources.
- The standard smoke test passes under `MockAdapter` (standard recipe compiles/executes without schema failures).
- The obvious legacy/compat surfaces (legacy stub entrypoints, back-compat type aliases, no-op reset hooks) have no in-repo runtime consumers beyond tests/archived docs.
- DEF‑011 is locked (delete `crustMode`; delete the `"legacy"` branch; keep `"area"` as the canonical behavior path).

Concrete spot checks used during investigation:

```bash
rg -n "state:engine" packages/mapgen-core/src packages/mapgen-core/test
pnpm -C packages/mapgen-core test test/pipeline/standard-smoke.test.ts
```

## 3) What M4 now buys us (and what it doesn’t)

At the end of M4, the system is genuinely on the “new pipeline” path: `RunRequest → ExecutionPlan → PipelineExecutor`, with recipe-driven enablement, tag registry validation, and the adapter boundary enforced for runtime engine interaction.

But M4 is still a “clean contract cutover” milestone, not the final package-architecture end state. The core library (`@swooper/mapgen-core`) still contains what the SPEC describes as mod-owned content: the standard registry, standard recipes, standard dependency spine, standard step implementations, and the domain libraries those steps execute. That’s the center of gravity of the remaining gap.

## 4) Remaining workstreams (post‑M4 → truly clean target)

### A) Standard mod “pluginization” and the package split (the big one)

Even with M4 complete, the codebase is not yet in the “mods own their domain behavior” end state. Today the “standard mod” lives inside `packages/mapgen-core/src/mods/standard/**`, and its registry simply delegates to `registerStandardLibrary` (which in turn registers all the standard layers and steps from inside the core package).

To reach the clean target, we need to invert that relationship:

- `@swooper/mapgen-core` becomes a generic pipeline + shared primitives library (StepRegistry, TagRegistry, ExecutionPlan compiler, executor, tracing, shared math/grid/rng/noise utilities, etc.).
- The standard pipeline becomes a mod/plugin that registers its own tags, steps, recipes, and domain helpers without the core package “knowing” about narrative/placement/ecology/etc.
  - In this repo, that plugin should live as a workspace package under `mods/mod-mapgen-standard` (so “domain behavior lives in mods,” not in core).

This is the workstream that makes the rest of the cleanup *real*, because it’s what removes the last structural reason for legacy shims and milestone-coded scaffolding to exist in core.

### B) Remove deprecation-only and dead surfaces (make “no dead code” true)

Post‑M4, there are still several exports/files whose only purpose is compatibility or historical breadcrumbs, not a real runtime path:

- Legacy stubs that only throw (e.g., `MapOrchestrator` and `syncClimateField`).
- Back-compat type aliases (`MapConfig`) and no-op reset hooks (`resetBootstrap`) that exist only for older callers/tests.
- Unused shims (e.g. the TypeBox format shim) that are no longer imported.
- Deprecated/no-op config keys that are explicitly documented as unused (top-level diagnostics toggles; legacy config fallbacks).

If the definition of “done” is “no shims, no dead exports, no deprecation-only surfaces,” these need to be deleted outright. A deeper in-repo reference scan shows the obvious candidates (legacy stub entrypoints, `MapConfig`, `resetBootstrap`, `syncClimateField`) have no runtime consumers inside this repo beyond tests and archived docs, so the remaining risk here isn’t technical—it’s only whether there are downstream users outside the monorepo that would need to migrate as part of an intentional breaking release.

### C) Eliminate hidden global/fallback contracts (make the engine boundary boring)

M4 removed the major *architectural* global dependencies (StoryTags, `state:engine.*`, legacy ordering, direct engine calls in domain code). But some “ambient environment” coupling still exists:

- `globalThis` detection/injection for utilities like Voronoi and RNG (`VoronoiUtils`, `RandomImpl`).
- Fallback constants and “best-effort” adapter behavior that allow a run to proceed even when an adapter cannot supply canonical IDs.

If we want the architecture to be clean and auditable, these should become explicit dependencies: either provided by the adapter/context, or moved into a Civ7-runtime-only layer (so `@swooper/mapgen-core` stays pure).

### D) Close the remaining post‑M4 deferrals that matter for a clean end state

These remain the main “we chose to postpone this” items that block a truly clean story:

- **DEF-010**: climate reification (reduce/eradicate climate’s hidden engine-read prerequisites).
- **DEF-011**: behavior-mode selectors (`"legacy" | "area"`) (choose canonical semantics, or rename to reflect that both are intentional products).
- **DEF-014**: split the monolithic foundation artifact into a real `artifact:foundation.*` inventory (and migrate consumers).
- **DEF-016**: colocate config schemas by domain (reduce the schema monolith and align ownership with step/domain code).
- **DEF-017**: strengthen `effect:*` verification (move beyond “call evidence” where it matters, via adapter read-back APIs + tests).

### E) Codebase hygiene refactors (move-based cleanup, consolidation, colocation)

Once the package split is in motion, we should also take the opportunity to make the layout unsurprising:

- Colocate step code with its artifact types and config schema (reduce “fractal” type/artifact files that are separated from their step owners).
- Remove milestone-coded naming (`M3_*`, `M4_*`) from runtime identifiers where they’ve become permanent fixtures.
- Consolidate small “wiring-only” modules where they add indirection without real abstraction value (especially around standard mod wiring spread across `pipeline/*`, `mods/standard/*`, and orchestrator entrypoints).

## 5) Complexity x Parallelism Overview

- Standard mod pluginization + package split: **Complexity high**, **Parallelism medium** (large surface move + API boundaries; many moves are parallelizable but the boundary design is serial).
- Dead/compat surface deletion: **Complexity low-medium**, **Parallelism high** (mostly mechanical removals; M5 explicitly treats legacy surfaces as removable, not “kept just in case”).
- Hidden global/fallback removal: **Complexity medium**, **Parallelism medium** (touches adapters + core contracts; needs careful test coverage).
- Deferrals closure: **Complexity medium-high**, **Parallelism mixed** (schema split is highly parallel; foundation/climate are more coupled).
- Layout/colocation refactors: **Complexity low-medium**, **Parallelism high** (mechanical moves once ownership boundaries are agreed).

## 6) Decisions and open questions

At this point, the “should we keep legacy?” class of questions is resolved: the target is a clean cutover, and M5 is the milestone where we delete transitional/compat surfaces rather than preserving them.

**DEF‑011 is now locked:** `crustMode` will not survive as a public config knob, and the `"legacy"` behavior branch will be deleted (the `"area"` behavior becomes canonical).

There are no remaining open design questions from this spike that block breaking M5 into concrete issues. Any further decisions should be treated as *new* ADR-level choices discovered during implementation, not “unknowns we knowingly left behind” here.
