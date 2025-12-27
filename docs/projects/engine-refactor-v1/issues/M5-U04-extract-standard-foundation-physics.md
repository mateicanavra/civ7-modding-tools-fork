---
id: M5-U04
title: "[M5] Move standard steps + domain helpers: foundation & physics cluster"
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

Move the foundation/physics step implementations (and their domain helpers) out of core into the standard mod package.

## Goal

Begin the real extraction of domain behavior. After this unit, core should still be runnable, but it should no longer structurally “own” the foundation/physics domain logic.

## Deliverables

- Move foundation/physics step implementations into the standard mod package.
- Move their supporting modules (domain helpers) with them, unless they are truly shared primitives.
- Tighten remaining core modules so anything kept is consciously generic.

## Acceptance Criteria

- The foundation/physics steps execute from the standard mod package (not from core).
- Shared primitives retained in core are minimal and do not encode domain ownership.
- Standard smoke test remains green (including `MockAdapter` runs).

## Testing / Verification

- Standard pipeline execution passes (MockAdapter).
- Workspace typecheck/build remains green after moves.

## Dependencies / Notes

- **Blocked by:** M5-U03 (registry/tags/recipes extraction).
- **Paper trail:** M5 spike; DEF-014 overlaps later at the foundation artifact inventory layer.
- **Complexity × parallelism:** high complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Bias toward moving helpers with the steps; err on the side of “mod-owned” unless a module is clearly cross-domain and reusable.
- Prefer a small number of stable “shared primitives” modules over many tiny indirections.

## Prework Prompt (Agent Brief)

Goal: make the extraction safe by mapping dependencies and deciding what stays core vs what moves.

Deliverables:
- A dependency map for the foundation/physics step cluster.
- A proposed “stays core” list (true shared primitives) vs “moves with mod” list (domain helpers).
- A list of import edges that will need inversion or API reshaping to respect the boundary.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

