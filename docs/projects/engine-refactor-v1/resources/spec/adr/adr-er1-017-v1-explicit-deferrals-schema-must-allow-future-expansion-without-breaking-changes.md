---
id: ADR-ER1-017
title: "V1 explicit deferrals (schema must allow future expansion without breaking changes)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: at_risk
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
---

# ADR-ER1-017: V1 explicit deferrals (schema must allow future expansion without breaking changes)

## Context

We want to ship a stable V1 slice that is a true subset of the end-state, while deferring major authoring/tooling expansions.

## Decision

- V1 explicitly defers:
  - ergonomic patch tooling for recipes (insert/replace/remove operations)
  - indirect mod placement scripts
  - DAG authoring semantics + deterministic topo-sort tie-break rules (as shipping tooling)
  - optional metadata like `affects` / `affectedBy` (no scheduling semantics by default)
  - full artifact lineage tracing (beyond optional hooks/sinks)
- V1 schemas keep reserved extension containers so future additions are non-breaking (`future.*`, `extensions`).

## Consequences

- V1 work should avoid “locking in” ad-hoc extension shapes outside the reserved containers.
