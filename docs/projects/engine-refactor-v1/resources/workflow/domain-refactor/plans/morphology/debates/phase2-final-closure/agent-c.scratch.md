---
title: "Agent C — Phase 2 Final Closure Audit (Morphology)"
role: "closure auditor"
scope: "Phase 2 canon trilogy (morphology/spec) + shared workflow docs"
constraints:
  - "Do not edit canonical trilogy files directly (Agent A owns them)"
  - "Completeness-first; no 'minimal'"
  - "wrapX always on; wrapY always off"
  - "Physics cannot consume artifact:map.* or effect:map.*"
  - "Stamping guarantees are effect:map.<thing>Plotted"
  - "No shims/compat/dual paths"
status: "FINAL"
---

# Quick signals

- **Closure readiness (FINAL): FAIL** — Phase 3 is blocked on a few must-lock op/step/determinism decisions; the closure gate (checklist + patch targets) is at the bottom of this file.

# Evidence gathered (so far)

These Phase 2 morphology canonical spec files exist and already define major invariants and surfaces:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - Defines freeze points F1–F5, braid rules, no-backfeeding, and an explicit Morphology causality spine (ordered dependencies).
  - Defines factoring rules: “ops pure, steps publish artifacts / effects”.
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - Defines global invariants (`wrapX=true`, `wrapY=false`), canonical mesh→tile projection, determinism, lifecycle/freeze semantics, upstream/downstream truth artifacts, and disallowed surfaces.
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
  - Defines `artifact:map.*` as projection intent (Gameplay-owned) and `effect:map.*Plotted` as stamping execution guarantees.
  - Defines required `plot-*` steps + effect boundaries and engine call ordering constraints.

Shared workflow guardrails reinforce the posture:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md` and `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md` explicitly forbid Physics from `require`/consuming `artifact:map.*` or `effect:map.*`.

# Findings (must-fix gaps in trilogy)

## Gap 1 — Missing explicit **operation catalog** for Morphology truth ops (name + I/O + config + determinism)

Evidence:
- `PHASE-2-CORE-MODEL-AND-PIPELINE.md` defines the causality spine and factoring rules, but does not enumerate a canonical list of Morphology ops with concrete names, inputs/outputs, and normalized config shapes. It describes steps conceptually (“subtrate mapping”, “base topography synthesis”, etc.) but doesn’t lock an implementable op surface.

Why this blocks Phase 3:
- Phase 3 implementation cannot wire recipe steps to stable pure ops without a canonical op catalog and exact I/O surfaces.
- Guardrails scripts can’t lint for completeness of I/O/config if ops are only described narratively.

Where to patch (Agent A):
- `PHASE-2-CORE-MODEL-AND-PIPELINE.md` — under `## 6) Stage/step model inside Morphology (pipeline explicit)`
  - Add a new section `### 6.5 Canonical Morphology operation catalog (Phase 2)` listing each required Morphology truth op:
    - op name (canonical identifier),
    - required input artifacts/fields,
    - produced artifact(s),
    - config struct (normalized defaults; no wrap flags),
    - determinism/tie-breakers (if applicable),
    - bounds (iterations, stopping conditions).

## Gap 2 — Step/contract boundary clarity for truth vs projection vs stamping is still partially implicit for some subsystems

Evidence:
- `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` already contains the required mapping table at `## 7) Step/effect boundary map (contract-facing)`.
- However, entries `### 7.5 plot-mountains` and `### 7.6 plot-volcanoes` still rely on vague “any required Morphology truth artifacts (…)” language; Phase 3 needs an explicit allowlist of truth artifacts/fields consumed for these steps (to avoid accidental backfeeding or “silent dependency creep”).

Where to patch (Agent A):
- `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` — extend `## 7) Step/effect boundary map (contract-facing)` with per-subsystem “source truth artifact(s)” bullets.
  - Example structure (no new optionality): for each `plot-*` step, list the truth artifact(s) that it is allowed to consume (e.g., `artifact:morphology.topography`, `artifact:morphology.volcanoes`) and the intent artifacts it publishes (if any).

## Gap 3 — (Check in progress) Validate “minimum field-level schema lock” is consistently present across every required artifact

Evidence:
- `PHASE-2-CONTRACTS.md` already contains **global indexing invariants** (tile arrays are dense, length=`width*height`, `tileIndex` order) and provides field-level schemas for at least:
  - `artifact:morphology.topography`
  - `artifact:morphology.substrate`
  - `artifact:morphology.coastlineMetrics`
  - `artifact:morphology.landmasses` (including wrap-aware bbox determinism rules)
  - `artifact:morphology.volcanoes`

Action:
- Continue auditing each Morphology truth artifact section for field-level closure. Any missing field/type/range should be listed here with exact headings.

