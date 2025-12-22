# Spike: Codex approvals, sandboxing, and add-dir behavior

## Objective
Capture what we learned about Codex approvals/permissions while wiring orchestration (git + Graphite writes across worktrees).

## Sources
- Local runner behavior and error logs from orchestration runs

## What we learned (observed)
- The runner must explicitly allow access to git common dir and Graphite config directory when operating across worktrees.
- Without those directories in the allowlist, Codex fails when it tries to write git/Graphite metadata.
- Using full auto-approve (approvalPolicy: "never") is required for non-interactive orchestration.

## Notes
- These findings are based on local behavior in our repo and runner configuration, not official CLI documentation.
- We should validate against official Codex CLI docs if we later want to support a CLI subprocess runner.

## Open questions
- Official Codex CLI flags or config for permissions (if any) that mirror the SDK runner settings.
- Whether additional directories must be explicitly set for other tools (e.g., hooks, git hooks, or other dotdirs).
