---
id: M11-U00
title: "[M11/U00] Physics-first realism upgrade plan (spike → spec)"
state: done
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [morphology, foundation, physics, refactor, spike]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [M10-U04, M10-U05, M10-U06]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Transform the Phase 0.5 “physics-first” intent into a post-M10, **spec-grade** remediation plan with explicit decisions, concrete migration slices, and guardrails—so “architecture-green” cannot mask “physics-weak”.

## Deliverables
- Drift ledger:
  - Phase 0.5 (greenfield) intent vs Phase 2 canon vs current implementation (code + doc evidence).
  - Categorize as: (A) spec inconsistency, (B) missing upstream drivers, (C) implementation incomplete, (D) intentional downscope.
- Remediation proposal:
  - Spec corrections required (if Phase 2 docs are internally inconsistent) and/or a Phase 4+ evolution plan (if Phase 2 intentionally downscoped).
  - New/updated truth driver surfaces required to make realism **physics-driven** (not noise-driven).
  - Concrete implementation slices (contracts → ops → steps → tests/guardrails) with clear ownership boundaries.
- Guardrail plan:
  - Add/extend verifications so the class of drift (cross-boundary imports, missing driver adoption, noise-as-crutch) is caught early.

## Acceptance Criteria
- Drift ledger is evidence-backed with links to:
  - Phase 0.5/Phase 2/Phase 3 docs
  - code paths + contract IDs
- Clear decision points are enumerated with recommended choices + tradeoffs:
  - whether to amend Phase 2 canon or treat as Phase 4+ evolution
  - whether deterministic noise is allowed in Physics truth ops vs Gameplay-only projections
  - authoritative resolution + projection rules for crust/lithology signals (mesh → tile)
- Follow-up issues are defined (with local docs created) for any remediation that requires code changes.

## Drift Ledger (Evidence-Backed)

This ledger is the minimal “what drifted + why it matters” spine that the M11 follow-up issues resolve.

- **Substrate material drivers (crust/lithology) are called required by Phase 2 but not implemented**
  - **Category:** (C) implementation incomplete (and possibly (A) spec inconsistency depending on the step maps)
  - **Phase 2 authority:** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - **Phase 2 causality spine:** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - **Current impl:** `mods/mod-swooper-maps/src/domain/morphology/ops/compute-substrate/contract.ts` (uplift/rift-only)
  - **Upstream gap:** `artifact:foundation.crust` is mesh-level and not projected for Morphology consumers

- **Noise-as-crutch exists in truth and planning paths**
  - **Category:** (B) missing upstream drivers and/or (D) intentional downscope that must be explicit
  - **Truth noise:** `mods/mod-swooper-maps/src/domain/morphology/ops/compute-base-topography/strategies/default.ts`
  - **Gameplay mountain planning inputs:** `mods/mod-swooper-maps/src/domain/morphology/ops/plan-ridges-and-foothills/contract.ts` (fractal tensors)
  - **Gameplay stamping use:** `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotMountains.ts`

