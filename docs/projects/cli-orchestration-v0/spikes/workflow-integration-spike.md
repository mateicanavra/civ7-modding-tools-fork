# Spike: Workflow Integration (CLI Orchestration + Existing Prompts)

## 1) Objective

Explore how a milestone -> issue -> dev -> review -> fix loop would actually behave if it runs on top of the existing Codex prompt workflows and helper skills in this repo, and surface what we would be signing up for.

## 2) Assumptions and Unknowns

**Assumptions**
- The loop uses Codex prompt templates under `~/.codex/prompts/` as the baseline reference, but the orchestrator will target **new autonomous `dev-auto-*` variants** of those prompts.
- Local issue docs in `docs/projects/**` remain the primary source of truth.
- Issue front matter is canonical for **milestone membership** and **dependencies** (`milestone`, `blocked_by`, `blocking`, or equivalent).
- The loop is CLI-only (Codex CLI), and structured outputs come from `codex exec --json` plus `--output-schema` (or equivalent).
- The orchestrator owns worktree lifecycle: **one dedicated worktree per issue**, created once and reused across dev/review/fix for that issue.
- Automation is allowed to create branches/worktrees, run Graphite commands, submit **draft** PRs, and commit/push as part of the flow (starting from a clean/greenfield repo state).

**Remaining unknowns (and why they matter)**
- Where the new `dev-auto-*` prompt variants live and how they’re distributed/installed. This affects portability and repeatability.
- How the `dev-auto-*` variants take “inputs” that interactive prompts currently infer via Linear (`$I` → title → branch name). This affects determinism and branch/worktree targeting.
- Whether automated runs may run installs/builds/tests for every phase, or whether we add caching/short-circuiting. This affects runtime cost and flakiness.
- If/when we extract shared “auto-safe” behavior into a skill (once the variants exist and patterns stabilize). This affects duplication, not feasibility.

## 3) What We Learned

### Existing commands/prompts (global, not repo-local)

**Development (single issue, Graphite stack)**
- `~/.codex/prompts/dev-linear.md`
  - Expects a local issue doc under `docs/projects/**/issues/`.
  - Uses Graphite (`gt ls`, `gt create`, `gt modify`, `gt ss --draft`).
  - Runs `pnpm install`, `bun run check-types`, `bun run build`.
  - Updates issue doc checkboxes and Linear metadata (manual comments).
  - Side effects: branch creation plus draft PR submission.

**Development (parallel worktrees + Graphite)**
- `~/.codex/prompts/dev-parallel.md`
  - Explicit worktree creation plus branch tracking (`git worktree`, `gt track`).
  - Requires `gt sync --no-restack` and warns against global restacks.
  - Runs install plus baseline verification.
  - Uses the `parallel-development-workflow` skill and `git-worktrees` skill.
  - Side effects: new worktree, new branch, Graphite tracking, draft PRs.

**Review (milestone-aware, worktree)**
- `~/.codex/prompts/review-linear.md` (recommended canonical command name: `dev-review-linear`)
  - Creates a review worktree (`git worktree add ../wt-review-<branch>`).
  - Tries to infer the work branch from Linear plus `gt ls`.
  - Appends a review entry to a review doc under `docs/projects/**/reviews/`.
  - Commits and pushes via Graphite (`gt modify`, `gt ss -u`).
  - Side effects: worktree creation, review doc edits, git commits.

**Fix Review (loop closure, worktree)**
- `~/.codex/prompts/fix-review.md` (recommended canonical command name: `dev-fix-review`)
  - Creates or reuses a fix worktree; default is to "steal" the existing branch.
  - Runs install plus baseline verification.
  - Requires classification of review points and updates docs.
  - Commits and updates stack (`gt ss -u`).
  - Side effects: worktree creation, commits, PR updates.

**General development (Graphite + checks)**
- `~/.codex/prompts/dev.md`
  - Similar to `dev-linear.md` but more general; still assumes Graphite stack and draft PR submission.

**Claude CLI prompts**
- `~/.claude/commands/` is empty. There is no parallel prompt set for Claude yet.

