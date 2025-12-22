---
description: Autonomous review phase for orchestrated workflows (no worktree lifecycle)
argument-hint: "ORCH_CONTEXT JSON block required"
---
# Dev-Auto Review (Autonomous)

**Contract:** `docs/projects/cli-orchestration-v0/resources/CONTRACT-dev-auto-and-runner.md`

You are running the **review phase** of an orchestrated loop. This command is **auto-safe** and must follow the `autonomous-development` skill constraints.

<core_rule>
The orchestrator owns worktree lifecycle. Do not create or remove worktrees.
</core_rule>

<output_verbosity_spec>
- Be candid and skimmable; prefer short sections and bullets over long narrative.
- **Final output must be JSON only**.
</output_verbosity_spec>

<inputs>
ORCH_CONTEXT (authoritative JSON block): provided inline by the orchestrator.
Full input: $ARGUMENTS
</inputs>

## Required behavior

- Treat the ORCH_CONTEXT block as authoritative input.
- **Do not** infer branch/worktree from Linear or other sources.
- **Do not** run sub-issue loops. The orchestrator controls iteration.
- Review only; do not apply fixes in this phase.
- If required inputs are missing or the environment is inconsistent, **still emit valid review JSON** with `status: "blocked"` and describe the issue in `summary`, `issues`, and `requiredActions`.

## Output contract (review phase)

The final assistant message must be **JSON only** matching this shape:

```json
{
  "phase": "review",
  "status": "pass",
  "issueId": "ISSUE-123",
  "milestoneId": "M1",
  "branch": "issue/ISSUE-123",
  "worktreePath": "/abs/path/to/worktree",
  "summary": "Short review summary",
  "issues": [{"severity": "high", "title": "...", "details": "...", "evidence": ""}],
  "requiredActions": ["..."],
  "followups": ["..."],
  "reviewDocPath": "docs/...",
  "confidence": "medium"
}
```

**All fields are required**. If a list is empty, return `[]`. `reviewDocPath` may be `""` when no review doc is written. For `issues[].evidence`, use `""` only when you truly have nothing to add; otherwise include concise pointers (file paths, commands, or reproduction notes). Use `"medium"` confidence by default.

Valid statuses: `"pass"`, `"changes_required"`, or `"blocked"`.

---

## Workflow (auto-safe)

1. **Parse ORCH_CONTEXT** and capture:
   - `issueId`, `issueDocPath`, `milestoneId`, `milestoneDocPath`, `branchName`, `worktreePath`, `maxReviewCycles`, `reviewCycle`.
   - `priorFixSummary` (optional; present when a review follows a fix cycle).
2. **Verify environment** (do not change worktree):
   ```bash
   pwd -P
   git rev-parse --show-toplevel
   git branch --show-current
   gt ls
   ```
   - If `branchName` does not match current branch, emit `status: "blocked"` and include the mismatch in `summary`/`requiredActions`.
3. **Review the work**:
   - Read the issue doc at `issueDocPath` and the relevant code/docs in this worktree.
   - Evaluate against acceptance criteria and contract constraints.
4. **Emit the final JSON result** (no prose afterward).

---

## Safety constraints

- Do not create/remove worktrees.
- Do not run global restacks or `gt sync` without `--no-restack`.
- Do not infer branch/worktree identity from Linear.
- Do not run internal sub-issue loops.
