---
id: M5-U09
title: "[M5] DEF-016 + follow-ups: schema ownership split (and “settings” migration where it belongs)"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Split the config schema monolith into domain-owned modules and migrate cross-cutting “settings-like” fields (starting with directionality) to the proper settings boundary.

## Goal

Make config ownership and discoverability match step/domain ownership after extraction. Reduce schema friction and eliminate ad-hoc “settings embedded inside step configs.”

## Deliverables

- Split the schema monolith into domain-owned schema modules with a clear barrel/index.
- Identify and migrate “settings-like” fields embedded in step configs into the intended `RunRequest.settings` surface where practical.
- Update imports without adding new layers of indirection.

## Acceptance Criteria

- `schema.ts` is split into domain-owned schema modules with a clear barrel/index.
- Cross-cutting settings (e.g., directionality) are represented as settings, not duplicated across unrelated step configs.
- Imports are updated without creating new “schema indirection” layers.

## Testing / Verification

- Workspace typecheck/build remains green.
- Config parse/validation tests (or smoke tests) still pass for standard run.

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-016) + triage “directionality settings migration” follow-up from CIV-56.
- **Sequencing:** best after extraction (M5-U02–U06) so we colocate in the final package locations.
- **Complexity × parallelism:** low–medium complexity, high parallelism (mechanical split; the “settings” boundary calls are the serialized part).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer colocation that matches the final ownership boundary; avoid transient halfway schema layouts.

## Prework Prompt (Agent Brief)

Goal: produce the mapping so schema moves are mechanical and the settings boundary work is explicit.

Deliverables:
- Mapping from current schemas → proposed file ownership (domain/step).
- A list of “settings-like” fields currently embedded in step configs (starting with directionality), with recommended target home.
- A short note identifying any migration risks (config backward compatibility vs hard cut) that might affect sequencing.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

