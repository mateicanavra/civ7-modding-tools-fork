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

## Canonical units of work (issue doc index)

Each unit below links to a local issue doc. Parent issues are indexes; leaf issues carry the detailed implementation steps.

### LOCAL-TBD-M6-U01 — Promote runtime pipeline as `engine/**`
Issue doc: [LOCAL-TBD-M6-U01](../issues/LOCAL-TBD-M6-U01-promote-runtime-pipeline-as-engine-sdk-surface.md)

Move the runtime pipeline into the engine SDK surface and update imports/tests to match.
- [x] Done (branch: `m6-u01-promote-runtime-pipeline-as-engine-sdk-surface`; review: `m6-u01-review-promote-runtime-pipeline-as-engine-sdk-surface`; PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/267)

### LOCAL-TBD-M6-U02 — Authoring SDK v1 (parent)
Issue doc: [LOCAL-TBD-M6-U02](../issues/LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md)

Deliver the authoring SDK v1 surface (`createStep`, `createStage`, `createRecipe`) with registry plumbing hidden.

**Children**
- [x] [LOCAL-TBD-M6-U02-1](../issues/LOCAL-TBD-M6-U02-1-define-authoring-pojos-and-schema-requirements.md) — Done (branch: `m6-u02-1-define-authoring-pojos-and-schema-requirements`; review: `m6-u02-1-review-define-authoring-pojos-and-schema-requirements`; PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/269)
- [x] [LOCAL-TBD-M6-U02-2](../issues/LOCAL-TBD-M6-U02-2-implement-createrecipe-registry-plumbing-and-api-surface.md) — Done (branch: `m6-u02-2-implement-createrecipe-registry-plumbing-and-api-surface`; review: `m6-u02-2-review-implement-createrecipe-registry-plumbing-and-api-surface`; PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/271)

### LOCAL-TBD-M6-U03 — Content package skeleton + exports (`mods/mod-swooper-maps`)
Issue doc: [LOCAL-TBD-M6-U03](../issues/LOCAL-TBD-M6-U03-scaffold-standard-content-package-skeleton-and-exports.md)

Establish the mod-owned content package skeleton and exports for standard recipes and domain libs.
- [x] Done (branch: `m6-u03-scaffold-standard-content-package-skeleton-and-exports`; review: `m6-u03-review-scaffold-standard-content-package-skeleton-and-exports`; PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/288)

### LOCAL-TBD-M6-U04 — Move domain libraries out of core (parent)
Issue doc: [LOCAL-TBD-M6-U04](../issues/LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)

Move all domain logic into the content package and remove core domain ownership.

**Children**
- [x] [LOCAL-TBD-M6-U04-1](../issues/LOCAL-TBD-M6-U04-1-relocate-domain-modules-to-mod-owned-libs.md) — Done (branch: `m6-u04-1-relocate-domain-modules-to-mod-owned-libs`; review: `m6-u04-1-review-relocate-domain-modules-to-mod-owned-libs`; PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/289)
- [x] [LOCAL-TBD-M6-U04-2](../issues/LOCAL-TBD-M6-U04-2-update-recipe-steps-to-use-mod-owned-domain-libs.md) — Done (branch: `m6-u04-2-update-recipe-steps-to-use-mod-owned-domain-libs`; review: `m6-u04-2-review-update-recipe-steps-to-use-mod-owned-domain-libs`; PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/290)
- [x] [LOCAL-TBD-M6-U04-3](../issues/LOCAL-TBD-M6-U04-3-remove-core-domain-exports-and-clean-import-edges.md) — Done (branch: `m6-u04-3-remove-core-domain-exports-and-clean-import-edges`; review: `m6-u04-3-review-remove-core-domain-exports-and-clean-import-edges`; PR: pending)

### LOCAL-TBD-M6-U05 — Re-author standard recipe as a mini-package (parent)
Issue doc: [LOCAL-TBD-M6-U05](../issues/LOCAL-TBD-M6-U05-re-author-standard-recipe-as-a-mini-package.md)

Rebuild the standard recipe as a mod-owned mini-package with stages/steps on disk.

**Children**
- [x] [LOCAL-TBD-M6-U05-1](../issues/LOCAL-TBD-M6-U05-1-translate-base-steps-into-recipe-local-stage-step-files.md) — Done (branch: `m6-u05-1-translate-base-steps-into-recipe-local-stage-step-files`; PR: pending)
- [LOCAL-TBD-M6-U05-2](../issues/LOCAL-TBD-M6-U05-2-compose-standard-recipe-and-tag-definitions-via-authoring-sdk.md)

