id: LOCAL-TBD-M9-hydrology-s4-cryosphere-aridity-diagnostics
title: "M9 / Slice 4 — Cryosphere + aridity + diagnostics (additive artifacts)"
state: done
priority: 1
estimate: 16
project: engine-refactor-v1
milestone: null
assignees: [codex]
labels: [hydrology, domain-refactor, slice-4]
parent: LOCAL-TBD-hydrology-vertical-domain-refactor
children: []
blocked_by:
  - LOCAL-TBD-M9-hydrology-s3-op-spine-climate-ocean
blocked:
  - LOCAL-TBD-M9-hydrology-s5-hydrography-cutover
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Add the high-fidelity physics surfaces (cryosphere, PET/aridity, diagnostics) as deterministic, bounded, additive Hydrology artifacts without forcing immediate downstream migration.

## Deliverables
- Cryosphere buffers + ops (snow/ice state) and bounded albedo feedback (fixed iteration count; deterministic tie-breaking).
- PET/aridity computation (evapotranspiration proxy + aridity index) as Hydrology ops.
- Diagnostics fields (rain shadow / continentality / convergence proxies) published as additive artifacts.
- Typed artifact schemas (no `Type.Any()` for new additive artifacts).

## Acceptance Criteria
- [x] Cryosphere feedback uses explicit fixed iteration counts (no convergence loops) and is deterministic for the same knobs + seed.
- [x] New artifacts are additive: existing consumers (Ecology, Placement) remain unbroken if they ignore them.
- [x] New artifacts are typed and validated (TypeBox schemas match runtime typed arrays).
- [x] Diagnostics are documented as advisory (projections) and do not become internal truth for Hydrology (projections never define internal representation).
- [x] `bun run check` and `bun run --cwd mods/mod-swooper-maps test` pass.

## Testing / Verification
- `bun run check`
- `bun run --cwd mods/mod-swooper-maps test`
- Add/extend tests to assert bounded feedback determinism (e.g., checksum of ice index after N fixed iterations).

## Dependencies / Notes
- Phase 2 authority (cryosphere + PET/aridity semantics): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`
- Parent plan: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-hydrology-vertical-domain-refactor.md`

## Implementation Decisions
- Additive artifact ids are stage-owned in `hydrology-post`: `artifact:hydrology.climateIndices`, `artifact:hydrology.cryosphere`, `artifact:hydrology.climateDiagnostics`.
- Cryosphere “off” knob posture still publishes typed artifacts but forces a no-ice solution deterministically (fixed `iterations: 0` for albedo feedback + extreme thresholds for cryosphere state).
- Climate diagnostics are explicitly advisory projections and are not consumed as Hydrology internal truth.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

<!-- Path roots -->
swooper-src = mods/mod-swooper-maps/src

### Artifact posture (additive, typed)

Slice 4 publishes new Hydrology artifacts that downstream consumers can adopt when ready, without breaking existing expectations:
- keep `artifact:climateField` stable (rainfall/humidity baseline projection),
- add new typed artifacts (names/ids to be decided during implementation, but must be stable once introduced):
  - temperature field (or thermal index),
  - PET / aridity field,
  - cryosphere indices (snow cover, sea ice, albedo proxy),
  - diagnostics (rain shadow index, continentality index, convergence proxy).

### Files (expected touchpoints)

```yaml
files:
  - path: /mods/mod-swooper-maps/src/domain/hydrology/ops
    notes: Add compute ops for cryosphere, albedo feedback, PET/aridity, and diagnostics.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/artifacts.ts
    notes: Add typed artifact definitions for additive outputs (or create stage-appropriate artifacts module if better aligned).
  - path: /mods/mod-swooper-maps/test
    notes: Add determinism tests for bounded feedback (fixed iters) and basic validity checks for new artifacts.
```

### Determinism constraints (non-negotiable)

- Any feedback loop must be expressed as **N fixed iterations** with deterministic tie-breaking, not “iterate until convergence”.
- Randomness is forbidden in cryosphere/aridity ops unless seeded explicitly via numeric seed input; prefer no randomness.

