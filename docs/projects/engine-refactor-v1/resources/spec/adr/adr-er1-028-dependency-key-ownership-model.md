# ADR-ER1-028: Dependency key ownership model

**Status:** Proposed

## Context

The target architecture depends on stable dependency identifiers to compile and validate recipes. If identifiers are invented ad hoc (or “by convention”) in multiple places, the dependency graph becomes fragile and refactors become painful.

We need a clear ownership rule for:
- where dependency keys are defined,
- who is allowed to introduce new keys,
- how recipes reference them.

## Decision

- **Definition ownership:** dependency keys and their definitions are **owned by the package that owns the producing/consuming contract** (typically the step contract model module, stage-shared contract module, or a domain library).
- **Registry is authoritative:** every dependency key referenced by a recipe must have a corresponding definition in the loaded `DependencyRegistry` (fail-fast on unknown keys).
- **Recipe is referential, not definitional:** recipes reference dependency keys; they do not “mint” new keys as a side effect of authoring.

## Options considered

1. **Recipe-owned keys** (the recipe defines the universe of keys)
   - Pros: simple authoring for one-off recipes
   - Cons: undermines portability of steps/domains; invites recipe-root catalogs and drift
2. **Domain/step-owned keys (registered)** (registry is assembled from content packages)
   - Pros: portable contracts; compile-time validation can be strict and deterministic
   - Cons: requires contract modules to expose/aggregate key definitions
3. **Hybrid** (some recipe-private keys, some registered)
   - Pros: flexibility for prototypes
   - Cons: creates two classes of dependency edge; makes validation and reuse rules ambiguous

## Consequences

- The standard content package is responsible for aggregating the dependency key definitions it owns (and any domain libraries it bundles) into the registry surface it exposes.
- Tooling can still provide “authoring sugar”, but compiled artifacts must be explicit and validated against the registry.
- The spec should describe dependency keys as part of contract ownership (step/stage/domain), not as recipe-root catalog content.

## Sources

- SPEC-architecture-overview
- SPEC-packaging-and-file-structure
- SPEC-tag-registry
- SPEC-pending-step-domain-operation-modules