### LOCAL-TBD-M6-U06 — Rewrite maps as recipe instances
Issue doc: [LOCAL-TBD-M6-U06](../issues/LOCAL-TBD-M6-U06-rewrite-maps-as-recipe-instances.md)

Rewrite maps/presets to select a recipe and provide config instances at runtime.

### LOCAL-TBD-M6-U07 — Delete legacy: base/bootstrap/config/orchestrator/task-graph
Issue doc: [LOCAL-TBD-M6-U07](../issues/LOCAL-TBD-M6-U07-delete-legacy-base-bootstrap-config-orchestrator.md)

Remove legacy surfaces once the new engine/authoring/content boundaries are live.

### LOCAL-TBD-M6-U08 — Tests and CI gates aligned to ownership
Issue doc: [LOCAL-TBD-M6-U08](../issues/LOCAL-TBD-M6-U08-realign-tests-and-ci-gates-to-ownership.md)

Move tests to match the new ownership boundaries and validate at least one recipe execution path.

---

## High-level sequencing (slices)

The key principle: establish the new runtime + authoring surfaces first, then move content, then delete legacy.

```yaml
steps:
  - slice: 0
    mode: sequential
    units: [LOCAL-TBD-M6-U01]
    description: Promote pipeline runtime to engine/** and update imports/tests.

  - slice: 1
    mode: sequential
    units: [LOCAL-TBD-M6-U02]
    description: Authoring SDK v1 (factories + required schemas + recipe tagDefinitions).

  - slice: 2
    mode: parallel
    after_slices: [1]
    units: [LOCAL-TBD-M6-U03, LOCAL-TBD-M6-U04]
    description: Establish content package skeleton and move domain libraries out of core.

  - slice: 3
    mode: sequential
    after_slices: [2]
    units: [LOCAL-TBD-M6-U05]
    description: Re-author the standard recipe mini-package (stages/steps nested; narrative deferred).

  - slice: 4
    mode: parallel
    after_slices: [3]
    units: [LOCAL-TBD-M6-U06, LOCAL-TBD-M6-U08]
    description: Rewrite maps as recipe instances + align tests to new ownership.

  - slice: 5
    mode: sequential
    after_slices: [4]
    units: [LOCAL-TBD-M6-U07]
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

## Resolved decisions (from open questions)

1) **Civ7 “map runner” home (for M6)**  
**Decision:** keep the Civ7 runner as **mod-owned runtime glue** in `mods/mod-swooper-maps/src/maps/_runtime/**` (thin wrapper that resolves map init + constructs settings + calls `recipe.run(...)`).  
**Rationale:** best DX (one place to look; minimal indirection); keeps engine/authoring SDK Civ7‑agnostic. A future “publishing SDK” package can be extracted only when multiple mods need it.

2) **Tag “schema richness” vs current `TagRegistry` (for M6)**  
**Decision:** keep the existing runtime `TagRegistry` contract (IDs + kind prefix validation + optional `satisfies` + optional demo validation). Do **not** implement the richer “tag schemas as TypeBox” sketch from `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` Appendix §7 in M6.  
**What “schema richness” means:** the SPEC appendix sketches per‑tag TypeBox schemas (e.g., `ArtifactTag.schema` required; `FieldTag.schema` optional) and richer tag metadata (`doc`, stronger `TagId` typing). The current runtime does not model per‑tag schemas; it validates by prefix, optional `satisfies`, and optional demo validators.  
**Rationale:** M6 is a packaging/ownership cutover; adding per‑tag schemas is high churn for limited author‑experience gain right now. Revisit only if it becomes a blocker for validation/observability.

---

## Coverage map (SPIKE → M6)

- SPIKE §1–2 (runtime contract + layering) → LOCAL-TBD-M6-U01, LOCAL-TBD-M6-U02
- SPIKE §3–7 (content package shape + examples) → LOCAL-TBD-M6-U03 through LOCAL-TBD-M6-U06
- SPIKE §9 (file mapping) → all units (authoritative per-file moves)
- SPIKE §10 (pre-work) → LOCAL-TBD-M6-U01/LOCAL-TBD-M6-U06 (context split + runner seam)
