id: LOCAL-TBD-hydrology-vertical-domain-refactor
title: Hydrology Vertical Domain Refactor — Phase 3 Implementation Plan (M9)
state: done
priority: 1
estimate: 16
project: engine-refactor-v1
milestone: null
assignees: [codex]
labels: [hydrology, domain-refactor, phase-3]
parent: null
children:
  - LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions
  - LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary
  - LOCAL-TBD-M9-hydrology-s3-op-spine-climate-ocean
  - LOCAL-TBD-M9-hydrology-s4-cryosphere-aridity-diagnostics
  - LOCAL-TBD-M9-hydrology-s5-hydrography-cutover
blocked_by: []
blocked: []
related_to:
  - LOCAL-TBD-placement-domain-refactor
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Convert Hydrology Phase 0.5–2 spikes into an executable slice plan that implements the locked Phase 2 Hydrology model via contract-first ops + orchestration-only steps.
- Enforce the Phase 2 bans early: no authored “thumbs on the scale” (swatches, story-driven climate modifiers, paleo), and no compat inside Hydrology.
- Introduce the stable boundary where public semantic knobs compile into a normalized internal parameter set.
- Keep downstream consumers unblocked by maintaining a minimal set of stable projections (e.g., `artifact:climateField`) while adding new typed artifacts additively.

