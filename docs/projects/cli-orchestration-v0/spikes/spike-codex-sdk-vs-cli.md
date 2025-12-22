# Spike: Codex SDK vs CLI (invocation and parsing)

## Objective
Assess whether our CLI JSONL parsing and schema handling is re-implementing the Codex SDK, and decide the right invocation layer for v0.

## Sources
- Internal dev-auto contract and runner notes
- Codex SDK docs/probe output (runner usage, event stream)

## What we learned
- The Codex SDK already provides streaming events, final message extraction, and typed request/response handling.
- Our CLI JSONL parsing replicates these features with more manual work (process management, schema parsing, error handling).
- The dev-auto contract (inputs/outputs) is runner-agnostic; only the transport changes.

## Recommendation for v0
- Use the Codex SDK as the primary runner for v0.
- Keep a Runner abstraction so a CLI subprocess runner can be swapped later if needed.
- Keep the dev-auto contract unchanged (same schema, same output requirements) regardless of runner.

## Implications
- Simplifies streaming and parsing logic.
- Reduces surface area for JSONL parsing bugs.
- Keeps the orchestrator focused on workflow control rather than transport plumbing.

## Open questions
- Whether we need a CLI runner as a fallback for non-Node environments.
- How much SDK behavior should be surfaced in logs vs distilled into orchestrator-level JSON outputs.
