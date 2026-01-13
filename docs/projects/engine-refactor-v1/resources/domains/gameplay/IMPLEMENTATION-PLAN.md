# Gameplay Domain Refactor — Implementation Plan (Migration Slices)

This document turns the Gameplay draft spec (`GAMEPLAY.md`) into an actionable, low-churn migration plan.

## Objective

Converge on a coherent **Gameplay-owned domain surface** by absorbing:
- Placement (already domain-shaped ops/config + engine apply boundary)
- Narrative (overlay contract + motif/corridor/swatches/orogeny machinery)

…while preserving the current **stage braid** and consumer-facing overlay contracts.

## Non-goals (for this plan)

- Re-model “physics” domains (Foundation/Morphology/Hydrology/Ecology).
- Introduce new Civ7 adapter primitives (triaged as later/out-of-scope for Gameplay v1 in `ADAPTER-GAP-TRIAGE.md`).
- Make overlays/buffers first-class dependency kinds (we keep the current artifact-wiring compromise).

## Ground Rules (Must Hold Throughout)

### 1) Stage braid is preserved

Do not reorder or merge stages as part of Gameplay v1. Source of truth:
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`

### 2) U21 authoring posture (assumed landed)

All step code and docs should assume:
- `run(ctx, config, ops, deps)` signature
- artifacts are stage-owned and surfaced via each stage’s `artifacts.ts`
- step contracts declare `artifacts.requires` / `artifacts.provides`
- step implementations access dependencies via `deps.*` (including `deps.artifacts.*`)

### 3) Buffers vs Artifacts vs Overlays (current policy)

This plan assumes the current, intentional compromise:
- **Artifacts** are publish-once, immutable-by-convention outputs used for gating + typed access.
- **Buffers** are mutable shared layers, currently “wrapped” as artifacts for gating/typing, then mutated in-place via `ctx.buffers.*` (no re-publish).
- **Overlays** are story/context outputs threaded through the artifact system today; treat them as append-preferred and “contracted”, not as ad-hoc bags.

Canonical evidence and posture lives in:
- `docs/system/libs/mapgen/research/SPIKE-gameplay-mapgen-touchpoints.md`
- `docs/projects/engine-refactor-v1/resources/domains/gameplay/OWNERSHIP-MAP.md`

### 4) Overlay contract stability for downstream consumers

Any slice that changes overlay keys/types/locations must migrate consumers in the same slice.

Consumers inventory:
- `docs/projects/engine-refactor-v1/resources/domains/gameplay/STAGE-STEP-INVENTORY.md`

## Target End State (v1)

### Ownership

The “Gameplay-owned” surface is the source of truth for:
- placement planning inputs/outputs and engine-apply boundary
- overlay contract meaning (keys/types/semantics), even when published by physics steps

Ownership map:
- `docs/projects/engine-refactor-v1/resources/domains/gameplay/OWNERSHIP-MAP.md`

### Domain surfaces (conceptual)

- `@mapgen/domain/gameplay` becomes the primary public surface for mapgen-time gameplay concerns.
- `@mapgen/domain/placement` and `@mapgen/domain/narrative` become compatibility wrappers during migration, then candidates for deprecation once consumers are migrated.

## Migration Strategy (Slices)

This plan is intentionally sliced to keep the system working at every boundary.

## Current Blast Radius (Concrete Import Sites)

This is the minimum “inventory” an implementer should keep open while migrating.

### Placement import sites

```yaml
imports:
  - path: mods/mod-swooper-maps/src/recipes/standard/recipe.ts
    notes: compile-op collection imports `@mapgen/domain/placement/ops`
  - path: mods/mod-swooper-maps/src/recipes/standard/runtime.ts
    notes: uses placement op output type for Starts config typing
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/placement-inputs.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/contract.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/inputs.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts
  - path: mods/mod-swooper-maps/src/domain/placement/config.ts
    notes: imports the placement domain contract surface
  - path: mods/mod-swooper-maps/src/domain/index.ts
    notes: re-exports placement domain module for convenience