## Deliverables
- Slice plan “M9” with child issue docs for Slice 1–5:
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s3-op-spine-climate-ocean.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s4-cryosphere-aridity-diagnostics.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s5-hydrography-cutover.md`
- Updated consumer scan + migration matrix that includes Placement as a downstream consumer via `effect:engine.riversModeled`.
- Concrete “Guardrails → Enforcement” checklist that maps locked decisions to executable verification commands.

## Acceptance Criteria
- [x] All child slice issue docs (Slice 1–5) exist and are linked from this issue.
- [x] Consumer scan and migration matrix include Placement’s dependency on `effect:engine.riversModeled` and `effect:engine.featuresApplied`.
- [x] Each slice doc contains: explicit scope boundaries, verifiable acceptance criteria, and verification commands grounded in repo scripts.
- [x] Locked bans are explicit and mechanically checkable (at least via `rg` commands until a stricter linter rule exists).
- [x] Phase 3 introduces no Phase 2 model changes; all model authority references point to the Phase 2 modeling synthesis.

## Milestone Tasks
- [x] Slice 1 — Delete authored interventions + guardrails (`docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions.md`) (branch: `agent-TURTLE-M9-LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/613)
- [x] Slice 2 — Semantic knobs + normalized params boundary (`docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary.md`) (branch: `agent-TURTLE-M9-LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/614)
- [x] Slice 3 — Contract-first op spine (climate + ocean coupling) (`docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s3-op-spine-climate-ocean.md`) (branch: `agent-TURTLE-M9-LOCAL-TBD-M9-hydrology-s3-op-spine-climate-ocean`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/615)
- [x] Slice 4 — Cryosphere + aridity + diagnostics (`docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s4-cryosphere-aridity-diagnostics.md`) (branch: `agent-TURTLE-M9-LOCAL-TBD-M9-hydrology-s4-cryosphere-aridity-diagnostics`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/616)
- [x] Slice 5 — Hydrography ownership cutover (`docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s5-hydrography-cutover.md`) (branch: `agent-TURTLE-M9-LOCAL-TBD-M9-hydrology-s5-hydrography-cutover`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/617)
- [x] Phase 5 — Verification + cleanup + workflow hardening (branch: `agent-TURTLE-M9-phase5-verification-cleanup-workflow`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/618)
- [x] Phase 5.1 — Docs commenting pass + Hydrology API/schema doc (branch: `agent-TURTLE-M9-phase5-1-docs-commenting-pass`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/619)
- [x] Phase 5.2 — Knobs semantics (overrides-first transforms) (branch: `agent-TURTLE-M9-t09-hydrology-knob-multipliers-explicit`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/632)
- [x] Phase 5.3 — Workflow docs: knobs overrides-first contract (branch: `agent-TURTLE-M9-t11-docs-knobs-overrides-first`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/633)
- [x] Phase 5.4 — Core: default knobs once (branch: `agent-TURTLE-M9-t13-mapgen-core-default-knobs-once`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/634)
- [x] Phase 5.5 — Core: per-step op defaultStrategy (branch: `agent-TURTLE-M9-t13b-mapgen-core-opref-default-strategy`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/635)
- [x] Phase 5.6 — Hydrology: apply knobs in normalize (branch: `agent-TURTLE-M9-t14-hydrology-knobs-apply-in-normalize`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/636)

## Testing / Verification
- `REFRACTOR_DOMAINS="hydrology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `bun run check`
- `bun run --cwd packages/mapgen-core check`
- `bun run --cwd packages/mapgen-core test`
- `bun run --cwd mods/mod-swooper-maps check`
- `bun run --cwd mods/mod-swooper-maps test`
- `bun run --cwd mods/mod-swooper-maps build`
- `bun run deploy:mods`

## Dependencies / Notes
- Phase 2 authority (locked model; do not change here): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`
- Keep/kill/migrate ledger: `docs/projects/engine-refactor-v1/resources/domains/hydrology/legacy-disposition-ledger.md`
- Placement downstream contract reference: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-placement-domain-refactor.md`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

<!-- Path roots (use for file references) -->
engine-refactor-v1 = docs/projects/engine-refactor-v1
swooper-src = mods/mod-swooper-maps/src
swooper-test = mods/mod-swooper-maps/test
mapgen-core = packages/mapgen-core

### Issue inventory (treat this as “M9”)

```yaml
issues:
  - id: M9
    title: Hydrology Vertical Domain Refactor — Phase 3 Implementation Plan
    status: ready-for-breakout
    blocked_by: []
  - id: M9-S1
    title: Slice 1 — Delete authored climate interventions + add guardrails
    status: ready-for-breakout
    blocked_by: []
  - id: M9-S2
    title: Slice 2 — Semantic knobs + normalized params boundary
    status: ready-for-breakout
    blocked_by: [M9-S1]
  - id: M9-S3
    title: Slice 3 — Contract-first op spine (climate/ocean coupling)
    status: ready-for-breakout
    blocked_by: [M9-S2]
  - id: M9-S4
    title: Slice 4 — Cryosphere + aridity + diagnostics (additive artifacts)
    status: ready-for-breakout
    blocked_by: [M9-S3]
  - id: M9-S5
    title: Slice 5 — Hydrography ownership cutover (discharge-driven projection)
    status: ready-for-breakout
    blocked_by: [M9-S4]
```

### Phase artifact links (inputs; model is locked in Phase 2)
- Plan index: `engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/HYDROLOGY.md`
- Phase 0.5 (greenfield): `engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-greenfield-synthesis.md`
- Phase 1 (current-state): `engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-current-state-synthesis.md`
- Phase 2 (modeling; authoritative model for this plan): `engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`
- Required canonical spike artifacts (workflow requirement; linked from synthesis):
  - `engine-refactor-v1/resources/spike/spike-hydrology-greenfield.md`
  - `engine-refactor-v1/resources/spike/spike-hydrology-current-state.md`
  - `engine-refactor-v1/resources/spike/spike-hydrology-modeling.md`
- Workflow: `engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- Guardrails reference: `engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`
- Traps/locked decisions reference: `engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`

### Scope guardrails (do not violate)
- Slice planning only. No model changes belong here; model changes go to the Phase 2 spike.
- Every slice ends pipeline-green (no dual paths).
- The refactored Hydrology domain must not retain compat surfaces; any transitional shims are downstream-owned, explicitly deprecated, and have removal triggers.
- Hydrology is a single domain; “subdomains” are internal organization only.
- Projections never define internal representation.

---

## Locked decisions + bans (Phase 2 authority; enforced starting Slice 1)

### Ban: authored climate interventions inside Hydrology (and the recipe braid)
Hydrology must be physics-only, deterministic, and derivative.

Enforcement targets (current state evidence):
- `swooper-src/recipes/standard/recipe.ts` includes stage `narrative-swatches`.
- `swooper-src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts` reads `deps.artifacts.overlays`.
- `swooper-src/recipes/standard/stages/hydrology-core/steps/rivers.ts` calls `storyTagClimatePaleo(...)`.
- Narrative swatches plumbing:
  - `swooper-src/recipes/standard/stages/narrative-swatches/**`
  - `swooper-src/domain/narrative/swatches.ts`
  - `swooper-src/domain/narrative/overlays/keys.ts` (`STORY_OVERLAY_KEYS.SWATCHES`, `STORY_OVERLAY_KEYS.PALEO`)

### Target downstream contract posture
- Maintain stable projections for existing consumers:
  - `artifact:climateField` remains the “ecology baseline” projection (but becomes typed and may expand additively).
- Add new typed Hydrology artifacts additively (consumers migrate when ready):
  - temperature, PET/aridity, cryosphere indices, discharge/runoff, hydrography snapshots (river network + lakes ids/masks).

---

## Step decomposition plan (Phase 2 causality spine → steps → artifacts/buffers)

Phase 2 causality spine is authoritative. This plan assigns it to concrete steps without changing the model.

### Target Hydrology steps (staged; keeps current stage braid)

Hydrology (pre):
- `lakes` remains an engine projection until Slice 5 hydrography cutover (do not treat engine lakes as canonical truth).
- `climateBaseline` evolves into “climate spine pass 1”:
  - compile semantic knobs → normalized params (Slice 2)
  - compute forcing/thermal scaffold (Slice 3)
  - compute circulation + initial ocean coupling proxy (Slice 3)
  - compute moisture transport + precipitation (Slice 3)
  - publish projections (`artifact:climateField`, `artifact:windField`) and new additive artifacts (Slice 3–4).

Hydrology (core):
- `rivers` evolves into a hydrography projection:
  - short-term: keep engine stamping until internal discharge-driven hydrography exists
  - long-term: project internal discharge + routing into river network; stamp engine as projection (Slice 5)
  - publish a stable hydrography projection artifact (successor to `artifact:riverAdjacency`) (Slice 5).

Hydrology (post):
- `climateRefine` becomes “climate spine pass 2”:
  - remove narrative motif inputs entirely (Slice 1)
  - if it remains, it must be physics-only (e.g., bounded cryosphere/albedo feedback; diagnostics) (Slice 4)
  - publish diagnostics/cryosphere artifacts additively (Slice 4).

### Artifact/buffer posture (target)
- Buffers: temperature, winds/currents, humidity, precipitation, PET/aridity, cryosphere, discharge.
- Artifacts: stable snapshots/projections of buffers consumed downstream.

---

## Consumer scan + migration matrix (break/fix by slice)

Legend:
- Break: consumer must change in this slice.
- No-op: consumer unchanged.
- Optional: consumer can adopt new artifacts but is not required.

Placement note (current wiring evidence):
- `swooper-src/recipes/standard/stages/placement/steps/derive-placement-inputs/contract.ts` requires:
  - `effect:engine.riversModeled`
  - `effect:engine.featuresApplied`

| Consumer | Today uses | Slice 1 | Slice 2 | Slice 3 | Slice 4 | Slice 5 |
| --- | --- | --- | --- | --- | --- | --- |
| `narrative-swatches/story-swatches` | overlays → climate swatches | Break (deleted) | n/a | n/a | n/a | n/a |
| `hydrology-post/climate-refine` | overlays motifs + `artifact:riverAdjacency` | Break (remove overlays + story config) | No-op | evolves to new ops | adds cryosphere/diagnostics | No-op |
| `hydrology-core/rivers` | engine rivers + `story.paleo` | Break (remove paleo) | No-op | No-op | Optional adopt discharge | Break (internal hydrography projection if cutover) |
| `narrative-post/storyCorridorsPost` | `artifact:riverAdjacency` | No-op | Optional migrate | Optional migrate | Optional migrate | Break (if `riverAdjacency` replaced) |
| Ecology steps (`pedology`, `biomes`, `features`, `resource-basins`) | `artifact:climateField` rainfall/humidity | No-op | No-op | No-op | Optional adopt new hydrology artifacts | Optional adopt discharge/wetness |
| Placement step (`derive-placement-inputs`) | requires `effect:engine.riversModeled` | No-op | No-op | No-op | No-op | Verify preserved (or explicitly re-owned) |

---

## Slice docs (authoritative plan units)

- Slice 1: `engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions.md`
- Slice 2: `engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary.md`
- Slice 3: `engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s3-op-spine-climate-ocean.md`
- Slice 4: `engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s4-cryosphere-aridity-diagnostics.md`
- Slice 5: `engine-refactor-v1/issues/LOCAL-TBD-M9-hydrology-s5-hydrography-cutover.md`

---

## Guardrails → enforcement (mechanical checks)

Base enforcement hook (already exists):
- `bun run lint:domain-refactor-guardrails` (`scripts/lint/lint-domain-refactor-guardrails.sh`)

Until there is a dedicated hydrology ban linter, use these mechanical checks in Slice 1 verification:
- `rg -n \"narrative-swatches\" swooper-src/recipes/standard` (expect zero hits)
- `rg -n \"storyTagClimatePaleo\" swooper-src/recipes/standard/stages/hydrology-core` (expect zero hits)
- `rg -n \"deps\\.artifacts\\.overlays\" swooper-src/recipes/standard/stages/hydrology-post` (expect zero hits)
- `rg -n \"applyClimateSwatches|ClimateSwatches\" swooper-src/domain/hydrology swooper-src/domain/narrative` (expect zero hits)
- `rg -n \"STORY_OVERLAY_KEYS\\.(SWATCHES|PALEO)\" swooper-src` (expect zero hits)

---

## Sequencing refinement note (required)

Drafted slices from Phase 2 deltas as:
1) remove authored interventions, 2) normalize config, 3) op/step cutover, 4) add high-fidelity fields, 5) hydrography cutover.

Re-checked for pipeline safety:
- Deletions of forbidden surfaces come first (Slice 1) to prevent model drift.
- Config compilation boundary comes before op/step refactor so later slices have a stable anchor.
- Hydrography cutover is last because it changes the deepest consumer surfaces (engine stamping + narrative corridors).

---

## Lookback 3 (pre-implementation checkpoint)

To be completed immediately before Phase 4 implementation begins:
- Confirm that Slice 1 guardrails are present and effective (scans + tests).
- Confirm Morphology publishes routing geometry (`artifact:morphology.routing`) (or insert an explicit upstream dependency issue/slice).
- Confirm consumer migration matrix remains accurate (re-scan contracts with `rg`).

## Lookback 4 (post-implementation retro)

Plan vs actual summary:
- The slice sequence (1–5) held; the Phase 2 Hydrology model remained authoritative (no opportunistic model edits).
- Biggest “physics vs engine” constraint was confirmed and operationalized: Civ7 adapter surfaces do not support explicit river/lake stamping, so engine hydrography remains projection-only while Hydrology artifacts are canonical truth.
  - Deferred explicitly as `DEF-020` in `engine-refactor-v1/deferrals.md` (trigger: add an adapter stamping capability).
- Downstream stability goals held: `artifact:riverAdjacency` remains available (now projected from discharge-derived hydrography), and Placement’s `effect:engine.riversModeled` gating remains intact.

Phase 5 gates executed (all green):
- `bun run check` (includes domain refactor guardrails)
- `REFRACTOR_DOMAINS="hydrology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `bun run --cwd packages/mapgen-core check && bun run --cwd packages/mapgen-core test`
- `bun run --cwd mods/mod-swooper-maps check && bun run --cwd mods/mod-swooper-maps test && bun run --cwd mods/mod-swooper-maps build`
- `bun run deploy:mods`
