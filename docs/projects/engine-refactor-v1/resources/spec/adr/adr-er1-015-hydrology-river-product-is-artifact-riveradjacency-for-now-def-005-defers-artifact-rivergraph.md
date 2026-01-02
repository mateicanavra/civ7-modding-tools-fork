---
id: ADR-ER1-015
title: "Hydrology river product is `artifact:riverAdjacency` for now (DEF-005 defers `artifact:riverGraph`)"
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
---

# ADR-ER1-015: Hydrology river product is `artifact:riverAdjacency` for now (DEF-005 defers `artifact:riverGraph`)

## Context

Some artifact inventories are still evolving; the target architecture locks the dependency-language approach while deferring specific domain products as needed.

## Decision

- `artifact:riverGraph` is explicitly deferred via `DEF-005`.
- Until that later milestone, the canonical river product remains `artifact:riverAdjacency`.

## Consequences

- Recipes/steps/tests should not assume `artifact:riverGraph` exists in V1/M4 scope.