**Prompt authoring + sync conventions (local environment)**
- `~/.codex/prompts/manage-prompts.md` describes a canonical workflow where prompts are authored as **Claude plugins** (commands/skills/scripts) and then synced into `~/.codex/prompts/` as a flattened target. This suggests we should author `dev-auto-*` variants in the plugin tree and sync them, rather than hand-editing `~/.codex/prompts/` directly.

**Plugin placement recommendation**
- Keep `dev-auto-*` variants in the existing **`dev` plugin** as additional commands.
- Add a dedicated skill (recommended name: `autonomous-development`) in the `dev` plugin to centralize the “auto-safe” contract.

### Skills and helper workflows

**Parallel development workflow**
- `~/.codex/skills/parallel-development-workflow/SKILL.md`
  - Canonical instructions for worktrees plus Graphite, including `gt sync --no-restack`.
  - Emphasizes isolation, no global restacks, and safe cleanup.

**Worktree safety**
- `~/.codex/skills/git-worktrees/SKILL.md`
  - Provides the patch-path guard and strict rules around worktree creation, reuse, and removal.

### Local docs shape (source of truth)

**Issue docs**
- Template in `docs/_templates/issue.md`.
- YAML front matter includes `id`, `milestone`, `blocked_by`, etc.
- Body has standard sections and a local-only "Implementation Details" section.

**Milestone docs**
- Template in `docs/_templates/milestone.md`.
- Example: `docs/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`.
  - Contains a table-style "Issue Map" with linked issue IDs.

**Review docs**
- Example: `docs/projects/engine-refactor-v1/reviews/REVIEW-M3-core-engine-refactor-config-evolution.md`.
  - Running-log format with structured headings per issue.

### Map state (for follow-up)

**Explored:**
- `~/.codex/prompts/*`
- `~/.codex/skills/*`
- `docs/_templates/*`
- `docs/projects/engine-refactor-v1/milestones/*`
- `docs/projects/engine-refactor-v1/issues/*`
- `docs/projects/engine-refactor-v1/reviews/*`
- `docs/process/GRAPHITE.md`
- `docs/process/LINEAR.md`

**Breadcrumbs:**
- Prompt workflows: `~/.codex/prompts/dev-linear.md`, `~/.codex/prompts/dev-parallel.md`, `~/.codex/prompts/review-linear.md`, `~/.codex/prompts/fix-review.md`
- Worktree safety: `~/.codex/skills/git-worktrees/SKILL.md`
- Parallel workflow: `~/.codex/skills/parallel-development-workflow/SKILL.md`

## 4) Potential Shapes

### Shape A (chosen): CLI-only orchestration + separate `dev-auto-*` prompt variants

- Create **separate autonomous prompt variants**:
  - `dev-auto-parallel`
  - `dev-auto-review-linear`
  - `dev-auto-fix-review`
- These should live as **commands in the `dev` plugin**, and be synced to Codex prompts via the meta sync workflow.
- Each variant is based on the existing prompt, but:
  - Removes internal worktree creation/cleanup (orchestrator owns it).
  - Removes internal “sub-issue loops” (orchestrator owns iteration).
  - Accepts explicit inputs from the orchestrator (issue doc path, branch name, worktree path) rather than inferring via Linear.
- Orchestrator runs `codex exec --json --full-auto` with an output schema for structured results.

### Shape B (defer): Shared skill + thin `dev-auto-*` prompts

- Once `dev-auto-*` prompts stabilize, extract common “auto-safe” constraints (no worktree ops, structured outputs, orchestration handoffs) into a shared skill and keep the prompts thin.
  - Recommended skill name: `autonomous-development` (owned by `dev` plugin).

### Shape C (not recommended): Wrapper prompts around existing prompts

- Lowest initial effort, but brittle: existing prompts contain explicit worktree creation/cleanup steps that conflict with an orchestrator-owned worktree.

## Derived Schema Fields (from existing prompt behavior)

### Review output (from `dev-review-linear` / `review-linear`)

Minimum viable schema:

```json
{
  "status": "pass|changes_required|blocked",
  "summary": "string",
  "issues": [
    {
      "severity": "blocker|high|medium|low",
      "title": "string",
      "details": "string",
      "evidence": ["path:line"]
    }
  ],
  "required_actions": ["string"],
  "followups": ["string"],
  "review_doc_path": "string",
  "review_entry_written": true,
  "confidence": "low|medium|high"
}
```

