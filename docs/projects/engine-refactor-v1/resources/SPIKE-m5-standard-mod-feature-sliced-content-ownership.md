# Spike: Standard Mod as a Feature‑Sliced “App” (Everything Content is Mod‑Owned)

**Date:** 2025-12-27  
**Baseline (repo at investigation time):** `5b4b38fc`  
**Primary references:**  
- SPEC: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`  
- Boundary skeleton decision record: `docs/projects/engine-refactor-v1/issues/M5-U02-standard-mod-boundary-skeleton.md`  

## 1) Objective

Explore (and make concrete) a more opinionated target than the current incremental refactor:

- **Core SDK is purely the generic pipeline/orchestration engine.**
- **Everything “content flavored” is mod-owned**, including:
  - steps, tags/catalogs, recipes
  - artifacts + artifact helpers/assertions
  - “domain logic” (algorithms) that implements those steps
  - base-biased wiring/helpers (run request building, stage descriptors, diagnostics checks)
- “Vanilla/base” is treated as a normal mod and is structured like a **feature-sliced app**:
  - each stage is a mini-package containing its step(s), types, schema, and helpers
  - stage slices bubble up into a mod-level registry/entry list

This spike is intentionally structural (no migration plan / no code changes).

## 2) Why this spike exists (problem statement)

The repo currently has a “base mod” boundary via subpath export (`@swooper/mapgen-core/base`), but the **ownership boundary is not yet clean**:

- “Base content” lives under `packages/mapgen-core/src/base/**`.
- “Domain” lives under `packages/mapgen-core/src/domain/**`, but it imports base tags/artifacts in multiple places.
- The runner (`packages/mapgen-core/src/orchestrator/task-graph.ts`) imports base helpers and base-biased narrative queries.
- Core “types” and “assertions” include base-specific artifacts (foundation tags + validation) and even import base types.

Net effect: core SDK is not a neutral engine; it still contains content contracts and content wiring.

The SPEC explicitly intends the opposite:

- “Vanilla ships as a standard mod package (registry + default recipe), not a privileged internal order.”  
  (`docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md:191`)
- Suggested layout puts standard content under `mods/standard/**`.  
  (`docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md:404`)

## 3) Evidence: where content leaks into core today (non-exhaustive)

### A) Base-biased runner in core

- `packages/mapgen-core/src/orchestrator/task-graph.ts:1`
  - imports `@mapgen/base/*` (run request builder, stage descriptor, foundation initializer)
  - imports `@mapgen/domain/narrative/queries` for story-specific diagnostics checks

### B) “Domain” is not core-generic (it already depends on base)

Examples:
- `packages/mapgen-core/src/domain/hydrology/climate/runtime.ts:1` imports `@mapgen/base/tags`
- `packages/mapgen-core/src/domain/ecology/biomes/index.ts:1` imports `@mapgen/base/pipeline/artifacts`
- `packages/mapgen-core/src/domain/narrative/queries.ts:1` imports `@mapgen/base/tags`

This makes top-level `domain/` an ownership fiction: it is effectively base content.

### C) Base artifacts + assertions live in core types

- `packages/mapgen-core/src/core/types.ts:1`
  - imports `SeedSnapshot` from `@mapgen/base/foundation/types`
  - defines `FOUNDATION_*_ARTIFACT_TAG` constants and validation for those artifacts
- `packages/mapgen-core/src/core/assertions.ts:1`
  - base-specific “require artifact” helpers for foundation artifacts

### D) Base gameplay semantics live in “core”

- `packages/mapgen-core/src/core/plot-tags.ts:1`
  - “landmass id” and plot tag helpers are content/gameplay semantics, not engine semantics

### E) Canonical config lives in core package (content boundary mismatch)

If we adopt a hard boundary of “entry = RunRequest”, then:
- `packages/mapgen-core/src/config/**` and `packages/mapgen-core/src/bootstrap/**`
  - are base content concerns (how base chooses defaults and translates knobs into step configs)
  - should not be core-engine responsibilities

## 4) Proposed ownership boundary (aggressive)

### 4.1 Core SDK (“engine”) owns only

Generic primitives for building/running pipelines:
- registry + tag infra (IDs, validation, owner metadata)
- step registry + compile (`RunRequest → ExecutionPlan`) + execute (`ExecutionPlan → run`)
- errors and observability hooks
- generic runtime types (minimal context constraints only)
- neutral utilities (math/grid/rng/noise) that are plausibly shared by multiple mods

Concrete candidates to remain (or become) engine-owned:
- `packages/mapgen-core/src/pipeline/**` + `packages/mapgen-core/src/core/**` + `packages/mapgen-core/src/trace/**` (collapsed into a single `engine/**` surface; remove standard/base coupling from types)
- a slimmed “engine types” surface to replace today’s base-coupled `core/types.ts`
- `packages/mapgen-core/src/lib/**` (after stripping accidental base imports)

RunRequest decision (remove ambiguity):
- `RunRequest` is **engine-owned** and is the only boundary input shape (`{ recipe, settings }`, per SPEC 1.2).
- Mods do **not** ship “RunRequest translators”. A mod ships:
  - a registry population function (`register(registry, runtime?)`),
  - one or more recipes (e.g. `default`),
  - and any helper “presets” are expressed as recipe variants or small helper functions that return `RunRequest` but live outside the mod package (CLI/app layer), not in `mods/<id>/shared/*`.

### 4.2 Standard/base mod owns everything else

Mod-owned (content) surfaces move under `mods/standard/**`:
- all step definitions and step config schemas
- tag catalogs and artifact helpers/assertions
- all “domain logic” implementing those steps (eliminate top-level `domain/`)
- any base-biased orchestrator helpers (foundation initializer, narrative smoke checks, etc.)

## 5) Concrete target directory tree (proposal)

This tree aims to satisfy:
- SPEC: standard pipeline is a mod package (`mods/standard`)
- Feature-sliced intent: standard mod is an app; each stage is a slice
- No “pipeline” naming confusion inside the mod (core owns the engine runtime surface)

### 5.1 Core SDK target tree (engine-only)

```text
packages/mapgen-core/src/
├─ engine/
│  ├─ index.ts                   # curated “SDK” surface for mod authors
│  ├─ types.ts                   # minimal engine context + shared runtime types (step contract lives here)
│  ├─ errors.ts                  # compile/execute/registry errors (generic; stable codes)
│  ├─ mod.ts                     # mod contract (register/recipes/runtime/config), no content
│  ├─ registry/
│     ├─ index.ts                # createRegistry/createRegistryEntry + public registry types
│     ├─ StepRegistry.ts         # internal runtime store (not exported by engine/index.ts)
│     └─ TagRegistry.ts          # internal runtime store (not exported by engine/index.ts)
│  ├─ runtime/
│     ├─ ExecutionPlan.ts        # RunRequest/ExecutionPlan + compileExecutionPlan()
│     └─ PipelineExecutor.ts     # execute(ExecutionPlan, context, options)
│  ├─ observability/
│     ├─ index.ts                # observability public surface (fingerprint + trace)
│     ├─ fingerprint.ts          # runId + plan fingerprint derivation (required outputs; SPEC 1.2)
│     └─ trace.ts                # trace event model + sinks (toggleable; SPEC 1.2)
│  └─ lib/
│     ├─ grid/**                 # indexing, bounds, wrapping, neighborhood helpers
│     ├─ math/**                 # clamp/lerp
│     ├─ noise/**                # perlin/fractal
│     ├─ rng/**                  # pick/weighted-choice/unit, etc.
│     └─ geom/**                 # geometry primitives (points, bounds, spans)
└─ mods/
   └─ standard/                  # content (see next section)
```

Notes:
- “engine” is a rename/re-scope of today’s `core/` + `pipeline/` + `trace/`.
- The key invariant is **no imports from `mods/standard/**` into `engine/**`.
- Any Civ7 runtime helpers (e.g. `createCiv7Adapter`) do *not* belong in engine if we treat the engine as pure; those should live in a Civ7 adapter package or in the mod that targets Civ7.

Terminology (to avoid “engine vs pipeline vs registry” ambiguity):
- “Registry” (engine) is the runtime data structure the engine compiles/executes against: `StepRegistry` + `TagRegistry`.
- “Registry” (mod) is *not* a second runtime concept; `mods/<id>/stages/index.ts` is an explicit import list + a `register(registry)` function that populates the engine registry.
- “Pipeline” is the behavior (`compileExecutionPlan` + `PipelineExecutor`), not a separate top-level folder; this proposal intentionally avoids an `src/pipeline/**` sibling of `src/engine/**`.

Second-pass outcome (this review):
- Keep `engine/` as the single conceptual home, but add light sub-grouping (`registry/`, `runtime/`, `observability/`) so “SDK surface” isn’t a flat pile of unrelated files.
- Treat `StepRegistry`/`TagRegistry` as engine-internal implementation details; mod authors should mostly interact with `createRegistry` + `createRegistryEntry` (SPEC sketches this shape).
- Treat `engine/index.ts` as the only supported public surface; subpath imports under `engine/**` are explicitly not part of the mod authoring contract.
- Keep the engine module hierarchy fixed at this depth (`registry/`, `runtime/`, `observability/`, `lib/`) to preserve a predictable SDK layout.

### 5.2 Standard mod target tree (feature-sliced)

```text
packages/mapgen-core/src/mods/standard/
├─ mod.ts
├─ index.ts                      # stable exports for consumers (mod + stage barrels)
├─ recipes/
│  └─ default.ts
├─ shared/
│  ├─ runtime.ts                 # runtime inputs (MapInfo, continents, etc.) for this mod
│  ├─ tags.ts                    # canonical tag IDs + tag definitions for this mod
│  └─ artifacts.ts               # mod-level artifact definitions + helpers (cross-stage aggregation)
└─ stages/
   ├─ index.ts                   # mod registry entrypoint; explicit STAGE_LIST / ENTRY_LIST (auditable)
   ├─ foundation/
   │  ├─ index.ts                # stage barrel + registerStage(registry)
   │  ├─ model.ts                # stage schema + types (single canonical file)
   │  ├─ artifacts.ts            # stage-owned artifact definitions + helpers
   │  ├─ steps/
   │  │  └─ foundation.ts
   │  └─ lib/                    # stage-local helpers and algorithms (empty allowed)
   ├─ morphology/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  ├─ landmassPlates.ts
   │  │  ├─ coastlines.ts
   │  │  ├─ ruggedCoasts.ts
   │  │  ├─ islands.ts
   │  │  ├─ mountains.ts
   │  │  └─ volcanoes.ts
   │  └─ lib/
   ├─ hydrology/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  ├─ lakes.ts
   │  │  ├─ climateBaseline.ts
   │  │  ├─ rivers.ts
   │  │  └─ climateRefine.ts
   │  └─ lib/
   ├─ ecology/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  ├─ biomes.ts
   │  │  └─ features.ts
   │  └─ lib/
   ├─ narrative/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  ├─ storySeed.ts
   │  │  ├─ storyHotspots.ts
   │  │  ├─ storyRifts.ts
   │  │  ├─ storyOrogeny.ts
   │  │  ├─ storyCorridorsPre.ts
   │  │  ├─ storySwatches.ts
   │  │  └─ storyCorridorsPost.ts
   │  └─ lib/
   └─ placement/
      ├─ index.ts
      ├─ model.ts
      ├─ artifacts.ts
      ├─ steps/
      │  ├─ derivePlacementInputs.ts
      │  └─ placement.ts
      └─ lib/
```

Notes:
- This removes the current “base/pipeline/* + domain/*” split and replaces it with “stage slices own their own domain logic”.
- `stages/index.ts` is where we keep the SPEC-required explicit import list; this list is stage-level (`STAGE_LIST`), and each stage’s `index.ts` owns a step-level `ENTRY_LIST`.
- Standardized mod shape (fixed structure):
  - every stage has the same slice template: `index.ts`, `model.ts`, `artifacts.ts`, `steps/`, `lib/`.
  - `shared/` always exists and is reserved for mod-global contracts and cross-stage aggregation (`runtime.ts`, `tags.ts`, `artifacts.ts`).
- Why `stages/index.ts` is the “registry entrypoint”:
  - it keeps stage slices and the explicit import list colocated (less top-level surface area than a separate `registry/` dir),
  - it makes “registry wiring” feel like an app composing feature slices, not a second parallel tree.

Barrels / export strategy (avoid opaque re-export ladders):
- Mod boundary: `mods/standard/mod.ts` is the canonical mod contract entrypoint; `mods/standard/index.ts` is the only “consumer barrel”.
- Stage boundary: `mods/standard/stages/<stage>/index.ts` is the only stage barrel; it re-exports the stage `model` and stage step factories/definitions.
- No deep barrels: avoid `lib/index.ts`; prefer direct imports within the stage slice.

Example import shapes this enables:
- Whole mod (engine loads content): `import standardMod from "@swooper/mapgen-core/base"` (subpath export) or `import { standardMod } from "@swooper/mapgen-core/base"` (named).
- Whole stage (for reuse/testing): `import * as morphology from "@swooper/mapgen-core/base/stages/morphology"`.
- Single step (direct): `import { landmassPlates } from "@swooper/mapgen-core/base/stages/morphology/steps/landmassPlates"`.

## 6) Wiring simplification rules (how we avoid the current indirection)

### Rule: per-step deps live on the step, not in a shared “spine”

Today: requires/provides are centralized in `base/stage-spine.ts` and threaded through layer registrars.

Target: each step file exports its own `step` with explicit `requires/provides`, and stage `index.ts` just registers those step objects (or registry entries).

Outcome: delete/avoid:
- stage descriptor maps (`getStageDescriptor`)
- separate “stage step list” files that duplicate what’s in `steps/*`

### Rule: stage `index.ts` is the single source of truth for that stage

Each stage’s `index.ts` should:
- export `ENTRY_LIST` (explicit list of this stage’s step modules)
- export `register(registry, runtime)` that registers those entries
- re-export stage model (`model.ts`) as the stage’s public surface

### Rule: mod root composes stages explicitly but minimally

`mods/standard/stages/index.ts`:
- imports stage registrars
- constructs the registry by applying each stage registrar (or concatenating their entries)
- is the single auditable list of what’s “in” the mod, per the SPEC’s intent (`docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md:708`)

## 7) Packaging note (subpath export vs separate package)

This proposal is compatible with the earlier packaging decision:

- Keep publishing the standard/base mod as `@swooper/mapgen-core/base` (subpath export), as described in `docs/projects/engine-refactor-v1/issues/M5-U02-standard-mod-boundary-skeleton.md:66`.
- Internally, that subpath should point at `packages/mapgen-core/src/mods/standard/mod.ts`.

This keeps monorepo ergonomics while still enforcing the architecture boundary by convention + import rules.

## 8) SPEC alignment and deltas

### Aligns with SPEC
- Standard pipeline is a mod package (`mods/standard/**`).  
  (`docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md:404`)
- Registry is explicit and auditable (explicit import list).  
  (`docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md:708`)
- No privileged “core pipeline semantics”; engine treats mods as pluggable content.  
  (`docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md:191`)

### Small, intentional adjustments
- The SPEC sketch shows `mods/standard/lib/**`. This proposal refines that to `mods/standard/stages/<stage>/lib/**` for feature-sliced ergonomics.
- The SPEC sketch favors “one step per `*.entry.ts` file”. This proposal allows:
  - either keep that pattern (stage slices still own the lib/types/schema), or
  - group steps under `stages/<stage>/steps/*.ts` with a stage-level entry list.

## 9) Open questions (for follow-up spikes / ADRs)

1) **What is the minimal engine context type?**  
   Today, engine tag satisfaction and executor are tied to `ExtendedMapContext` (`packages/mapgen-core/src/pipeline/tags.ts:1`). If core is generic, either:
   - make satisfaction functions generic over `TContext`, or
   - define a minimal `EngineContext` interface (artifacts/effects/trace) and have mods extend it.

2) **Do we keep an engine-level “phase” concept?**  
   Today `GenerationPhase` is a hard-coded union (`packages/mapgen-core/src/pipeline/types.ts:1`). Target: engine requires `phase: string` on each step, but does not define a canonical phase enum.

3) **What neutral utilities should be promoted to engine/lib?**  
   Some “base types” leak into shared libs (`packages/mapgen-core/src/lib/plates/crust.ts:1`). Decide which types move to engine/lib vs stay in mod.

4) **What happens to Civ7-specific orchestrator helpers?**  
   If core is pure, `packages/mapgen-core/src/orchestrator/**` should become either:
   - a Civ7-targeted runner package, or
   - mod-owned “runner” helpers for the standard mod.
