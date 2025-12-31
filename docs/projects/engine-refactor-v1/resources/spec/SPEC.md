# Spec (Project Resources)

This directory contains spec-adjacent documents for the `engine-refactor-v1` project.

**Canonical target architecture (SSOT):**
- `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`

**Component splits (derived from the canonical spec):**
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-architecture-overview.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-packaging-and-file-structure.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-tag-registry.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-core-sdk.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-standard-content-package.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-global-invariants.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-appendix-target-trees.md`

**Pending-merge specs (not canonical until merged):**
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-pending-step-domain-operation-modules.md`

**ADR log:**
- `docs/projects/engine-refactor-v1/resources/spec/adr/ADR.md`

## How these pieces fit together

Start with the canonical spec for the full, authoritative target architecture. The split component files provide focused views on specific subsystems and contracts while keeping the original text intact. Use the component files for focused review or cross-team discussions, but resolve disagreements in the canonical spec.

Cross-cutting concerns live in `SPEC-architecture-overview.md` (principles, pipeline contract, context shape, dependency tags, phase ownership, narrative model, observability). The packaging, registry, core SDK, and standard content package files detail how those cross-cutting decisions are applied in concrete layouts and responsibilities. Global invariants and the appendix provide diffable rules and full target trees to validate implementations.
