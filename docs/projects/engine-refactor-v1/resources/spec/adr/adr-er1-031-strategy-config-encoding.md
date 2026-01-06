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
  - "SPEC-step-domain-operation-modules"
---

# ADR-ER1-031: Strategy config encoding (selection + defaults + explicitness)

## Context

Domain operations may offer multiple strategies. The authoring surface needs a consistent encoding so that:
- strategy selection is type-safe,
- defaults are deterministic and visible in the compiled plan,
- the operation’s config remains ergonomic for one-strategy and many-strategy cases.

## Decision

- Strategy selection is represented as a **discriminated union** keyed by `strategy`.
- The op config shape is always explicit and uniform:
  - `{ strategy: "<strategyId>", config: <innerConfig> }`
  - `strategy` is always present (no shorthand encodings).
- Operation authoring is strategy-first:
  - all ops declare `strategies` and include a mandatory `"default"` strategy id,
  - each strategy owns its own `config` schema (and optional `resolveConfig`),
  - `createOp(contract, { strategies })` derives `op.config` (the envelope union schema) and `op.defaultConfig` (always `{ strategy: "default", config: <defaulted inner> }`).
- Strategy defaults are resolved during compile/validation; runtime steps receive explicit, validated configs.

## Options considered

1. **Discriminated union (`strategy` field)**
   - Pros: type-safe; clear selection; supports per-strategy schemas cleanly
   - Cons: requires a wrapper field even for single-strategy ops
2. **Nested shape (`{ shared, strategy: { id, config } }`)**
   - Pros: avoids field collisions; supports shared + per-strategy config explicitly
   - Cons: heavier authoring surface; more boilerplate
3. **Ad hoc per-op encoding**
   - Pros: local freedom
   - Cons: impossible to build consistent tooling/validation; encourages drift

## Consequences

- Operation modules should expose:
  - a contract (`contract.ts`) with strategy config schemas,
  - strategy implementations (out of line) attached via `createStrategy(...)`,
  - a runtime op created via `createOp(contract, { strategies })`.
- Step config schemas can compose operation strategy schemas without inventing custom shapes per step.
- Any legacy/default-friendly encodings (e.g., omitting `strategy` when a default exists) must be treated as transitional-only and removed as part of the authoring cutover (see ADR-ER1-036).

Authoring constraints (TypeScript hard rules):
- Do not apply a type assertion to the object literal passed into `createOp(...)` (including `as const`); it disables contextual typing and breaks inferred `run(input, cfg)` types.
- Inline POJO strategies are the preferred authoring mode for full inference.
- Out-of-line strategy modules must be explicitly typed (via `createStrategy(...)` + `satisfies OpStrategy<...>` or equivalent).