## Gap 4 — `artifact:morphology.topography` has a small but real type/semantics ambiguity (seaLevel precision vs Int16 bathymetry)

Evidence:
- `PHASE-2-CONTRACTS.md` → `### artifact:morphology.topography (required; truth)` defines:
  - `elevation: Int16Array` (meters)
  - `seaLevel: number` (meters)
  - `bathymetry: Int16Array` with formula `min(0, elevation[i] - seaLevel)`
- If `seaLevel` can be non-integer, the bathymetry derivation needs an explicit rounding rule (and landMask thresholding becomes fractional).

Why this blocks Phase 3:
- Phase 3 wiring needs determinism at the “meters vs float meters” boundary; without a locked rule, two implementations can diverge while still “following the doc”.

Where to patch (Agent A):
- `PHASE-2-CONTRACTS.md` → `### artifact:morphology.topography (required; truth)`
  - Lock one of:
    - `seaLevel` is an integer in meters (recommended given `Int16Array` elevation), OR
    - `bathymetry` changes to `Float32Array` (unlikely desired), OR
    - define explicit rounding (`seaLevelRounded = round(...)` or `floor(...)`) used for both `landMask` and `bathymetry`.

## Gap 5 — Volcano contract semantics appear to contradict the Morphology causality spine ordering (and risk landMask inconsistency)

Evidence:
- `PHASE-2-CORE-MODEL-AND-PIPELINE.md` → `## 5) Morphology causality spine…` puts **Volcanism intent** as step `7)` and then freezes Morphology truth at F2.
- `PHASE-2-CONTRACTS.md` → `### artifact:morphology.volcanoes (required; truth intent)` states: “Morphology modifies topography locally to express volcanic landforms physically…”.
- If volcanism modifies `artifact:morphology.topography.elevation`, then `landMask`, `coastlineMetrics`, and `landmasses` (all defined earlier in the spine) can become inconsistent unless they are recomputed after volcanism.

Why this blocks Phase 3:
- Phase 3 needs a single clear answer: either volcanism affects Morphology topography truth (then ordering must change / recomputation must be explicit), or volcanism is intent-only (then the “modifies topography” line is misleading and should be removed/relocated).

Where to patch (Agent A) — pick one, don’t leave it implicit:
- Option A (simpler; preserves spine): `PHASE-2-CONTRACTS.md` → `### artifact:morphology.volcanoes…` clarify volcanoes are **intent-only** for downstream projections/stamping and MUST NOT mutate `artifact:morphology.topography` truth; gameplay stamping may set mountain terrain/volcano features without changing physics truths.
- Option B (harder; changes spine): `PHASE-2-CORE-MODEL-AND-PIPELINE.md` → `## 5) Morphology causality spine…` move volcanism earlier (before seaLevel/landMask/coastline/landmasses) and/or add an explicit “recompute land classification after volcanism topography edits” step so F2 truths stay consistent.

Also recommend locking an invariant (regardless of option):
- `PHASE-2-CONTRACTS.md` → `### artifact:morphology.volcanoes…` add: `volcanoMask[i] === 1` ⇒ `artifact:morphology.topography.landMask[i] === 1` at F2 (so Gameplay stamping never has to “make land true” in a way that would backfeed engine state into truth).

# Potential contradictions / drift risks (early)

- **Duplication of posture across docs** (`WORKFLOW.md`, guardrails refs, prompts, and trilogy): risk of wording divergence (e.g., “must not require” vs “must not reference”). Recommend centralizing “Physics cannot consume map-layer” wording in one canonical location and making others link-only (Agent B/A scope).
- **“Braided map stages” terminology**: Core file permits braided gameplay stages as ordering detail; ensure shared docs don’t accidentally imply braided *physics* stages can read `artifact:map.*` (so far they do not, but needs full scan).

## Drift risk 1 — Some non-morphology docs still talk about “downstream shims” as acceptable (contradicts locked posture)

Evidence:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md` contains language like “if needed at all, rehomed downstream as deprecated shim…”.

Why this matters for Morphology Phase 2 closure:
- The locked posture for this audit is **no shims/compat/dual paths** anywhere; allowing “downstream shim” as a general technique reintroduces drift risk in Phase 3 slicing decisions.

Patch suggestion (Agent B/A scope):
- Update shared refactor workflow docs to uniformly state “no shims/compat/dual paths” and treat any mention of “downstream shim” as obsolete guidance that must be removed or time-scoped to archived docs.

## Drift risk 2 — Coast expansion “sync back into runtime buffers” can read like backfeeding (needs precise wording)

Evidence:
- `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` says `effect:map.coastsPlotted` implies runtime synchronization after `expandCoasts`, but earlier in the same file warns against fixups silently changing Physics truth.

Why this matters:
- Without tightening, Phase 3 implementers may accidentally treat engine-mutated landMask/terrain as upstream truth for later physics or projection steps.

Patch suggestion (Agent A):
- `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` → `### 4.1 Canonical effect taxonomy` (`effect:map.coastsPlotted`) and/or `#### Coast expansion`:
  - explicitly say “sync is Gameplay-owned map state only; Physics truth artifacts remain unchanged; if engine changes land/water classification relative to `artifact:morphology.topography.landMask`, treat as failure or re-stamp from truth.”