### Dev / Fix output (from `dev-linear` + `dev-fix-review` / `fix-review`)

Minimum viable schema:

```json
{
  "status": "pass|failed|deferred",
  "branch": "string",
  "worktree": "string|null",
  "stack_branches": ["string"],
  "draft_prs": ["url"],
  "tests_run": [
    { "command": "string", "status": "pass|fail|skipped", "notes": "string" }
  ],
  "docs_updated": ["path"],
  "deferred": ["string"],
  "open_questions": ["string"]
}
```

## Guardrails (based on prompt expectations)

- Graphite safety
  - Allow `gt sync --no-restack` only.
  - Forbid global restacks, forced syncs, or reparenting other stacks.
- Worktree safety
  - Orchestrator owns: create/reuse/remove of the issue worktree.
  - `dev-auto-*` prompts must not create/remove worktrees (they may still run the patch-path guard checks).
  - Forbid deleting worktrees not created by the loop.
- PR safety
  - `gt ss --draft` is allowed; `gt ss --publish` should be blocked unless explicitly approved.
- Install/build/test
  - Default to run issue-specified verification commands only.
  - Allow a "skip installs" flag if baseline checks already passed.
- Review doc updates
  - Review prompt expects writing to `docs/projects/**/reviews/REVIEW-*.md`.
  - If we want non-mutating review runs, we must override that behavior.

## Rough Loop Shape (grounded in current workflows)

```
Issue docs (front matter) -> dependency order (DAG or fallback) -> for each issue:
  (orchestrator) ensure issue worktree exists
  dev (dev-auto-parallel) [in issue worktree]
    -> review (dev-auto-review-linear) [in same issue worktree]
      -> if review.status == "pass" -> (orchestrator) cleanup worktree -> done
      -> else fix (dev-auto-fix-review) [in same issue worktree]
         -> review again (max 2 cycles)
         -> (orchestrator) cleanup worktree when done/capped
```

### Simple ASCII flow diagram

```
[Issue Docs (front matter)]
      |
      v
 [DAG Order (or fallback)]
      |
      v
 (for each issue)
      |
      v
 [WT: ensure issue worktree]
      |
      v
 [DEV: dev-auto-parallel]
      |
      v
 [REVIEW: dev-auto-review-linear] --> (status == pass?) --yes--> [WT cleanup] --> [Next Issue]
      |                                       |
      | no                                    v
      v                                 [FIX: dev-auto-fix-review]
                               (max 2 cycles, same worktree)
```

Guardrail checks happen before each phase:
- validate repo clean or worktree
- ensure safe Graphite ops only
- ensure output JSON is parseable

## 5) Minimal Experiment (Optional)

Run `codex exec --json --output-schema <review-schema>` with `dev-auto-review-linear` on a single issue (inside the issue worktree) and verify:
- The JSON schema is respected.
- The output can be parsed deterministically.
- The prompt does not create/remove worktrees.

## 6) Risks and Open Questions

**Risks**
- The prompts assume interactive, human-in-the-loop workflows, but a loop will run them blindly.
- Review/fix prompts modify docs and commit changes, which could produce churn if run in automation.
- If the interactive review/fix prompts (`dev-review-linear` / `dev-fix-review`, currently `review-linear` / `fix-review` in `~/.codex/prompts/`) are used unmodified, they create/remove worktrees and will conflict with the orchestrator’s worktree lifecycle.
- Running `pnpm install` or `bun run build` repeatedly could be slow, flaky, or network-sensitive.

**Open questions**
- How should `dev-auto-*` prompts receive “branch/worktree targeting” inputs that interactive prompts currently derive from Linear?
- Where do we store/distribute the `dev` plugin content for team use (local-only vs repo-backed copy), and how do we keep it in sync across machines?
- Do we later add a separate “watcher” pass for scope drift + open questions (out of scope for this doc, but a likely follow-on)?

## 7) Next Steps

- If we want to continue, the next spike should focus on a single issue end-to-end loop (dev -> review -> fix), with schema enforcement and no side effects (dry-run mode).
- If we want to define stable schemas and review-output structure, consider a `/dev:spike-resource` for structured CLI output contracts.