```

### Narrative import sites (overlay + story machinery)

```yaml
imports:
  - path: mods/mod-swooper-maps/src/recipes/standard/overlays.ts
    notes: overlay consumer helpers (keys + models + corridor types)
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.ts
    notes: publishes overlays artifact
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/story*.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts
    notes: publishes HOTSPOTS overlays (boundary wrinkle)
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/steps/rivers.ts
    notes: imports swatches (“paleo”) helpers today
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/*
    notes: imports narrative models and reads overlays
  - path: mods/mod-swooper-maps/test/**/*
    notes: story/ecology tests import narrative overlay machinery directly today
```

### Slice 0 — Preflight: lock invariants + inventory the blast radius

**Why:** Avoid “hidden consumers” and accidental overlay contract breaks.

**Required outputs (docs artifacts):**
- [ ] Confirm stage braid + step inventory is current (`STAGE-STEP-INVENTORY.md`).
- [ ] Confirm overlay contract keys + schema shape are current (`mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts`, `mods/mod-swooper-maps/src/recipes/standard/overlays.ts`).
- [ ] Confirm all repo imports that will be touched by this refactor:
  - `@mapgen/domain/placement`
  - `@mapgen/domain/placement/ops`
  - `@mapgen/domain/narrative/*`

**Evidence commands:**
- `rg -n "@mapgen/domain/placement" mods/mod-swooper-maps/src`
- `rg -n "@mapgen/domain/narrative" mods/mod-swooper-maps/src`

**Gate (do not proceed until):**
- [ ] You can name every import site you’ll migrate in Slice 1–2 (no surprises).
- [ ] You understand which non-gameplay stages publish overlays (HOTSPOTS wrinkle).

### Slice 1 — Placement-first: introduce Gameplay domain + re-home Placement ops/config

**Intent:** Make Placement fully reachable through a Gameplay-owned surface, with minimal behavior change.

**Key posture:**
- Keep stage ids and stage directories unchanged.
- Prefer compatibility wrappers over sweeping renames in the first slice.

**Work items (high-level):**
- Introduce `@mapgen/domain/gameplay` domain module (contract entrypoint).
- Introduce `@mapgen/domain/gameplay/ops` (runtime entrypoint) and absorb Placement’s ops:
  - `planStarts`, `planFloodplains`, `planWonders`
- Move/alias Placement config surface under Gameplay (or re-export it) so stage schemas keep working.
- Update Standard recipe compile-op collection to reference Gameplay (not Placement).
- Migrate placement stage steps (contracts + impl) to import from Gameplay domain surface by default.
- Keep `@mapgen/domain/placement` as a compatibility wrapper (re-export Gameplay placement surface) for one migration window.

**Files (expected touchpoints):**
```yaml
files:
  - path: mods/mod-swooper-maps/src/domain/gameplay/index.ts
    notes: New contract entrypoint (defineDomain)
  - path: mods/mod-swooper-maps/src/domain/gameplay/ops/contracts.ts
    notes: Placement op contracts live here (or re-exported here)
  - path: mods/mod-swooper-maps/src/domain/gameplay/ops/index.ts
    notes: Placement op implementations live here (or delegated here)
  - path: mods/mod-swooper-maps/src/recipes/standard/recipe.ts
    notes: `collectCompileOps(...)` uses Gameplay domain ops instead of Placement
  - path: mods/mod-swooper-maps/src/recipes/standard/runtime.ts
    notes: Replace placement-type import with Gameplay surface for Starts config typing
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/**/*
    notes: Prefer importing `@mapgen/domain/gameplay` over `@mapgen/domain/placement`
