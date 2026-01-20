# Scratchpad — Agent E (debate: may Physics read `artifact:map.*` / `effect:map.*`?)

Note: the original Agent E instance did not produce output (hung/unresponsive). This scratchpad is a faithful “Agent E replacement” writeup to unblock the decision.

Goal: take multiple angles (author DX, architectural integrity, Phase 3 migration cost) and converge on a single cohesive posture for the whole pipeline.

---

## 1) Framing: what problem are we trying to solve?

We’re trying to prevent two failure modes:

1. **Semantic backfeeding**: Physics truth starts depending on Gameplay choices (projection interfaces, engine materialization), creating cycles and drift.
2. **Hidden coupling**: the codebase *already* reads/writes engine state inside physics-ish stages; if we ban expressing those deps, they don’t disappear—they become tribal knowledge.

So the decision must balance:
- **Clean target model** (what Phase 2 should define),
- **Transitional reality** (what Phase 3 must migrate from),
- **Author DX** (simple rules that don’t invite “it depends”).

---

## 2) Candidate postures (A/B/C) with consequences

### A) Strict: Physics cannot read `artifact:map.*` and cannot require `effect:map.*`

**Pros**
- Cleanest mental model: Physics truth is derived only from Physics truth.
- Strongest drift resistance: no accidental coupling to Gameplay projections or engine state.
- Keeps `artifact:map.*` truly Gameplay-owned (free to evolve for observability/gameplay).

**Cons**
- In the *current* repo, some “physics” steps read/write adapter state. Under this rule, their real prerequisites can’t be expressed using map effects, so ordering becomes implicit until Phase 3 migration completes.

**Mitigation**
- This is acceptable in Phase 2 (spec), as long as Phase 3 work is explicitly seeded: reclassify engine-coupled steps as Gameplay stamping steps (braided as needed).

**Verdict**
- Best target posture for Phase 2 canonical model.

---

### B) Mixed: Physics cannot read `artifact:map.*`; Physics may require a small canonical set of `effect:map.*Plotted` as ordering gates

**Pros**
- Makes existing hidden coupling explicit: if a step already depends on engine-derived state, a `requires: [effect:map.elevationPlotted]` gate is at least auditable.
- Improves author DX during transition: you can express “must happen before” without inventing shims outside steps.

**Cons / risks**
- Still introduces a semantic coupling vector: requiring an effect implies reliance on engine materialization semantics (even if “boolean”).
- Easy to abuse: “just require the effect” becomes a crutch instead of removing adapter reliance.

**Hard guardrails required (if we choose B)**
- No ad-hoc effects; only the spec-defined taxonomy.
- “One-way door”: once a step requires any `effect:map.*`, it cannot be an input to any upstream truth derivation.
- Any step that provides or requires `effect:map.*` is *Gameplay-owned* in the model, even if braided into a physics phase.

**Verdict**
- Viable transitional posture if we need explicit gating while the repo remains hybrid, but it weakens the “Physics is pure” story unless we reclassify those steps as Gameplay.

---

### C) Relaxed: Physics can read `artifact:map.*` (and maybe require effects)

**Pros**
- Superficially “simple”: “if you need tile-indexed layers, read `artifact:map.*`.”
- Avoids duplicated derivations if `artifact:map.*` already contains what you need.

**Cons (the core reason to reject)**
- Breaks the target architecture: Physics truth becomes dependent on Gameplay projection decisions.
- Creates cycle risk: Physics → `artifact:map.*` is derived from Physics → Physics reads it back.
- `artifact:map.*` is where we *want* convenience/debug layers to live; letting Physics consume them guarantees rot (“Physics depends on debug shape”).

**Verdict**
- Reject. This is the fastest path to a mixed API and long-term drift.

---

## 3) Addressing the specific questions from the prompt

### Q1: “Why not let Physics read `artifact:map.*` for tile projections?”

Because it collapses the boundary we’re explicitly trying to create:
- `artifact:map.*` is Gameplay-owned derived interface, intended to evolve for observability and gameplay consumption.
- If Physics consumes it, Physics truth becomes coupled to Gameplay’s projection shapes and policies, which is effectively backfeeding.

Better alternative (already consistent with Phase 2 direction):
- **Physics may publish tile-indexed truth artifacts** in its own domain namespace (`artifact:foundation.*`, `artifact:morphology.*`, etc.) when needed for physics algorithms or cross-physics contracts.
- Gameplay may project those truths into `artifact:map.*` for observability/future gameplay reads (mirrors are allowed but not required).

This preserves the clean mental model and still gives us tile-indexed layers everywhere we want them.

### Q2: “If Physics can’t require `effect:map.*`, how do we guarantee ‘mountains stamped / elevation built’?”

In the *canonical* Phase 2 model:
- Downstream **Physics** domains must not require “stamping happened”. They require **truth artifacts** (elevation fields, mountain masks, etc.), not engine materialization.
- `effect:map.*Plotted` is for **Gameplay/engine materialization ordering**, not for physics truth derivation.

If a downstream step truly needs engine state (legacy reality today):
- That step is not Physics in the target model; it must be reclassified into a Gameplay stamping/materialization lane (even if braided into the same phase), and it may use `effect:map.*Plotted` gates there.

### Q3: “Should all tile-indexed artifacts live in `artifact:map.*`?”

No. That would overload `artifact:map.*` into “the universal tile layer store”, and then Physics will inevitably depend on it.

Better partition:
- **Physics tile-indexed layers** (used for physics algorithms/contracts): live under Physics domain artifacts (`artifact:foundation.*`, `artifact:morphology.*`, etc.).
- **Gameplay tile-indexed layers** (observability, projections, future gameplay reads, engine-ready indices): live under `artifact:map.*`.

They can duplicate. Duplication here is a feature, not a bug: it buys decoupling and prevents backfeeding.

---

## 4) Converged recommendation (what we should lock)

Lock **A for Phase 2 canonical posture**, with an explicit Phase 3 migration acknowledgement:

1) **Physics steps MUST NOT require or consume `artifact:map.*` as inputs.**
2) **Physics steps MUST NOT require or consume `effect:map.*` as inputs.**
3) **Any step that provides or requires `effect:map.*` is Gameplay-owned** (engine/materialization lane), even if braided inside another phase.
4) **Physics may publish tile-indexed truth artifacts freely** (including `tileIndex` references and tile-indexed arrays/maps) when they are part of the physics contract or needed for physics algorithms.
5) **Gameplay SHOULD publish `artifact:map.*` layers for observability and future gameplay reads** whenever sensible, but Physics never consumes them.

Phase 3 seed (important to state explicitly):
- Current repo contains engine adapter reads/writes inside “physics-ish” stages. Phase 3 must relocate those operations into Gameplay-owned stamping steps and replace any downstream dependency on engine state with dependencies on Physics truth artifacts.

---

## 5) Minimal “rule text” I’d put into shared docs

> Physics domains are truth-only. Physics steps must not depend on Gameplay projections or engine materialization.\n
> - Physics steps MUST NOT `require` `artifact:map.*`.\n
> - Physics steps MUST NOT `require` `effect:map.*`.\n
> - Physics MAY publish tile-indexed truth artifacts (including `tileIndex` references) under its own domain namespace.\n
> - Gameplay owns `artifact:map.*` (projection/observability) and `effect:map.*Plotted` (adapter materialization guarantees). Physics never consumes them.\n
> - Any step that touches the engine adapter is Gameplay-owned and must assert the appropriate `effect:map.*Plotted`.

