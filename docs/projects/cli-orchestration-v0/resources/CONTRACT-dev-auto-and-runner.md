# Dev-Auto Contract and Codex Runner Cheat Sheet (v0)

**Status:** Canonical contract for the first Bun/TypeScript orchestrator (runner-agnostic; Codex SDK default, CLI fallback).

This document defines the **minimum viable contract** between the orchestrator and the `dev-auto-*` prompt variants, plus the **Codex runner invocation/parsing rules** the orchestrator will code against. The contract is **runner-agnostic**; only the transport layer changes (SDK vs CLI).

---

## dev-auto-* Autonomous Contract

### Commands covered

- `dev-auto-parallel` (dev phase)
- `dev-auto-review-linear` (review phase)
- `dev-auto-fix-review` (fix phase)

**Placement (v0 decision):**
- Source prompts live in the repo under `plugins/dev/commands/`:
  - `plugins/dev/commands/dev-auto-parallel.md`
  - `plugins/dev/commands/dev-auto-review-linear.md`
  - `plugins/dev/commands/dev-auto-fix-review.md`
- The `autonomous-development` skill lives at `plugins/dev/skills/autonomous-development/SKILL.md`.
- Sync into `~/.codex/prompts/` and `~/.codex/skills/` via the `~/.claude/plugins/local/plugins/meta/scripts/sync_to_codex.py` workflow.

### A) Inputs (from the orchestrator)

**Common required inputs (all phases):**
- `issueId` (string)
- `issueDocPath` (absolute or repo-relative path)
- `milestoneId` (string)
- `milestoneDocPath` (absolute or repo-relative path)
- `branchName` (string, explicit; do **not** infer from Linear)
- `worktreePath` (absolute path)
- `maxReviewCycles` (number; used for reporting only)
- `reviewCycle` (number, 1-based)

**Phase-specific inputs:**
- `dev-auto-review-linear`:
  - `priorFixSummary` (optional string; provided when review follows a fix cycle)
- `dev-auto-fix-review`:
  - `reviewResult` (required object matching the review schema; passed inline in the prompt)

**Input contract (hard rules):**
- The orchestrator sets `cwd` to `worktreePath` before invoking a command.
- Commands **must not** infer branch/worktree from Linear or other sources.
- If required inputs are missing or inconsistent with the current repo state, the command must emit a **structured failure result** (see Output Contract) and exit non-zero.

**Input delivery format (v0):**
- The orchestrator prepends a JSON context block to the prompt:

```json
ORCH_CONTEXT:
{"issueId":"ISSUE-123","issueDocPath":"docs/projects/.../issues/ISSUE-123.md","milestoneId":"M4","milestoneDocPath":"docs/projects/.../milestones/M4.md","branchName":"issue/ISSUE-123","worktreePath":"/path/to/wt-ISSUE-123","maxReviewCycles":2,"reviewCycle":1}
```

Prompt authors should treat this block as authoritative.

### B) Behavior contract

**Worktree rules (mandatory):**
- Orchestrator owns worktree lifecycle.
- Commands **must not** create or remove worktrees.
- Commands may run safety checks (e.g., verify `cwd` is a worktree), but may not modify worktree lifecycle.

**Phase responsibilities:**
- `dev-auto-parallel`:
  - Implement the issue scope.
  - Update docs/tests as needed.
  - Run relevant checks described by the issue or repo defaults.
  - Prepare Graphite changes and draft PRs if required by the workflow.
- `dev-auto-review-linear`:
  - Perform a structured review **only** (no fixes).
  - Surface required changes, blockers, and follow-ups in the JSON output.
  - Optionally append to a review doc if that is part of the workflow (not required for v0).
- `dev-auto-fix-review`:
  - Address the specific review points from `reviewResult`.
  - Update code/docs/tests as needed.
  - Run relevant checks for the fixes.

**Graphite / git rules (v0 allowlist):**
- **Allowed:** `gt ls`, `gt create`, `gt track`, `gt modify`, `gt sync --no-restack`, `gt restack --upstack`, `gt ss --draft`, `gt ss -u`.
- **Not allowed:** global restacks, `gt sync` without `--no-restack`, reparenting/moving unrelated stacks, publishing PRs (e.g., `gt ss --publish`) unless explicitly authorized.

**Sub-issue / multi-issue rules:**
- Commands must not run internal sub-issue loops.
- The orchestrator owns iteration across issues and review/fix cycles.

### C) Output contract (structured JSON)

**All commands must emit structured JSON** as the final assistant message (JSON only, no prose) and adhere to the phase schema. The orchestrator treats this JSON as the authoritative result for control flow.

**Common required fields (all phases):**
- `phase`: `"dev"` | `"review"` | `"fix"`
- `status`: phase-specific (see below)
- `issueId`
- `milestoneId`
- `branch`
- `worktreePath`
- `summary` (short string)

