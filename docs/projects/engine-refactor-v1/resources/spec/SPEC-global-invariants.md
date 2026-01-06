# SPEC: Target Architecture (Canonical)

## 6. Global Architecture Invariants (Diffable)

- Core SDK (`CORE_SDK_ROOT`) does not depend on mod content (`MOD_CONTENT_ROOT/**`) and does not ship recipe content.
- Content packages own all content artifacts and validators (core may store artifacts but does not define their shapes).
- Centralized mega-modules are forbidden:
  - no mod-wide config schema/loader package
  - no recipe-root tag/artifact catalogs
  - no “god files” that define multiple unrelated stages’ contracts
- Colocation is the default:
  - step-owned contracts live with steps
  - stage-shared contracts live in stage-scoped modules at the stage root
  - domain-shared contracts live with their owning domain library
- Shared utilities are centralized:
  - cross-cutting helpers (math, noise, RNG, grid) live in the core SDK and are imported from there
  - only truly local helpers remain inside a step or op module

---
