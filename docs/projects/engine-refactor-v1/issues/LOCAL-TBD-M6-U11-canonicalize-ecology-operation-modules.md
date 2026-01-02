---
id: LOCAL-TBD-M6-U11
title: "[M6] Canonicalize ecology domain operation modules (pure ops + plan kinds + key-based plans)"
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by:
  - LOCAL-TBD-M6-U10
blocked: []
related_to:
  - ADR-ER1-030
  - ADR-ER1-034
  - SPEC-step-domain-operation-modules
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Make `mods/mod-swooper-maps` ecology the canonical reference implementation of the step ↔ domain operation module contract: operations are pure (buffers/POJOs only), placement-producing operations are `kind: "plan"` with verb-forward naming, and all engine binding/logging lives strictly in the step layer.

## Deliverables
- Ecology domain ops are contract-pure (ADR-ER1-030):
  - No ecology op input/output contains adapters, callbacks, or other runtime “views”.
  - Typed-array/buffer contracts use `TypedArraySchemas.*` and op-entry validation (`runValidated`) instead of ad-hoc `Type.Any()` fields.
- Ecology uses strict operation kind semantics (ADR-ER1-034):
  - All operations that produce applyable placements are `kind: "plan"` and have verb-forward names.
  - `kind: "compute"` remains reserved for derived-field products only (ex: biome classification).
- Ecology placement outputs are key-based plans (engine-agnostic):
  - Ops return semantic keys (ex: `FEATURE_*`, `PLOTEFFECT_*`) rather than numeric engine indices.
  - Steps resolve keys → engine indices at apply time and own all runtime gating (`canHaveFeature`, etc.).
- Ecology feature “embellishments” are split into two semantic plan ops:
  - `planReefEmbellishments` (paradise reefs + passive shelf reefs)
  - `planVegetationEmbellishments` (volcanic halos + density-driven vegetation tweaks)
- No domain-side logging:
  - Domain ops do not call `devLogJson` or any logger.
  - Step-level tracing is the only logging/diagnostics mechanism (no domain-side diagnostic helpers).

## Acceptance Criteria
- **Boundary purity**
  - `rg -n "adapter\\b|ctxRandom\\b|TraceScope\\b|devLogJson\\b" mods/mod-swooper-maps/src/domain/ecology/ops` returns no matches.
  - All ecology ops are callable with plain buffers/POJOs (no engine adapter required in `op.input`).
- **Correct kind + naming**
  - `mods/mod-swooper-maps/src/domain/ecology/ops/**` exports:
    - exactly one `compute` op: `classifyBiomes` (existing behavior),
    - `plan*` ops for placements (features + plot effects) and embellishments (reef + vegetation split).
  - No exported op is noun-named (no `*Placement`, `*Embellishments`, `plotEffects` exports).
- **Key-based plans**
  - Ecology plan ops return placements using:
    - `feature: FeatureKey` where `FeatureKey` is `FEATURE_*` strings,
    - `plotEffect: PlotEffectKey` where `PlotEffectKey` is `PLOTEFFECT_*` strings.
  - Steps contain the only code that calls:
    - `adapter.getFeatureTypeIndex(...)`, `adapter.getPlotEffectTypeIndex(...)`,
    - `adapter.canHaveFeature(...)`, `adapter.setFeatureType(...)`, plot-effect apply APIs.
- **No legacy strategy naming**
  - There are no strategy modules named `owned` or `vanilla` under ecology ops. Any strategies are semantic and algorithmic (not ownership-oriented).
- **Feature baseline orchestration**
  - The ecology `features` step never calls `adapter.addFeatures(...)` and always applies mod-owned plans.
  - There is no op-level “engine baseline” strategy, and no op returns `useEngineBaseline`.
- **Diagnostics alignment**
  - Any snow/plot-effects diagnostics are step-owned (or refactored into pure summary functions + step-level logging), and never depend on adapter within the domain layer.

