---
id: M5-U12
title: "[M5] DEF-010: climate prerequisite reification (remove hidden engine-read prerequisites)"
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

Make climate generation’s correctness dependencies explicit and TS-owned where feasible (no “read engine later” semantics).

## Goal

Eliminate hidden prerequisites that are satisfied only because some earlier step happened to run and mutate engine state. Climate should be schedulable/verifiable via explicit `field:*` / `artifact:*` products and/or explicit `effect:*` contracts.

## Deliverables

- Inventory climate-related adapter reads and classify which can be reified into TS-owned products.
- Introduce the necessary `field:*` / `artifact:*` prerequisites so cross-step dependencies are explicit.
- Where adapter reads remain necessary, ensure they are explicitly declared and verifiable (effects/contracts), not ambient.

## Acceptance Criteria

- Climate steps do not rely on hidden adapter reads as cross-step prerequisites.
- Any adapter reads that remain are either (a) moved earlier into explicit products or (b) declared/verified as effects with explicit contracts.
- Climate remains runnable under `MockAdapter` with explicit prerequisites (to the degree feasible).

## Testing / Verification

- Standard pipeline run passes under `MockAdapter`.
- Tests exist for the reified products/contracts that replace hidden prerequisites.

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-010).
- **Sequencing:** overlaps extraction and schema split; benefits from a boring engine boundary posture (M5-U08).
- **Complexity × parallelism:** medium complexity, mixed parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Avoid turning “engine readbacks” into implicit globals; if we must read from adapter, make it explicit and testable.

## Prework Prompt (Agent Brief)

Goal: map climate’s hidden prerequisites and propose the explicit products/contracts that replace them.

Deliverables:
- Inventory all adapter reads used by climate generation.
- Classification per read: “can reify into TS product now” vs “must remain adapter read.”
- Proposed artifact/field products needed to eliminate hidden dependencies, including where they are produced/consumed in the pipeline.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

