# Foundation Domain Refactor — Phase 1 Current-State Spike

This spike is the **Phase 1 output** for the Foundation vertical refactor workflow:
- Plan: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/FOUNDATION.md`
- Backbone workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

Goal: ground the Foundation refactor in **current-state reality** (wiring + contracts + boundary violations), so Phase 2/3 can be re-scoped based on evidence.

---

## Phase 0 baseline gates (green)

Ran the Phase 0 baseline gates (worktree + full checks/tests/build/deploy). Result: **all green**.

Commands:
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
```

---

## Phase 1 hypotheses to validate (from plan)

- `/src/domain/foundation/ops/contracts.ts` is currently empty (Foundation is not yet contract-first in practice).
- `/src/recipes/standard/stages/foundation/` is partially aligned with canonical authoring posture:
  - stage-owned artifact contracts exist,
  - the step uses `deps.artifacts.*` publishes,
  - orchestration still routes through a monolithic producer (`/src/recipes/standard/stages/foundation/producer.ts`).
- Downstream domains read Foundation tensors via artifact tags, including indirect reads via `ctx.artifacts.get(...)` helper assertions.
- `env.directionality` is required at runtime; current maps pass it in from authored recipe config.
- Some downstream code imports Foundation implementation constants directly (e.g., `BOUNDARY_TYPE`), creating module-layout coupling that must become a stable contract surface.

## 1) Recipe wiring (where Foundation sits)

Standard recipe stage ordering (source of truth):
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`

```yaml
stages_in_order:
  - foundation
  - morphology-pre
  - narrative-pre
  - morphology-mid
  - narrative-mid
  - morphology-post
  - hydrology-pre
  - narrative-swatches
  - hydrology-core
  - narrative-post
  - hydrology-post
  - ecology
  - placement
```

**Implication:** Foundation outputs are read across *many* downstream stages (morphology, narrative, hydrology).

---

## 2) Foundation stage (current authoring posture)

Stage directory:
- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation`

Current composition:
```yaml
stage:
  id: foundation
  stage_module: mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts
  artifacts_module: mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts
  steps:
    - id: foundation
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.ts
      notes:
        - "Publishes foundation artifacts via deps.artifacts.*"
        - "Orchestration still routes through a monolithic producer (producer.ts)"
```

Foundation artifacts (stage-owned contracts):
- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
- Canonical tag ids live in `packages/mapgen-core/src/core/types.ts`

```yaml
artifacts:
  - name: foundationPlates
    id: artifact:foundation.plates
  - name: foundationDynamics
    id: artifact:foundation.dynamics
  - name: foundationSeed
    id: artifact:foundation.seed
  - name: foundationDiagnostics
    id: artifact:foundation.diagnostics
  - name: foundationConfig
    id: artifact:foundation.config
```

**Current consumer reality:**
- `foundationPlates` and `foundationDynamics` are consumed downstream.
- `foundationSeed`, `foundationDiagnostics`, `foundationConfig` are **not** required by any downstream step contracts today (they appear to exist for trace/debug/forward-compat).

---

## 3) Current dependency graph (who reads Foundation outputs)

### Direct step-level dependencies (contract-declared)

These step contracts explicitly require Foundation artifacts (via `artifacts.requires`):

```yaml
foundationPlates_consumers:
  - mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyRifts.contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.contract.ts

foundationDynamics_consumers:
  - mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.contract.ts
```

### Indirect domain-level dependencies (hidden coupling via `ctx.artifacts.get`)

Several downstream domain modules read Foundation artifacts **directly** via `@swooper/mapgen-core` assertion helpers, which fetch from `ctx.artifacts.get(...)`:
- `packages/mapgen-core/src/core/assertions.ts`

Key callsites:
```yaml
assertFoundationPlates_callers:
  - mods/mod-swooper-maps/src/domain/morphology/landmass/index.ts
  - mods/mod-swooper-maps/src/domain/morphology/coastlines/rugged-coasts.ts
  - mods/mod-swooper-maps/src/domain/morphology/mountains/apply.ts
  - mods/mod-swooper-maps/src/domain/morphology/volcanoes/apply.ts

assertFoundationDynamics_callers:
  - mods/mod-swooper-maps/src/domain/hydrology/climate/refine/index.ts
  - mods/mod-swooper-maps/src/domain/hydrology/climate/swatches/monsoon-bias.ts
```

**Implication:** even when a step’s `run(...)` does not explicitly read a Foundation artifact via `deps.artifacts.*.read(ctx)`, the domain implementation it calls may still depend on Foundation tensors through `ctx.artifacts`.

