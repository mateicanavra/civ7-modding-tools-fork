---
id: CIV-69
title: "[M4] Effects verification: biomes + features reify fields and verify effects"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Validation]
parent: CIV-63
children: []
blocked_by: [CIV-68]
blocked: [CIV-70]
related_to: [CIV-47]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Reify engine-derived biome/feature outputs into explicit fields and provide verified `effect:*` tags for biomes/features steps.

## Deliverables

- `field:biomeId` and `field:featureType` are produced by the biomes/features steps.
- Biomes/features steps provide `effect:engine.biomesApplied` and `effect:engine.featuresApplied` with adapter-backed postcondition checks.
- Downstream steps consume the reified fields instead of “read engine later” dependencies.

## Acceptance Criteria

- Biomes/features steps no longer require/provide `state:engine.*` and instead provide verified `effect:*` tags plus reified `field:*` outputs.
- Any downstream step that depends on engine-derived biome/feature data reads from `ctx.fields.*` rather than adapter reads.
- Failures in adapter-backed postconditions are loud (no silent skips).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- One smoke test covers a biomes/features pass with effect verification enabled and asserts `field:biomeId`/`field:featureType` are provided and the effect verifiers pass.

## Dependencies / Notes

- **Parent:** [CIV-63](CIV-63-M4-EFFECTS-VERIFICATION.md)
- **Blocked by:** CIV-68
- **Blocks:** CIV-70

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep behavior stable; focus on reification + verification only.
- Prefer reify-after-mutate patterns:
  - mutate via adapter
  - reify results immediately into fields
  - provide the effect tag once the postcondition passes

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: map biomes/features reification so downstream migrations are mechanical and effect verification is minimal.

Deliverables:
- A reification plan: biomes publishes `field:biomeId`; features publishes `field:featureType` (do not introduce new field names for M4).
- A consumer map: downstream steps that currently depend on engine reads and must switch to the reified fields/artifacts.
- A minimal postcondition checklist for verifying `effect:engine.biomesApplied` and `effect:engine.featuresApplied`.

Where to look:
- Code: `packages/mapgen-core/src/pipeline/ecology/**`, `packages/mapgen-core/src/domain/ecology/**`,
  `packages/mapgen-core/src/pipeline/standard.ts`.
- Search for engine reads or `state:engine.*` usage tied to biomes/features.
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (fields/effects),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.5).

Constraints/notes:
- Use reify-after-mutate; keep behavior stable.
- Prefer minimal, adapter-friendly postconditions (avoid full-map scans).
- Do not implement code; return the plan and maps as markdown tables/lists.

## Pre-work

Goal: define the reify-after-mutate pattern for biomes/features and enumerate the downstream consumers that must switch from engine reads to field reads.

### Current state (what's true today)

- `ExtendedMapContext` preallocates buffers for:
  - `ctx.fields.biomeId: Uint8Array`
  - `ctx.fields.featureType: Int16Array`
  - (`packages/mapgen-core/src/core/types.ts`)
- Biomes and features are **engine-first** today:
  - Biomes: `designateEnhancedBiomes()` calls `adapter.designateBiomes(...)` and nudges via `setBiomeType(...)` (`packages/mapgen-core/src/domain/ecology/biomes/index.ts`).
  - Features: `addDiverseFeatures()` calls `adapter.addFeatures(...)` and tweaks via `setFeatureType(...)` (`packages/mapgen-core/src/domain/ecology/features/index.ts`).
- **Cross-step engine read exists today**:
  - Features reads engine biome state via `adapter.getBiomeType(x, y)` to decide vegetation/density tweaks (`packages/mapgen-core/src/domain/ecology/features/index.ts`).
  - This is the "implicit engine dependency" that reification is meant to eliminate.

### Important caveat: current field tags are "always satisfied"

In M3, `isDependencyTagSatisfied()` treats `field:*` as satisfied if the buffer exists (which is true from context creation), so `field:biomeId`/`field:featureType` cannot currently act as meaningful scheduling/validation edges.

