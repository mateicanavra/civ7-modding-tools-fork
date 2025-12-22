---
name: autonomous-development
description: |
  Auto-safe development contract for orchestrated dev/review/fix workflows. Use when running dev-auto-* commands or any autonomous loop that relies on orchestrator-owned worktrees, explicit inputs, and structured JSON outputs. Trigger terms: "dev-auto", "autonomous", "orchestrator", "worktree lifecycle", "structured output".
---

# Autonomous Development Contract (Auto-Safe)

This skill defines the shared safety and output contract for **autonomous** dev/review/fix commands invoked by an orchestrator.

<core_invariants>
- Orchestrator owns worktree lifecycle. Commands must not create or remove worktrees.
- Inputs are explicit. Do not infer branch/worktree from Linear or other sources.
- Emit structured JSON only as the final assistant message (no prose after).
- Avoid global Graphite operations; use only allowlisted commands.
</core_invariants>

## Auto-safe guardrails

- **Worktree**: assume `cwd` is already the correct issue worktree; verify before edits.
- **Branch**: ensure the current branch matches the orchestrator-provided `branchName`; if not, emit a structured failure result.
- **Iteration**: do not run sub-issue loops; the orchestrator controls issue and review/fix iteration.

## Graphite allowlist (v0)

- Allowed: `gt ls`, `gt create`, `gt track`, `gt modify`, `gt sync --no-restack`, `gt restack --upstack`, `gt ss --draft`, `gt ss -u`.
- Not allowed: `gt sync` without `--no-restack`, global restacks, reparenting unrelated stacks, publishing PRs unless explicitly authorized.

## Output contract (v0)

- Final assistant message must be **JSON only** matching the phase schema.
- Prefer emitting a structured `status: "failed"` or `status: "deferred"` over crashing.
