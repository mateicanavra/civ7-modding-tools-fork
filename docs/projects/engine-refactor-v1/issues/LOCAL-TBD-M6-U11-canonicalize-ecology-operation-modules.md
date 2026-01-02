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

## Target outcome (canonical)
- **Pure domain ops:** every module under `mods/mod-swooper-maps/src/domain/ecology/ops/**` is callable with only buffers/POJOs + schema-backed config; no adapter/callback/runtime views exist in op contracts.
- **Strict kind semantics:** any op whose output can be applied to the engine is `kind: "plan"` and verb-forward (`plan*`); `kind: "compute"` remains reserved for derived-field products (biome classification).
- **Engine-agnostic plans:** plan ops return semantic keys (ex: `FEATURE_FOREST`, `PLOTEFFECT_SNOW_LIGHT_PERMANENT`) rather than engine indices; steps resolve keys → engine IDs at apply time.
- **No baseline/legacy behavior:** ecology “features” does not call `adapter.addFeatures(...)` and does not have a baseline switch/strategy/config field; the step always applies mod-owned plans.
- **Tracing boundary only:** all observability is step-owned tracing; the domain has zero logging/diagnostic helpers and no trace types in signatures.

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
  - `rg -n "Type\\.Any\\(" mods/mod-swooper-maps/src/domain/ecology/ops` returns no matches.
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
  - Guardrails:
    - `rg -n "\\baddFeatures\\(" mods/mod-swooper-maps/src/recipes/standard/stages/ecology` is empty.
    - `rg -n "\\buseEngineBaseline\\b" mods/mod-swooper-maps/src/domain/ecology mods/mod-swooper-maps/src/recipes/standard/stages/ecology` is empty.
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
- [Target outcome (canonical)](#target-outcome-canonical)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
- [Implementation Plan](#implementation-plan-no-ambiguity)
- [Pre-work](#pre-work)

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

### D3) Delete engine baseline behavior entirely
- **Context:** `featuresPlacement` currently mixes “call engine baseline” into the op surface.
- **Options:** Keep baseline as a strategy/switch; delete baseline entirely.
- **Choice:** Delete baseline entirely: ecology features always applies mod-owned plans and never calls `adapter.addFeatures(...)`.
- **Rationale:** Eliminates a mixed “plan vs engine” contract and removes silent compatibility drift.
- **Risk:** Maps may differ vs engine defaults; treat as intended under architectural cutover.

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
- **Choice:** Step owns diagnostics and tracing; domain exports no diagnostic helpers (any summaries live in step scope).
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
  - validates buffer sizes and invariants (fail fast; no silent coercions),
  - computes any derived masks/fields needed by the op,
  - provides `seed` for op PRNG (fixed label per op; no callback RNG).
- Step `apply.ts`:
  - resolves keys → engine indices (throw on unknown key; no `-1` fallbacks),
  - gates with `adapter.canHaveFeature` (and equivalent plot-effect gates),
  - applies placements and reifies any fields as required.
- Step `index.ts`:
  - orchestrates (build inputs → call ops via `runValidated` → apply),
  - does all tracing.

## Implementation Plan (no ambiguity)

### A) Rename + restructure ecology ops to match the operation-module spec
**In scope**
- Replace existing ops (no compat re-exports):
  - `mods/mod-swooper-maps/src/domain/ecology/ops/features-placement/**` → `mods/mod-swooper-maps/src/domain/ecology/ops/plan-feature-placements/**`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/plot-effects/**` → `mods/mod-swooper-maps/src/domain/ecology/ops/plan-plot-effects/**`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/features-embellishments/**` → split into:
    - `mods/mod-swooper-maps/src/domain/ecology/ops/plan-reef-embellishments/**`
    - `mods/mod-swooper-maps/src/domain/ecology/ops/plan-vegetation-embellishments/**`
- Delete the legacy re-export module `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes.ts` and migrate importers to `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes/index.ts` (no alias modules).
- Update exports:
  - `mods/mod-swooper-maps/src/domain/ecology/ops/index.ts`
  - `mods/mod-swooper-maps/src/domain/ecology/index.ts`
- Update all in-repo importers to the new op names/paths (no compat re-exports), including:
  - `mods/mod-swooper-maps/src/config/schema/ecology.ts`
  - `mods/mod-swooper-maps/src/config/schema.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/apply.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/index.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/inputs.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/apply.ts`
  - `mods/mod-swooper-maps/src/maps/*.ts` presets that author ecology config blocks
  - `mods/mod-swooper-maps/test/ecology/*.test.ts` fixtures and assertions that import op modules directly

**Out of scope**
- Renaming stable step IDs in the recipe graph (step IDs must remain unchanged).

**Acceptance Criteria**
- `mods/mod-swooper-maps/src/domain/ecology/ops/index.ts` exports only:
  - `classifyBiomes` (`compute`),
  - `planFeaturePlacements` (`plan`),
  - `planPlotEffects` (`plan`),
  - `planReefEmbellishments` (`plan`),
  - `planVegetationEmbellishments` (`plan`).
- Guardrails pass:
  - `rg -n "featuresPlacement|plotEffects|featuresEmbellishments" mods/mod-swooper-maps/src/domain/ecology/ops` is empty.
  - `rg -n "\\becology\\.ops\\.(featuresPlacement|featuresEmbellishments|plotEffects)\\b" mods/mod-swooper-maps/src` is empty.
  - `rg -n "@mapgen/domain/ecology/ops/(features-placement|plot-effects|features-embellishments)" mods/mod-swooper-maps` is empty.

### B) Remove runtime views from all ecology op inputs (and enforce op-entry validation)
**In scope**
- Delete op-schema fields for runtime views:
  - `adapter`
  - callback RNG (`rand`, `ctxRandom`, etc.)
- Add pure input fields only:
  - `seed: number`
  - typed arrays expressed via `TypedArraySchemas.*`
- Steps call ops using `op.runValidated(...)` (not `op.run(...)`).

**Out of scope**
- Introducing new runtime “view” abstractions that reintroduce adapters/callbacks under a different name.

**Acceptance Criteria**
- Guardrails pass:
  - `rg -n "adapter\\b|ctxRandom\\b|rand\\b|TraceScope\\b|devLogJson\\b" mods/mod-swooper-maps/src/domain/ecology/ops` is empty.
  - `rg -n "Type\\.Any\\(" mods/mod-swooper-maps/src/domain/ecology/ops` is empty.
- `rg -n "\\.runValidated\\(" mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps` has matches for `features` and `plot-effects` steps.
- `rg -n "\\bctxRandom\\b" mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps` is empty.

### C) Convert placement-producing ops to `kind: "plan"` and key-based outputs
**In scope**
- Convert placement ops to `kind: "plan"` and return key-based placements:
  - features: `FeatureKey` (`FEATURE_*`)
  - plot effects: `PlotEffectKey` (`PLOTEFFECT_*`)
- Apply steps resolve keys → engine indices and apply placements at runtime:
  - features: `adapter.getFeatureTypeIndex(...)`, `adapter.setFeatureType(...)`, `adapter.canHaveFeature(...)`
  - plot effects: `adapter.getPlotEffectTypeIndex(...)` + plot-effect apply API

**Out of scope**
- Allowing “missing key” fallbacks (no `-1` / `undefined` / “skip silently” behavior).

**Acceptance Criteria**
- `rg -n "getFeatureTypeIndex|getPlotEffectTypeIndex" mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps` is non-empty.
- `rg -n "getFeatureTypeIndex|getPlotEffectTypeIndex" mods/mod-swooper-maps/src/domain/ecology/ops` is empty.

### D) Split “embellishments” into two semantic plan ops (reef vs vegetation)
**In scope**
- Implement exactly two plan ops:
  - `planReefEmbellishments` (paradise reefs + shelf reefs)
  - `planVegetationEmbellishments` (volcanic halos + density vegetation tweaks)
- Update the `features` step to orchestrate:
  - base feature placements plan → apply
  - reef embellishments plan → apply
  - vegetation embellishments plan → apply

**Out of scope**
- Further fragmentation into more than two embellishment ops.

**Acceptance Criteria**
- No remaining `featuresEmbellishments` op export exists; two new plan ops exist and are used by the `features` step.

### E) Delete engine-baseline paths from ecology features (no switches)
**In scope**
- Remove baseline strategy/switches completely:
  - no op strategy named “vanilla”/“owned”,
  - no “engine baseline” flag/field returned by ops,
  - no step config fields that represent baseline choice.
- Ensure the `features` step never calls `adapter.addFeatures(...)`.

**Acceptance Criteria**
- Guardrails pass:
  - `rg -n "\\baddFeatures\\(" mods/mod-swooper-maps/src/recipes/standard/stages/ecology` is empty.
  - `rg -n "\\buseEngineBaseline\\b" mods/mod-swooper-maps/src/domain/ecology mods/mod-swooper-maps/src/recipes/standard/stages/ecology` is empty.

### F) Move diagnostics/logging to steps and use tracing only
**In scope**
- Delete domain diagnostics modules under ecology ops (ex: `mods/mod-swooper-maps/src/domain/ecology/ops/plot-effects/diagnostics.ts`) and replace with step-owned tracing.
- Ensure the only logging emitted is from step scopes via tracing.

**Out of scope**
- Introducing a new domain-level diagnostics API.

**Acceptance Criteria**
- `rg -n "devLogJson\\b|console\\." mods/mod-swooper-maps/src/domain/ecology/ops` is empty.

### G) Verification + cleanup (required)
**In scope**
- Run the full verification pipeline:
  - `pnpm check`
  - `pnpm build`
  - `pnpm test`
  - `pnpm deploy:mods`
- After green:
  - remove dead files/exports from renames,
  - remove legacy compat re-exports (no shim layer),
  - ensure all guardrail `rg` checks in this doc are still zero-hit.

## Pre-work

### Pre-work for A (module layout + exports)
- “Inventory current ecology op exports and importers (domain `index.ts`, step call-sites). Enumerate every symbol/name that must be renamed and ensure the final export surface matches the `plan*` and `classifyBiomes` shape exactly.”
- “Confirm whether `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes.ts` is required for anything other than re-export; if it’s redundant, delete it as part of the module cleanup.”

### Pre-work for B (purity + validation)
- “Inventory runtime views in ecology ops (`adapter`, `rand`, `ctxRandom`). For each, write down the step-level replacement: inputs builder reads runtime, apply stage writes runtime.”
- “Locate and list any `Type.Any` fields in ecology op schemas; plan the exact `TypedArraySchemas.*` replacements and any required shape validation in step `inputs.ts`.”

### Pre-work for C (key-based plans)
- “List the full set of feature/plot-effect numeric IDs currently returned by ecology ops. Define the corresponding semantic key surface (`FEATURE_*`, `PLOTEFFECT_*`) and identify where key→engine-ID resolution will live in the apply steps.”
- “Decide the ‘unknown key’ failure behavior (must be throw/fail fast) and specify the error message shape so it’s debuggable (key + step id).”

### Pre-work for D (embellishments split)
- “Audit the current `features-embellishments` implementation and classify each behavior into reef vs vegetation. Confirm the split is exhaustive and there are no leftovers.”

### Pre-work for E (baseline deletion)
- “Locate all baseline references (`addFeatures`, `useEngineBaseline`, `owned/vanilla` strategies, config flags). Confirm a complete deletion plan with no compatibility switches.”

### Pre-work for F (diagnostics relocation)
- “Inventory ecology diagnostic modules and identify what they compute vs what they log. For any computed summaries, either keep them step-local or inline them; do not export domain diagnostics.”

### Pre-work for G (verification)
- “Before final cleanup, run all guardrail `rg` checks in this doc and ensure they’re correctly scoped (avoid false positives outside ecology).”

## Findings (pre-work results)

### A1) Inventory current ecology op exports + importers
**Current public op exports (must be replaced; no shims)**
- `@mapgen/domain/ecology` exports:
  - `ops.classifyBiomes`
  - `ops.featuresPlacement`
  - `ops.featuresEmbellishments`
  - `ops.plotEffects`
- `@mapgen/domain/ecology` additionally exports runtime-only helpers that are incompatible with the target boundary:
  - `logSnowEligibilitySummary` (plot-effects diagnostics)
  - `resolvePlotEffectsConfig` (runtime config normalization)

**Importers that must be updated to the new canonical op names**
- Domain export aggregators:
  - `mods/mod-swooper-maps/src/domain/ecology/index.ts`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/index.ts`
- Step call-sites (and their helper type aliases):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/apply.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/index.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/inputs.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/apply.ts`
- Schema importers:
  - `mods/mod-swooper-maps/src/config/schema/ecology.ts`
  - `mods/mod-swooper-maps/src/config/schema.ts`
- Map presets (authoring):
  - `mods/mod-swooper-maps/src/maps/shattered-ring.ts` (`featuresPlacement`, `plotEffects`)
  - `mods/mod-swooper-maps/src/maps/sundered-archipelago.ts` (`featuresPlacement`, `plotEffects`)
  - `mods/mod-swooper-maps/src/maps/swooper-desert-mountains.ts` (`featuresPlacement`, `plotEffects`)
  - `mods/mod-swooper-maps/src/maps/swooper-earthlike.ts` (`featuresPlacement`, `plotEffects`)
- Tests that import ecology op modules directly (must be migrated to the new op modules):
  - `mods/mod-swooper-maps/test/ecology/features-owned-does-not-call-vanilla.test.ts`
  - `mods/mod-swooper-maps/test/ecology/features-owned-enforces-canHaveFeature.test.ts`
  - `mods/mod-swooper-maps/test/ecology/features-owned-land-water-separation.test.ts`
  - `mods/mod-swooper-maps/test/ecology/features-owned-navigable-river-exclusion.test.ts`
  - `mods/mod-swooper-maps/test/ecology/features-owned-never-overwrites.test.ts`
  - `mods/mod-swooper-maps/test/ecology/features-owned-reef-latitude-split.test.ts`
  - `mods/mod-swooper-maps/test/ecology/features-owned-unknown-chance-key.test.ts` (imports `resolveFeaturesPlacementOwnedConfig` / `FeaturesPlacementOwnedConfig`)
  - `mods/mod-swooper-maps/test/ecology/plot-effects-owned-snow.test.ts` (imports `plotEffects`)

**Canonical rename mapping**
- `featuresPlacement` → `planFeaturePlacements`
- `plotEffects` → `planPlotEffects`
- `featuresEmbellishments` → split into:
  - `planReefEmbellishments`
  - `planVegetationEmbellishments`

**U10 landing assumption (affects what exists to migrate)**
- `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` is deleted by U10; any current references found there are not part of this issue’s migration surface.

### A2) `ops/classify-biomes.ts` is a pure re-export shim and will be deleted
**Observed**
- `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes.ts` is a 1-line `export * from "./classify-biomes/index.js"`.
- Current importers of `@mapgen/domain/ecology/ops/classify-biomes.js` (must be migrated):
  - `mods/mod-swooper-maps/src/domain/ecology/index.ts`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/index.ts`
  - `mods/mod-swooper-maps/src/config/schema/ecology.ts`
  - `mods/mod-swooper-maps/test/ecology/classify-biomes.test.ts`
  - `mods/mod-swooper-maps/test/layers/callsite-fixes.test.ts`

**Decision (no ambiguity)**
- Delete `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes.ts` and update all importers to the directory module entrypoint:
  - `@mapgen/domain/ecology/ops/classify-biomes/index.js`

### B1) Inventory runtime views in ecology ops (and the step-owned replacements)
**Runtime views currently passed into op inputs (must be deleted)**
- `adapter` (engine runtime view) is present in op input schemas for:
  - `mods/mod-swooper-maps/src/domain/ecology/ops/features-placement/index.ts`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/plot-effects/index.ts`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/features-embellishments/index.ts`
- `rand` callback (ctxRandom wrapper) is present in op inputs for:
  - `mods/mod-swooper-maps/src/domain/ecology/ops/features-placement/index.ts`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/plot-effects/index.ts`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/features-embellishments/index.ts`

**Step-level sources of those runtime views (must be migrated)**
- `ctxRandom` is currently used to build `rand` in:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/inputs.ts`

**Replacement plan (strict boundary)**
- `adapter` replacement:
  - Step `inputs.ts` reads runtime/engine-derived state and supplies only buffers/POJOs to ops (no adapter).
  - Step `apply.ts` owns all adapter queries and mutations:
    - resolve keys → engine IDs,
    - gate with `adapter.canHaveFeature(...)` / plot-effect gate equivalents,
    - apply placements (`adapter.setFeatureType(...)`, plot-effect apply APIs).
- `rand` / `ctxRandom` replacement:
  - Steps pass `seed: number` into op input (derived deterministically from run settings + step/op id).
  - Ops construct a pure deterministic PRNG internally and never accept callback RNGs.
