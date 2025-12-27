---
id: M5-U07
title: "[M5] Delete dead/compat/deprecation-only surfaces (make “no dead code” true)"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Stop shipping transitional affordances: delete legacy entrypoints, compat aliases/no-ops, unused shims, and deprecated/no-op schema fields.

## Goal

Make the public surface truthful. If something exists only “just in case,” it keeps the repo in transition forever; M5 deletes those surfaces and enforces “no legacy” invariants.

## Deliverables

- Delete legacy stub entrypoints, back-compat aliases/no-ops, and unused shims across mapgen packages.
- Delete deprecated/no-op config keys from schemas (or reject loudly) so config does not accept legacy-only fields.
- Audit package exports and tighten them so only real, supported surfaces remain.
- Establish/refresh “no legacy surface” invariant checks (zero-hit checks) as guardrails.

## Acceptance Criteria

- Dead exports/entrypoints are deleted (not merely deprecated).
- Deprecated/no-op config keys are removed or rejected loudly; no “compat parse” in the target architecture.
- Public exports are tightened (no compat-only exports remain).
- “No legacy surface” invariants are true (zero hits in runtime sources).

## Testing / Verification

- Workspace typecheck/build remains green.
- Standard smoke test remains green under `MockAdapter`.
- Suggested guardrails (exact patterns refined in prework): `rg`-based zero-hit checks for legacy namespaces/surfaces.

## Dependencies / Notes

- **Sequencing:** best after M5-U02–U06 extraction so deletions don’t fight relocations; some deletions can run in parallel once confirmed unused.
- **Complexity × parallelism:** low–medium complexity, high parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer hard deletion + fast failure over “keep legacy behind a compat layer.”
- Treat any remaining external consumers as a release-note/breaking-change problem, not a reason to keep shims indefinitely.

## Prework Prompt (Agent Brief)

Goal: produce a complete deletions inventory so implementation is a deterministic cleanup pass.

Deliverables:
- A deletions inventory for mapgen packages: dead exports, deprecated schema fields, unused shims, runtime-only compat modules.
- For each item: (a) in-repo consumer check, (b) likelihood of external consumers, (c) whether removal must be gated by a coordinated change outside this repo.
- A proposed set of “no legacy surface” `rg` checks that should be zero-hit by end of M5 (suitable for CI guardrails).

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths) to avoid missing transitive consumers. Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

