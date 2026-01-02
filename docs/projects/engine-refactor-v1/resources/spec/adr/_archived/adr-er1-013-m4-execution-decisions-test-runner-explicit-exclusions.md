---
id: ADR-ER1-013
title: "M4 execution decisions (test runner + explicit exclusions)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: overridden
system: mapgen
component: documentation
concern: project-policy
supersedes: []
superseded_by: null
archived: true
sources:
  - "M4-target-architecture-cutover-legacy-cleanup (Out of Scope list; Triage resolved decisions)"
---

# ADR-ER1-013: M4 execution decisions (test runner + explicit exclusions)

## Context

M4 is the cutover milestone for “no legacy left” architecture/infrastructure, but not a full “reify every internal step behavior” content milestone.

## Decision

- Tests for `mapgen-core` use Bun’s test runner (invoked via pnpm) for M4; any Vitest migration is explicitly post-M4.
- Explicit M4 exclusions (post-M4 work):
  - rainfall ownership transfer / climate prerequisite reification (`DEF-010`)
  - foundation artifact split into discrete `artifact:foundation.*` products (`DEF-014`)
  - recipe UI / mod patch tooling beyond “pick a recipe and run it”
  - algorithm modernization work (morphology/hydrology/ecology)
- Doc-only JS archives under `docs/**/_archive/*` are acceptable to keep; no M4 cleanup required.

## Consequences

- M4 completion criteria (“no legacy left”) refers to runtime architecture/infrastructure (single plan path; no stage/preset/dual orchestration/StoryTags surfaces), not full internal content reification for every step.
