---
id: M10
title: "M10: Morphology Domain Refactor"
status: planned
project: engine-refactor-v1
---

# M10: Morphology Domain Refactor

**Status:** planned  
**Owner:** TBD  
**Target Date:** TBD

Effort estimate (complexity × parallelism): high complexity, medium parallelism.

This milestone is the index wrapper around the Phase 3 implementation plan for the Morphology domain refactor. Detailed slice plans and implementation checklists live in the issue docs below.

<!-- Path roots -->
ENGINE_REFACTOR = docs/projects/engine-refactor-v1
SWOOPER_MAPS = mods/mod-swooper-maps
MAPGEN_CORE = packages/mapgen-core

## Milestone Summary

**Goal:** Cut over the standard recipe to the Phase 2 Morphology posture (Physics truth-only; Gameplay stamping owns Civ7 adapter + `artifact:map.*`; overlays removed; `TerrainBuilder.buildElevation()` re-homed out of Hydrology).

## Issue Index

- [M10-U01 — Delete overlays as Morphology inputs](../issues/M10-U01-delete-overlays-as-morphology-inputs.md)
  - Remove `artifact:storyOverlays` from Morphology contracts/ops/steps and enforce overlay bans.
- [M10-U02 — Delete the overlay system](../issues/M10-U02-delete-overlay-system.md)
  - Remove narrative stages and all overlay producers/consumers from the standard recipe.
- [M10-U03 — Introduce `map-morphology` stamping + re-home coasts/continents/effects](../issues/M10-U03-map-morphology-stamping.md)
  - Add Gameplay stamping steps for coasts/continents and introduce `effect:map.*` posture.
- [M10-U04 — Re-home TerrainBuilder elevation + remaining Morphology stamping](../issues/M10-U04-gameplay-stamping-cutover.md)
  - Move remaining adapter stamping into Gameplay; complete topology cutover.
- [M10-U05 — Truth artifact cleanup + map projection artifacts + deletion sweep](../issues/M10-U05-truth-artifacts-and-map-projections.md)
  - Align Morphology truth artifacts to Phase 2, add required `artifact:map.*` projections, and complete the deletion sweep.
- [M10-U06 — Tracing pass: observability hardening](../issues/M10-U06-tracing-observability-hardening.md)
  - Replace adapter-coupled tracing with truth-only traces; add Gameplay engine-surface dumps.

## Sequencing & Parallelization Plan

Single-agent sequence (no parallel workstreams):
- `M10-U01` → `M10-U02` → `M10-U03` → `M10-U04` → `M10-U06` → `M10-U05`

## Phase 2 Authority (do not modify during Phase 4)

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`

Phase 3 workflow + traps:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`

## Objective (framing)

Cut over the standard recipe to the Phase 2 Morphology posture: Morphology becomes truth-only (engine-agnostic, overlay-free) with contract-first ops and stable truth artifacts; all Civ7 adapter stamping/materialization and `artifact:map.*` projections move into a Gameplay-owned lane that produces boolean `effect:map.*` guarantees (no dual paths, no shims). In M10 specifically: remove the entire “story overlay” system as a load-bearing dependency and re-home `TerrainBuilder.buildElevation()` out of Hydrology.

## Scope (framing)

In scope:
- Standard recipe wiring and Morphology-touching stages/steps (`mods/mod-swooper-maps/src/recipes/standard/recipe.ts`).
- Full removal of the story overlay system (delete producers/consumers, remove narrative stages).
- Re-home Morphology-related adapter calls into Gameplay-owned `plot-*` / `build-*` steps.
- Introduce Phase 2 Gameplay contracts for stamping guarantees (`effect:map.*`) and required `artifact:map.*` projections.
- Replace engine-coupled “truth” surfaces (remove engine terrain IDs from Morphology truth artifacts).
- Remove Physics-side “engine sync” coupling (`syncHeightfield`, adapter reads) for Morphology-owned concepts.
- Migrate any Phase 2-disallowed cross-domain dependencies (e.g., `artifact:morphology.routing`).