- **Canonical docs/examples contradict Phase 2 bans**
  - **Category:** (A) spec authority drift (docs/examples treated as canon)
  - **Candidate:** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/VOLCANO.md`
  - **Candidate:** `docs/system/libs/mapgen/morphology.md`

## Decision Recommendations (Spec-Grade)

### Amend Phase 2 canon only for contradictions; treat realism upgrades as Phase 4+ evolution
- **Context:** Phase 2 docs are used as “locked posture” authority; some files disagree internally and with examples.
- **Options:** (A) retroactively amend Phase 2 as if it always required missing drivers, (B) treat missing drivers as Phase 4+ evolution with explicit scope.
- **Choice:** (A) only for clear internal contradictions; otherwise (B) as explicit Phase 4+ evolution.
- **Rationale:** preserves Phase 2 as a stable cutover target while keeping realism upgrades reviewable and non-silent.
- **Risk:** if we over-amend Phase 2, older downstream assumptions may silently break; if we under-amend, Phase 2 remains ambiguous.

### Deterministic noise is allowed only as bounded micro-structure, never as the primary driver
- **Context:** current truth/planning uses noise where physics drivers are weak.
- **Options:** (A) ban deterministic noise from Physics truth entirely, (B) permit it only as a bounded, documented secondary signal.
- **Choice:** (B) bounded secondary signal, with amplitude gated by physics drivers (fracture/orogeny), and guardrails to prevent “noise creates mountains.”
- **Risk:** overly strict bans can reduce variety; overly lax allows drift back to “noise-first.”

### Crust/material projection rule should be mesh→tile and explicit (no hidden heuristics)
- **Context:** Foundation produces crust on the mesh; Morphology needs tile-indexed drivers.
- **Options:** (A) add a first-class mesh→tile projection artifact (e.g. tileToCell + projected crust fields), (B) re-derive crust-like signals in Morphology from plates/tensors.
- **Choice:** (A) explicit projection from Foundation (single source of truth).
- **Risk:** projection rule becomes part of a cross-domain contract; must be deterministic and topology-correct.

## Testing / Verification
- N/A (analysis spike).
- Verification for evidence gathering:
  - `rg -n "artifact:foundation\\.crust|foundationArtifacts\\.crust" -S mods/mod-swooper-maps/src docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec`
  - `rg -n "erodibil|litholog|crust" -S mods/mod-swooper-maps/src/domain/morphology docs/system/libs/mapgen/morphology.md`
  - `rg -n "PerlinNoise|fractal" -S mods/mod-swooper-maps/src/domain/morphology mods/mod-swooper-maps/src/recipes/standard/stages`

## Dependencies / Notes
- Related:
  - [M10-U04](./M10-U04-gameplay-stamping-cutover.md)
  - [M10-U05](./M10-U05-truth-artifacts-and-map-projections.md)
  - [M10-U06](./M10-U06-tracing-observability-hardening.md)
  - [M11 milestone](../milestones/M11-physics-first-realism-upgrade.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Assumed baseline (post-M10)

This spike assumes M10 completes as planned (especially U05):
- Morphology becomes truth-only (no adapter coupling; no story overlays).
- Gameplay `map-*` steps own stamping/materialization and provide `effect:map.*` guarantees.
- Required Phase 2 map projection artifacts exist (`artifact:map.projectionMeta`, `artifact:map.landmassRegionSlotByTile`).
- Morphology truth artifacts are aligned to Phase 2 shapes (U05’s stated goal).

This spike is specifically about the remaining “physics-first” quality gap after the architecture cutover is done.

### Research synthesis (deep dives)

Spec-grade research inputs (synthesis of agent deep dives):
- `docs/projects/engine-refactor-v1/issues/research/physics-first-gap-research.md`

High-signal recommendations (post-M10 remediation direction):
- **Foundation must provide coherent drivers** (not IID placeholders): polar boundary conditions, coherent crust type+age, continuous regime blends, oceanic age/subsidence proxies, and deformation/strain/fracture fields.
- **Morphology substrate must become materially driven** (Phase 2 semantic intent): `erodibilityK` must be derivable from crust/material drivers + regime signals.
- **Mountains/hills must not be “chosen by noise”**: if deterministic noise remains, it should be micro-structure only and amplitude-gated by physics drivers (fracture/orogeny), never creating mountains where physics indicates none.
- **Volcano truth must match Phase 2 shape**: `volcanoMask` plus a deterministic intent list `{ tileIndex, kind, strength01 }` (land-only; sorted).

### Outcome shape (what “done” means)

This plan is “done” when:
- The drift ledger is complete and evidence-backed.
- The decision points are resolved into explicit choices (with rationale and risk).
- The follow-up issue set is complete, sequenced, and migration-slice shaped (prepare → cutover → cleanup) with “no legacy left” outcomes.
- **Engine hard stops remain Gameplay-only**: any logic that depends on Civ7 engine-derived elevation/cliffs must live after `effect:map.elevationBuilt`.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Evidence: Phase 2 internal inconsistency (crust/erodibility)

Phase 2 says crust exists and is required:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - `artifact:foundation.crust` (required)
  - “erodibilityK must be derived from Foundation crust/material drivers … not overlays”

Phase 2 causality spine explicitly names lithology mapping:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - Step 1: “Substrate mapping (lithology / erodibility) — Inputs: Foundation crust properties …”

But Phase 2 step map for `morphology/step-substrate` lists only `artifact:foundation.plates` inputs (uplift/rift) and omits crust.

Implementation corroboration:
- `mods/mod-swooper-maps/src/domain/morphology/ops/compute-substrate/contract.ts` consumes `upliftPotential` + `riftPotential` only.
- Foundation crust is produced at mesh resolution and is currently used only inside Foundation:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/crust.ts`
  - not projected to tiles for Morphology consumption.

