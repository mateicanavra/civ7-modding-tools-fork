# M6: Engine/Authoring SDK Split + Standard Content Package Cutover

**Status:** proposed  
**Baseline snapshot:** `2429a600` (post‑M5 landed)  
**Canonical spec (for this milestone):** `docs/projects/engine-refactor-v1/resources/SPIKE-m5-standard-mod-feature-sliced-content-ownership.md`

---

## Executive summary

M5 made the pipeline runtime *real* (registry + compile + execute + `effect:*`), and pluginized the “base mod” as `@swooper/mapgen-core/base`. But we are still not in the target ownership model: core still ships privileged content surfaces (`base`, `domain`, `config`, `bootstrap`), and consumers still run through a legacy runner (`runTaskGraphGeneration`) that bakes in monolithic config and override behavior.

M6 is the milestone that completes the packaging/ownership architecture:

- `@swooper/mapgen-core` becomes **two SDK surfaces**:
  - **Engine SDK**: runtime only (`registry + compile + execute + observability`), content‑agnostic.
  - **Authoring SDK**: minimal factories (`createStep/createStage/createRecipe`) that hide registry plumbing.
- The “standard pipeline” becomes a **real content package**: `mods/mod-swooper-maps` owns domain libraries and recipes.
- **Recipes are structural** (“how we generate a kind of map”) and are **not** map variants/presets.
  - Maps/presets are **instances**: they select a recipe and supply **config values**.
- Delete legacy entrypoints and concepts:
  - `@swooper/mapgen-core/base`, `PipelineModV1`, `bootstrap`, monolithic `MapGenConfig`, `runTaskGraphGeneration`, overrides/bootstrap plumbing.

This milestone is intentionally “purist”: minimize dual‑pathing/shims; existing map consumers are disposable.

---

## Definition of done (acceptance criteria)

### A) Package/ownership boundary

- `packages/mapgen-core` exports:
  - `@swooper/mapgen-core/engine` (runtime SDK)
  - `@swooper/mapgen-core/authoring` (authoring SDK)
- `packages/mapgen-core` does **not** export or ship:
  - `@swooper/mapgen-core/base`
  - `@swooper/mapgen-core/domain`
  - `@swooper/mapgen-core/config`
  - `@swooper/mapgen-core/bootstrap`
  - `PipelineModV1` (and anything that requires a mod to “register itself” globally)

### B) Authoring model is enforced by code (not convention)

- Every authored step **must** declare a config schema (even if empty).
- Recipe‑local tag catalog/definitions are passed via `createRecipe({ tagDefinitions })` (may be an empty list, but always present).
- Steps/stages/recipes are **POJO‑first** and default‑exportable (DX‑friendly).

### C) Standard content package is real and self‑contained

- `mods/mod-swooper-maps` owns:
  - `src/domain/**` (pure logic reused within the mod)
  - `src/recipes/**` (recipe mini‑packages; stages own steps on disk)
  - `src/maps/**` (map/preset entrypoints: recipe + config instance + settings)
- `mods/mod-swooper-maps` recipe code imports the **authoring SDK** (not engine registry/executor directly).

### D) Runtime cutover

- The Civ7 entrypoint path runs without:
  - `runTaskGraphGeneration`
  - overrides/bootstrap config translation
  - `baseMod`
- The engine still runs the existing runtime contract:
  - `RunRequest = { recipe, settings }` → `compileExecutionPlan` → `PipelineExecutor.executePlan`

### E) Verification gates

- `pnpm -C packages/mapgen-core test` passes (engine/authoring tests).
- `pnpm -C mods/mod-swooper-maps test` (or equivalent) passes for content tests.
- At least one “standard recipe” smoke path:
  - compiles an `ExecutionPlan` from a structural recipe + config instance, and
  - executes it under a mock/stub adapter (headless) OR under Civ7 integration test harness (whichever is already present in repo patterns).

---

## Current state → target state (what changes)

This milestone is a packaging + ownership re‑architecture, not an algorithm rewrite.

### Current state (post‑M5)

- Runtime pipeline exists under `packages/mapgen-core/src/pipeline/**`.
- “Base mod” content exists as a privileged subpath export: `@swooper/mapgen-core/base` (implements `PipelineModV1`).
- Consumers (maps) run via `runTaskGraphGeneration`, which:
  - creates a `StepRegistry` and calls `baseMod.register(registry, MapGenConfig, …)`
  - translates monolithic config/overrides into per‑step config
  - bakes in legacy enablement/override behavior

### Target state (end of M6)

- `packages/mapgen-core`:
  - contains `engine/**` (runtime)
  - contains `authoring/**` (factories)
  - deletes legacy `base/**`, `bootstrap/**`, `config/**`, `domain/**`, and the task‑graph runner
