## M1: CLI Orchestration v0.1 (Thin Slice)
**Goal:** Ship the first runnable orchestrator slice (single-issue dev loop, SDK runner, logging, and contracts).
**Status:** Planned
**Target Date:** TBD
**Owner:** Orchestration

### Acceptance Criteria
- Orchestrator can run a single issue through `dev-auto-parallel` and persist structured results.
- Worktree lifecycle is orchestrator-owned and prompt-safe.
- Issue selection uses milestone front matter with stable ordering.

### Issues / Deliverables
- [ ] LOCAL-TBD — Orchestration bootstrap (runner + dev-only loop)
- [ ] LOCAL-TBD-AUTO — Dev-auto prompt variants + autonomous-development skill

### Sequencing & Parallelization Plan
**Stacks Overview**
- Stack A: Orchestrator bootstrap (runner, issue discovery, worktree lifecycle, logging)
- Stack B: Dev-auto prompt variants + autonomous-development skill (parallel)

**Notes**
- Use Graphite stacks per `docs/process/GRAPHITE.md`.

### Risks
- Prompt sync drift between repo and `~/.codex/prompts`.
- Milestone/issue metadata inconsistencies.

### Notes
- Contract: `docs/projects/cli-orchestration-v0/resources/CONTRACT-dev-auto-and-runner.md`
