---
description: Autonomous dev phase for orchestrated workflows (no worktree lifecycle)
argument-hint: "ORCH_CONTEXT JSON block required"
---
# Dev-Auto Parallel (Autonomous)

**Contract:** `docs/projects/cli-orchestration-v0/resources/CONTRACT-dev-auto-and-runner.md`

You are running the **dev phase** of an orchestrated loop. This command is **auto-safe** and must follow the `autonomous-development` skill constraints.

<core_rule>
The orchestrator owns worktree lifecycle. Do not create or remove worktrees.
</core_rule>

<output_verbosity_spec>
- Work in a disciplined, production-quality way, but **final output must be JSON only**.
- Do not include prose after the final JSON.
</output_verbosity_spec>

<inputs>
ORCH_CONTEXT (authoritative JSON block): provided inline by the orchestrator.
Full input: $ARGUMENTS
</inputs>

## Required behavior

- Treat the ORCH_CONTEXT block as authoritative input.
- **Do not** infer branch/worktree from Linear or other sources.
- **Do not** run sub-issue loops. The orchestrator controls iteration.

## Phase responsibilities

- Implement the issue scope based on the issue doc referenced by `issueDocPath`.
- Update docs/tests as needed.
- Run relevant checks for the repo (per issue doc or repo defaults).
- Use Graphite for commits/stacking when making changes.

## Output contract (dev phase)

The final assistant message must be **JSON only** matching this shape:

```json
{
  "phase": "dev",
  "status": "pass",
  "issueId": "ISSUE-123",
  "milestoneId": "M1",
  "branch": "issue/ISSUE-123",
  "worktreePath": "/abs/path/to/worktree",
  "summary": "Short summary of what changed",
  "testsRun": [{"command": "bun run check-types", "status": "pass", "notes": ""}],
  "docsUpdated": ["docs/..."],
  "draftPrs": ["https://..."],
  "stackBranches": ["branch-name"],
  "deferred": ["..."],
  "openQuestions": ["..."]
}
```

On failure or deferral, set `status` to `"failed"` or `"deferred"` and explain in `summary`/`openQuestions`.

---

## Workflow (auto-safe)

1. **Parse ORCH_CONTEXT** and capture:
   - `issueId`, `issueDocPath`, `milestoneId`, `branchName`, `worktreePath`.
2. **Verify environment** (do not change worktree):
   ```bash
   pwd -P
   git rev-parse --show-toplevel
   git branch --show-current
   gt ls
   ```
   - If `branchName` does not match current branch, emit `status: "failed"`.
3. **Read the issue doc** at `issueDocPath` and confirm acceptance criteria.
4. **Implement the scoped work** in this worktree.
5. **Commit with Graphite**:
   ```bash
   gt add -A
   gt modify --commit -am "feat(orchestration): <summary>"
   ```
6. **Run required checks** (from issue doc or repo defaults).
7. **Submit draft PRs if required by the workflow**:
   ```bash
   gt ss --draft
   ```
8. **Emit the final JSON result** (no prose afterward).

---

## Safety constraints

- Do not create/remove worktrees.
- Do not run global restacks or `gt sync` without `--no-restack`.
- Do not infer branch/worktree identity from Linear.
- Do not run internal sub-issue loops.