#### `dev-auto-parallel` / `dev-auto-fix-review` (dev/fix phases)

**Required fields:**
- `phase`: `"dev"` or `"fix"`
- `status`: `"pass"` | `"failed"` | `"deferred"`
- `issueId`, `milestoneId`, `branch`, `worktreePath`, `summary`

**Optional fields (recommended):**
- `testsRun`: array of `{ command, status, notes }` — `notes` is required (empty string allowed, but include context when available)
- `docsUpdated`: string[] (paths)
- `draftPrs`: string[] (urls)
- `stackBranches`: string[]
- `deferred`: string[]
- `openQuestions`: string[]

#### `dev-auto-review-linear` (review phase)

**Required fields:**
- `phase`: `"review"`
- `status`: `"pass"` | `"changes_required"` | `"blocked"`
- `issueId`, `milestoneId`, `branch`, `worktreePath`, `summary`

**Optional fields (recommended):**
- `issues`: array of `{ severity, title, details, evidence }`
- `requiredActions`: string[]
- `followups`: string[]
- `reviewDocPath`: string
- `confidence`: `"low"` | `"medium"` | `"high"`

### D) Error / failure semantics

**Preferred behavior:** emit a structured JSON result **even on failures**.

- Use `status: "failed"` for unrecoverable phase errors (missing inputs, not in a git repo, not in expected worktree).
- Use `status: "deferred"` for soft failures where work cannot proceed without human input (missing dependency, ambiguous requirements).
- Only exit non-zero when the phase is truly unrecoverable. If possible, emit the JSON result **before** exiting non-zero.

The orchestrator will stop review/fix cycles when:
- `dev-auto-review-linear` returns `status: "pass"` (success), or
- `status: "blocked"` (halt issue and record as blocked), or
- max review/fix cycles are reached (guardrail).

---

## Codex Runner Invocation and Parsing (Orchestrator v0)

### A) Codex SDK (default runner)

**Default runner:** Codex TypeScript SDK.

**Canonical usage (conceptual):**
- Invoke the prompt with `output_schema` enforcement (SDK `run`/`runStreamed`).
- Use the SDK’s **final response** as the authoritative structured JSON result.
- If streaming is enabled, persist the SDK event stream for observability.

**Runner contract:**
- The SDK must return the final assistant message as **valid JSON** matching the phase schema.
- The orchestrator treats that JSON as the authoritative result for control flow.

### B) Codex CLI (fallback runner)

**Required flags (all phases):**
- `--json` (JSONL streaming)
- `--full-auto` (non-interactive)
- `--output-schema <schemaPath>` (phase-specific schema enforcement)

**Phase invocation (example):**

```
codex exec \
  --json \
  --full-auto \
  --output-schema scripts/cli-orchestration/schemas/dev.schema.json \
  "<rendered prompt>"
```

**Environment expectations:**
- `cwd` is the issue worktree (`worktreePath`).
- Codex CLI is authenticated and ready.
- Repo is in the clean, greenfield state defined in the orchestration docs.

### C) What output we parse (authoritative source)

**V0 choice (SDK default):** use the SDK’s **final response** as the structured JSON result that must match the schema.

**CLI fallback:** parse JSONL stdout, find the **last assistant message**, and parse its `message` as the structured JSON result.

Rules:
- Record all JSONL lines for observability.
- Extract the last `assistant_message` event (or equivalent event that carries the assistant’s final message).
- Parse its `message` field as JSON and validate against the phase schema.
- That parsed object is the **authoritative result** for orchestrator control flow.

### D) Logging / observability (minimal convention)

**Per phase:**
- Raw events: `logs/orch/<milestoneId>/<issueId>/<phase>.jsonl` (SDK stream events or CLI JSONL stdout)
- Parsed result: `logs/orch/<milestoneId>/<issueId>/<phase>-result.json`
- Stderr: `logs/orch/<milestoneId>/<issueId>/<phase>.stderr.log`

Logs live in the **repo root** so they persist after issue worktrees are removed. (Add to `.gitignore` separately.)

### E) Runner-layer error handling (v0)

**Runner exits non-zero / throws:**
- Mark phase as `failed`.
- Persist stdout/stderr logs.
- Stop the issue loop (no review/fix retries), unless manually resumed.

**Runner returns but structured JSON is missing/invalid:**
- Treat as `failed`.
- Persist logs.
- Stop the issue loop.

**Retries:** none in v0 (avoids repeated side effects); manual rerun is the safe path.

---

## Pre-run checklist (v0)

- Codex SDK available and configured (CLI fallback should also be authenticated).
- Repo in clean, greenfield state (no unexpected stacks/worktrees).
- Issue docs and milestone doc are present and parse cleanly.
- Schema files exist for each phase (`dev`, `review`, `fix`).
