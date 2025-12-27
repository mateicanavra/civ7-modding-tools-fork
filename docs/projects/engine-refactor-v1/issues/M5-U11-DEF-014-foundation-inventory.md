---
id: M5-U11
title: "[M5] DEF-014: foundation inventory (`artifact:foundation.*`) + consumer migration"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Replace the monolithic foundation artifact with a real inventory of discrete `artifact:foundation.*` products, migrate consumers, then delete the blob.

## Goal

Make foundation an explicit, schedulable, verifiable product surface. A single blob artifact blocks fine-grained dependencies and pushes consumers toward implicit coupling.

## Deliverables

- Define the canonical discrete foundation artifact set (mesh/crust/plate graph/tectonics + any required rasters).
- Publish those artifacts under `artifact:foundation.*` with explicit contracts.
- Migrate consumers from the monolithic `artifact:foundation` / `ctx.artifacts.foundation` surface to the discrete inventory.
- Delete the monolithic artifact surface once no longer required.

## Acceptance Criteria

- The discrete `artifact:foundation.*` set exists with clear contracts.
- Consumers no longer require the monolithic foundation blob.
- The monolithic artifact surface is deleted (or reduced to a derived transitional artifact only if temporarily unavoidable and time-bounded).

## Testing / Verification

- Standard pipeline run passes under `MockAdapter`.
- Contract tests/guards exist for the discrete artifact inventory (shape/required fields).

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-014); M4 foundation surface cutover (CIV-62) explicitly deferred the split.
- **Sequencing:** easier once extraction is done (M5-U02–U06), but can be started in parallel as long as the end-state ownership boundary is respected.
- **Complexity × parallelism:** medium–high complexity, mixed parallelism (artifact design + consumer migration sequencing).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Keep the inventory contracts crisp; avoid reintroducing “blob as escape hatch.”

## Prework Prompt (Agent Brief)

Goal: make the split and migration safe by enumerating consumers and designing the discrete artifact inventory up front.

Deliverables:
- Inventory of all consumers of the monolithic foundation artifact (direct and transitive).
- Proposed discrete artifact set, including contract notes for each artifact (required fields, versioning).
- A sequencing plan for consumer migration (which consumers must migrate first) and any stop-the-world constraints.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

