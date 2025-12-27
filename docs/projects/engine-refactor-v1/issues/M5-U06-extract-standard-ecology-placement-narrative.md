---
id: M5-U06
title: "[M5] Move standard steps + domain helpers: ecology, placement, narrative clusters"
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

Move the remaining major standard-domain clusters (ecology, placement, narrative) out of core into the standard mod package so core has no structural reason to embed standard behavior.

## Goal

Finish the extraction: after this unit, core should be structurally generic, and the standard pipeline should be mod-owned end-to-end (steps + helpers + registrations).

## Deliverables

- Move ecology/placement/narrative step implementations into the standard mod package.
- Move domain helpers with them (including any adapter-facing helpers or tag/recipe wiring that is standard-domain).
- Leave only shared, cross-domain primitives in core.

## Acceptance Criteria

- Ecology/placement/narrative steps execute from the standard mod package (not core).
- Core retains only generic primitives (no domain ownership).
- Standard smoke test remains green under `MockAdapter`.

## Testing / Verification

- Standard pipeline execution passes (MockAdapter).
- Workspace typecheck/build remains green after moves.

## Dependencies / Notes

- **Blocked by:** M5-U03 (registry/tags/recipes extraction).
- **Paper trail:** narrative has already been migrated off StoryTags in M4 (CIV-74); this unit is about ownership/packaging, not “bring StoryTags back.”
- **Complexity × parallelism:** high complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Pay special attention to adapter-facing helpers; keep the boundary boring and explicit (avoid reintroducing ambient/global patterns).
- Treat narrative artifacts/queries as standard-mod owned, not core owned, unless they are intentionally made generic primitives.

## Prework Prompt (Agent Brief)

Goal: map the dependency/ownership edges so the extraction is safe and complete.

Deliverables:
- A dependency map for ecology/placement/narrative step clusters.
- A proposed “stays core” vs “moves with mod” decision list, with special attention to adapter-facing helpers and tag definitions.
- A list of any runtime entrypoints or exports that still assume these domains are core-owned.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

