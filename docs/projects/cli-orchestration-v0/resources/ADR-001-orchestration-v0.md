# ADR-001: CLI Orchestration Loop v0 Architecture

**Status:** Accepted
**Date:** 2025-12-21
**Context:** We need a lightweight, repo-local orchestration loop that can drive milestone issues through dev -> review -> fix cycles while staying compatible with existing prompt/skill workflows, Graphite, and local docs. Background spikes live under `docs/projects/cli-orchestration-v0/spikes/`.

**Decision:**
- Build a custom Bun/TypeScript orchestration script as the v0 control plane.
- Use the Codex TypeScript SDK as the default invocation/parsing layer, behind a runner abstraction so raw CLI can be swapped in later.
- Introduce autonomous prompt variants: `dev-auto-parallel`, `dev-auto-review-linear`, `dev-auto-fix-review`.
  - These live as commands in the `dev` plugin and are synced into `~/.codex/prompts/`.
  - Add a dedicated `autonomous-development` skill to centralize the auto-safe contract (worktree rules, Graphite allowlist, structured outputs).
- Enforce orchestrator-owned worktrees: one worktree per issue, created once, reused across phases, removed only after the issue loop completes or is capped.
- Use issue front matter under `docs/projects/**/issues/*.md` as the source of truth for milestone membership and dependencies; build a DAG with a stable linear fallback.
- Convergence uses `status: pass` from `dev-auto-review-linear`, with a max of 2 review/fix cycles as guardrail.
- Automation is allowed to run end-to-end (branches, Graphite ops, draft PRs, commits/pushes) starting from a clean, greenfield repo state.

**Consequences:**
- Orchestrator and prompts must honor strict input/output contracts and avoid internal worktree lifecycle changes.
- The SDK becomes the default transport, but the contract remains runner-agnostic for future CLI fallbacks or alternate providers.
- Prompt/skill authoring must introduce auto variants and a shared auto-safe skill before full automation can ship.
