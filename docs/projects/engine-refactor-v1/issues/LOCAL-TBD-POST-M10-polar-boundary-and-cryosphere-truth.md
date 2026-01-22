---
id: LOCAL-TBD
title: "[POST-M10] Polar boundary conditions + cryosphere truth (edge physics + ice proxies)"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: TBD
assignees: []
labels: [foundation, hydrology, morphology, ecology, physics]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [LOCAL-TBD]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Close the “polar addendum” gap by making north/south edges real tectonic boundary conditions (Foundation), and standardize/extend cryosphere truth proxies (Hydrology) with optional bounded Morphology glacial modifiers.

## Deliverables
- Foundation: explicit polar boundary controls and coherent edge-band regime signals:
  - “virtual polar plates” interactions with taper/smoothing, deterministic tie-breakers, and no `wrapY` knobs.
- Hydrology: standardized cryosphere truth semantics (snapshot proxies) and optional extensions:
  - `groundIce01`, `permafrost01`, `meltPotential01` (tile-indexed; deterministic).
- Morphology (optional): bounded glacial carving/modifier pass gated by `groundIce01` persistence proxies (fjord/U-valley signals), with topology-safe boundary conditions.
- Ecology: derived cold constraints (tree-line / freeze gating) so consumers don’t duplicate heuristics.

## Acceptance Criteria
- Polar edge behavior is coherent (no “dead band” or abrupt seam at the top/bottom rows) and deterministic for a fixed seed.
- Cryosphere truth is defined well enough that downstream consumers do not “re-infer” it from temperature alone.
- If glacial modifiers are implemented: they are strictly bounded (no runaway carving), preserve determinism, and do not violate Phase 2 truth/projection boundaries.

## Testing / Verification
- Determinism fixture tests for polar boundary driver fields (stable across runs).
- A “polar edge diagnostics” trace (mask/field dump) for a fixed seed.
- If glacial modifiers exist: regression tests asserting they only activate under high `groundIce01` and remain within amplitude bounds.

## Dependencies / Notes
- Polar boundary conditions are primarily a Foundation concern; cryosphere truth is primarily Hydrology.
- Reference synthesis: `docs/projects/engine-refactor-v1/issues/research/physics-first-gap-research.md`.
