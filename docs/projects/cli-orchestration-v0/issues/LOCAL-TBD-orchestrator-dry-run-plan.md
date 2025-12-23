---
id: LOCAL-TBD-TEST-PLAN
title: "[M1] Orchestrator: dry-run planning mode (no Codex, no worktrees)"
state: planned
priority: 3
estimate: 1
project: cli-orchestration-v0
milestone: M1
assignees: [codex]
labels: [Orchestration, Test]
parent: null
children: []
blocked_by: [LOCAL-TBD]
blocked: []
related_to: [LOCAL-TBD-TEST, LOCAL-TBD-TEST-REVIEW]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Add a `--dry-run` mode to the orchestrator CLI that prints the resolved issue plan (ordering + derived worktree/branch) and exits without invoking Codex or touching git worktrees.

## Deliverables
- Add a `--dry-run` flag to `scripts/cli-orchestration/orchestrate.ts`.
- When `--dry-run` is set:
  - Parse and filter issues by `--project` + `--milestone`.
  - Print the planned per-issue execution order (issue id + doc path) and the derived per-issue worktree + branch names.
  - Exit `0` without creating/removing worktrees and without calling the runner.
- Add a small Bun test that asserts:
  - The plan output includes the selected issue(s).
  - No worktree lifecycle functions are invoked in `--dry-run` mode.

## Acceptance Criteria
- Running:
  - `bun run scripts/cli-orchestration/orchestrate.ts --project cli-orchestration-v0 --milestone M1 --dry-run`
  prints a deterministic plan and exits successfully.
- No new worktree directories are created and `git worktree list` is unchanged after a dry run.

## Testing / Verification
- `bun test scripts/cli-orchestration/tests`
- Manual smoke:
  - `bun run scripts/cli-orchestration/orchestrate.ts --project cli-orchestration-v0 --milestone M1 --dry-run`
  - Confirm stdout includes the issue ids selected for M1 and the derived `wt-...` worktree path and branch name per issue.
  - Confirm `git worktree list` is unchanged.

## Dependencies / Notes
- **Blocked by:** `LOCAL-TBD` (bootstrap) since this is an orchestrator CLI behavior change.
- **Related:** `LOCAL-TBD-TEST` (dev-phase input fixture), `LOCAL-TBD-TEST-REVIEW` (review/fix result fixtures).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
