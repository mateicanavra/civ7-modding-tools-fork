id: LOCAL-TBD-M9-hydrology-s3-op-spine-climate-ocean
title: "M9 / Slice 3 — Contract-first op spine (climate + ocean coupling)"
state: planned
priority: 1
estimate: 16
project: engine-refactor-v1
milestone: null
assignees: [codex]
labels: [hydrology, domain-refactor, slice-3]
parent: LOCAL-TBD-hydrology-vertical-domain-refactor
children: []
blocked_by:
  - LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary
blocked:
  - LOCAL-TBD-M9-hydrology-s4-cryosphere-aridity-diagnostics
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Implement the locked Phase 2 climate causality spine as contract-first ops and orchestrate them from Hydrology steps, while keeping the existing downstream projection `artifact:climateField` stable and deterministic.

## Deliverables
- Hydrology climate ops catalog (subset of Phase 2) implemented under `mods/mod-swooper-maps/src/domain/hydrology/ops/**` with contracts + deterministic strategies.
- Hydrology steps (`climateBaseline`, `climateRefine`) refactored to orchestration-only:
  - steps call ops through the domain router surface,
  - steps do not import op implementations or strategy modules directly,
  - ops do not call other ops.
- Stable projection preserved:
  - `artifact:climateField` remains present and structurally compatible for Ecology.
- Typed artifacts (incremental):
  - `artifact:climateField` and any new additive fields are typed and validated (no `Type.Any()` for new artifacts).

## Acceptance Criteria
- [ ] Hydrology steps import no op implementations (no deep imports into `@mapgen/domain/hydrology/ops/**` or strategy modules).
- [ ] Ops do not import from `recipes/**` or `maps/**`, and do not import adapters/contexts (pure input/output).
- [ ] `artifact:climateField` continues to publish rainfall/humidity arrays with correct size and deterministic values for the same seed + knobs.
- [ ] All ops have explicit iteration counts / fixed passes; no convergence loops.
- [ ] `pnpm check` and `pnpm -C mods/mod-swooper-maps test` pass.

## Testing / Verification
- `pnpm check`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm lint:domain-refactor-guardrails`
- `rg -n \"@mapgen/domain/hydrology/ops/\" mods/mod-swooper-maps/src/recipes/standard` (expect zero hits; steps must import from domain surface only)
- `rg -n \"recipes/standard|/recipes/\" mods/mod-swooper-maps/src/domain/hydrology` (expect zero hits; domain boundary)

## Dependencies / Notes
- Phase 2 authority (op catalog + causality spine): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`
- Recipe compiler invariants (no runtime defaulting; compile/normalize semantics): `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md`
- Parent plan: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-hydrology-vertical-domain-refactor.md`

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
mapgen-core = packages/mapgen-core

### Current-state evidence (what gets replaced)

Hydrology currently mixes “legacy climate module calls” with one existing op:
- `swooper-src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts`:
  - calls op `hydrology/compute-wind-fields` via `ops.computeWindFields(...)`
  - calls legacy `applyClimateBaseline(...)` from `swooper-src/domain/hydrology/climate/baseline.ts` (latitude bands + modifiers)
  - publishes `artifact:climateField` and `artifact:windField`
- `swooper-src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`:
  - calls legacy `refineClimateEarthlike(...)` from `swooper-src/domain/hydrology/climate/refine/index.ts`
  - currently depends on narrative overlays + story config (removed in Slice 1)

Slice 3’s target posture: legacy module functions become ops (pure input/output); steps become orchestration-only.

### Files (expected touchpoints)

```yaml
files:
  - path: /mods/mod-swooper-maps/src/domain/hydrology/ops
    notes: Add new climate/ocean ops modules (contracts + strategies) per Phase 2 catalog.
  - path: /mods/mod-swooper-maps/src/domain/hydrology/ops/contracts.ts
    notes: Register new op contracts so the domain surface exports them.
  - path: /mods/mod-swooper-maps/src/domain/hydrology/ops/index.ts
    notes: Register implementations for new ops.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts
    notes: Replace legacy baseline call with orchestration over ops; keep publishing `artifact:climateField`.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts
    notes: Replace legacy refine call with orchestration over ops; physics-only inputs (no overlays/story).
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/artifacts.ts
    notes: Type + validate `artifact:climateField` (rainfall/humidity typed arrays) and any additive artifacts introduced in this slice.
```

### Op catalog (Phase 2 subset to land in Slice 3)

The Phase 2 model’s op list is broad. Slice 3 should land the minimum spine needed to:
1) support realistic circulation/ocean coupling foundations, and
2) keep existing projections stable for consumers.

Minimum spine (suggested grouping; exact contracts owned by Phase 2 doc):
- Forcing/thermal scaffold:
  - `hydrology/compute-radiative-forcing` (compute)
  - `hydrology/compute-thermal-state` (compute)
- Atmospheric circulation:
  - evolve `hydrology/compute-wind-fields` into a more explicit “circulation scaffold” op (or add a successor op)
- Ocean coupling proxy:
  - `hydrology/compute-ocean-surface-currents` (compute) (even if simplified in v1; must be deterministic + data-only)
  - `hydrology/compute-evaporation-sources` (compute) (land/sea moisture sourcing)
- Moisture transport + precipitation:
  - `hydrology/transport-moisture` (compute) (advection/diffusion passes; fixed iters)
  - `hydrology/compute-precipitation` (compute) (orographic rainout, coastal gradients)

### Projection posture: keep `artifact:climateField` stable

Downstream (notably Ecology) consumes `artifact:climateField` today. The implementation must preserve:
- Artifact existence and ids.
- Structural expectations: rainfall/humidity typed arrays of size `width*height`.
- Determinism: same seed + knobs ⇒ same arrays.

Any new internal fields (temperature, PET, etc.) can be introduced as additive artifacts later (Slice 4) to avoid forcing migration here.

### Determinism requirements

All ops must be deterministic and purely driven by:
- explicit inputs (typed arrays/scalars),
- compiled normalized params (from Slice 2),
- a seed value where randomness is needed (seed must be computed in steps, passed as a number; do not pass RNG objects).

### Prework Prompt (Agent Brief)
**Purpose:** Identify a minimal “climate regression signature” that can be used as a golden-map test for determinism without overfitting.\n
**Expected Output:** A proposed test file + metric(s) (e.g., checksum of rainfall/humidity arrays; summary stats) and where to plug it into existing mod tests.\n
**Sources to Check:**\n
- `mods/mod-swooper-maps/test/standard-run.test.ts` (existing execution harness)\n
- `rg -n \"checksum|hash|snapshot\" mods/mod-swooper-maps/test -S`\n