```

**Gate:**
- [ ] `mods/mod-swooper-maps` builds and tests with Placement referencing Gameplay.
- [ ] No consumer uses a deep, internal path when a Gameplay public surface exists.

### Slice 2 — Narrative absorption (contract-first): move overlay contract + helpers under Gameplay

**Intent:** Make overlay meaning/contracts “Gameplay-owned”, while keeping the existing braid and existing artifact wiring.

**Work items (high-level):**
- Introduce `@mapgen/domain/gameplay/overlays/*` and migrate:
  - overlay keys (currently `@mapgen/domain/narrative/overlays/keys.ts`)
  - overlay registry/normalize helpers (currently narrative)
- Keep the **single** overlays artifact contract stable:
  - Continue to treat `artifact:storyOverlays` as the canonical overlays container.
  - Keep `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts` as the contract surface for now (low churn), but ensure its schema/typing imports point at Gameplay-owned overlay semantics where useful.
- Update `mods/mod-swooper-maps/src/recipes/standard/overlays.ts` to import keys/types/models from Gameplay.
- Update narrative stage step implementations to import overlay publishers from Gameplay.
- Update physics steps that publish overlays (HOTSPOTS wrinkle) to import publishers/keys from Gameplay.
- Keep `@mapgen/domain/narrative/overlays/*` as compatibility wrappers re-exporting from Gameplay for one migration window.

**Files (expected touchpoints):**
```yaml
files:
  - path: mods/mod-swooper-maps/src/domain/gameplay/overlays/keys.ts
  - path: mods/mod-swooper-maps/src/domain/gameplay/overlays/registry.ts
  - path: mods/mod-swooper-maps/src/domain/gameplay/overlays/normalize.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/overlays.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-*/steps/*.ts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts
```

**Gate:**
- [ ] Overlay key names and consumer-visible semantics remain stable (or are migrated in-slice).
- [ ] All overlay reads in steps continue to flow through `deps.artifacts.overlays.*` (no direct imports of artifact internals).

### Slice 3 — Narrative absorption (machinery): corridors, tagging, swatches, orogeny

**Intent:** Consolidate story overlay producers under Gameplay while preserving behavior and keeping physics domains authoritative for physics causality.

**Work items (high-level):**
- Migrate narrative story machinery to Gameplay domain:
  - `tagging/*` motif producers
  - `corridors/*` generation and post-processing
  - `orogeny/*` belt/wind/cache helpers
  - `swatches` producers
- Update narrative stage steps to call Gameplay-owned machinery.
- Update physics steps that depend on narrative models/types to import from Gameplay-owned types/models.
- Keep `@mapgen/domain/narrative/*` compatibility wrappers for one migration window.

**Open question (must be decided before migrating `paleo/*`):**
- `mods/mod-swooper-maps/src/domain/narrative/paleo/rainfall-artifacts.ts` mutates climate/buffer-like state.
- Decision posture lives in: `docs/projects/engine-refactor-v1/resources/domains/gameplay/DOMAIN-ABSORPTION-INVENTORY.md`.

**Gate:**
- [ ] Narrative-* stages compile and run with story machinery imported from Gameplay.
- [ ] Cross-stage consumers (morphology/hydrology/ecology) continue to compile and behave consistently.

### Slice 4 — Cleanup window: remove backdoors + tighten import discipline

**Intent:** Make “Gameplay is the default surface” real, not aspirational.

**Work items (high-level):**
- Identify and remove or quarantine any remaining deep imports that bypass Gameplay-owned surfaces.
- Tighten lint guardrails (where appropriate) to prevent regressions:
  - prefer importing from `@mapgen/domain/gameplay` for gameplay concerns
  - allow deep imports in tests only when truly necessary (document the exception)
- Update or add a short “how to import gameplay surfaces” section in:
  - `docs/projects/engine-refactor-v1/resources/domains/gameplay/README.md`

**Tests posture (explicit):**
- Default: tests should import the same public Gameplay surfaces that “real” code uses.
- Allowed exception: tests may deep-import internal modules when the public surface cannot express the test (e.g., needing a narrow helper or fixture), but:
  - the deep import should be local to the test (not re-exported/shared as a “test surface”)
  - the reason should be clear in the test body (short comment or naming)

**Gate:**
- [ ] `pnpm lint:domain-refactor-guardrails` passes.
- [ ] `pnpm test` passes.

## Verification (per slice)

Commands (repo-standard):
- `pnpm lint:domain-refactor-guardrails`
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm test`
- `pnpm run deploy:mods` (smoke test runtime behavior at least once before calling the refactor “done”)

## Notes on “done” posture

Gameplay v1 should be considered complete when:
- Placement and Narrative concerns are reachable through Gameplay-owned surfaces.
- Overlay contracts and consumer wiring are stable and understood.
- Compatibility wrappers exist only as transitional aids, and are called out explicitly as candidates for deletion in the next cleanup milestone.
