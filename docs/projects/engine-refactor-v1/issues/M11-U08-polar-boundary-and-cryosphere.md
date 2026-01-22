---
id: M11-U08
title: "[M11/U08] Polar boundary conditions + cryosphere truth (edge physics + ice proxies)"
state: done
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [foundation, hydrology, morphology, ecology, physics]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [M11-U00]
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

## Implementation Decisions

### Implement polar boundary conditions inside `foundation/compute-tectonics`
- **Context:** Phase 2 contracts require north/south edges to behave like real boundary regimes (no dead band; no wrapY knobs).
- **Choice:** Add explicit `polarBoundary` + `polarBandFraction` config to `foundation/compute-tectonics` and inject tapered edge-band regime signals into driver fields.
- **Rationale:** Keeps edge physics in Foundation and deterministic, and flows downstream through existing projections (`artifact:foundation.plates`).

### Standardize cryosphere truth proxies in `hydrology/compute-cryosphere-state`
- **Context:** Downstream consumers need explicit cryosphere state without re-deriving from temperature alone.
- **Choice:** Extend `hydrology/compute-cryosphere-state` and `artifact:hydrology.cryosphere` to publish `groundIce01`, `permafrost01`, and `meltPotential01` (0..1, tile-indexed).
- **Rationale:** Centralizes cryosphere semantics in Hydrology and keeps the signals deterministic and bounded.

### Ecology cold constraints: publish cryosphere proxies via `artifact:ecology.biomeClassification`
- **Context:** Consumers should not have to re-infer cold constraints from temperature-only heuristics.
- **Choice:** Thread `groundIce01`, `permafrost01`, and `meltPotential01` into `artifact:ecology.biomeClassification` and publish a simple `treeLine01` proxy derived from permafrost.
- **Rationale:** Makes cold constraints easily consumable by downstream steps without duplicating cryosphere heuristics.

### Glacial modifiers (deferred within milestone scope)
- **Context:** Glacial carving is a high-surface-area change in Morphology with significant regression risk.
- **Choice:** Not implemented in this milestone slice.
- **Rationale:** Land upstream edge physics + cryosphere truth first; glacial modifiers can land as a dedicated follow-up once erosion/cryosphere harnesses are expanded.
