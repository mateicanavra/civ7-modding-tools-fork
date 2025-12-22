# PRD: Cross-Repo Orchestration Engine (Target Architecture)

**Status:** Draft

## 1. Overview

This PRD defines a **greenfield, cross-repo orchestration engine** that can run a milestone-driven **dev -> review -> fix** loop in any repo that opts in via a minimal configuration. The engine is invoked either from a plugin command inside Codex/Claude Code or directly from a terminal CLI, while preserving streaming visibility and structured outputs.

**Key references:**
- Contract: `docs/projects/cli-orchestration-v0/resources/CONTRACT-dev-auto-and-runner.md`
- ADR (v0 context): `docs/projects/cli-orchestration-v0/resources/ADR-001-orchestration-v0.md`

---

## 2. Goals

- Run the orchestration loop **across any repo** with a minimal opt-in config.
- Provide **two entrypoints** with the same behavior:
  - Plugin command (agent-driven, streamed to chat).
  - CLI command (human-driven, streamed to terminal).
- Keep the engine **repo-agnostic** and **versioned independently** of target repos.
- Preserve **structured JSON contracts** for all phases and runner outputs.
- Maintain **one orchestrator-owned worktree per issue** and deterministic execution.

---

## 3. Non-Goals

- Repo-specific build/test logic embedded in the engine.
- Parallel or distributed execution across issues.
- UI dashboards or rich visualizations.
- Automatic selection of issue templates or milestone creation.
- Multi-model orchestration (Claude/Gemini) in the initial release.

---

## 4. User Scenarios

- As a developer, I can run `orchestrator run --milestone M1` in any repo that is configured, and watch the loop stream logs to my terminal.
- As a user in Codex/Claude Code, I can trigger `/dev-auto-orchestrate` in the current workspace and see streaming output in-session, ending with a summarized result.

---

## 5. Functional Requirements

### 5.1 Entrypoints

- **CLI:** `orchestrator run --milestone <ID> [--issue <ID>] [--config <path>]`.
- **Plugin command:** `dev-auto-orchestrate` invokes the same engine in the current repo.

### 5.2 Repo discovery & opt-in

- The engine must detect whether a repo is orchestration-capable by **presence of a config file** (e.g., `orchestrator.config.json|ts`).
- If no config is found, the engine **fails fast** with a clear error.

### 5.3 Configuration

The config specifies:
- Issue doc root(s) or glob(s).
- Milestone field name and dependency field names.
- Default runner (Codex SDK) and optional CLI fallback.
- Log root path (default: `<repo>/.orchestrator/logs`).

### 5.4 Issue selection and ordering

- Filter issues by milestone ID in front matter.
- Build a dependency DAG when fields are present; otherwise use stable linear ordering.

### 5.5 Worktree lifecycle

- Create **one worktree per issue**.
- Reuse worktree across dev/review/fix phases.
- Remove worktree only after the issue loop completes or is capped.

### 5.6 Phase sequence and convergence

- `dev-auto-parallel` -> `dev-auto-review-linear` -> (if needed) `dev-auto-fix-review`.
- Convergence signal: `status: pass` from review.
- Guardrail: max 2 review/fix cycles per issue.

### 5.7 Contracts and outputs

- Phase outputs must match the **dev-auto contract**.
- The orchestrator treats structured JSON as authoritative.

### 5.8 Streaming and observability

- Stream raw runner output to:
  - terminal stdout/stderr when invoked via CLI.
  - plugin command output when invoked in Codex/Claude.
- Persist raw logs and final parsed JSON per issue/phase under the log root.

---

## 6. Non-Functional Requirements

- **Portability:** engine runs in any repo with minimal config.
- **Determinism:** explicit inputs, stable ordering, no external inference.
- **Safety:** no destructive git operations beyond orchestrator-owned worktree lifecycle and the allowed Graphite commands.
- **Transparency:** logs are always available after a run.

---

## 7. Integration Points

- **Engine:** packaged in a dedicated orchestration repo as a versioned NPM package.
- **Runner:** Codex SDK as default invocation/parsing layer.
- **Prompts:** `dev-auto-parallel`, `dev-auto-review-linear`, `dev-auto-fix-review` via plugin sync.
- **Skills:** `autonomous-development` for auto-safe behavior.

---

## 8. Out of Scope / Future Work

- Claude/Gemini review agents.
- Parallel execution.
- Rich dashboards or UI.
- Automated scope-drift watcher.
- Advanced resume/checkpointing across sessions.
