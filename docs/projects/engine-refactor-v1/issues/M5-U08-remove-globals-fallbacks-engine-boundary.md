---
id: M5-U08
title: "[M5] Remove ambient globals and silent fallbacks (make the engine boundary boring)"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Eliminate “it works because of globals/fallbacks” from runtime semantics by replacing ambient patterns with explicit wiring and explicit contracts.

## Goal

Make the engine boundary boring and predictable. Missing capabilities fail fast with clear errors, rather than silently degrading or warning+defaulting.

## Deliverables

- Replace `globalThis`-based runtime detection on hot paths with explicit wiring.
- Remove or scope module-level cached constants that act as process-wide hidden state.
- Replace “fallback constants + warnings” patterns with explicit adapter requirements and/or explicit run wiring.

## Acceptance Criteria

- Core has no `globalThis`-based runtime detection on hot paths.
- Adapter capability requirements are explicit; missing capability fails fast with a clear error.
- Process-wide cached constants are removed or scoped per run/adapter instance with explicit contracts.

## Testing / Verification

- Standard smoke test remains green under `MockAdapter`.
- A failing adapter capability produces a clear, deterministic error (tests added where appropriate).

## Dependencies / Notes

- **Paper trail:** CIV-67 risk notes + M5 spike.
- **Sequencing:** overlaps extraction; easier once M5-U02–U06 establish ownership boundaries.
- **Complexity × parallelism:** medium complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer explicit “required adapter capabilities” over environment sniffing.
- Keep civ-runtime-only integration in civ adapter packages, not in core.

## Prework Prompt (Agent Brief)

Goal: enumerate every remaining ambient pattern and propose its explicit replacement contract.

Deliverables:
- Inventory all remaining ambient patterns: `globalThis` detection, module-level caches, fallback defaults + warnings, implicit env detection.
- For each: propose the explicit replacement contract (adapter-provided capability, context-provided wiring, or civ-runtime-only integration layer).
- Identify which patterns are correctness-critical vs convenience-only (so we can prioritize deletions).

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

_TBD_

