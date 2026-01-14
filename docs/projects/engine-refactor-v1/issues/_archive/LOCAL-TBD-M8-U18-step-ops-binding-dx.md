---
id: LOCAL-TBD-M8-U18
title: "[M8] Bind step-declared ops (remove manual op schema imports + local binding)"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M8
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - LOCAL-TBD-M7-U16
---

## TL;DR
- Make step authoring truly contract-first by letting step contracts declare the ops they use (`contract.ops`), deriving the step config schema from those op contracts, and binding runtime ops centrally so step implementations can call `ops.<op>(...)` without re-importing or re-binding anything.

## Problem
- Step contracts cannot express which ops they use, so authors “smuggle” op config schemas into step schemas via `domain.ops.<op>.config`.
- Step implementations then re-import domain ops, manually bind them, and often re-run op normalization logic locally.
- This duplicates compiler responsibilities, creates noisy imports, and makes ecology steps (and future domains) harder to refactor cleanly.

## Target outcome (canonical)
- **Single source of truth:** `step.contract.ops` drives:
  - Step config schema shape (includes op envelopes under stable keys).
  - Op envelope default prefill during compilation.
  - Op envelope normalization during compilation.
  - Runtime callable ops surface for `step.run`.
- **Contract-first DX:**
  - Step `contract.ts` imports only `Type` (and op contracts), never runtime op implementations.
  - Step `index.ts` imports only the step contract + step factory; ops are provided as a typed `ops` param.
- **Engine is domain-agnostic:** binding uses registries keyed by op id; steps remain structurally ignorant of domains.

## Deliverables
- [ ] Add `ops` to the authoring `StepContract` and `defineStep(...)` API.
- [ ] Derive step config schemas from `contract.ops` (single strict `Type.Object(...)` output; no schema intersections).
- [ ] Add/land a runtime op registry (`runtimeOpsById`) at the recipe boundary and bind once per step invocation.
- [ ] Update step run typing to allow `run(context, config, ops)` with full autocomplete for declared ops.
- [ ] Migrate ecology steps to the golden path (remove local op binding + manual op normalization).
- [ ] Add tests that prove:
  - Missing runtime op implementations for declared contracts fail loudly.
  - Compiler normalization + defaults are applied via `contract.ops` without step-local re-implementation.
- [ ] Add guardrails to prevent regressions (lint/grep rule or reviewer checklist).

## Acceptance Criteria
- A step that declares `ops` does not need to:
  - Embed op config schemas manually (no `domain.ops.<op>.config` in step contracts).
  - Bind ops locally in `step.run` implementations.
  - Call op normalization helpers inside `step.normalize` / `resolveConfig`.
- Step compilation:
  - Prefills op defaults and normalizes declared op envelopes using op contracts.
  - Enforces strict config shape (unknown keys rejected).
- Step runtime:
  - Provides `ops` as a typed callable surface scoped to the step’s declared ops.
  - Does not require step authors to import runtime op implementations in step files.

## References
- `docs/projects/engine-refactor-v1/remediation/issue-doc-audit-m7-architecture-drift.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md`
