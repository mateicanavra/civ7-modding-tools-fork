# Spec (Project Resources)

This directory contains spec-adjacent documents for the `engine-refactor-v1` project.

**Canonical target architecture (SSOT):**
- SPEC-target-architecture-draft

**Component splits (derived from the canonical spec):**
- SPEC-architecture-overview
- SPEC-packaging-and-file-structure
- SPEC-tag-registry
- SPEC-core-sdk
- SPEC-standard-content-package
- SPEC-global-invariants
- SPEC-appendix-target-trees

**Pending-merge specs (not canonical until merged):**
- SPEC-pending-step-domain-operation-modules

**ADR log:**
- ADR log (spec-adjacent): see `adr/ADR.md`

## How these pieces fit together

Start with the canonical spec for the full, authoritative target architecture. The split component files provide focused views on specific subsystems and contracts while keeping the original text intact. Use the component files for focused review or cross-team discussions, but resolve disagreements in the canonical spec.

Cross-cutting concerns live in SPEC-architecture-overview (principles, pipeline contract, context shape, dependency tags, phase ownership, narrative model, observability). The packaging, registry, core SDK, and standard content package docs detail how those cross-cutting decisions are applied in concrete layouts and responsibilities. Global invariants and the appendix provide diffable rules and full target trees to validate implementations.
