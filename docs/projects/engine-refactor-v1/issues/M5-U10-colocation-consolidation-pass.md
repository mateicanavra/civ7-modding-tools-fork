---
id: M5-U10
title: "[M5] Colocation + consolidation pass (reduce wiring-only indirection; co-locate types/artifacts with owners)"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

After extraction, do a move-based cleanup pass that makes the repo navigable and reduces “fractal” scattering of types/artifacts/schemas.

## Goal

Make the end-state layout unsurprising. Co-locate step code with the types/artifacts/schemas it owns, and consolidate wiring-only indirections where they add noise without abstraction value.

## Deliverables

- Co-locate step code with its artifact/type definitions and schema (when owned by the same module).
- Consolidate small wiring-only modules (e.g., dedupe executor loops) where it materially improves readability/maintainability.
- Remove milestone-coded identifiers where they’ve become permanent.

## Acceptance Criteria

- Key steps/domains have schemas/types/artifacts colocated with their owning module.
- Wiring-only modules are reduced where they add indirection without abstraction value.
- No new public API churn is introduced solely by colocation; this is primarily internal layout cleanup.

## Testing / Verification

- Workspace typecheck/build remains green.
- Standard smoke test remains green under `MockAdapter`.

## Dependencies / Notes

- **Paper trail:** M5 spike workstream “hygiene refactors”; triage “dedupe executor loops” follow-up from CIV-41.
- **Sequencing:** after extraction (M5-U02–U06); can overlap with schema split (M5-U09).
- **Complexity × parallelism:** low–medium complexity, high parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer co-locating “artifact definitions” with the step/domain that publishes them (unless they are intentionally cross-domain primitives).

## Prework Prompt (Agent Brief)

Goal: identify the highest-value layout cleanups so the consolidation pass is focused and doesn’t devolve into arbitrary reshuffling.

Deliverables:
- The top “fractal offender” inventory (types/artifacts/schemas split across many tiny files), with a proposed colocation target per cluster.
- A small list of “wiring-only indirection” targets worth consolidating (including executor loop dedupe), with the rationale for each.
- A proposed end-state layout that remains stable after extraction (not a temporary halfway shape).

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

