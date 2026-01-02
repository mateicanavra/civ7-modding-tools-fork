---
id: ADR-ER1-011
title: "Placement consumes explicit `artifact:placementInputs@v1` (implementation deferred per DEF-006)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: at_risk
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Scope Areas; Triage “Placement inputs” notes)"
---

# ADR-ER1-011: Placement consumes explicit `artifact:placementInputs@v1` (implementation deferred per DEF-006)

## Context

Placement prerequisites were partly implicit engine reads, which makes composition, validation, and testing difficult.

## Decision

- Placement consumes an explicit, TS-canonical `artifact:placementInputs@v1` produced upstream and referenced via `requires/provides`.
- Placement may delegate writes/side-effects to the engine via the adapter, but must not rely on implicit “read engine later” state as a dependency surface.

## Consequences

- Implementation timing is deferred via `DEF-006`, but the contract direction is locked.
