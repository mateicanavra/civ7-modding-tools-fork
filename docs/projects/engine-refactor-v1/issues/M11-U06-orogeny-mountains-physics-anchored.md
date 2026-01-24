---
id: M11-U06
title: "[M11/U06] Orogeny + mountains: physics-anchored planning (noise as micro-structure only)"
state: done
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [morphology, foundation, physics, gameplay]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [M11-U00]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Make mountain/hill placement primarily derived from physics truth drivers (tectonic regime + deformation history + fracture/material), with deterministic noise constrained to micro-structure and forbidden from creating mountains where physics indicates none.

## Deliverables
- A spec-grade “orogeny potential” descriptor that is physics-driven and deterministic:
  - either as a Morphology truth artifact (if justified), or as an internal-only computation feeding Gameplay `plot-mountains`.
- A defined noise policy:
  - noise is micro-structure only (band-limited) and amplitude-gated by fracture/orogeny; never a primary selector.
- Validation hooks and diagnostics (maps/metrics) that make drift visible early.

## Acceptance Criteria
- With noise disabled or minimized, the generator still places coherent mountain belts aligned with convergent regimes and rift shoulders aligned with extension regimes.
- Turning noise on changes only local roughness/texture, not macro placement of mountain belts.
- No mountains stamped onto ocean/coast tiles; land-mask invariants are enforced.

## Testing / Verification
- Add at least one deterministic fixture test (fixed seed) asserting:
  - correlation between convergence regime and mountain density above a threshold,
  - noise-only runs cannot create mountain belts without orogeny signal.
- Add a simple “diagnostic dump” (trace or artifact) to render:
  - `orogenyPotential01`, `fracture01`, and final mountain mask for a fixture.

## Dependencies / Notes
- Primary driver source is Foundation; the work is blocked on adding coherent regime blends / fracture / cumulative deformation signals if they do not already exist.
- Reference synthesis: `docs/projects/engine-refactor-v1/issues/research/physics-first-gap-research.md`.

## Implementation Decisions

### Gate ridge noise by physics-derived orogeny potential (noise cannot create belts)
- **Context:** Prior mountain planning allowed fractal noise to contribute even when physics signals were absent.
- **Options:** (A) leave noise as a primary selector, (B) treat noise as micro-structure only and scale it by a physics gate.
- **Choice:** B.
- **Rationale:** Keeps macro placement anchored to tectonic regime + boundary proximity + stress/uplift/rift signals, while still allowing deterministic texture variation inside active belts.
- **Risk:** Coefficients for orogeny/fracture proxies are heuristic and may need later tuning when additional “deformation history” fields are introduced.
