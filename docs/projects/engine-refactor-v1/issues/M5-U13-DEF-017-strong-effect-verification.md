---
id: M5-U13
title: "[M5] DEF-017: stronger `effect:*` verification via adapter read-back APIs + tests"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Validation]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Upgrade effect verification from “call evidence + cheap invariants” to “verified against engine state” where it matters, by adding explicit adapter read-back APIs and tests.

## Goal

Make the effect contract story credible for the highest-risk effects. The end-state should not rely on “trust me, the step ran” semantics for effects that gate downstream behavior.

## Deliverables

- Design a minimal adapter read-back API set for strong verification (landmass/coastlines/rivers/placement).
- Implement the API in both Civ adapter and `MockAdapter`.
- Update effect verifiers to use read-back surfaces where appropriate.
- Add tests that validate both verifier behavior and read-back semantics.

## Acceptance Criteria

- Highest-risk engine effects are verified using adapter read-back surfaces (not only call evidence).
- Civ adapter and `MockAdapter` implement the needed read-back API surface.
- Tests exercise both verifier behavior and read-back semantics.

## Testing / Verification

- Unit tests cover verifier logic in engine-free runs (MockAdapter).
- Smoke tests (where needed) validate Civ adapter read-back semantics.

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-017); “defer stronger verification” choice recorded during M4 effects work (CIV-68/70 notes).
- **Sequencing:** benefits from explicit engine boundary work (M5-U08) and the end-state ownership boundary (M5-U02–U06).
- **Complexity × parallelism:** medium–high complexity, mixed parallelism (API design is serialized; implementation/test work is parallelizable).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Keep the API surface minimal; prefer a few robust reads over a wide “engine mirror.”

## Prework Prompt (Agent Brief)

Goal: decide the minimal read-back API and verification strategy before implementation to avoid churn and adapter coupling surprises.

Deliverables:
- Proposed minimal adapter read-back API set for strong verification (landmass/coastlines/rivers/placement).
- For each API: what it returns, how to implement in Civ adapter, and how to simulate meaningfully in `MockAdapter`.
- A verifier mapping: which effects should use read-back vs “cheap invariants,” and why.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

