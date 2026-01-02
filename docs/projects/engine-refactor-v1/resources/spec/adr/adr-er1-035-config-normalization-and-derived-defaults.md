---
id: ADR-ER1-035
title: "Config normalization and derived defaults (beyond schema defaults)"
status: proposed
date: 2025-12-30
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: authoring-sdk
concern: config-normalization
supersedes: []
superseded_by: null
sources:
  - "SPEC-architecture-overview"
  - "SPEC-pending-step-domain-operation-modules"
---

# ADR-ER1-035: Config normalization and derived defaults (beyond schema defaults)

## Context

Schema defaults are necessary but often insufficient: some defaults are derived (e.g., a strategy-specific default that depends on other config values or on run settings). Without a consistent normalization model, defaults and “fixups” drift into runtime code paths and become hard to observe and validate.

## Decision

- Configuration normalization is a **compile/validation concern**:
  - after schema defaults are applied, a deterministic normalization step may compute derived defaults and canonicalize shapes.
  - the compiled plan carries the final explicit config for each step occurrence.
- Normalization may depend on:
  - the authored config,
  - `RunRequest.settings`,
  - registry metadata (e.g., known dependency keys),
  - but not on runtime buffer state or engine callbacks.
- Runtime execution must not apply implicit config merges or hidden defaults; it consumes the compiled plan as-is.

## Options considered

1. **Schema defaults only**
   - Pros: simple
   - Cons: pushes real-world defaults into ad hoc runtime logic and breaks observability
2. **Explicit normalization phase (compile-time)**
   - Pros: deterministic; debuggable; supports richer authoring safely
   - Cons: requires a well-defined normalization hook surface
3. **Runtime-only defaults**
   - Pros: lowest up-front work
   - Cons: highest drift risk; hard to validate and reproduce

## Consequences

- The authoring SDK can expose helpers for normalization, but those helpers must produce explicit config in the plan.
- If a default depends on runtime state, it must be re-framed as:
  - an explicit input/setting, or
  - an explicit runtime-derived artifact/buffer dependency.
