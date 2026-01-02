---
id: ADR-ER1-032
title: "Recipe config authoring surface (no global overrides)"
status: proposed
date: 2025-12-30
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: authoring-sdk
concern: recipe-config
supersedes: []
superseded_by: null
sources:
  - "SPEC-architecture-overview"
  - "SPEC-packaging-and-file-structure"
  - "SPEC-pending-step-domain-operation-modules"
---

# ADR-ER1-032: Recipe config authoring surface (no global overrides)

## Context

The target architecture treats the recipe as the single source of truth for composition and step configuration. Historically, configuration has also been injected through global overrides and stage-wide mutation, which makes it difficult to reason about what config actually drove a run.

We need explicit rules for what the recipe may author, what is forbidden, and how “defaults” are handled.

## Decision

- The recipe authors **per-step-occurrence config** only.
- Global config overrides that silently affect multiple steps are forbidden in the target architecture.
- Defaults are resolved during compile/validation:
  - schema defaults and normalization-derived defaults are applied deterministically,
  - the compiled plan contains explicit final configs for each step occurrence.
- Any “authoring convenience” (bundles, presets-like selection) is a tooling concern that must compile down to explicit recipe content.

## Options considered

1. **Allow global overrides for convenience**
   - Pros: easy to tweak large recipes
   - Cons: reintroduces hidden coupling and ambiguous run provenance
2. **Recipe-only per-occurrence config (compile to explicit plan)**
   - Pros: explicitness; deterministic; debuggable
   - Cons: requires tooling for ergonomics on large recipes
3. **Hybrid**
   - Pros: flexibility
   - Cons: “two sources of truth” and drift risk

## Consequences

- Validation and observability can report config provenance at the plan-node level.
- Domain operation modules should not depend on any implicit/global config merges; all config arrives explicitly.
