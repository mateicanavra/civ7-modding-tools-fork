---
name: domain-refactor-operation-modules
description: |
  Entry point workflow for refactoring one MapGen domain to the canonical
  step ↔ domain contracts via operation modules architecture.
---

# WORKFLOW: Domain Refactor (Operation Modules)

This is the workflow entry point. It is intentionally a **thin** executable checklist that links to deeper references.

Canonical spec + legacy workflow (to be decomposed into this package):
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
- `docs/projects/engine-refactor-v1/resources/spec/WORKFLOW-step-domain-operation-modules.md`

Local references (this workflow package):
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/structure-and-module-shape.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`

<workflow>

<step name="preflight-and-worktree">

TODO: minimal preflight + worktree loop (Graphite).

</step>

<step name="domain-inventory">

TODO: required inventory artifact (all callsites/contracts/config/typed arrays/deletions).

</step>

<step name="lock-op-catalog">

TODO: fix op IDs/kinds/contracts and config ownership (no optionality).

</step>

<step name="implement-subissues">

TODO: repeated loop per subissue (ops → steps → scorched-earth deletions → tests).

</step>

<step name="verify-and-submit">

TODO: verification gates + guardrails + draft submission.

</step>

</workflow>

