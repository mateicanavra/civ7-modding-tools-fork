---
id: LOCAL-TBD-AUTO
title: "[M1] Dev-auto prompt variants + autonomous-development skill"
state: planned
priority: 2
estimate: 3
project: cli-orchestration-v0
milestone: M1
assignees: [codex]
labels: [Orchestration, Prompts]
parent: LOCAL-TBD
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Create autonomous `dev-auto-*` prompt variants and the shared `autonomous-development` skill so the orchestrator can run without interactive worktree logic.

## Deliverables
- [x] `dev-auto-parallel` prompt variant aligned to the contract (structured JSON, no worktree lifecycle).
- [x] `dev-auto-review-linear` prompt variant aligned to the contract (structured JSON, no worktree lifecycle).
- [x] `dev-auto-fix-review` prompt variant aligned to the contract (structured JSON, no worktree lifecycle).
- [x] `autonomous-development` skill that codifies auto-safe constraints (worktree rules, Graphite allowlist, structured output).

## Acceptance Criteria
- All three `dev-auto-*` variants reference the contract and emit required structured JSON.
- Prompts explicitly defer worktree creation/cleanup to the orchestrator.
- `autonomous-development` skill is referenced by each auto variant.

## Testing / Verification
- Manual dry-run of each `dev-auto-*` prompt in a controlled worktree to confirm JSON output shape matches the contract.

## Dependencies / Notes
- **Contract:** `docs/projects/cli-orchestration-v0/resources/CONTRACT-dev-auto-and-runner.md`
- **ADR:** `docs/projects/cli-orchestration-v0/resources/ADR-001-orchestration-v0.md`
- **Scope guardrail:** No orchestrator implementation changes in this issue.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
