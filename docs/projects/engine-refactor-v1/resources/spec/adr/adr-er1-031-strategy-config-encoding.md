---
id: ADR-ER1-031
title: "Strategy config encoding (selection + defaults + explicitness)"
status: proposed
date: 2025-12-30
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: authoring-sdk
concern: domain-operation-modules
supersedes: []
superseded_by: null
sources:
  - "SPEC-architecture-overview"
  - "SPEC-pending-step-domain-operation-modules"
---

# ADR-ER1-031: Strategy config encoding (selection + defaults + explicitness)

## Context

Domain operations may offer multiple strategies. The authoring surface needs a consistent encoding so that:
- strategy selection is type-safe,
- defaults are deterministic and visible in the compiled plan,
- the operation’s config remains ergonomic for one-strategy and many-strategy cases.

## Decision

- Strategy selection is represented as a **discriminated union** keyed by `strategy` for multi-strategy operations.
- For operations with exactly one strategy:
  - `strategy` may be omitted and the single strategy is implied.
  - if a `defaultStrategy` exists and there are multiple strategies, omission selects the default; otherwise `strategy` is required.
- Strategy defaults are resolved in compile/validation and the compiled plan carries an explicit, fully-resolved strategy config.

## Options considered

1. **Discriminated union (`strategy` field)**
   - Pros: type-safe; clear selection; supports per-strategy schemas cleanly
   - Cons: requires a wrapper field even for single-strategy ops (unless special-cased)
2. **Nested shape (`{ shared, strategy: { id, config } }`)**
   - Pros: avoids field collisions; supports shared + per-strategy config explicitly
   - Cons: heavier authoring surface; more boilerplate
3. **Ad hoc per-op encoding**
   - Pros: local freedom
   - Cons: impossible to build consistent tooling/validation; encourages drift

## Consequences

- Operation contract modules should expose:
  - strategy identifiers,
  - config schemas for each strategy,
  - a normalization/defaulting path so the plan is explicit.
- Step config schemas can compose operation strategy schemas without inventing custom shapes per step.