Conclusion (to decide):
- Either Phase 2 canon is inconsistent and needs a correction, or implementation never completed the intended crust→tile→substrate wiring.

### Evidence: deterministic noise as an input to truth/planning

Physics truth already uses deterministic noise in base topography:
- `mods/mod-swooper-maps/src/domain/morphology/ops/compute-base-topography/strategies/default.ts`

Gameplay projection uses perlin-derived fractal arrays for mountain planning/stamping:
- `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotMountains.ts`
- and the plan op contract requires fractal tensors:
  - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-ridges-and-foothills/contract.ts`

Decision point:
- Is deterministic noise acceptable as a *secondary* tie-breaker/variety signal, or is it compensating for missing truth drivers (crust age/material / accumulated uplift history / fracture)?

### Inventory: “physics truth computations” that actually exist today

Foundational drivers (mesh → tile projection exists for some):
- Foundation mesh/crust/tectonics/plates artifacts:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`

Morphology truth ops (tile-indexed):
- `morphology/compute-substrate` (uplift/rift only)
- `morphology/compute-base-topography` (uplift/rift/closeness + deterministic noise)
- `morphology/compute-sea-level`
- `morphology/compute-landmask`
- `morphology/compute-coastline-metrics` (uses deterministic noise)
- `morphology/compute-flow-routing` (steepest descent routing)
- `morphology/compute-geomorphic-cycle` (bounded diffusion/erosion/deposition pass)
- `morphology/compute-landmasses`
- `morphology/plan-volcanoes` (intent)

Known gaps vs “physics-first” narrative:
- No tile-level lithology/crust age/material driver is used in substrate derivation.
- Geomorphic-cycle uses flow accumulation but does not incorporate slope/stream power (no explicit `S` term), so “valley carving” is simplified.
- Mountain/ridge planning is largely plate-signal + fractal scoring, not derived from evolved topography/substrate.

### Proposed remediation tracks (post-M10)

Track A — Spec correction + clarity (fast)
- Reconcile Phase 2 docs:
  - If crust is required, ensure step maps/contracts explicitly include it and the pipeline includes a projection rule.
  - If crust is *not* actually intended as a Morphology input in Phase 2, explicitly document the deferral + trigger.

Track B — Add missing driver surfaces (medium)
- Decide canonical crust/lithology resolution + projection:
  - mesh crust → tile rasters (tileIndex → cellIndex mapping)
- Update Morphology substrate op contract to consume a crust-derived driver:
  - e.g. `crustType`, `crustAge`, or derived `erodibilityBase`

Track C — Reduce noise dependency (long)
- Rework mountains/ridges planning to prefer physics truths:
  - evolved topography gradients, uplift history proxies, fracture/tectonic stress, etc.
- Keep deterministic noise only as a controlled, documented, optional stabilizer.


### Process drift: missing canonical Phase 0.5/Phase 2 spike artifacts

Canonical workflow expects:
- Phase 0.5 output at `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-greenfield.md`
- Phase 2 output at `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-modeling.md`

Current repo state:
- No `spike-morphology-*` files exist under `docs/projects/engine-refactor-v1/resources/spike/`.
- Morphology greenfield material exists only as archived prompt output under:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v3/spike-morphology-greenfield-gpt.md`

This makes it easy for Phase 2 canon to drift from Phase 0.5 intent without a single canonical “model body” doc acting as a durable reconciliation point.

### Evidence: Foundation crust is currently placeholder-grade

- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`
  - `type` is assigned by independent RNG draws vs a global `continentalRatio` threshold (no spatial coherence).
  - `age` is assigned by independent uniform RNG draws (0..255) (no plate history).