# Notes / next audit passes

- Verify whether `PHASE-2-CONTRACTS.md` includes explicit “no `artifact:map.*` in physics requires/provides” for Morphology stages (it references the rule globally; verify no local exceptions).
- Verify “physics cannot consume artifact:map.* or effect:map.*” also holds for any “derived view” artifacts (e.g., ensure `artifact:foundation.plates` is treated as physics view, not map projection).

---

# Hardest missing decisions (needs orchestrator/user input)

1) **Volcanism vs topography truth:** does volcanism ever mutate `artifact:morphology.topography` truth, or is it intent-only for downstream projection/stamping? (If it mutates, the causality spine ordering and recomputation guarantees must change.)
2) **Sea level precision:** is `artifact:morphology.topography.seaLevel` integer meters or float meters? If float, lock rounding for `landMask` and `bathymetry` so `Int16Array` outputs remain deterministic.
3) **Coast expansion authority:** must `expandCoasts` be guaranteed not to change land/water classification relative to `artifact:morphology.topography.landMask`? If it can, do we fail-fast or re-stamp from truth (and in which step), and what state is considered “authoritative” for subsequent Gameplay-only projections?

---

# Closure checklist (Phase 2 “done” when all true)

- `PHASE-2-CORE-MODEL-AND-PIPELINE.md` includes a canonical Morphology **op catalog** (stable ids + I/O + normalized config + determinism/iteration bounds) that a Phase 3 implementer can wire without inventing interfaces.
- `PHASE-2-CONTRACTS.md` locks every required Morphology truth artifact with: field list + types/units + indexing + derived-field rules + determinism/tie-breakers (including explicit `seaLevel` rounding/precision).
- The volcanism posture is unambiguous: either intent-only (no truth mutation) or truth-mutating with explicit recomputation/order guarantees so F2 artifacts are mutually consistent.
- `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` `plot-*` table lists **explicit allowlisted truth inputs** for `plot-mountains` and `plot-volcanoes` (no “any required” ambiguity).
- `effect:map.coastsPlotted` semantics are tightened to avoid accidental backfeeding; any runtime sync is described as Gameplay-owned state only (or explicitly fails if land/water classification diverges).
- Shared workflow docs do not mention “downstream shims” as an acceptable technique (align with “no shims/compat/dual paths” posture).
- Non-canonical entrypoints (`spike-morphology-modeling-gpt.md`, plan indexes/prompts) clearly defer to the canon trilogy and avoid introducing conflicting contract language.

---

# PASS/FAIL

- **FAIL** (not closure-ready yet): the trilogy is close, but Phase 3 wiring still requires filling the op catalog + resolving a few determinism/ordering ambiguities.

# Exact patch suggestions (Agent A/B integration targets)

## Canon trilogy (Agent A)

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md` → `## 6) Stage/step model inside Morphology (pipeline explicit)`:
  - Add `### 6.5 Canonical Morphology operation catalog (Phase 2)` with named ops + I/O + config + determinism/iteration bounds.
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` → `### artifact:morphology.topography (required; truth)`:
  - Lock `seaLevel` precision + rounding rule (so `landMask`/`bathymetry` are deterministic with `Int16Array` storage).
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` → `### artifact:morphology.volcanoes (required; truth intent)` and/or `PHASE-2-CORE-MODEL-AND-PIPELINE.md` → `## 5) Morphology causality spine…`:
  - Resolve the “volcanism modifies topography” vs “intent-only” ambiguity; if intent-only, remove/clarify the conflicting sentence; if truth-mutating, change ordering/recompute guarantees.
  - Add invariant: `volcanoMask[i] === 1` ⇒ `topography.landMask[i] === 1` at F2 (or state the alternative explicitly).
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` → `## 7) Step/effect boundary map (contract-facing)`:
  - Replace “any required Morphology truth artifacts” in `### 7.5 plot-mountains` / `### 7.6 plot-volcanoes` with an explicit allowlist (e.g., `artifact:morphology.topography`, `artifact:morphology.volcanoes`, and specific `artifact:foundation.plates` fields).
  - Tighten `effect:map.coastsPlotted` wording to avoid implying backfeeding into physics truth.

## Shared workflow docs (Agent B)

- Remove/patch any “downstream shim” guidance that conflicts with “no shims/compat/dual paths” (example: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`).
