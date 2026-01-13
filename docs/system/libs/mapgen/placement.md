# Placement

> **Status:** Canonical (domain-only causality + contract spec)
>
> **This doc is:** what Placement *means* in the pipeline: responsibilities, inputs, outputs, and ownership boundaries.
>
> **This doc is not:** SDK wiring guidance (step/stage file layout, authoring mechanics, adapters).

## Overview

Placement is the final domain layer: it consumes upstream physical and gameplay-facing signals and turns them into **concrete, game-start decisions**.

Placement is explicitly downstream because it must remain free to:
- enforce fairness constraints (e.g., “no one spawns trapped”),
- preserve theme/flavor (e.g., “desert civ starts near desert edge”),
- and respect any narrative/playability injections that were applied earlier.

## Core responsibilities

1. **Start positions:** choose player start plots fairly and consistently.
2. **Natural wonders:** place wonders (often multi-tile) with strong constraints and clear diagnostics.
3. **Resource placement:** turn upstream “resource basin candidates” into actual resource placements (counts, spacing, biasing).
4. **Final validation:** ensure the final map satisfies engine invariants and recipe-level “must-haves” before returning control.

## Inputs (upstream signals Placement depends on)

### Physical substrate (Foundation/Morphology)

- Land/ocean mask + elevation/topography surfaces.
- Coastlines, mountain/relief signals, and any morphology-derived “passability” hints.

### Climate + water (Hydrology/Climate)

- Moisture/rainfall fields and temperature fields/bands.
- Rivers/lakes or equivalent hydrology signals that influence starts, wonders, and resource viability.

### Living world (Ecology)

- Biome classification (symbols or IDs, plus any biome-adjacent indices used for biasing).
- Soils/fertility signals (where present).
- Resource basin candidates (ecology-owned planning outputs intended specifically for placement consumption).
- Baseline non-wonder features (forests/wetlands/reefs/ice) if already applied; placement must respect them, not overwrite them.

### Story and playability (Narrative/Playability)

- Typed story entries and any derived views used for:
  - “corridor” constraints,
  - thematic region bonuses/penalties,
  - and explicit injectors that adjust the world pre-placement.

Canonical playability stance and story-entry model:
- `docs/projects/engine-refactor-v1/resources/PRD-target-narrative-and-playability.md`

### Buffers vs artifacts (contract nuance)

Placement should primarily consume **artifacts** (published contracts). If Placement reads from shared **buffers** (mutable working layers like elevation/heightfield), treat those reads as:

- intentionally scoped (only what is necessary for a placement decision),
- stable (no ad-hoc heuristics scattered across the codebase),
- and effectively **read-only** at this stage (Placement should not mutate cross-domain buffers as part of “final decisions”).

### Overlays (story-driven placement bias)

Placement may consume upstream **overlays** to bias decisions in a way that is explainable and testable.

Examples:
- Use `overlays.corridors` (mountain/rift corridors) to bias:
  - start adjacency to passes,
  - goodies/barbs placement along strategic routes,
  - or “interesting map” constraints.

Placement should generally treat overlays as read-only and avoid mutating shared overlay collections at this stage.

## Outputs (what Placement owns and publishes)

Placement produces decisions, not just fields:

- **Start placements:** player start plots + any supporting diagnostics artifacts.
- **Wonder placements:** wonder selection + location(s) + justification/diagnostics.
- **Resource placements:** final placed resources (and any placement-owned “distribution diagnostics” artifacts).

Placement may write engine-facing fields as part of applying decisions, but the domain responsibility is the *decision*, not the field mutation.

## Ownership boundaries (important)

### Ecology vs Placement (features)

- **Ecology owns:** baseline placement of non-wonder features (forests, wetlands, reefs, ice).
- **Placement owns:** natural wonders and floodplains.

Historical rationale (archived): `docs/projects/engine-refactor-v1/resources/spike/_archive/spike-ecology-feature-placement-ownership.md`

### Narrative/playability vs Placement

- Narrative/playability may inject motif-driven changes and publish story entries.
- Placement consumes these signals and may apply additional adjustments only when they are part of a placement decision (e.g., “this start must have a river-adjacent tile within N”).

## Modeling constraints (authoritative posture)

- Placement should be authored as **atomic operations** orchestrated by steps/stages.
- Any “policy” logic (fairness scoring, biasing, constraint evaluation) should be explicit and testable:
  - treat rules as policies that are imported by operations,
  - avoid scattering generic helpers without an ownership model.

## Open questions (expected to evolve)

- What is the minimal stable contract for “resource basin candidates” so Ecology can change its internals without forcing Placement churn?
- Which placement decisions must be explainable/diagnosable in artifacts (for debugging and mod tuning), and at what granularity?