For M4, the executor/registry should treat field tags like published products:
- (Locked by SPEC: dependency satisfaction semantics are `provides`-driven, not allocation-driven.)
- A step "provides" `field:*`, and the executor marks it satisfied after the step runs (similar to `state:engine.*` today).
- **M4 decision:** do not add value/meaning-based verification of `field:*` contents here (we don't have a stable notion of “unset”/“valid range” yet). Verification is structural only: the step must explicitly `provide` the field tags and execute the reify-after-mutate loop to completion.
  - If you believe you must add semantic/value checks anyway, stop and add a `triage` entry to `docs/projects/engine-refactor-v1/triage.md` documenting the exact checks + expected failure modes, then ask for confirmation before proceeding.

### 1) Reification plan: biomes → `field:biomeId`

Current behavior:
- `BiomesStep` calls `adapter.designateBiomes(...)` to mutate engine state.
- `field:biomeId` is preallocated in `ExtendedMapContext.fields` but **not populated** after biomes runs.
- Downstream steps (notably `features`) read biome data via `adapter.getBiomeType(x, y)`.

Target reify-after-mutate pattern:
1. `BiomesStep` mutates engine via `adapter.designateBiomes(...)`.
2. Immediately after, reify the result into `ctx.fields.biomeId`:
   - iterate plots and call `ctx.fields.biomeId[idx] = adapter.getBiomeType(x, y)`.
3. Provide `effect:engine.biomesApplied` (verified via minimal postcondition; see below).
4. Downstream steps (features, placement, etc.) consume `ctx.fields.biomeId` directly instead of calling `adapter.getBiomeType`.

### 2) Reification plan: features → `field:featureType`

Current behavior:
- `FeaturesStep` calls `adapter.addFeatures(...)` and related methods to mutate engine state.
- `field:featureType` is preallocated but not populated after features runs.
- Downstream steps (placement) read feature data via `adapter.getFeatureType(x, y)`.

Target reify-after-mutate pattern:
1. `FeaturesStep` mutates engine via adapter feature methods.
2. Immediately after, reify the result into `ctx.fields.featureType`:
   - iterate plots and call `ctx.fields.featureType[idx] = adapter.getFeatureType(x, y)`.
3. Provide `effect:engine.featuresApplied` (verified via minimal postcondition).
4. Downstream steps consume `ctx.fields.featureType` instead of adapter reads.

### 3) Consumer map: who reads biomes/features today?

#### Biomes consumers (engine reads)

| File | Usage | Migration |
| --- | --- | --- |
| `packages/mapgen-core/src/domain/ecology/features/index.ts` | Calls `adapter.getBiomeType(x, y)` to decide feature placement eligibility. | Switch to `ctx.fields.biomeId[idx]`. |

#### Features consumers (engine reads)

No cross-step engine reads of features were found in the pipeline; keep the consumer sweep focused on biomes→features (the known engine-read edge) unless new evidence appears.

### 4) Minimal postcondition checklist (M4 structural verification)

Goal: fail loudly on wiring mistakes without guessing domain semantics.

#### `effect:engine.biomesApplied` verification

- Verify that:
  - `field:biomeId` is explicitly `provided` by the biomes step, and
  - the biomes step executes the reify-after-mutate loop to completion (writes the full buffer length for the run).

#### `effect:engine.featuresApplied` verification

- Verify that:
  - `field:featureType` is explicitly `provided` by the features step, and
  - the features step executes the reify-after-mutate loop to completion (writes the full buffer length for the run).

### 5) Coordination notes

- **Effects Verification‑1:** provides the `effect:*` tag registration and adapter postcondition surface. This issue implements the reify-after-mutate pattern and wires the verification.
- **Effects Verification‑3:** removes `state:engine.*` once biomes/features/placement all provide verified effects.
- **Placement Inputs:** placement verification is artifact-based (ADR-ER1-020); biomes/features use sampled + field-based verification.
