# ADR-ER1-027: Dependency terminology and registry naming

**Status:** Proposed
**Date:** 2025-12-31

## Context

Pipeline “tags” are currently overloaded in meaning (pipeline dependencies vs narrative tags vs diagnostics), which makes the target architecture hard to read and makes ownership rules ambiguous.

The pending step/domain-operation modules spec explicitly calls out the intent to retire “tag” as the primary term for pipeline dependencies and to rename the registry surface.

## Decision

- The target architecture uses **dependency** / **dependency key** as the primary term for pipeline scheduling/validation dependencies.
- The canonical registry surface is named **`DependencyRegistry`** and stores **`DependencyKeyDefinition`** entries.
- The existing namespace prefixes remain the canonical taxonomy:
  - `artifact:*` — immutable published products
  - `buffer:*` — mutable runtime buffers
  - `effect:*` — verified side effects / milestones

## Options considered

1. **Keep “tag” as the primary term** (no rename)
   - Pros: minimal churn
   - Cons: continues semantic overload and confuses future spec work
2. **Docs-only rename** (keep code identifiers as-is; spec uses dependency terminology)
   - Pros: reduces confusion immediately without forcing implementation churn
   - Cons: introduces a docs/API mismatch until a later refactor lands
3. **Rename in both docs and code** (target naming is implemented)
   - Pros: aligns target naming with implementation once delivered
   - Cons: requires coordinated refactor work across content + runtime

## Consequences

- Canonical spec language should avoid “tag” when referring to pipeline dependency edges; reserve “tag” for other domains if needed.
- When implementation catches up, code should converge on `DependencyRegistry` and `DependencyKeyDefinition` to match the spec.
- Any transitional aliasing (old names) is an implementation concern, not a spec concern.

## Sources

- `docs/projects/engine-refactor-v1/resources/spec/SPEC-architecture-overview.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-tag-registry.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-pending-step-domain-operation-modules.md`