- `mods/mod-swooper-maps`:
  - becomes the canonical “standard content” package
  - contains domain libraries + recipes + maps
  - maps select recipes and provide config instances

**No hidden gaps:** The authoritative file‑by‑file mapping is in the SPIKE:
`docs/projects/engine-refactor-v1/resources/SPIKE-m5-standard-mod-feature-sliced-content-ownership.md` (Section 9).

---

## Workstreams (problem framing)

### 1) Engine SDK surface: `pipeline/**` → `engine/**`

**Goal:** runtime‑only SDK surface, content‑agnostic; no authoring concepts.

**Complexity × parallelism:** medium complexity, high parallelism.

### 2) Authoring SDK: `createStep/createStage/createRecipe` (registry hidden)

**Goal:** mod authors think in `step/stage/recipe`; registry/tag plumbing is internal.

**Complexity × parallelism:** high complexity, medium parallelism (API/typing choices are coupled; call‑site updates are parallel).

### 3) Standard content package cutover (`mods/mod-swooper-maps`)

**Goal:** move all standard content out of core, and re‑author the standard recipe as a recipe mini‑package with nested stages/steps.

**Complexity × parallelism:** high complexity, medium–high parallelism (moves are parallel once contracts are stable).

### 4) Consumer cutover (maps/presets)

**Goal:** maps become recipe instances: select recipe + supply config instance + run with settings.

**Complexity × parallelism:** medium complexity, high parallelism.

### 5) Delete legacy surfaces + tests re-home

**Goal:** remove base/bootstrap/config/orchestrator legacy; re-home tests to match ownership.

**Complexity × parallelism:** medium complexity, high parallelism (but should run after cutover).

---

## Canonical units of work (hierarchical; no issue docs yet)

These are the canonical “units” that later become local issue docs / Graphite layers.

### M6‑U01 — Promote runtime pipeline as `engine/**`

**Outcome**
- `packages/mapgen-core/src/engine/**` exists and is the canonical runtime surface.
- `packages/mapgen-core/src/pipeline/**` is removed (or left as an internal, temporary re‑export only during the stack, then deleted before M6 completion).

**Key work**
- Move/rename runtime modules (`StepRegistry`, `TagRegistry`, `compileExecutionPlan`, `PipelineExecutor`, errors/observability/types).
- Update internal imports + exports map.
- Update engine tests to import from `engine/**`.

**Complexity × parallelism:** medium × high.

### M6‑U02 — Authoring SDK v1 (factories + types; registry hidden)

**Outcome**
- `packages/mapgen-core/src/authoring/**` exists with:
  - `createStep`, `createStage`, `createRecipe`
  - structural recipe vs config instance separation
  - recipe-local tag definitions via `createRecipe({ tagDefinitions })`
  - per-step schema required (even empty)

**Key work**
- Define minimal authored `Step/Stage/RecipeModule` POJOs (as per SPIKE).
- Implement `createRecipe` to:
  - derive full step IDs from nesting (recipeId + stageId + stepId)
  - build registry internally (StepRegistry + TagRegistry)
  - expose `instantiate/compile/run` without exposing registry

**Complexity × parallelism:** high × medium.

### M6‑U03 — Content package skeleton + exports (`mods/mod-swooper-maps`)

**Outcome**
- `mods/mod-swooper-maps/src/mod.ts` exists and exports recipes.
- `mods/mod-swooper-maps/src/recipes/standard/**` skeleton exists with required stage template:
  - `stages/<stageId>/index.ts`
  - `stages/<stageId>/steps/index.ts` (explicit named exports only; no `export *`)
  - `stages/<stageId>/steps/*.ts` (one file per step)
- `mods/mod-swooper-maps/src/domain/**` exists as the mod-local domain library root.

**Complexity × parallelism:** medium × high.

### M6‑U04 — Move domain libraries out of core

**Outcome**
- `packages/mapgen-core/src/domain/**` no longer exists; equivalent pure logic lives under `mods/mod-swooper-maps/src/domain/**`.
- All recipe-local steps import domain logic from the content package domain libs.

**Complexity × parallelism:** high × high (many moves; low conceptual complexity if kept mechanical).

### M6‑U05 — Re-author the “standard” recipe as a recipe mini-package