Implication:
- If Phase 2 expects Morphology substrate/erodibility to be derived from crust type/age, Foundation crust must itself be upgraded to a coherent, physics-anchored driver field (or replaced with a different driver surface) before Morphology can become meaningfully “lithology-driven”.

### Evidence: a mesh→tile projection exists, but does not include crust/lithology

- `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts` projects mesh-level tectonics fields into tile rasters (`artifact:foundation.plates`).
- It internally computes a `tileToCell` mapping but does not publish it or use it to project crust type/age.

Remediation option:
- Extend the Foundation projection step to also project crust-derived drivers to tiles (either by adding fields to `foundation.plates` or by publishing a dedicated tile-indexed crust/lithology artifact).

### Evidence: Phase 2 treats mountains/hills as Gameplay stamping (not Morphology truth)

- Phase 2 map projections/stamping spec defines `effect:map.mountainsPlotted` as the guarantee that mountain/hill terrain has been applied via adapter writes.
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
- Phase 2 step table explicitly models `plot-mountains` as consuming `artifact:morphology.topography` + `artifact:foundation.plates` and producing only an effect (no `artifact:map.mountains`).

Implication:
- The presence of deterministic noise inputs in `plot-mountains` is not automatically a Phase 2 boundary violation (it’s a Gameplay projection step).
- The real “physics-first” question becomes:
  - are Morphology truth fields (topography/substrate/routing) rich enough that Gameplay projections can be derived primarily from physics signals, with noise only as a minor stabilizer?
  - or are projections forced to rely on noise because upstream truth drivers are missing?

---

## Comprehensive drift ledger (expanded)

This section is the “complete audit pass” across:
- Phase 0.5 intent (archived greenfield doc),
- Phase 2 trilogy (authoritative for the refactor),
- current implementation reality (code + artifact shapes),
with special attention on **core Morphology physics computations** (not just pipeline boundaries).

### Direct answers to the “do we have these drivers?” question

**We do have (but quality varies):**
- Plate / boundary drivers: `artifact:foundation.tectonics` (mesh) and `artifact:foundation.plates` (tiles) include boundary type + uplift/rift/shear/volcanism potentials.
  - Tile projection implementation: `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts`
- Simplified routing and erosion primitives in Morphology:
  - `morphology/compute-flow-routing` (steepest descent) and `morphology/compute-geomorphic-cycle` (diffusion + flowAccum-driven erosion/deposition).
  - Implementation: `mods/mod-swooper-maps/src/domain/morphology/ops/compute-flow-routing/**`, `mods/mod-swooper-maps/src/domain/morphology/ops/compute-geomorphic-cycle/**`

**We do not have (in Phase 2 / implementation) as real driver surfaces:**
- Crust thickness history / lithology / erodibility as a *meaningful, coherent* upstream driver field.
  - `artifact:foundation.crust` exists, but is currently IID RNG per mesh cell (`compute-crust`), so it does not encode “history” or spatially coherent lithology.
- A Phase 0.5-grade stream-power erosion model (explicit slope term `S` and exponents `m,n`).
  - Current geomorphology uses a simplified flowAccum normalization and local diffusion; it’s not stream power law as described in `docs/system/libs/mapgen/morphology.md`.

Interpretation:
- The refactor has largely succeeded at **boundary + artifact posture**, but the “physics-first richness” story is only partially realized because several upstream drivers are placeholders and several Phase 0.5 algorithmic expectations were not locked/implemented.

### Drift inventory by subsystem (A/B/C/D classification)

