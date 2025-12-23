---
id: LOCAL-TBD
title: "[M1] Orchestration bootstrap (runner + dev-only loop)"
state: planned
priority: 3
estimate: 5
project: cli-orchestration-v0
milestone: M1
assignees: [codex]
labels: [Orchestration]
parent: null
children: [LOCAL-TBD-AUTO]
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Implement the first thin slice of the Bun/TS orchestrator: runner abstraction, Codex SDK runner, issue discovery, and a single-issue dev-only loop with logging.

## Deliverables
- Orchestrator scaffold with core types (`Runner`, `Phase`, `PhaseResult`, `IssuePlan`) and a CLI entrypoint stub.
- Minimal Codex SDK runner that executes `dev-auto-parallel` and returns structured JSON per the contract.
- Issue discovery that parses front matter under `docs/projects/**/issues/*.md` and builds a simple ordered list.
- Single-issue dev loop that creates an orchestrator-owned worktree, runs the dev phase once, logs results, and tears down per contract.
- Minimal logs and result persistence under `logs/orch/<milestone>/<issue>/...`.

### Sub-issues (v0.1 thin slice)
1. **Dev-auto prompt variants + autonomous-development skill**  
   Create `dev-auto-parallel`, `dev-auto-review-linear`, and `dev-auto-fix-review` plus the shared `autonomous-development` skill, aligned to the contract (no worktree lifecycle, structured JSON outputs).  
   **Depends on:** none.
2. **Orchestrator scaffold + runner interface**  
   Define core types (`Runner`, `Phase`, `PhaseResult`, `IssuePlan`) and a CLI entrypoint stub for milestone selection.  
   **Depends on:** none.
3. **Codex SDK runner (dev-auto-parallel only)**  
   Implement a minimal `CodexSdkRunner` that invokes `dev-auto-parallel`, enforces the output schema, and returns the structured JSON result.  
   **Depends on:** Sub-issue 2.
4. **Issue discovery (front matter, linear ordering)**  
   Parse issue front matter under `docs/projects/**/issues/*.md`, filter by milestone, and produce a stable linear list (DAG support later).  
   **Depends on:** none.
5. **Single-issue dev loop with worktree lifecycle**  
   For one issue: create orchestrator-owned worktree, run `dev-auto-parallel` once via the runner, log outputs, and tear down per contract.  
   **Depends on:** Sub-issues 2–4.
6. **Logging and basic result persistence**  
   Persist raw event logs and final JSON results under `logs/orch/<milestone>/<issue>/...` for inspection.  
   **Depends on:** Sub-issues 2–5.

## Acceptance Criteria
- Orchestrator can run a single issue through `dev-auto-parallel` and persist structured results.
- Worktree lifecycle is orchestrator-owned and complies with the contract (no prompt-driven worktree changes).
- Issue selection uses front matter milestone filtering with a stable linear order.
- Logs include both raw SDK stream data and a final JSON result for the phase.

## Testing / Verification
- Dry-run the orchestrator against a single issue doc in this project (manual invocation documented in the implementation).
- Verify logs exist under `logs/orch/<milestone>/<issue>/` and include the final JSON result.

## Dependencies / Notes
- **Project docs:**  
  - ADR: `docs/projects/cli-orchestration-v0/resources/ADR-001-orchestration-v0.md`  
  - PRD: `docs/projects/cli-orchestration-v0/resources/PRD-cli-orchestration-v0.md`  
  - Contract: `docs/projects/cli-orchestration-v0/resources/CONTRACT-dev-auto-and-runner.md`
- **Runner default:** Codex TypeScript SDK for v0 (runner abstraction keeps CLI swap possible later).
- **Scope guardrail:** Dev-only loop for v0.1; review/fix loop is intentionally out of scope here.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