This is a primary boundary violation to eliminate in the refactor (domain logic should not reach into `ctx.artifacts` once it becomes contract-first ops).

---

## 4) Current Foundation “domain” surface (what exists vs target architecture)

### Foundation domain module

Foundation domain directory:
- `mods/mod-swooper-maps/src/domain/foundation`

Key files:
```yaml
files:
  - mods/mod-swooper-maps/src/domain/foundation/index.ts
  - mods/mod-swooper-maps/src/domain/foundation/ops/contracts.ts  # empty
  - mods/mod-swooper-maps/src/domain/foundation/ops/index.ts      # empty
  - mods/mod-swooper-maps/src/domain/foundation/ops.ts            # createDomain(domain, implementations)
  - mods/mod-swooper-maps/src/domain/foundation/plates.ts         # computePlatesVoronoi implementation
  - mods/mod-swooper-maps/src/domain/foundation/plate-seed.ts     # PlateSeedManager
  - mods/mod-swooper-maps/src/domain/foundation/types.ts          # BOUNDARY_TYPE and plate models
  - mods/mod-swooper-maps/src/domain/foundation/constants.ts      # re-export boundary types
```

**Current vs target mismatch:**
- `mods/mod-swooper-maps/src/domain/foundation/ops/contracts.ts` exports `{}` (no op contracts).
- `mods/mod-swooper-maps/src/domain/foundation/ops/index.ts` exports `{}` (no implementations).
- The Foundation stage producer calls *implementation modules directly*:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/producer.ts`

---

## 5) Typed array products (current artifact payload shapes)

Mapgen-core defines the canonical Foundation artifact payload shapes as typed arrays:
- `packages/mapgen-core/src/core/types.ts`

```yaml
artifact_payloads:
  foundationPlates:
    id: Int16Array
    boundaryCloseness: Uint8Array
    boundaryType: Uint8Array
    tectonicStress: Uint8Array
    upliftPotential: Uint8Array
    riftPotential: Uint8Array
    shieldStability: Uint8Array
    movementU: Int8Array
    movementV: Int8Array
    rotation: Int8Array
  foundationDynamics:
    windU: Int8Array
    windV: Int8Array
    currentU: Int8Array
    currentV: Int8Array
    pressure: Uint8Array
  foundationSeed:
    type: SeedSnapshot
    notes: "Validated against map dimensions; published but currently not required downstream."
  foundationDiagnostics:
    boundaryTree: unknown | null
  foundationConfig:
    type: FoundationConfigSnapshot
    notes: "Published snapshot; currently not required downstream."
```

Validation:
- Artifact validators + assertion helpers live in `packages/mapgen-core/src/core/types.ts` and `packages/mapgen-core/src/core/assertions.ts`.

---

## 6) Config and env coupling (directionality)

Runtime env includes `directionality` (external input to MapGen execution):
- `mods/mod-swooper-maps/src/maps/_runtime/standard-entry.ts`
- `packages/mapgen-core/src/core/env.ts`

Observed wiring in map modules (example):
- `mods/mod-swooper-maps/src/maps/swooper-earthlike.ts`
  - passes `directionality = config.foundation.foundation.foundation.dynamics.directionality` into `wireStandardMapEntry({ ..., directionality })`

Foundation stage **requires** `context.env.directionality` (current behavior):
- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/producer.ts`