## Testing / Verification
- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm deploy:mods`

## Dependencies / Notes
- Blocked by: `LOCAL-TBD-M6-U10` (compile-time config resolution and deletion of legacy config translation; required for “no runtime meaning-level defaults” discipline).
- Spec + ADRs:
  - `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md`
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Implementation Decisions (locked)

### D1) Enforce “no runtime views” in op contracts
- **Context:** Ecology ops currently accept `adapter` and callback RNG in `op.input`, violating ADR-ER1-030.
- **Options:** Keep views in ops; move all runtime IO into steps.
- **Choice:** Move all runtime IO into steps; ops take buffers/POJOs only.
- **Rationale:** Makes ops unit-testable contracts and keeps domain libraries engine-agnostic.
- **Risk:** Requires explicit step input builders (more plumbing), but removes architectural drift.

### D2) Placement-producing ops are `kind: "plan"` and verb-forward
- **Context:** Current placement-like ops are `kind: "compute"` and noun-named.
- **Options:** Keep `compute`; use `select`; use `plan`.
- **Choice:** Use `kind: "plan"` for any op returning applyable placements; use `plan*` naming.
- **Rationale:** Aligns taxonomy with reality (ADR-ER1-034); improves reviewability and tooling.
- **Risk:** Requires renames across steps/configs; stable step IDs remain unchanged.

### D3) Engine baseline behavior is step orchestration (not a domain op strategy)
- **Context:** `featuresPlacement` currently mixes “call engine baseline” into the op surface.
- **Options:** Keep baseline as a strategy; move baseline to step.
- **Choice:** Step owns baseline orchestration; domain ops never model “do engine thing”.
- **Rationale:** Keeps the op surface purely about domain planning; steps own runtime IO.
- **Risk:** Step config surface must explicitly represent baseline choice (no silent fallback).

### D4) Plan outputs use semantic keys; steps resolve keys → engine indices
- **Context:** Ops currently return numeric IDs and resolve IDs using adapters.
- **Options:** Use numeric IDs end-to-end; use semantic keys and resolve at step boundary.
- **Choice:** Plans are key-based; apply steps resolve keys to engine indices at runtime.
- **Rationale:** Keeps domain ops portable and avoids engine coupling in contracts.
- **Risk:** Missing key resolution must fail fast with clear errors (no silent -1 fallbacks).

### D5) Deterministic randomness via `seed` + pure PRNG (no callback RNG)
- **Context:** Callback RNG is a runtime view and violates ADR-ER1-030.
- **Options:** Keep callback; pass seed and compute randomness purely.
- **Choice:** Pass `seed` (number) in op input and use a pure deterministic PRNG in the op.
- **Rationale:** Preserves determinism while keeping contracts pure.
- **Risk:** Distribution changes are possible; treat as expected/acceptable under architectural cutover.

### D6) Diagnostics/logging are step-owned
- **Context:** Domain-side diagnostics currently log and depend on adapter.
- **Options:** Keep logging in domain; move to step; split into pure summary + step log.
- **Choice:** Step owns diagnostics and tracing; domain exports pure summary helpers only when required.
- **Rationale:** Observability is a runtime concern; domains stay pure.
- **Risk:** Requires moving/refactoring existing snow summary utilities.

### D7) Split feature embellishments into two semantic `plan` ops (and rename)
- **Context:** A monolithic “embellishments” op is a grab-bag contract and hides semantics.
- **Options:** Keep monolith; split into many; split into a small semantic set.
- **Choice:** Split into exactly two plan ops:
  - `planReefEmbellishments` (paradise + shelf reefs),
  - `planVegetationEmbellishments` (volcanic + density vegetation tweaks).
- **Rationale:** Keeps contracts reviewable and single-purpose without over-fragmenting.
- **Risk:** Additional wiring work in the `features` step and config schema migration.

## Canonical target shape (what “done” looks like)

### A) File layout (ecology domain)

```txt
mods/mod-swooper-maps/src/domain/ecology/
  index.ts
  artifacts.ts
  ops/
    classify-biomes/
      index.ts
      schema.ts
  rules/*
    plan-feature-placements/
      index.ts
      schema.ts
      rules/*
    plan-plot-effects/
      index.ts
      schema.ts
      rules/*
    plan-reef-embellishments/
      index.ts
      schema.ts
      rules/*
    plan-vegetation-embellishments/
      index.ts
      schema.ts
      rules/*
  rules/*                 # shared pure helpers
```

### B) Canonical op naming + kinds
- `ecology.ops.classifyBiomes` (`kind: "compute"`, unchanged).
- `ecology.ops.planFeaturePlacements` (`kind: "plan"`).
- `ecology.ops.planPlotEffects` (`kind: "plan"`).
- `ecology.ops.planReefEmbellishments` (`kind: "plan"`).
- `ecology.ops.planVegetationEmbellishments` (`kind: "plan"`).

### C) Canonical plan output shapes (key-based)
- Feature plan placement:
  - `{ x: number; y: number; feature: FeatureKey }`
  - `FeatureKey` is a string union of `FEATURE_*` names (ex: `FEATURE_FOREST`).
- Plot-effect plan placement:
  - `{ x: number; y: number; plotEffect: PlotEffectKey }`
  - `PlotEffectKey` is a string union of `PLOTEFFECT_*` names (ex: `PLOTEFFECT_SNOW_LIGHT_PERMANENT`).

### D) Canonical step responsibilities
- Step `inputs.ts`:
  - reads runtime via adapter/artifacts/fields,
  - validates buffer sizes and invariants,
  - computes any derived masks/fields needed by the op,
  - provides `seed` for op PRNG (fixed label per op; no callback RNG).
- Step `apply.ts`:
  - resolves keys → engine indices,
  - gates with `adapter.canHaveFeature` (and equivalent plot-effect gates),
  - applies placements and reifies any fields as required.
- Step `index.ts`:
  - orchestrates (build inputs → call ops via `runValidated` → apply),
  - does all tracing.

## Implementation Plan (no ambiguity)

### 1) Rename + restructure ecology ops to match the operation-module spec
- Replace existing ecology ops:
  - `ops/features-placement` → `ops/plan-feature-placements`
  - `ops/plot-effects` → `ops/plan-plot-effects`
  - `ops/features-embellishments` → split into `ops/plan-reef-embellishments` + `ops/plan-vegetation-embellishments`
- Update `mods/mod-swooper-maps/src/domain/ecology/ops/index.ts` and `mods/mod-swooper-maps/src/domain/ecology/index.ts` to re-export the new op names only.

### 2) Remove runtime views from all ecology op inputs
- Delete all op-schema fields for:
  - `adapter`
  - callback RNG (`rand`)
- Replace with buffer/POJO inputs only:
  - typed-array fields use `TypedArraySchemas.*` with grid shape metadata and validators.
  - include `seed: number` for deterministic randomness.

### 3) Convert placement ops to `kind: "plan"` and key-based outputs
- Convert all placement-producing ops to `kind: "plan"` and return key-based placements.
- Remove any `useEngineBaseline`/baseline signal from op output.

### 4) Delete the engine baseline path from ecology features
- The `features` step never calls `adapter.addFeatures(...)` and has no baseline switch in config.

### 5) Move/replace domain diagnostics with step-owned tracing
- Move snow/plot-effects diagnostics out of domain ops.
- Any diagnostic summary computation lives in the step layer and is logged via trace (no domain-side helper exports).

### 6) Typed-array schemas and validation are canonical (no `Type.Any`)
- All typed arrays in op inputs/outputs use `TypedArraySchemas.*`.
- Steps validate grid-shape invariants before calling ops.
- Steps call ops using `op.runValidated(...)` (not `op.run(...)`).

### 7) Verification + cleanup (required)
- Run the full verification pipeline:
  - `pnpm check`
  - `pnpm build`
  - `pnpm test`
  - `pnpm deploy:mods`
- Remove any dead exports/files from renames; ensure no “compat layer” remains (no legacy op names re-exported).
