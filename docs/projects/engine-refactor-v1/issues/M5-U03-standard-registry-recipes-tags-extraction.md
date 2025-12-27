---
id: M5-U03
title: "[M5] Move standard registry + recipes + tags into the standard mod"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Packaging]
parent: null
children: []
blocked_by: [M5-U02]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Move “standard defaults” (registry, tags, recipes) out of core so the mod boundary becomes real at the registration layer.

## Goal

Core stops owning the standard pipeline’s identity. The standard mod owns its tags/recipes/registrations; core provides only the mechanism.

## Deliverables

- Move standard-domain tag definitions and recipe definitions into the standard mod package.
- Move standard registry instantiation/registration into the standard mod package.
- Invert remaining import edges so core no longer depends on standard-domain registration modules.

## Acceptance Criteria

- Core no longer exports or instantiates the standard registry as a built-in default.
- Standard recipes live in the standard mod package and are selected via mod-owned wiring.
- Tags that represent standard-domain concepts are mod-owned; core retains only generic tag infrastructure.

## Testing / Verification

- Standard pipeline can still compile and execute via the mod boundary.
- Standard smoke test remains green under `MockAdapter`.

## Dependencies / Notes

- **Blocked by:** M5-U02 (standard mod boundary skeleton).
- **Paper trail:** M4 packaging precedent (CIV-57) + M5 spike.
- **Complexity × parallelism:** high complexity, medium parallelism (large surface move, but mostly mechanical once boundaries are explicit).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Treat this as “standard ownership lives with the mod.” If a tag/recipe is about domain semantics, it should not live in core.
- Be careful not to accidentally re-encode standard ownership by leaving “default registry” helpers in core.

## Prework Prompt (Agent Brief)

Goal: identify everything that is truly “standard-owned” at the registration layer and enumerate the import inversions required.

Deliverables:
- An inventory of all standard-owned registry/tag/recipe modules.
- A list of remaining “core depends on standard” import edges (direct and transitive) that must be inverted.
- A short note flagging any modules that look “core-ish” but are actually standard-domain concepts (so they must move).

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

