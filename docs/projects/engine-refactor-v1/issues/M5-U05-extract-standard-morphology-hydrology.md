---
id: M5-U05
title: "[M5] Move standard steps + domain helpers: morphology & hydrology cluster"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Packaging]
parent: null
children: []
blocked_by: [M5-U03]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Move the morphology/hydrology step implementations (and their domain helpers) out of core into the standard mod package.

## Goal

Continue extraction of standard-domain behavior until core is structurally generic. After this unit, core should not need to “know” morphology/hydrology exist.

## Deliverables

- Move morphology/hydrology step implementations into the standard mod package.
- Move domain helpers with them, retaining only true shared primitives in core.
- Remove or invert any remaining core→standard import edges.

## Acceptance Criteria

- Morphology/hydrology steps execute from the standard mod package (not from core).
- Core retains only generic primitives; no “standard pipeline knowledge” is embedded.
- Standard smoke test remains green (including `MockAdapter` runs).

## Testing / Verification

- Standard pipeline execution passes (MockAdapter).
- Workspace typecheck/build remains green after moves.

## Dependencies / Notes

- **Blocked by:** M5-U03 (registry/tags/recipes extraction).
- **Complexity × parallelism:** high complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Treat shared helpers skeptically: if it exists only because the standard pipeline needs it, it should probably move.

## Prework Prompt (Agent Brief)

Goal: map the cluster so extraction is mechanical and we don’t accidentally keep domain ownership in core.

Deliverables:
- A dependency map for morphology/hydrology steps and helpers.
- A list of shared utility candidates vs domain helpers that must move with the mod.
- A list of boundary reshapes required (imports, exports, shared-primitives API adjustments).

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

