---
id: LOCAL-TBD-TEST-REVIEW
title: "[M1] Orchestrator test fixture (review/fix output samples)"
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
related_to: [LOCAL-TBD-TEST]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Add tiny, deterministic review/fix JSON fixtures (pass + changes_required) so the v0 orchestrator can validate schemas and exercise the review→fix loop without ambiguity.

## Deliverables
- `scripts/cli-orchestration/fixtures/review-result.pass.sample.json` matching `scripts/cli-orchestration/schemas/review.schema.json`.
- `scripts/cli-orchestration/fixtures/review-result.changes_required.sample.json` matching `scripts/cli-orchestration/schemas/review.schema.json`.
- `scripts/cli-orchestration/fixtures/dev-result.pass.sample.json` matching `scripts/cli-orchestration/schemas/dev.schema.json`.
- `scripts/cli-orchestration/fixtures/fix-result.pass.sample.json` matching `scripts/cli-orchestration/schemas/dev.schema.json` (phase = `fix`).

## Acceptance Criteria
- Fixture files exist at the paths above and are valid JSON.
- Fixtures validate against the corresponding JSON schemas:
  - Review fixtures include required nested fields (including `evidence`, empty string allowed).
  - Dev/fix fixtures include required nested fields (including `notes`, empty string allowed).
- `bun test scripts/cli-orchestration/tests` passes.

## Testing / Verification
- `cat scripts/cli-orchestration/fixtures/review-result.pass.sample.json`
- `cat scripts/cli-orchestration/fixtures/review-result.changes_required.sample.json`
- `cat scripts/cli-orchestration/fixtures/dev-result.pass.sample.json`
- `cat scripts/cli-orchestration/fixtures/fix-result.pass.sample.json`
- `bun test scripts/cli-orchestration/tests`

## Dependencies / Notes
- **Blocked by:** `LOCAL-TBD` (orchestrator bootstrap / schemas + runner already in place).
- **Related to:** `LOCAL-TBD-TEST` (input fixture for ORCH_CONTEXT).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

