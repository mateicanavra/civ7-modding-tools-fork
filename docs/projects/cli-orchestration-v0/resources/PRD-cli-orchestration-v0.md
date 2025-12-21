# PRD: CLI Orchestration Loop v0

**Status:** Draft

## 1. Overview

This PRD defines the v0 product scope for a **repo-local orchestration loop** that processes a milestone by iterating its issues through a deterministic **dev -> review -> fix** cycle, using `dev-auto-*` prompts and an orchestrator-owned worktree per issue. The goal is an end-to-end automated workflow that produces reviewable changes, logs, and structured results.

**Key references:**
- ADR: `docs/projects/cli-orchestration-v0/resources/ADR-001-orchestration-v0.md`
- Contract: `docs/projects/cli-orchestration-v0/resources/CONTRACT-dev-auto-and-runner.md`
- Background spikes: `docs/projects/cli-orchestration-v0/spikes/`

---

## 2. Goals

- Run a milestone end-to-end using a **single, lightweight Bun/TS script**.
- Use **structured JSON outputs** for control flow and observability.
- Enforce **orchestrator-owned worktrees** (one per issue, reused across phases).
- Maintain **deterministic issue selection and ordering** from local docs.
- Preserve visibility: logs per issue/phase and a clear final status summary.

---

## 3. Non-Goals (v0)

- Multi-issue parallelism or multi-worktree concurrency.
- A GUI or dashboard; logs are file-based.
- Claude/Gemini review agents; only Codex is used in v0.
- A scope-drift watcher agent or human-in-the-loop interrupts.
- Advanced resume or checkpointing beyond manual reruns.

---

## 4. User Scenarios

- As a developer, I point the orchestrator at a **milestone** and it automatically runs **dev -> review -> fix** for each issue, producing draft PRs, structured review notes, and logs I can inspect afterward.
- As a reviewer, I can open the logs and structured results for any issue/phase to understand what changed and why the loop stopped.

---

## 5. Functional Requirements

### 5.1 Inputs and scope

- The orchestrator accepts a **milestone identifier**.
- It discovers issues via **front matter** in `docs/projects/**/issues/*.md`.
- Missing or invalid front matter causes a **fail-fast** error.

### 5.2 Issue ordering

- Build a dependency DAG from front matter fields (e.g., `blocked_by` / `blocking`).
- If dependencies are incomplete, fall back to a **stable linear order**.

### 5.3 Worktree lifecycle (mandatory)

- Create **one worktree per issue**.
- Reuse that worktree across **all phases** for the issue.
- Remove the worktree **only after** the issue loop completes or is capped.

### 5.4 Phase sequence per issue

- `dev-auto-parallel` -> `dev-auto-review-linear` -> (if needed) `dev-auto-fix-review` -> repeat review/fix until convergence or cap.
- The orchestrator provides all required inputs to each phase per the contract.

### 5.5 Convergence and guardrails

- **Primary convergence:** review returns `status: pass`.
- **Guardrail:** maximum of **2 review/fix cycles** per issue.
- `status: blocked` stops the issue loop and records the block.

### 5.6 dev-auto-* contract binding

- Commands are invoked with explicit inputs: issue, milestone, branch, and worktree.
- Outputs must be **structured JSON** matching phase schemas.
- The orchestrator treats the parsed JSON as the authoritative result.

### 5.7 Logging and observability

- Persist raw runner output and a parsed result per issue/phase.
- Logs live in the repo root (outside worktrees) so they survive cleanup.

### 5.8 Automation policy

- Full end-to-end automation is allowed (branches, Graphite ops, draft PRs, commits/pushes).
- A **clean, greenfield repo state** is a hard precondition.

---

## 6. Non-Functional Requirements

- **Safety:** commands must not create/remove worktrees; orchestrator owns lifecycle.
- **Determinism:** phase inputs are explicit; no inference from Linear or external services.
- **Failure handling:** missing/invalid structured output is a phase failure and halts the issue loop.
- **Sequential execution:** v0 processes issues one at a time.

---

## 7. Integration Points

- **Codex runner:** Codex TypeScript SDK is the default invocation/parsing layer; raw CLI remains a fallback behind a runner abstraction.
- **Prompts:** `dev-auto-parallel`, `dev-auto-review-linear`, `dev-auto-fix-review` in the `dev` plugin, synced into `~/.codex/prompts/`.
- **Skills:** `autonomous-development` skill encodes auto-safe behavior and shared constraints.
- **Docs:** issue and milestone front matter under `docs/projects/**/issues/*.md`.
- **Graphite:** use the allowlist defined in the dev-auto contract.

---

## 8. Out of Scope / Future Work

- Claude/Gemini review agents and multi-model orchestration.
- Scope-drift watcher and human decision escalations.
- Parallel execution or multi-issue batching.
- UI dashboards or TUI orchestration.
- Robust resume/checkpointing with state persistence.
