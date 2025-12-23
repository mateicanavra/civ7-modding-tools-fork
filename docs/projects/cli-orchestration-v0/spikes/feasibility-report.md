# Feasibility Report: CLI Orchestration Loop (Codex-first)

**Date:** 2025-12-21
**Type:** Spike Feasibility (Integration-focused)
**Status:** Draft

---

### 1) Objective

Assess feasibility and integration shape for a lightweight milestone -> issues -> dev/review/fix loop using CLI-only orchestration, grounded in this repo's local milestone/issue docs and existing prompt templates.

### 2) Assumptions and Unknowns

**Decisions (locked for this report):**
- **Source of truth:** local docs are canonical. The loop should **fail fast** if milestone/issue docs are missing or unparsable. No silent fallback to Linear.
- **Issue selection + ordering:** issue front matter is canonical for milestone membership and dependencies. Build a DAG from dependency fields and fall back to a stable linear order when needed.
- **Agent split:** Codex CLI runs **dev** and **fix** phases. Review is also Codex for now, with a seam to swap in Claude later.
- **Convergence:** primary signal is a **structured `status: pass`** from the review step. Guardrail: max **2 review/fix cycles per issue**.
- **Prompt trio:** dev uses **`dev-parallel`**, review uses **`dev-review-linear`**, fix uses **`dev-fix-review`** (via `dev-auto-*` variants).
- **Worktree lifecycle:** **one dedicated worktree per issue**, created once by the orchestrator and removed only after the issue loop finishes. Prompts must **not** create or remove worktrees.
- **Precondition:** runs start from a **clean, greenfield state** (no pre-existing stacks/worktrees that could interfere).
- **Prompt strategy:** use **separate autonomous prompt variants** (not wrappers), with a `dev-auto-` prefix:
  - `dev-auto-parallel`
  - `dev-auto-review-linear`
  - `dev-auto-fix-review`

**Assumptions:**
- The issue list and ordering can be derived from issue front matter under `docs/projects/**/issues/` (`milestone`, `blocked_by`, `blocking`, etc.).
- The global prompt templates in `/Users/mateicanavra/.codex/prompts/` are available to the script at runtime.
- Codex CLI is installed, authenticated, and supports JSON/JSONL output as documented in the spike.

**Unknowns that still matter:**
- Where to persist logs and run state (repo-local `logs/` vs external path) and whether to ignore them in git.
- The exact JSON event types emitted by Codex JSONL in this environment (affects parsing heuristics).
- Exact file layout / directory structure for the new `dev-auto-*` prompt variants (and how they’re distributed/installed).
- Whether/when to extract shared “auto-safe” behavior into a skill once patterns stabilize (non-blocking).

### 3) Feasibility Verdict (Evidence-backed)

**Feasible with caveats.**

Evidence: the CLI orchestration spike at `docs/projects/cli-orchestration-v0/spikes/claude-codex-cli-orchestration-spike.md` confirms `codex exec --json`, `--output-schema`, `resume`, and notify hooks. The repo already uses structured milestone/issue docs with required front matter (`docs/process/LINEAR.md`). This is enough to drive a sequential loop from local docs. Caveats are mostly around convergence policy, session management, and prompt side effects (Graphite/worktrees).

### 4) Primary Recommendation

Start with a **CLI-only Bun/TypeScript script** that:
- Parses issue docs locally (fail fast on errors), then derives milestone membership + dependency ordering from front matter.
- Runs Codex subprocesses with JSONL output for dev/review/fix.
- Enforces a structured review schema with `status: pass | changes_required | blocked`.
- Caps review/fix loops at 2 per issue.
- Owns the issue worktree lifecycle (create once, reuse for all phases, remove at end).

**Prompt adaptation (locked):** create **autonomous prompt variants** for `dev-parallel`, `dev-review-linear`, `dev-fix-review` (named `dev-auto-*`) that remove internal worktree creation/cleanup and subissue loops, and rely on the orchestrator’s worktree. Consider extracting shared “auto-safe” behavior into a skill later once the variant set stabilizes.

**Auto prompt strategy (tradeoffs):**
- **Option A: Separate `dev-auto-*` variants (chosen).** Clear separation from interactive prompts; easiest to make worktree-free and orchestrator-owned. Slight duplication until patterns stabilize.
- **Option B: Shared skill + thin `dev-auto-*` shims (defer).** Lower duplication and consistent constraints, but adds an extra abstraction before the contracts are proven.
- **Option C: Wrapper prompts around existing ones.** Lowest edit footprint but brittle: existing prompts contain explicit worktree creation/cleanup steps that conflict with the orchestrator spec.

**Naming (locked):** use a `dev-auto-` prefix (`dev-auto-parallel`, `dev-auto-review-linear`, `dev-auto-fix-review`) to keep names recognizable while clearly distinguishing autonomous variants.

**Authoring convention (based on local prompt tooling):** use the plugin-content workflow (`manage-prompts`) as the canonical way to create/maintain these prompts: author as Claude plugin **commands**, then sync to Codex prompts, rather than editing `~/.codex/prompts` directly.