| Subsystem | Phase 0.5 intent | Phase 2 canon | Current reality | Drift |
|---|---|---|---|---|
| **Crust** | Meaningful crust material & age signal used downstream | `artifact:foundation.crust` required; semantic material posture | IID RNG per mesh cell (`type`,`age`) | B |
| **Substrate** | `erodibilityK` derived from crust/lithology + regime | Contracts: must derive from crust/material; Core: uplift/rift-only inputs | Implementation: uplift/rift-only | A + C |
| **Base topography** | Plate-driven structure; some hybrid noise ok | Explicitly allows deterministic noise | Uses labeled RNG noise in base topography | D (acceptable) |
| **Routing** | Physics routing primitives needed for erosion/hydrology | `morphology.routing` is explicitly disallowed as cross-domain input; routing is internal to geomorphology | Morphology publishes `artifact:morphology.routing` (legacy) | C (cleanup) |
| **Geomorphic shaping** | Erosion/deposition “enough to matter”; field-based is fine | `compute-geomorphic-cycle` exists in model | Simplified but real diffusion/erosion/deposition exists | D (acceptable, but weaker than canonical docs claim) |
| **Mountains projection** | Mountains should be physics-driven; noise only for micro detail | Phase 2: mountains are Gameplay stamping (`effect:map.mountainsPlotted`) | Gameplay `plotMountains` uses explicit Perlin fractal inputs | D (acceptable); becomes C if we want stronger physics-first mountains |
| **Volcano truth** | Volcano intent includes kind/strength; land-only invariant | Phase 2 contracts: `volcanoMask` + list `{ tileIndex, kind, strength01 }` | Current truth artifact only provides `{ index }[]` | C |
| **Volcano map artifact** | Optional debug/annotation | Phase 2 does not require `artifact:map.volcanoes` | Example doc suggests it exists; implementation does not publish it | A (doc/example) / D (optional surface) |
| **Docs authority** | Canonical docs should match Phase 2 | Phase 2 trilogy is authority for M10 | `docs/system/libs/mapgen/morphology.md` is labeled canonical but describes richer physics than Phase 2/impl | A (doc drift) |

### Doc contradictions likely contributing to drift

1) **Phase 2 trilogy internal mismatch (substrate semantics vs op catalog inputs)**
- Contracts file: `artifact:morphology.substrate.erodibilityK` “must be derived from Foundation crust/material drivers”.
- Core model op catalog: `morphology/compute-substrate` lists inputs as uplift/rift from `artifact:foundation.plates` only.