### Prework Results (Resolved)

Phase 2 explicitly requires downstream-facing surfaces for:
- PET proxy + aridity index (P vs PET),
- freeze/cryosphere indices + sea ice + albedo proxy.

Evidence: `/docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md` (“Canonical contract surfaces”).

**Current downstream (Ecology) consumption posture**

Ecology steps require `artifact:climateField` and currently compute (and publish) their own derived indices:
- Requires `artifact:climateField` today:
  - `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/pedology/contract.ts`
  - `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/resource-basins/contract.ts`
  - `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts`
  - `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/contract.ts`
- Ecology publishes `artifact:ecology.biomeClassification` including:
  - `surfaceTemperature`, `aridityIndex`, `freezeIndex` (and others)
  - `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/artifacts.ts`
  - Runtime validation expects typed arrays for those fields:
    - `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/artifact-validation.ts`

This means the smallest “real downstream value” additive Hydrology artifact set is: publish physics-derived equivalents of the exact indices Ecology already wants, plus explicit cryosphere state where useful (snow/sea-ice), without forcing immediate migration.

**Proposed minimal additive artifact set (ids + schemas + downstream value)**

1) `artifact:hydrology.climateIndices` (PET/aridity + thermal + freeze)
- Purpose: unlock Ecology migration off of hand-authored temperature/aridity proxies when ready; provides a physics-derived “continuous field” surface consistent with Phase 2.
- Proposed schema (TypeBox; use `TypedArraySchemas` like other artifacts):
  - `width: number`, `height: number`
  - `surfaceTemperatureC`: `Float32Array` (°C, annual mean; optional seasonal fields are out of scope for the minimal slice)
  - `pet`: `Float32Array` (PET proxy in “rainfall units” consistent with Phase 2’s P vs PET framing)
  - `aridityIndex`: `Float32Array` (normalized 0..1; derived from PET + precipitation)
  - `freezeIndex`: `Float32Array` (normalized 0..1; freeze persistence / snowline suitability index)
- Downstream (Ecology) can later:
  - replace its current temperature/aridity computations with these fields,
  - keep discretization policies (biomes, plot-effects, feature gates) strictly Ecology-owned.

2) `artifact:hydrology.cryosphere` (snow/ice + sea ice + albedo proxy)
- Purpose: provide explicit cryosphere state for downstream visuals/constraints and for Ecology’s snow/ice feature logic when adopted.
- Proposed schema (TypeBox):
  - `width: number`, `height: number`
  - `snowCover`: `Uint8Array` (0..255 fractional snow cover / persistence proxy)
  - `seaIceCover`: `Uint8Array` (0..255 fractional sea ice cover)
  - `albedo`: `Uint8Array` (0..255; may be explicitly stored or derived deterministically from snow/ice to satisfy Phase 2 “explicit or derivable” rule)
- Downstream (Ecology/Placement) can later:
  - gate ice feature placement and snow plot effects using these fields,
  - avoid re-deriving “ice-ness” indirectly from latitude bands.

Optional (explicitly non-minimal; still consistent with the slice’s title):
- `artifact:hydrology.climateDiagnostics` (debug-only projections; not internal truth)
  - candidates: `rainShadowIndex`, `continentalityIndex`, `convergenceIndex` as `Float32Array` (0..1)
  - note: diagnostics must remain advisory and must not become a hidden dependency spine.

**Determinism test strategy (locks bounded feedback and stability)**

Follow the same “two-layer signature” approach as Slice 3:
1) Determinism: run the recipe twice with identical `env + config/knobs` and assert hashes match.
2) Golden: store and assert `sha256`-based signature constants (updated only on intended model changes).

Specific to bounded cryosphere/albedo feedback:
- Assert the implementation uses an explicit fixed iteration count (`N`) and hash the resulting `snowCover/seaIceCover/albedo` buffers after exactly `N` passes.
- Add a monotonic A/B gate consistent with Phase 2 knob semantics:
  - `temperature="cold"` yields larger mean `freezeIndex` and/or greater `snowCover` extent than `temperature="hot"` (same seed/morphology).