Defer SDK usage until you need richer streaming or programmatic hooks.

**Where this should live (recommended):**
- Put the `dev-auto-*` commands in the existing **`dev` plugin** (they are “dev workflows in autonomous mode”).
- Add a dedicated skill (recommended name: `autonomous-development`) that encodes the shared auto-safe contract (worktree ownership, input contract, structured outputs, Graphite allowlist).
- Keep the existing interactive commands unchanged for manual use.

### 5) What This Would Look Like Here (Conceptual "Shape")

- **Milestone/issue model:** Parse all issue docs and filter by `milestone` front matter. Build a dependency-aware order from `blocked_by`/`blocking`, with a linear fallback.
- **Agent model:** An agent is `cli + auto prompt template + session/thread id + logs`. Codex runs dev/fix (and review for now).
- **Phase completion:** Process exit + structured review JSON indicates completion and convergence. Use `--output-schema` to guarantee review output shape.
- **Loop:** For each issue, run dev once, then review -> fix until `status: pass` or max cycles reached. If capped, write remaining issues to a per-issue summary and proceed.
- **Worktrees:** Orchestrator creates one worktree per issue, runs all phases inside it, then removes it after the loop completes.

### 6) Major Touchpoints / Impacted Areas

- Spike foundation: `docs/projects/cli-orchestration-v0/spikes/claude-codex-cli-orchestration-spike.md`
- Prompt templates (global): `/Users/mateicanavra/.codex/prompts/dev-parallel.md`, `review-linear.md`, `fix-review.md` (recommended canonical command names: `dev-review-linear`, `dev-fix-review`)
- Auto prompt variants (to be created): `dev-auto-parallel`, `dev-auto-review-linear`, `dev-auto-fix-review` (recommended: `dev` plugin commands, synced to `~/.codex/prompts/`)
- Milestone docs: `docs/projects/**/milestones/*.md`
- Issue docs: `docs/projects/**/issues/*.md`
- Front matter requirements: `docs/process/LINEAR.md`
- Graphite guidance (if prompts create branches/worktrees): `docs/process/GRAPHITE.md`

### 7) Implementation Outline (High-level)

**Thin-slice path:**
1) Parse the milestone doc and resolve issue docs (fail fast if parsing fails).
2) Build a dependency-aware issue order from front matter.
3) Implement `runCodexPhase()` that spawns `codex exec --json` and captures JSONL + stdout.
4) Implement `runReviewLoop()` enforcing the JSON schema and `maxReviewCycles = 2`.
5) Add per-issue log files and a small state file for resume.
6) Add worktree lifecycle helpers (create once per issue, reuse for all phases, remove at end).

**Validation strategy:**
- Dry-run mode prints planned steps without invoking the CLI.
- Single-issue smoke test to verify schema parsing and log capture.

**Rollout considerations:**
- Keep it sequential and single-threaded to avoid worktree conflicts.
- Add Claude as an optional review agent only after the Codex-only loop is stable.

### 8) Risks, Trade-offs, and Potential Regressions

- **Non-convergence:** review/fix cycles can loop. Mitigate with `status: pass` + max cycles.
- **Prompt side effects:** `dev-parallel` creates worktrees and Graphite branches. Running it in automation can change repo state unexpectedly.
- **Worktree mismatch:** review/fix prompts currently create their own worktrees, which conflicts with an orchestrator-owned worktree. `dev-auto-*` variants are required to avoid this.
- **Parsing brittleness:** JSONL parsing requires careful line buffering; use a schema for review results.
- **Auth/tooling drift:** CLI auth expiration or prompt changes can break automation.

### 9) Workarounds / Low-effort Alternatives

- Single-pass automation: dev -> review only, with human deciding fixes.
- Manual issue list file per milestone to avoid parsing Markdown tables.
- Codex-only dev/fix with manual review pasted in (no review agent step).

### 10) Buy vs Build (When Relevant)

**Build.** Existing orchestration frameworks are unnecessary. CLI subprocess orchestration is enough for this scope.

### 11) Alignment With Ongoing / Planned Work

This aligns with the repo's Linear + doc-driven workflow (`docs/process/LINEAR.md`) and Graphite conventions (`docs/process/GRAPHITE.md`). It does not require changes to existing code packages.

### 12) Open Questions / Decisions

- Where should the orchestration script live (e.g., `scripts/orchestration/`), and should logs be ignored in git?
- Where do we store/distribute the plugin content for team use (local plugin tree only vs a repo-backed copy + bootstrap)?
- How do we operationalize plugin → Codex sync for team use (bootstrap script, CI check, manual step)?
- When do we extract the shared `autonomous-development` skill (recommended once there are ≥2–3 `dev-auto-*` prompts and repetition is clear), and what exact invariants belong there?
- When we introduce Claude as a review agent later, do we want separate per-agent session persistence?

---

## Minimal CLI-only orchestration sketch

See `docs/projects/cli-orchestration-v0/spikes/cli-orchestration-shape.md` for a Bun/TypeScript-oriented sketch and example code snippets. This is a conceptual shape, not production-ready implementation.
