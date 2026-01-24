---
id: LOCAL-TBD-M11-U16
title: "[M11/U16] Morphology contracts + ops: JSdoc/description parity and commentary pass"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [morphology, docs, contracts, authoring]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [M11-U00, LOCAL-TBD-M11-U15]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Make Morphology easier to tune and safer to evolve by ensuring every meaningful config surface is documented (JSdoc matches schema `description`) and Morphology steps/ops/rules have clear commentary on intent, invariants, and “what knobs actually do”.

## Deliverables
- Morphology contract schemas under `mods/mod-swooper-maps/src/domain/morphology/**/contract.ts` have:
  - JSdoc above each meaningful config property (and major schema objects), and
  - JSdoc text matches the schema `description` (same meaning; no divergence).
- Morphology step/operation entrypoints have “why/how” commentary where it’s currently opaque:
  - ops `index.ts`: intent + inputs/outputs summary and any non-obvious invariants
  - rules: definitions for key terms (e.g. “boundaryStrength”, “orogenyPotential”) and expected ranges
  - strategies: posture (what it optimizes for) and how it composes rules/knobs
- Any newly clarified invariants that should be enforced mechanically are promoted into:
  - tests (if they are behavior), or
  - the relevant issue doc section (if they are architectural posture).

## Acceptance Criteria
- A reader can answer, from code alone, for any major Morphology config knob:
  - “What behavior does this change?”
  - “What range is meaningful?”
  - “What other knobs does it interact with?”
- No schema `description` exists without corresponding JSdoc for that property (within Morphology contracts).
- No JSdoc/description contradictions remain for Morphology config surfaces.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm -C mods/mod-swooper-maps typecheck`

## Dependencies / Notes
- Related:
  - [M11-U00](./M11-U00-physics-first-realism-upgrade-plan.md)
  - [LOCAL-TBD-M11-U15](./LOCAL-TBD-M11-U15-foundation-realism-execution-spine.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