Out of scope:
- Non-Morphology refactors beyond minimal consumer migrations required to remove overlays and keep pipeline-green.
- Foundation changes beyond Phase 2-required inputs for Morphology.
- Re-defining Phase 2 Morphology semantics (Phase 2 trilogy remains authority).
- Changing Civ7 adapter behavior except for new `effect:map.*` tags at the recipe layer.

## Locked Decisions + Bans (verbatim, global)

Topology:
- Civ7 maps are a cylinder: `wrapX = true` always; `wrapY = false` always.
- No wrap knobs/env/config; wrap flags must not appear as contract inputs.

Truth vs map projection/materialization boundary:
- Physics domains publish truth-only artifacts (pure). No adapter coupling.
- Gameplay/materialization lane owns `artifact:map.*` (projection/annotation/observability) and adapter stamping.
- No backfeeding: Physics steps must not consume `artifact:map.*` or `effect:map.*` as inputs.
- Hard ban: no `artifact:map.realized.*` namespace.

Effects as execution guarantees:
- Completion is represented by boolean effects: `effect:map.<thing><Verb>`.
- Use semantically correct, short verbs: `*Plotted` or `*Built`.

TerrainBuilder “no drift” lock:
- `TerrainBuilder.buildElevation()` produces engine-derived elevation/cliffs; there is no setter.
- Any decision that must match actual Civ7 elevation/cliffs belongs in Gameplay/map logic after `effect:map.elevationBuilt`.

No compat/shims:
- Do not plan or accept “temporary” shims, legacy paths, or dual APIs.
- Every slice must end pipeline-green with migrations + deletions in-slice.

Additional Phase 2 Morphology locks:
- No story overlays at all in M10.
- No hidden multipliers/constants/defaults in touched Morphology ops/steps.
- No placeholders / dead bags surviving any slice.

Enforcement mapping (introduction slice noted in issue docs):
- `scripts/lint/lint-domain-refactor-guardrails.sh`
- `mods/mod-swooper-maps/test/morphology/contract-guard.test.ts`
- `mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts`
- `rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src`

## Workstreams (global)

- Evidence + inventory and consumer migration matrix.
- Morphology contracts/ops changes (overlay removal, truth-only posture).
- Overlay purge + recipe surgery (delete `narrative-pre`/`narrative-mid`).
- Gameplay stamping steps + effects (`map-morphology` + `effect:map.*`).
- Gameplay map projections + stamping effects (`artifact:map.*`).
- Tracing / observability pass (Physics truth-only traces + Gameplay engine dumps).
- Guardrails + verification gates; deletion ledger with per-slice removals.

## Acceptance / Verification (milestone-wide)

Full acceptance criteria, deletion ledger, and verification commands are tracked in:
- [M10-U05](../issues/M10-U05-truth-artifacts-and-map-projections.md) (global gates + Phase 5 ruthlessness).

Tracing-specific acceptance criteria live in:
- [M10-U06](../issues/M10-U06-tracing-observability-hardening.md).

U04 enforcement (cross-boundary import hygiene):
- Acceptance: no cross-stage helper imports; no step imports from `domain/**/ops/**/rules/**`.
- Verification: `rg -n "src/recipes/standard/stages/.*/steps/helpers/" mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*`
- Verification: `rg -n "src/domain/.*/ops/.*/rules" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-*`

## Risks + Mitigations (summary)

- Two-truth drift between engine surfaces and Morphology truth.
  - Mitigation: explicit Gameplay stamping steps with `effect:map.*` and no backfeed.
- Physics-first quality gap (placeholder upstream drivers; spec/example drift) masked by “architecture-green” guardrails.
  - Mitigation: execute M11 remediation plan: `docs/projects/engine-refactor-v1/milestones/M11-physics-first-realism-upgrade.md` and `docs/projects/engine-refactor-v1/issues/M11-U00-physics-first-realism-upgrade-plan.md`.
- Overlay backfeeding reintroduced through “helpful” masks.
  - Mitigation: contract guards and overlay purge gates.
- TerrainBuilder ordering drift.
  - Mitigation: `build-elevation` Gameplay step + allowlist gating.
- Effect naming sprawl.
  - Mitigation: single tag catalog + naming regex guard.
- Slice sequencing breaks pipeline.
  - Mitigation: explicit migration + deletion per slice (see issue docs).
