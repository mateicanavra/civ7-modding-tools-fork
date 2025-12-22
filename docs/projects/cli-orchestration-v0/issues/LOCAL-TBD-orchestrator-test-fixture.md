---
id: LOCAL-TBD-TEST
title: "[M1] Orchestrator test fixture (sample input JSON)"
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
related_to: [LOCAL-TBD]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Add a tiny, easy-to-verify fixture file so the v0 orchestrator can run a single dev loop against a concrete, known input shape.

## Deliverables
- `scripts/cli-orchestration/fixtures/orchestrator-input.sample.json` containing a minimal, valid input payload for the `dev-auto-parallel` phase.

## Acceptance Criteria
- The fixture file exists at the expected path and uses the exact keys required by the contract:
  - `issueId`, `issueDocPath`, `milestoneId`, `branchName`, `worktreePath`.
- Values are clearly placeholder/test values (safe to overwrite by the orchestrator during real runs).

## Testing / Verification
- `cat scripts/cli-orchestration/fixtures/orchestrator-input.sample.json` shows the expected keys and valid JSON.

## Dependencies / Notes
- **Blocked by:** `LOCAL-TBD` (orchestrator bootstrap) since the fixture mirrors the v0 input contract.
- **Contract:** `docs/projects/cli-orchestration-v0/resources/CONTRACT-dev-auto-and-runner.md`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
