---
id: M11
title: "M11: Physics-first realism upgrade (Foundation + Morphology)"
status: planned
project: engine-refactor-v1
---

# M11: Physics-first realism upgrade (Foundation + Morphology)

**Status:** planned  
**Owner:** TBD  
**Target Date:** TBD

## Milestone Summary

**Goal:** Close the “physics-first” gap between Phase 0.5 greenfield intent and the Phase 2/3 implementation reality by upgrading driver richness (Foundation) and making Morphology projections/truth consume real, coherent physics signals. In parallel, introduce a first-class author surface for **knobs + presets** so authors can tune realism without spelunking step-level advanced config.

Non-negotiables (carry forward):
- Phase boundary posture stays intact: Physics is truth-only; Gameplay owns adapter stamping + `artifact:map.*`.
- No shims / no dual paths / no silent fallbacks.
- Knobs apply **after** advanced config as deterministic transforms (no presence-gating).

## Issue Index (proposed sequence)

- [x] [M11-U00 — Physics-first realism upgrade plan (spike → spec)](../issues/M11-U00-physics-first-realism-upgrade-plan.md) (branch: `agent-KIMMY-M11-U00-physics-first-realism-upgrade-plan`)
- [x] [M11-U01 — Spec authority reconciliation (Phase 0.5 vs Phase 2 vs Phase 3)](../issues/M11-U01-spec-authority-reconciliation.md) (branch: `agent-KIMMY-M11-U01-spec-authority-reconciliation`)
- [x] [M11-U02 — Author config overhaul: knobs + presets + config layering](../issues/M11-U02-config-knobs-and-presets.md) (branch: `agent-KIMMY-M11-U02-config-knobs-and-presets`)
- [x] [M11-U03 — Foundation crust coherence upgrade](../issues/M11-U03-foundation-crust-coherence-upgrade.md) (branch: `agent-KIMMY-M11-U03-foundation-crust-coherence-upgrade`)
- [x] [M11-U04 — Foundation tile material drivers + polar boundary conditions](../issues/M11-U04-foundation-tile-material-drivers.md) (branch: `agent-KIMMY-M11-U04-foundation-tile-material-drivers`)
- [x] [M11-U05 — Morphology substrate material-driven rewrite](../issues/M11-U05-morphology-substrate-material-driven.md) (branch: `agent-KIMMY-M11-U05-morphology-substrate-material-driven`)
- [x] [M11-U06 — Orogeny + mountains: physics-anchored planning (noise as micro-structure only)](../issues/M11-U06-orogeny-mountains-physics-anchored.md) (branch: `agent-KIMMY-M11-U06-orogeny-mountains-physics-anchored`)
- [x] [M11-U07 — Volcano truth contract completion](../issues/M11-U07-volcanoes-truth-contract-completion.md) (branch: `agent-KIMMY-M11-U07-volcanoes-truth-contract-completion`)
- [x] [M11-U08 — Polar boundary conditions + cryosphere truth](../issues/M11-U08-polar-boundary-and-cryosphere.md) (branch: `agent-KIMMY-M11-U08-polar-boundary-and-cryosphere`)
- [x] [M11-U09 — Geomorphology upgrade: stream-power erosion + sediment transport](../issues/M11-U09-geomorphology-stream-power-erosion.md) (branch: `agent-KIMMY-M11-U09-geomorphology-stream-power-erosion`) (PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/704)

## References

- Research synthesis: `docs/projects/engine-refactor-v1/issues/research/physics-first-gap-research.md`
- Phase 0.5 (historical intent): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v3/spike-morphology-greenfield-gpt.md`
- Phase 2 canon (M10 authority; post-M10 evolution is allowed but must be explicit):
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
