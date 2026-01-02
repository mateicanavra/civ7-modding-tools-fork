---
id: ADR-ER1-009
title: "Engine boundary is adapter-only + reification-first; `state:engine.*` is transitional-only; verified `effect:*` is schedulable"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: civ7-adapter
concern: engine-boundary
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Scope Areas; Triage “Effects + state:engine.* Cleanup” and “Engine Boundary Gaps”)"
---

# ADR-ER1-009: Engine boundary is adapter-only + reification-first; `state:engine.*` is transitional-only; verified `effect:*` is schedulable

## Context

Legacy paths relied on engine globals and trusted engine-state tags (`state:engine.*`) as schedulable edges without verification.

## Decision

- Civ engine is an I/O surface behind `EngineAdapter`; steps must not read engine globals directly.
- Cross-step dependencies flow through reified TS-owned `buffer:*`/`artifact:*` products.
- `effect:*` is a first-class schedulable namespace; schedulable effects must be runtime-verifiable (adapter-backed postconditions).
- `state:engine.*` is transitional-only wiring and must not be enshrined as a permanent namespace.

## Consequences

- Remove `state:engine.*` from the standard pipeline dependency surface by end of M4 (`DEF-008` closeout).
- Eliminate direct engine-global reads as dependency surfaces; fence any remaining engine reads behind adapter/runtime surfaces and reify if cross-step.
