id: LOCAL-TBD-M9-hydrology-s3-op-spine-climate-ocean
title: "M9 / Slice 3 — Contract-first op spine (climate + ocean coupling)"
state: done
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
- [x] Hydrology steps import no op implementations (no deep imports into `@mapgen/domain/hydrology/ops/**` or strategy modules).
- [x] Ops do not import from `recipes/**` or `maps/**`, and do not import adapters/contexts (pure input/output).
- [x] `artifact:climateField` continues to publish rainfall/humidity arrays with correct size and deterministic values for the same seed + knobs.
- [x] All ops have explicit iteration counts / fixed passes; no convergence loops.
- [x] `bun run check` and `bun run --cwd mods/mod-swooper-maps test` pass.

## Testing / Verification
- `bun run check`
- `bun run --cwd mods/mod-swooper-maps test`
- `bun run lint:domain-refactor-guardrails`
- `rg -n \"@mapgen/domain/hydrology/ops/\" mods/mod-swooper-maps/src/recipes/standard` (expect zero hits; steps must import from domain surface only)
- `rg -n \"recipes/standard|/recipes/\" mods/mod-swooper-maps/src/domain/hydrology` (expect zero hits; domain boundary)

## Dependencies / Notes
- Phase 2 authority (op catalog + causality spine): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`
- Recipe compiler invariants (no runtime defaulting; compile/normalize semantics): `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md`
- Parent plan: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-hydrology-vertical-domain-refactor.md`

## Implementation Decisions

### Derive op seeds in steps (no RNG callbacks across boundary)
- **Context:** Phase 2/3 refactor posture bans RNG callbacks crossing boundaries; seeds must be computed in steps and passed as plain numbers.
- **Options:** (A) pass RNG callbacks, (B) derive integer seeds in steps via `ctxRandom`/`ctxRandomLabel`.
- **Choice:** (B) — steps derive seeds and pass `rngSeed` / `perlinSeed` as numbers.
- **Rationale:** Keeps ops serializable/data-only and matches authoring/guardrail expectations.
- **Risk:** Changing seed labels changes climate texture; mitigated with a deterministic signature test.

### Keep river-adjacency rainfall refinement until hydrography cutover
- **Context:** Legacy pipeline adjusts rainfall/humidity near rivers after `hydrology-core` produces a `riverAdjacency` mask; Phase 2 model aims to remove “rivers drive climate” feedback.
- **Options:** (A) delete river-adjacency refine now (breaking legacy wetness projection), (B) keep a bounded refinement pass and revisit during Slice 5 when discharge-driven cutover lands.
- **Choice:** (B) — keep a deterministic refine pass gated on `riverAdjacency`.
- **Rationale:** Keeps downstream ecology behavior closer to current until Slice 5 introduces the new discharge/wetness ownership.
- **Risk:** Conflicts with the strict Phase 2 causality posture; tracked in `docs/projects/engine-refactor-v1/triage.md`.

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

Hydrology current posture (after the refactor):
- `swooper-src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts`:
  - orchestrates over contract-first ops (`hydrology/compute-*`, `hydrology/transport-moisture`)
  - publishes `artifact:climateField` and `artifact:windField`
- `swooper-src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`:
  - orchestrates over contract-first ops (precip refine, cryosphere, diagnostics)

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
  - `hydrology/compute-atmospheric-circulation` (compute)
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

### Prework Results (Resolved)

There is no existing “climate checksum” test yet, but the test harness already exists and the climate projection buffers are already typed/validated as `Uint8Array`s.

**Ground truth: where the climate projection lives**
- Climate baseline step publishes `artifact:climateField` from `context.buffers.climate`:
  - `/mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts`
    - validates `rainfall` + `humidity` as `Uint8Array` of size `width*height`
    - publishes `context.buffers.climate` as `artifact:climateField`
  - `/mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/artifacts.ts` (artifact schema; currently `Type.Any()` but runtime validation expects `Uint8Array`)

**Where to plug the regression signature (existing harness)**
- `/mods/mod-swooper-maps/test/standard-run.test.ts` already:
  - builds `env` with a fixed `seed`
  - runs `standardRecipe.compile(env, config)` then `standardRecipe.run(context, env, config, ...)`
  - reads `artifact:climateField` and asserts `humidity` exists

**Recommended minimal “climate regression signature”**

Use a two-layer signature:
1) **Determinism check (no golden):** run the recipe twice with the same `env + config` and assert the computed signature is identical (catches hidden RNG/state leaks without pinning a specific climate output).
2) **Golden signature (explicitly update-on-intent):** assert the signature equals a stored constant for a fixed seed/config (catches unintended drift; update only when the Phase 2 model says the projection should change).

Metrics:
- Primary: `sha256` over full `rainfall` and `humidity` buffers.
  - Use `sha256Hex` exported by `@swooper/mapgen-core` (re-exported from `/packages/mapgen-core/src/index.ts` via `@mapgen/trace/index.ts`).
  - Suggested encoding for hashing: `sha256Hex(Buffer.from(array).toString("base64"))` (small, stable string input).
- Secondary (human-debuggable): summary stats for each field:
  - `min`, `max`, `sum`, `nonZeroCount`, `mean` (computed from the typed array)

Suggested signature shape (conceptual; not code):
- `signature = stableStringify({ width, height, seed, rainfallSha, humiditySha, rainfallStats, humidityStats })`
- `signatureHash = sha256Hex(signature)`

**Test location recommendation**
- Keep it co-located with the existing harness for minimal churn:
  - Add a second `it(...)` case in `/mods/mod-swooper-maps/test/standard-run.test.ts` that computes and asserts the signature.
  - Alternatively (if refactoring the harness becomes necessary), extract a helper function under `/mods/mod-swooper-maps/test/helpers/signatures.ts` and reuse from both tests.

**“Without overfitting” guardrail**
- Prefer the “run twice → identical signature” gate as the first-line determinism assertion.
- Treat the golden `signatureHash` as an explicit “model baseline” value (a deliberately updated constant when output changes are intended by the Phase 2 model), not as an invariant that blocks planned realism upgrades.
