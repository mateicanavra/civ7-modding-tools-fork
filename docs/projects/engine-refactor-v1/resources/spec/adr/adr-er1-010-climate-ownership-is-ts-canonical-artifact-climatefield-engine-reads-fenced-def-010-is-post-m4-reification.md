---
id: ADR-ER1-010
title: "Climate ownership is TS-canonical `artifact:climateField` (engine reads fenced; DEF-010 is post-M4 reification)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: domain-content
concern: hydrology
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Out of Scope list)"
---

# ADR-ER1-010: Climate ownership is TS-canonical `artifact:climateField` (engine reads fenced; DEF-010 is post-M4 reification)

## Context

Some climate prerequisites still rely on adapter reads (e.g., latitude/water/elevation), which complicates offline determinism and testability.

## Decision

- `buffer:climateField` (and any derived views) is TS-owned and canonical.
- Engine writes are publish effects via adapter, not the source of truth.
- Engine reads are allowed only through the adapter and must not become implicit cross-step dependency surfaces; reify if downstream depends.

## Consequences

- M4 may keep some adapter reads for climate inputs, but climate ownership is still TS-canonical; deeper reification is explicitly post-M4 (`DEF-010`).