Downstream steps also require `env.directionality` for climate/story logic:
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.ts`

**Phase 2 decision needed:** whether directionality belongs in:
- the Foundation op config envelope (domain-owned), or
- the `Env` surface (runtime-owned), or
- a mixed approach (env provides override, config provides defaults).

---

## 7) Deep import / coupling hotspots (non-contract-first)

Direct imports of Foundation implementation surfaces still exist:

```yaml
foundation_deep_imports:
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/producer.ts:
      - "@mapgen/domain/foundation/plate-seed.js"
      - "@mapgen/domain/foundation/plates.js"
      - "@mapgen/domain/foundation/types.js"
  - mods/mod-swooper-maps/src/domain/morphology/**:
      - "@mapgen/domain/foundation/constants.js"  # imports BOUNDARY_TYPE
```

**Implication:** multiple downstream domains are coupled to Foundation’s *implementation* module layout, not to stable op contract surfaces.

---

## 8) Tests that anchor current behavior

Foundation-specific tests (directly exercising Foundation domain implementation):
- `mods/mod-swooper-maps/test/foundation/plate-seed.test.ts`
- `mods/mod-swooper-maps/test/foundation/plates.test.ts`
- `mods/mod-swooper-maps/test/foundation/voronoi.test.ts`

Cross-domain tests that implicitly depend on Foundation tensors being present in `ctx.artifacts`:
- Hydrology climate refinement and narrative swatches paths (see assert callsites in section 3).

---

## Living artifacts spine (Phase 1 snapshot)

### A) Domain surface inventory (current)

```yaml
files:
  - path: /src/recipes/standard/recipe.ts
    notes: Standard recipe ordering; Foundation runs first.

  # Foundation stage boundary (source of truth for publish-once artifact contracts + step wiring)
  - path: /src/recipes/standard/stages/foundation/index.ts
    notes: Stage module; currently contains one step (`foundation`).
  - path: /src/recipes/standard/stages/foundation/artifacts.ts
    notes: Stage-owned artifact contracts for foundation outputs (plates/dynamics/seed/diagnostics/config).
  - path: /src/recipes/standard/stages/foundation/producer.ts
    notes: Monolithic producer/orchestration; calls Foundation implementation modules directly.
  - path: /src/recipes/standard/stages/foundation/steps/foundation.contract.ts
    notes: Step contract; provides all foundation artifacts; schema includes FoundationConfigSchema.
  - path: /src/recipes/standard/stages/foundation/steps/foundation.ts
    notes: Step runtime; publishes artifacts via deps.artifacts.* and calls runFoundationStage (producer).

  # Foundation domain module (current state is not ops-first)
  - path: /src/domain/foundation/index.ts
    notes: Domain entrypoint (`defineDomain({ id: "foundation", ops })`); exports types; ops router currently empty.
  - path: /src/domain/foundation/ops/contracts.ts
    notes: Empty op contract router (no declared ops).
  - path: /src/domain/foundation/ops/index.ts
    notes: Empty op implementations router (no implementations).
  - path: /src/domain/foundation/ops.ts
    notes: createDomain(domain, implementations) wrapper; runtime ops surface exists but is empty.
  - path: /src/domain/foundation/plates.ts
    notes: Voronoi plate generation implementation (typed arrays) used by the Foundation stage producer.
  - path: /src/domain/foundation/plate-seed.ts
    notes: PlateSeedManager capture/finalize; used by producer and tests.
  - path: /src/domain/foundation/constants.ts
    notes: Re-exports `BOUNDARY_TYPE`; imported by downstream domain implementations (coupling).

callers:
  # Downstream steps that explicitly require foundation artifacts via step contracts
  - path: /src/recipes/standard/stages/morphology-pre/steps/landmassPlates.contract.ts
    notes: Requires foundationPlates.
  - path: /src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts
    notes: Requires foundationPlates (and storyOverlays).
  - path: /src/recipes/standard/stages/morphology-post/steps/mountains.contract.ts
    notes: Requires foundationPlates.
  - path: /src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts
    notes: Requires foundationPlates.
  - path: /src/recipes/standard/stages/narrative-pre/steps/storyRifts.contract.ts
    notes: Requires foundationPlates (and storyOverlays).
  - path: /src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.contract.ts
    notes: Requires foundationPlates + foundationDynamics (and storyOverlays).
  - path: /src/recipes/standard/stages/narrative-swatches/steps/storySwatches.contract.ts
    notes: Requires foundationDynamics (and heightfield/climateField/overlays).
  - path: /src/recipes/standard/stages/hydrology-post/steps/climateRefine.contract.ts
    notes: Requires foundationDynamics (and heightfield/climateField/overlays/riverAdjacency).

  # Downstream domain logic that reads foundation artifacts indirectly via ctx.artifacts.get (legacy coupling)
  - path: packages/mapgen-core/src/core/assertions.ts
    notes: assertFoundationPlates/assertFoundationDynamics fetch from ctx.artifacts.get(artifact:foundation.*).
  - path: /src/domain/morphology/landmass/index.ts
    notes: Reads plates via assertFoundationPlates(ctx, ...).
  - path: /src/domain/morphology/mountains/apply.ts
    notes: Reads plates via assertFoundationPlates(ctx, ...).
  - path: /src/domain/morphology/volcanoes/apply.ts
    notes: Reads plates via assertFoundationPlates(ctx, ...).
  - path: /src/domain/morphology/coastlines/rugged-coasts.ts
    notes: Reads plates via assertFoundationPlates(ctx, ...).
  - path: /src/domain/hydrology/climate/refine/index.ts
    notes: Reads dynamics via assertFoundationDynamics(ctx, ...).
  - path: /src/domain/hydrology/climate/swatches/monsoon-bias.ts
    notes: Reads dynamics via assertFoundationDynamics(ctx, ...).

tests:
  - path: /test/foundation/voronoi.test.ts
  - path: /test/foundation/plates.test.ts
  - path: /test/foundation/plate-seed.test.ts
```

### B) Contract matrix (current)

```yaml
steps:
  - id: foundation/foundation
    title: "Publish Foundation tensors (plates/dynamics) + snapshots"
    requires:
      artifacts: []
      buffers: []
      overlays: []
    provides:
      artifacts:
        - artifact:foundation.plates
        - artifact:foundation.dynamics
        - artifact:foundation.seed
        - artifact:foundation.diagnostics
        - artifact:foundation.config
      buffers: []
      overlays: []
    consumers:
      - morphology-pre/landmass-plates
      - morphology-mid/rugged-coasts
      - narrative-pre/story-rifts
      - narrative-mid/story-orogeny
      - morphology-post/mountains
      - morphology-post/volcanoes
      - narrative-swatches/story-swatches (dynamics)
      - hydrology-post/climate-refine (dynamics)
    notes: "Current orchestration is monolithic producer (not contract-first ops)."

  - id: morphology-pre/landmass-plates
    title: "Landmass generation (plate-driven)"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: []
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []
    notes: "Domain logic reads plates via assertFoundationPlates(ctx, ...); also uses engine-effect tags (non-artifact gating)."

  - id: morphology-mid/rugged-coasts
    title: "Rugged coasts (margin/corridor-aware)"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []
    notes: "Requires story overlays; domain logic reads plates via assertFoundationPlates(ctx, ...)."

  - id: narrative-pre/story-rifts
    title: "Story motifs: rift valleys"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: [artifact:storyOverlays]
    consumers: []
    notes: "Consumes plates; appends rift motifs into overlays."

  - id: narrative-mid/story-orogeny
    title: "Story motifs: orogeny belts"
    requires:
      artifacts: [artifact:foundation.plates, artifact:foundation.dynamics]
      buffers: []
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: [artifact:storyOverlays]
    consumers: []
    notes: "Consumes plates+dynamics; appends orogeny motifs into overlays."

  - id: narrative-swatches/story-swatches
    title: "Story overlays: climate swatches (hydrology-facing)"
    requires:
      artifacts: [artifact:foundation.dynamics]
      buffers: [artifact:heightfield, artifact:climateField]
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: [artifact:storyOverlays]
    consumers: []
    notes: "Swatches/monsoon logic reads dynamics via assertFoundationDynamics(ctx, ...); step code also requires env.directionality."

  - id: hydrology-post/climate-refine
    title: "Post-rivers climate refinement (earthlike)"
    requires:
      artifacts: [artifact:foundation.dynamics, artifact:riverAdjacency]
      buffers: [artifact:heightfield, artifact:climateField]
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []
    notes: "Refinement logic reads dynamics via assertFoundationDynamics(ctx, ...); step code also requires env.directionality."

  - id: morphology-post/mountains
    title: "Mountains placement (plate-aware physics)"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: []
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []
    notes: "Domain logic reads plates via assertFoundationPlates(ctx, ...)."

  - id: morphology-post/volcanoes
    title: "Volcano placement (plate-aware)"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: []
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []
    notes: "Domain logic reads plates via assertFoundationPlates(ctx, ...)."
```

### C) Legacy surface inventory (current)

- TBD (inventory every config property, rule/policy, and domain function with locations and callsites)

### D) Upstream authoritative input review (current)

- Not applicable (Foundation is the pipeline root).

### E) Decisions + defaults (initial)

- **Default:** do not propagate legacy authoring patterns; prefer canonical authoring surfaces.
- **Default:** treat all `ctx.artifacts.get(artifact:foundation.*)` reads in domain code as legacy coupling to delete once Foundation becomes ops-first.
- **Decision needed (Phase 2):** resolve `env.directionality` ownership (see section 6); current state duplicates it in config and env.

### F) Risk register (initial)

```yaml
risks:
  - id: R1
    title: "Downstream domains directly read Foundation artifacts via ctx.artifacts"
    severity: high
    blocking: true
    notes: "Requires slice plan: consumers must be migrated to ops inputs/contracts without reintroducing ctx.artifacts access."
  - id: R2
    title: "Downstream imports depend on Foundation implementation module layout"
    severity: high
    blocking: true
    notes: "BOUNDARY_TYPE imports from @mapgen/domain/foundation/constants.js must be replaced by stable contract surfaces."
  - id: R3
    title: "Directionality is treated as env-owned but authored in config"
    severity: medium
    blocking: false
    notes: "Phase 2 needs a single canonical posture for where this lives (env vs config vs override)."
  - id: R4
    title: "Foundation tests directly exercise implementation modules (plates/voronoi/seed)"
    severity: medium
    blocking: false
    notes: "Slice plan must preserve deterministic coverage while migrating to ops-first surfaces."
```

### G) Golden path candidate (current)

Nearest “Foundation-shaped” canonical step (artifacts + deps signature, but no ops yet):
- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.ts`

Style exemplar for contract-first authoring (already canonical):
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts`

### H) Deletion list (current)

- TBD (populate during Phase 1 inventory)

---

## Lookback (Phase 1 → Phase 2): Adjust modeling plan

This lookback converts the Phase 1 inventory into **explicit Phase 2 modeling work** (and flags the decisions/risks that must be resolved before slicing implementation).

### What we learned (Phase 1 synthesis)

- **Foundation is already an artifact producer** at the stage boundary (plates/dynamics/seed/diagnostics/config), and downstream steps already declare `artifacts.requires` on plates/dynamics.
- **Foundation is not ops-first today**: the Foundation step runtime calls a monolithic producer, which calls Foundation implementation modules directly (`plates.ts`, `plate-seed.ts`, etc.).
- **Hidden coupling exists in downstream domain code**: multiple morphology/hydrology domain implementations read `artifact:foundation.*` via `ctx.artifacts.get(...)` assertion helpers in `packages/mapgen-core`.
- **Directionality is currently treated as env-owned at runtime**, but authored inside the recipe config and plumbed into `Env` by map entry wiring (config↔env coupling).
- **Module-layout coupling exists**: downstream domain code imports `BOUNDARY_TYPE` from Foundation implementation modules, which is not a stable “contract surface”.

### Phase 2 scope updates (modeling work we must do)

1) **Define the op catalog + contract surfaces (Foundation-owned)**
- Identify the minimal op set that the Foundation step needs to compute the current plate/dynamics tensors (and seed/diagnostics/config snapshot if those remain artifacts).
- Decide what “atomic” means for Foundation ops in practice (no op calls op): the current producer contains multiple conceptual units (plates, winds, pressure, currents, seed capture/finalize, config snapshot).

2) **Decide what is actually “public and stable” from Foundation**
- `artifact:foundation.plates` and `artifact:foundation.dynamics` are hard dependencies; preserve them as stable contracts until downstream domains are refactored.
- Decide whether `artifact:foundation.seed`, `artifact:foundation.diagnostics`, and `artifact:foundation.config` are:
  - retained as forward-compat/debugging artifacts,
  - or demoted to internal/non-public (still possible as step-local trace products),
  - and what their schema/validation posture should be.

3) **Directionality ownership posture**
- Decide whether directionality should be:
  - **env-only** (runtime-owned input; config only influences env construction),
  - **config-only** (domain-owned; env does not carry it),
  - or **hybrid** (env provides optional overrides; config is default).
- This decision must be recorded as a Phase 2 “default with trigger”, because it impacts contract design and test harness shape.

4) **Eliminate module-layout coupling (boundary constants)**
- Design a stable “contract surface” for boundary semantics used by downstream domains (e.g., a Foundation model export that is explicitly stable).
- This is a Phase 2 modeling decision because it defines what Foundation is responsible for publishing as canonical semantics (even before downstream refactors).

5) **Schema posture for typed arrays**
- Foundation artifacts are currently defined as `Type.Any()` at the stage level, while mapgen-core validators enforce typed-array shapes.
- Phase 2 should decide whether stage-owned artifact schemas:
  - stay permissive (Type.Any) while validation lives in artifact runtimes, or
  - become explicit TypeBox schemas (with clear guidance on typed array representation), or
  - move toward a dedicated “typed array artifact schema helper”.

### Plan deltas to carry into Phase 2

- **Appendix A/B updates:** the plan now has concrete filepaths and a current contract matrix; Phase 2 must rewrite Appendix B “target” based on the op catalog and ownership decisions above.
- **Appendix C additions:** Phase 2 must explicitly record:
  - directionality ownership posture,
  - boundary semantics export posture,
  - and whether seed/diagnostics/config remain public artifacts.
- **Appendix D updates:** keep R1/R2 as blocking risks for slice ordering (legacy `ctx.artifacts` access and module-layout coupling), and treat schema posture as a medium risk (DX + correctness).
