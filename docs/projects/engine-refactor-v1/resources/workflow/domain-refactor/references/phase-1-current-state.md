# Phase 1 Current-State Spike (Template)

Purpose: produce a grounded current-state spike for a single domain so Phase 2 modeling can reconcile **greenfield intent** with **evidence**, not assumptions.

Scope guardrails:
- This is current-state only. No modeling or slice planning here.
- Capture facts, boundary violations, and deletions; defer design choices to Phase 2.

Prereq:
- Phase 0.5 greenfield pre-work spike exists:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md`

Required output:
- `docs/projects/engine-refactor-v1/resources/spike/spike-<domain>-current-state.md`

Required sections (minimum):
- Executive snapshot (what the evidence says; 5–10 bullets)
- Domain surface inventory (outside view)
- Contract matrix (current-state)
- Legacy surface inventory (config properties + rules/policies + functions)
- Legacy intervention mechanisms (if any): authored/non-derivative “outcome overrides” that perturb the domain’s outputs
- Story/narrative/overlay surface inventory (current-state only)
  - List any “story”, “narrative”, or “overlay” artifacts/steps/surfaces that are produced or consumed today.
  - Treat them as legacy evidence to delete/replace; do not endorse them as target-model concepts in Phase 1.
- Upstream authoritative input review (if non-root)
- Upstream handoff review (changes to this domain made by the prior refactor)
- Downstream consumer inventory (current usage + contract dependencies)
- Current pipeline map (producer/consumer data-flow snapshot)
- Greenfield delta notes (what current-state evidence contradicts or constrains from the Phase 0.5 greenfield sketch)
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
- Story/narrative/overlay surface inventory (producers + consumers + file paths)
- Upstream authoritative input review (prior domain Phase 2 model + pipeline delta list)
- Upstream handoff review (prior refactor changes to this domain: compat shims, temporary adapters, legacy pathways)
- Downstream consumer inventory (current consumers + the contracts they rely on)
- Current pipeline map (producer/consumer data-flow snapshot)
- Typed-array inventory (constructors, lengths, validators)
- Deletion list (symbols + file paths that must go to zero)

Gate checklist (Phase 1 completion):
- The spike contains all five “living artifacts” sections (inventory, contract matrix, decisions, risks, golden path).
- Every boundary violation in scope is either listed as a deletion target or explicitly deferred.
- Any legacy “intervention mechanisms” are inventoried as evidence (no target-model endorsement).
- The deletion list exists and is concrete (symbols + file paths).
- Legacy surface inventory is complete (no “TBD” placeholders).
- Upstream authoritative inputs are reviewed and logged (if the domain is not the pipeline root).
- Upstream handoff review is explicit and lists upstream-introduced changes to remove.
- Downstream consumer inventory is explicit and complete.
- Current pipeline map exists and reflects current producers/consumers.

References:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`
