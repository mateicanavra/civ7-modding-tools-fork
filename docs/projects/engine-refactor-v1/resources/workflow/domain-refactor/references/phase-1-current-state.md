# Phase 1 Current-State Spike (Template)

Purpose: produce a grounded current-state spike for a single domain so Phase 2 modeling starts from evidence, not assumptions.

Scope guardrails:
- This is current-state only. No modeling or slice planning here.
- Capture facts, boundary violations, and deletions; defer design choices to Phase 2.

Required output:
- `docs/projects/engine-refactor-v1/resources/spike/spike-<domain>-current-state.md`

Required sections (minimum):
- Domain surface inventory (outside view)
- Contract matrix (current-state)
- Legacy surface inventory (config properties + rules/policies + functions)
- Upstream authoritative input review (if non-root)
- Decisions + defaults (initial)
- Risk register (initial)
- Golden path candidate
- Deletion list

Inventory checklist (do not skip):
- Complete step map (all callsites that touch the domain)
- Dependency gating inventory:
  - `requires`/`provides` (non-artifacts) per step (ids + file paths)
  - `artifacts.requires`/`artifacts.provides` per step (ids + file paths)
  - Stage-owned artifact contract catalog per stage (`stages/<stage>/artifacts.ts`)
- Config surface map (schemas/defaults/normalizers + runtime fixups to delete)
- Legacy surface inventory (every config property, rule/policy, and domain function)
- Upstream authoritative input review (prior domain Phase 2 model + pipeline delta list)
- Typed-array inventory (constructors, lengths, validators)
- Deletion list (symbols + file paths that must go to zero)

Gate checklist (Phase 1 completion):
- The spike contains all five “living artifacts” sections (inventory, contract matrix, decisions, risks, golden path).
- Every boundary violation in scope is either listed as a deletion target or explicitly deferred.
- The deletion list exists and is concrete (symbols + file paths).
- Legacy surface inventory is complete (no “TBD” placeholders).
- Upstream authoritative inputs are reviewed and logged (if the domain is not the pipeline root).

References:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`