2) **“Canonical example” contradictions**
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/VOLCANO.md` calls itself canonical but:
  - mentions `buffer:heightfield` as a Physics requirement (exactly the backfeeding posture we ban), and
  - implies `artifact:map.volcanoes` is provided (which is not required by Phase 2 map projections spec).

3) **Canonical domain doc vs Phase 2**
- `docs/system/libs/mapgen/morphology.md` describes stream power law explicitly and claims erodibility derived from crust type/age (granite vs sandstone).
- Current Phase 2 + implementation does not deliver those drivers/algorithms at that fidelity.

---

## Remediation proposal (post-M10)

### 1) Spec reconciliation first (fast, unblocks everything)

Goal: establish one authoritative truth about “substrate inputs” and “what’s canonical vs illustrative”.

Actions:
- Reconcile Phase 2 trilogy inconsistency for `morphology/compute-substrate`.
  - Recommended direction: keep the Contracts semantics (“crust/material-derived”) and update the Core model op catalog to include a crust/material input surface (projected deterministically).
- Fix or downgrade confusing docs:
  - Update `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/VOLCANO.md` so it cannot be read as authoritatively contradicting Phase 2 bans.
  - Reconcile `docs/system/libs/mapgen/morphology.md` with Phase 2 (or reclassify as historical).

### 2) Upgrade Foundation crust into a real driver (medium, required for “physics-first”)

Goal: make `artifact:foundation.crust` encode coherent, physically motivated signals (even if simplified).

Minimum acceptable outcome:
- `type` and `age` correlate with plates and boundary regimes (spatial coherence), not IID RNG per cell.
- Determinism and tie-breakers are explicit.

### 3) Provide tile-indexed crust/material drivers (medium)

Goal: let Morphology consume crust/material as tile rasters without duplicating projection logic in every downstream.

Viable options:
- Extend `artifact:foundation.plates` to include projected crust/material fields.
- Publish a dedicated `artifact:foundation.crustTiles` tile artifact.
- Publish/persist a canonical `tileToCellIndex` mapping as a Foundation-owned artifact to make projection a shared primitive.

### 4) Make `morphology/compute-substrate` truly material-driven (medium)

Goal: align with Phase 2 semantics: `erodibilityK` derived from crust/material drivers + regime signals.

Minimum acceptable outcome:
- `compute-substrate` consumes at least crust type/age (tile-indexed) and boundary regime/closeness.
- Add a semantic smoke test that fails if `erodibilityK` no longer changes when crust/material changes.

### 5) Complete Phase 2 volcano truth shape (small/medium)

Goal: make `artifact:morphology.volcanoes` match Phase 2 contracts.

Actions:
- Add `volcanoMask`.
- Populate `kind` and `strength01` deterministically (strength from `volcanism/255` baseline per Phase 2).
- Decide whether to publish a Gameplay `artifact:map.volcanoes` debug/annotation layer; if yes, add it to the Phase 2 map projections spec and TagRegistry.

### 6) (Optional) Reduce mountain projection dependence on fractal noise (long)

Goal: ensure mountains/hills placement is primarily driven by physics truths (tectonics, crust/material, cumulative uplift proxies), with noise only as a controlled stabilizer.

---

## Follow-up issues (M11)

These are tracked as separate local issue docs and are indexed by the M11 milestone.

- [M11-U01-spec-authority-reconciliation](./M11-U01-spec-authority-reconciliation.md)
- [M11-U02-config-knobs-and-presets](./M11-U02-config-knobs-and-presets.md)
- [M11-U03-foundation-crust-coherence-upgrade](./M11-U03-foundation-crust-coherence-upgrade.md)
- [M11-U04-foundation-tile-material-drivers](./M11-U04-foundation-tile-material-drivers.md)
- [M11-U05-morphology-substrate-material-driven](./M11-U05-morphology-substrate-material-driven.md)
- [M11-U06-orogeny-mountains-physics-anchored](./M11-U06-orogeny-mountains-physics-anchored.md)
- [M11-U07-volcanoes-truth-contract-completion](./M11-U07-volcanoes-truth-contract-completion.md)
- [M11-U08-polar-boundary-and-cryosphere](./M11-U08-polar-boundary-and-cryosphere.md)
- [M11-U09-geomorphology-stream-power-erosion](./M11-U09-geomorphology-stream-power-erosion.md)

---

## Guardrail plan (catch this class of drift earlier)

This milestone has strong architecture guardrails. The gap was semantic + authority drift. Add:
- A doc lint rule: “canonical example” docs must not mention Physics-consuming `artifact:map.*`, `effect:map.*`, or `buffer:heightfield` as inputs.
- A small semantic contract smoke test suite (one per high-value contract):
  - substrate: changing crust/material must change `erodibilityK` in a predictable way (at least for a toy fixture).
  - volcanoes: `volcanoMask` and `volcanoes[]` are consistent; list is land-only; ordering is by `tileIndex`.
- An “authority header” requirement for docs that claim canonical status, pointing to Phase 2 trilogy and stating whether they are Phase 2-accurate.

---

## Session analysis (workflow-extractor)

### Primary goal
Prevent “physics-first” intent from silently downgrading into an architecture-only refactor by making drift explicit, actionable, and enforceable.

### Workflow pattern
1. Gather intent (Phase 0.5; historical) → note expectations and potential drivers.
   - Invariant: do not silently reinterpret Phase 2 canon.
2. Gather canon (Phase 2 trilogy; authoritative) → detect internal inconsistencies.
   - Quality gate: trilogy must be internally consistent for the concept under review.
3. Gather reality (Phase 3 code + artifact shapes) → classify drift (A/B/C/D).
   - Quality gate: artifact shapes and semantics match contracts.
4. Remediate:
   - If (A): fix docs/spec and add an authority guardrail.
   - If (B): open upstream driver issue(s); do not “paper over” with noise.
   - If (C): open implementation issue(s) and add a semantic smoke test.
   - If (D): log explicit deferral with triggers (no implicit downscope).

### Extracted invariants
| Invariant | How discovered | Enforcement mechanism |
|---|---|---|
| Examples must not contradict Phase 2 bans | `examples/VOLCANO.md` claims canonical while implying backfeeding | doc lint/hook gate |
| Canonical docs must be Phase 2-accurate or labeled historical | `docs/system/libs/mapgen/morphology.md` claims richer physics than Phase 2/impl | authority header + reclassification |
| Architecture guards are not semantic guards | drift exists while architecture guardrails can still pass | semantic smoke tests for key contracts |