**Outcome**
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` is authored via the authoring SDK.
- Steps are recipe-local wrappers; stages own steps on disk; recipe composes stages.
- Narrative remains structurally a normal stage slice (no narrative redesign in M6).

**Key work**
- Translate current `@swooper/mapgen-core/base` step implementations into recipe-local step files.
- Replace old stage spine registration with explicit stage composition and step `requires/provides`.
- Provide recipe-local tag definitions (`mods/mod-swooper-maps/src/recipes/standard/tags.ts`) and pass them into `createRecipe`.

**Complexity × parallelism:** high × medium (some sequencing across phases, but mostly mechanical).

### M6‑U06 — Rewrite maps as recipe instances (config instance lives in the map)

**Outcome**
- `mods/mod-swooper-maps/src/maps/**` exists.
- Each map/preset:
  - imports a recipe module (`standard`)
  - builds settings (seed + dimensions)
  - supplies a config **instance** (values)
  - calls `recipe.run(ctx, settings, config)`

**Complexity × parallelism:** medium × high.

### M6‑U07 — Delete legacy: base/bootstrap/config/orchestrator/task-graph

**Outcome**
- Delete:
  - `packages/mapgen-core/src/base/**`
  - `packages/mapgen-core/src/bootstrap/**`
  - `packages/mapgen-core/src/config/**`
  - `packages/mapgen-core/src/orchestrator/task-graph.ts`
  - `packages/mapgen-core/src/pipeline/mod.ts` + `PipelineModV1` contract
- Remove `@swooper/mapgen-core/base` export surface.
- Root `packages/mapgen-core/src/index.ts` no longer re-exports legacy modules.

**Complexity × parallelism:** medium × high.

### M6‑U08 — Tests and CI gates aligned to ownership

**Outcome**
- Engine tests cover engine/authoring only.
- Content tests move to `mods/mod-swooper-maps/test/**` and validate:
  - standard recipe compiles
  - at least one end-to-end execution path is stable under mock adapter

**Complexity × parallelism:** medium × medium.

---

## High-level sequencing (slices)

The key principle: establish the new runtime + authoring surfaces first, then move content, then delete legacy.

```yaml
steps:
  - slice: 0
    mode: sequential
    units: [M6-U01]
    description: Promote pipeline runtime to engine/** and update imports/tests.

  - slice: 1
    mode: sequential
    units: [M6-U02]
    description: Authoring SDK v1 (factories + required schemas + recipe tagDefinitions).

  - slice: 2
    mode: parallel
    after_slices: [1]
    units: [M6-U03, M6-U04]
    description: Establish content package skeleton and move domain libraries out of core.

  - slice: 3
    mode: sequential
    after_slices: [2]
    units: [M6-U05]
    description: Re-author the standard recipe mini-package (stages/steps nested; narrative deferred).

  - slice: 4
    mode: parallel
    after_slices: [3]
    units: [M6-U06, M6-U08]
    description: Rewrite maps as recipe instances + align tests to new ownership.

  - slice: 5
    mode: sequential
    after_slices: [4]
    units: [M6-U07]
    description: Delete all legacy surfaces (base/bootstrap/config/task-graph) and ensure no dual path remains.
```

---

## Risks and mitigations

- **Wide move surface area:** large rename/move churn across packages.
  - Mitigation: keep slices disciplined; enforce “no legacy imports” at each slice boundary with `rg` gates.
- **Context split ambiguity (`core/types.ts`):** engine vs content ownership can be messy.
  - Mitigation: treat as an explicit subtask in M6‑U01/M6‑U02; keep engine context minimal; move content validators/types into mod domain libs.
- **Tag definitions completeness:** recipe-local tag catalog must match what executor validates.
  - Mitigation: keep `createRecipe({ tagDefinitions })` required; add compile-time/unit tests around TagRegistry registration.
- **Civ7 integration friction:** deleting orchestrator requires re-wiring map entrypoints.
  - Mitigation: maps are disposable; prioritize a clean new entry path and ensure at least one Civ7 smoke run is possible.

---

## Open questions (should not block drafting local issues, but must be resolved during implementation)

1) **Where does the Civ7 “map runner” live long-term?**  
M6 can keep minimal wiring inside `mods/mod-swooper-maps/src/maps/_runtime/**`, but a future “publishing SDK” likely becomes its own package. This milestone should not invent that package unless it is required to keep the repo runnable.

2) **Tag schema richness vs current `TagRegistry`**  
`SPEC-target-architecture-draft.md` sketches richer tag schemas than the current runtime `TagRegistry` supports. M6 should not redesign tag typing unless it blocks the content cutover; track as a follow-up if needed.

---

## Coverage map (SPIKE → M6)

- SPIKE §1–2 (runtime contract + layering) → M6‑U01, M6‑U02
- SPIKE §3–7 (content package shape + examples) → M6‑U03…M6‑U06
- SPIKE §9 (file mapping) → all units (authoritative per‑file moves)
- SPIKE §10 (pre-work) → M6‑U01/M6‑U06 (context split + runner seam)

