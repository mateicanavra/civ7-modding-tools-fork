---
id: M1-review
milestone: M1
title: "M1: CLI Orchestration v0 — Aggregate Review"
status: draft
reviewer: AI agent (Codex CLI)
---

# M1: CLI Orchestration v0 — Aggregate Review (Running Log)

This running log captures task-level reviews for milestone M1.

---

## LOCAL-TBD – Orchestration bootstrap (runner + dev-only loop)

**Reviewed:** 2025-12-21

- **Intent/AC:** Deliver a dev-only orchestrator slice (runner abstraction, issue discovery, worktree lifecycle, logs).
- **Strengths:** Clear modular split (`runner`, `issue-discovery`, `worktree`, `logging`), dev schema enforcement, logs persisted under `logs/orch/<milestone>/<issue>/`.
- **Issues:** Orchestrator passes an empty `milestoneDocPath` despite the contract requiring it; issue discovery filters only by `milestoneId` (no project scoping); no in-repo run instructions found beyond CLI usage text.
- **Follow-ups:** Resolve `milestoneDocPath` from a milestone doc (fail fast if missing), scope issues by project/milestone doc, document a minimal manual invocation path.

## LOCAL-TBD-AUTO – Dev-auto prompt variants + autonomous-development skill

**Reviewed:** 2025-12-21

- **Intent/AC:** Provide `dev-auto-*` autonomous prompts and the shared auto-safe skill.
- **Strengths:** Prompts enforce JSON-only output and worktree constraints; skill codifies Graphite allowlist and non-interactive contract.
- **Issues:** Prompt definitions and the skill are not versioned in-repo (they live under `~/.codex`), which conflicts with the contract’s “dev plugin” placement and makes orchestration non-reproducible for fresh clones.
- **Follow-ups:** Move prompt sources into the repo’s plugin structure and document the sync step into `~/.codex/prompts`; add explicit contract references in prompt headers.
