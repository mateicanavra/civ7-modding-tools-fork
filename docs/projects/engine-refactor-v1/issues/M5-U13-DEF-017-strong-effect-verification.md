---
id: M5-U13
title: "[M5] DEF-017: stronger `effect:*` verification via adapter read-back APIs + tests"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Validation]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Upgrade effect verification from “call evidence + cheap invariants” to “verified against engine state” where it matters, by adding explicit adapter read-back APIs and tests.

## Goal

Make the effect contract story credible for the highest-risk effects. The end-state should not rely on “trust me, the step ran” semantics for effects that gate downstream behavior.

## Deliverables

- Design a minimal adapter read-back API set for strong verification (landmass/coastlines/rivers/placement).
- Implement the API in both Civ adapter and `MockAdapter`.
- Update effect verifiers to use read-back surfaces where appropriate.
- Add tests that validate both verifier behavior and read-back semantics.

## Acceptance Criteria

- Highest-risk engine effects are verified using adapter read-back surfaces (not only call evidence).
- Civ adapter and `MockAdapter` implement the needed read-back API surface.
- Tests exercise both verifier behavior and read-back semantics.

## Testing / Verification

- Unit tests cover verifier logic in engine-free runs (MockAdapter).
- Smoke tests (where needed) validate Civ adapter read-back semantics.

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-017); “defer stronger verification” choice recorded during M4 effects work (CIV-68/70 notes).
- **Sequencing:** benefits from explicit engine boundary work (M5-U08) and the end-state ownership boundary (M5-U02–U06).
- **Complexity × parallelism:** medium–high complexity, mixed parallelism (API design is serialized; implementation/test work is parallelizable).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Keep the API surface minimal; prefer a few robust reads over a wide “engine mirror.”

## Prework Findings (Complete)

Goal: define the minimal adapter read-back surface needed to make key `effect:*` tags verifiable (beyond “call evidence”), and map which effects should use read-back vs cheap invariants.

### 1) Current state (what is/ isn’t verified today)

Effect ids live in:
- `packages/mapgen-core/src/pipeline/tags.ts` (`M4_EFFECT_TAGS.engine.*`)

Verification behavior today:
- `packages/mapgen-core/src/pipeline/tags.ts` only treats these as “verified” (via `context.adapter.verifyEffect(id)` or custom satisfies):
  - `ENGINE_EFFECT_TAGS.biomesApplied`
  - `ENGINE_EFFECT_TAGS.featuresApplied`
  - `ENGINE_EFFECT_TAGS.placementApplied` (custom `isPlacementOutputSatisfied(...)` using `artifact:placementOutputs@v1`)
- These are currently *not* strongly verified:
  - `effect:engine.landmassApplied`
  - `effect:engine.coastlinesApplied`
  - `effect:engine.riversModeled`

Also note:
- `EngineAdapter.verifyEffect(effectId)` in both Civ and Mock adapters currently checks only an internal “evidence set” (call evidence), not engine state read-back.

### 2) Proposed minimal read-back APIs (adapter surface)

Design constraints:
- Keep the surface tiny (a few robust reads), and make it implementable in both `Civ7Adapter` and `MockAdapter`.
- Prefer reads that already exist on Civ7 globals (per `packages/civ7-types/index.d.ts`) and can be simulated in MockAdapter.

Recommended minimal additions to `EngineAdapter`:
- `isRiver(x: number, y: number): boolean`
  - Civ: `GameplayMap.isRiver(x, y)`
  - Mock: backed by a `riverMask` or derived from `riverType`/modeled data
- `getContinentType(x: number, y: number): number`
  - Civ: `GameplayMap.getContinentType(x, y)`
  - Mock: backed by a `continentType` buffer (can start as zeros; populated when `stampContinents()` is called)

### 3) Verifier mapping (read-back vs cheap invariants)

#### A) `effect:engine.riversModeled` (read-back recommended)

Why: rivers materially affect downstream climate + playability.

Verifier sketch:
- Read-back: scan for at least N river tiles (`adapter.isRiver(x,y)`).
- In MockAdapter tests, guarantee determinism by controlling modeled rivers (or by seeding a test river mask).

#### B) `effect:engine.coastlinesApplied` (read-back recommended)

Why: coast expansion changes terrain classification and affects multiple later steps.

Verifier sketch (read-back using existing adapter reads; no new API required):
- Scan `adapter.getTerrainType(x,y)` for presence of the coast terrain id (`COAST_TERRAIN`), or
- Scan `adapter.isCoastalLand(x,y)` if/when that becomes an explicit adapter read-back API.

#### C) `effect:engine.landmassApplied` (mixed: read-back + cheap invariants)

Hard constraint:
- Civ7 surface does not expose a direct “landmass region id” getter in current typings (only setter exists on `TerrainBuilder`), so full read-back of region IDs may not be feasible without additional engine APIs.

Verifier sketch:
- Read-back (available): ensure engine recognizes >0 land and >0 water via `adapter.isWater` / terrain counts, and that `getContinentType` has non-trivial variety after `stampContinents()` (best-effort).
- Cheap invariant (TS-owned): validate `landmassPlates` produced windows/continents and published expected artifacts (if/when those become explicit artifacts), rather than relying purely on “we called a function”.

#### D) `ENGINE_EFFECT_TAGS.placementApplied` (cheap invariants preferred)

Current satisfier:
- `packages/mapgen-core/src/pipeline/tags.ts#isPlacementOutputSatisfied` checks `artifact:placementOutputs@v1` consistency and expected players.

Recommendation:
- Keep this as the primary verifier (it’s already explicit + testable).
- Add read-back only if an engine API exists to query placed starts (not currently present in adapter surface).

### 4) Tests to add (to make the plan implementable)

Suggested test targets:
- Tag verifier unit tests:
  - `packages/mapgen-core/test/pipeline/tag-registry.test.ts` (or a new effect-verification-focused test file)
- Adapter read-back tests:
  - `packages/civ7-adapter/src/mock-adapter.ts` behaviors can be tested directly (river mask, continent type buffer, etc.)
  - Civ adapter read-back should be covered by smoke tests where possible (best-effort; requires Civ runtime).
