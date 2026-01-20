# Agent C Scratch — Coherence/Hardening Audit (Morphology Phase 2 docs)

Scope: overall coherence across the in-scope Phase 2 Morphology doc set, focusing on pipeline topology, stage/step boundaries, freeze semantics, and eliminating contradictions with the locked decisions:
- `wrapX=true` always; `wrapY=false` always; no wrap knobs.
- Physics is truth-only (pure); Gameplay owns `artifact:map.*` projection + adapter stamping; no backfeeding.
- `artifact:foundation.plates` is Phase 2-canonical (Foundation-owned derived tile view); avoid duplicating under `artifact:map.*` by default.
- Modeling vocabulary: stages/steps/ops/rules; steps are effect boundaries; no logic outside steps.

In-scope docs audited:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-lockdown-plan.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md` (only as a potential reader entrypoint; not canonical)

---

## 1) Deep-scan results (forbidden language / contradictions)

Searched under `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/` for:
- wrap optionality / wrap knobs (`wrapX|wrapY|wrap|torus|cylind`)
- backfeeding (`backfeed|feed back|feedback loop|round-trip`)
- “delete/forbid `artifact:foundation.plates`”

Findings:
- In-scope spec files are consistent with the locked decisions: no wrap knobs, explicit no-backfeed, `artifact:foundation.plates` required + not `artifact:map.*`.
- Contradictions exist in adjacent docs that are likely to be read as entrypoints or “still true” history:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md:380` and `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md:1007` describe `artifact:foundation.plates` as “for convenience” / “used for convenience”, which undermines the Phase 2 lock that it is the canonical tile-space derived view meant to prevent duplicated mesh→tile projection.
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/foundation-plates/agent-arch-longterm.scratch.md` still claims the Phase 2 specs “forbid” `artifact:foundation.plates`. This is now false and contradicts both `spec/PHASE-2-CONTRACTS.md` and `spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`. Even though that file has an “UPDATE (decision locked)” header, the body still contains the incorrect “Verified” bullets.

---

## 2) Pipeline topology + freeze semantics coherence

### 2.1 Coherence gap fixed in the Core spine

Problem: the Core spine declared a linear canonical phase order, but also used wording that could be read as “Gameplay stamping happens inside Morphology”, which blurs phase boundaries.

Fix applied:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md:130-180`
  - Clarifies “phase order” is the dependency order for **Physics truths**, not a claim that no Gameplay steps can be interleaved in wiring.
  - Makes the no-backfeed boundary explicit in the Gameplay section: Physics must not require `artifact:map.*`, `effect:map.*`, or adapter state as inputs.

### 2.2 Remaining ambiguity to watch (not edited here)

`docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md:202` says stamping steps can be “braided between physics stages”.

This is coherent only if we treat that as wiring-only scheduling that never creates prerequisites for Physics. If we want closure-grade unambiguity, add one sentence there:
- “Physics steps must never require `effect:map.*`; effects are Gameplay-to-Gameplay ordering only.”

---

## 3) Proposed drop-in text (for non-canonical entrypoints)

### 3.1 Fix `spike-morphology-modeling-gpt.md` `artifact:foundation.plates` posture

Replace the “convenience” framing with Phase 2-canonical language:

- Update `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md:380`:
  - Current: “Produced … for downstream convenience… ideally uses the mesh-based tectonics data where possible.”
  - Proposed: “Produced … as the Phase 2-canonical derived tile-space view of mesh-first tectonic truths (to prevent duplicated mesh→tile projection). Downstream tile-based consumers should reuse this artifact rather than re-deriving equivalent tile views ad hoc.”

- Update `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md:1007`:
  - Current: “Used for convenience…”
  - Proposed: “Consumed as the canonical derived tile-space view; do not treat as optional or ‘nice-to-have’.”

### 3.2 Fix the debate doc contradiction (if the debate folder stays)

If `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/foundation-plates/` remains in-tree:
- Remove or clearly label as superseded the “Verified: specs forbid `artifact:foundation.plates`” bullets in `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/foundation-plates/agent-arch-longterm.scratch.md`.

---

## 4) Phase 3 backlog sanity check (docs-only)

Checked `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-lockdown-plan.md:788-823`:
- It is consistent with the locked decision: explicitly treats `artifact:foundation.plates` as Phase 2-canonical and calls for deleting alternative plate-tensor publishing surfaces (not deleting `artifact:foundation.plates`).
