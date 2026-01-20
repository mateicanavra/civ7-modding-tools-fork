<implementation_prompt>
  You are implementing the Hydrology vertical domain refactor (Phases 4–5). The model is locked.
  Your job is to execute the Phase 3 slice plan end-to-end, keep the pipeline green after every slice,
  and delete legacy surfaces without drifting into “make it work” compatibility.

  Do not start coding until you have deeply studied the authority docs listed below.

  The Phase 3 Hydrology issue doc is the authoritative tracker for:
  - the slice index and sequencing rationale,
  - locked decisions/bans (and their guardrails),
  - config semantics (meaning + default/empty/null + determinism policies),
  - stable fix anchors,
  - consumer migration matrix (break/fix per slice),
  - acceptance criteria and verification gates.

  Execution posture:
  - One Graphite branch/PR per slice (or explicit subissue you carve out inside a slice).
  - Each slice ends pipeline-green with migrations, deletions, docs/tests, and guardrails complete before moving on.
  - No dual paths within scope. No shims/compat layers are allowed as a refactor technique; redesign the slice to migrate and delete instead.

  Non-negotiable invariants (drift prevention):
  - Model-first: the canonical model is the source of truth even if artifacts/projections change.
  - No compat inside Hydrology: Hydrology must not publish or retain legacy compat/projection surfaces.
    Do not introduce deprecated downstream shims; migrate consumers and delete in-slice.
  - Narrative overlays are forbidden in this refactor phase: remove story/narrative/overlay surfaces entirely. Replace any load-bearing ones with canonical, domain-anchored contracts and migrate consumers.
  - Ops are data-pure; steps own runtime binding: no runtime views, callbacks, trace handles, or RNG functions cross the op boundary.
  - RNG crosses boundaries as data only: steps pass deterministic seeds; ops build local RNGs.
  - Defaults belong in schemas; derived/scaled values belong in normalize; run bodies assume normalized config and must not hide defaults.
  - Hard ban: no hidden multipliers/constants/defaults (no unnamed behavior-shaping numbers in compile/normalize/run paths).
  - Hard ban: no placeholders / dead bags (no empty directories, empty config bags, or future scaffolding).
  - No freezing/snapshotting at publish/return boundaries to simulate immutability.
  - No monolith drift: step boundaries are the architecture. Follow the causality spine and step decomposition plan; do not collapse steps.
  - Types follow schemas: do not hand-duplicate TS shapes when a schema exists; derive types from schemas.

  Semantic knobs (required contract discipline):
  - For any semantic knob you touch (lists/pairs/weights/modes), do not infer meaning ad hoc in run code.
  - Use the Phase 2 Config Semantics Table as the contract:
    - meaning, missing vs explicit default policy, empty/null behavior, determinism expectations.
  - If a reviewer thread reveals ambiguity, run a “contract clarification” micro-step before coding:
    - write the rule (meaning/default/empty/determinism),
    - confirm against at least two usages/call sites,
    - add/update a deterministic test that locks the semantics.

  Fix placement durability (survivability validation):
  - Prefer fixes at stable anchors (domain boundary / “config → normalized internal form” normalization), not in code likely to move next slice.
  - Before committing a fix, ask: “will this still apply after the next slice lands?”
  - Lock non-trivial behavior with deterministic tests, not just prose.

  Locked decisions must be enforced, not just written:
  - Whenever you introduce or restate a locked decision/ban during implementation, it must become a guardrail (test or scan) in that same slice.
    Do not defer guardrails “until cleanup”.

  Drift protocol (stop the line):
  If you detect drift (preserving legacy nesting, adding hidden fallbacks, smuggling runtime concerns, collapsing steps,
  authority confusion, or a spec decision changing mid-flight), stop and:
  - write a short status report in the issue doc (what changed, what is in-flight, what is next),
  - re-baseline slice gates/checklists in the issue doc so the new reality is explicit,
  - split vague “later” work into explicit subissues and branches,
  - add guardrails so the violation cannot reappear (same slice).

  Tooling discipline:
  - Use ripgrep/file search for bulk discovery and “find all occurrences”.
  - Use the code-intel MCP server when semantics matter: producer/consumer mapping, call-path tracing, symbol references,
    and contract surface mapping. Prefer it to avoid incorrect assumptions.

  Civ7 official resources (engine interop only):
  - Use Civ7 resources as evidence/constraints for engine-facing projections only.
  - Do not import Civ7’s domain modeling choices as requirements for our internal canonical model.

  Documentation is part of done:
  - For every touched schema/function/op/step/stage/contract, update JSDoc and schema descriptions with behavior,
    defaults, modes, and downstream impacts.
  - For semantic knobs, docs must also state missing/empty/null meaning and determinism expectations.

  Paths (authority + workflow; shared root: docs/projects/engine-refactor-v1/)

  Hydrology artifacts and tracker:
  - issues/LOCAL-TBD-<milestone>-hydrology-*.md
  - resources/spike/spike-hydrology-greenfield.md
  - resources/spike/spike-hydrology-current-state.md
  - resources/spike/spike-hydrology-modeling.md

  Workflow entrypoints:
  - resources/workflow/domain-refactor/WORKFLOW.md
  - resources/workflow/domain-refactor/IMPLEMENTATION.md

  Core references:
  - resources/workflow/domain-refactor/references/op-and-config-design.md
  - resources/workflow/domain-refactor/references/implementation-reference.md
  - resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md
  - resources/workflow/domain-refactor/references/verification-and-guardrails.md
  - resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md
  - resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md
  - resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md
  - resources/workflow/domain-refactor/references/phase-3-implementation-plan.md

  Hydrology prior art / drafts:
  - resources/workflow/domain-refactor/plans/hydrology/HYDROLOGY.md

  Paths (Civ7 official resources; engine interop constraints only)
  - .civ7/outputs/resources/Base/modules/base-standard
</implementation_prompt>
