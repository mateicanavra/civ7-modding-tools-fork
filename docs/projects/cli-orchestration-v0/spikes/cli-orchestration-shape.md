# CLI Orchestration Shape (Bun/TypeScript, Codex-first)

**Status:** Conceptual sketch (not production-ready)

## Purpose

A minimal CLI-only loop that:
- Reads **local** milestone/issue docs for ordering (fail fast on missing/invalid docs).
- Runs Codex CLI for **dev**, **review**, **fix** phases using **autonomous prompt variants**.
- Stops when review returns structured `status: pass` or after **max 2** review/fix cycles.
- Captures JSONL output and human-readable logs per issue/phase.
- Enforces **one worktree per issue**, owned by the orchestrator (prompts must not create/remove worktrees).

## Preconditions

- Start from a **clean, greenfield state**: no pre-existing Graphite stacks or issue worktrees.

## Worktree ownership contract

- **Prompts must not create or remove worktrees** when run under this orchestrator.
- **The orchestrator owns worktree lifecycle**; prompts/commands are expected to respect that.

## Script Structure (conceptual)

```
/scripts/cli-orchestration/
  orchestrate.ts           # entrypoint
  schemas/
    review.schema.json     # JSON schema for structured review result
```

Prompt variants are expected to live as **commands in the `dev` plugin** and sync into `~/.codex/prompts/`. The exact team-friendly layout/distribution is still open.

## Prompt strategy + naming (locked)

- **Strategy:** create **separate autonomous prompt variants** (not wrappers) for:
  - `dev-auto-parallel`
  - `dev-auto-review-linear`
  - `dev-auto-fix-review`
- **Why:** wrappers are brittle against existing prompts’ explicit worktree creation/cleanup; autonomous variants can be made worktree-safe and orchestration-friendly without ambiguity.
- **Authoring convention:** follow the local plugin-content workflow: author new prompts as **commands** in the Claude plugin tree and sync to Codex prompts (avoid hand-editing `~/.codex/prompts` directly).
- **Future refactor (non-blocking):** once patterns stabilize, consider extracting shared “auto-safe” behavior into a skill and keeping the `dev-auto-*` prompts as thin shims.

## Plugin placement (recommended)

**Recommendation:** keep autonomous development inside the existing **`dev` plugin**, separated by:
- `commands/dev-auto-*.md` for the autonomous prompt variants.
- A dedicated skill (recommended name: `autonomous-development`) that defines the auto-safe contract and shared constraints.

Rationale:
- The `dev` plugin already owns Graphite + worktree + Linear/doc workflows (see `~/.codex/plugins/registry.json`).
- Keeping `dev-auto-*` variants in the same plugin avoids duplicating shared dev skills (`git-worktrees`, `parallel-development-workflow`) and keeps discovery simple: “autonomous dev” is a mode of the dev workflows, not a separate domain.

### Design options (evaluated)

**Option A: Dedicated “autonomous development” plugin**
- **Where things live:** `autonomous-dev` plugin holds `dev-auto-parallel` / `dev-auto-review-linear` / `dev-auto-fix-review` + an `autonomous-development` skill.
- **Pros:** very crisp separation; easy to point at “this plugin is the autonomous system.”
- **Cons:** duplicates (or re-exports) overlap with `dev` skills; introduces more plugin surface area to distribute/sync; higher chance of drift between interactive and auto variants.

**Option B: Keep in the existing `dev` plugin (chosen)**
- **Where things live:** `dev` plugin holds both interactive and `dev-auto-*` commands; an `autonomous-development` skill defines the auto-safe contract.
- **Pros:** maximizes reuse of existing dev/worktree/Graphite skills; reduces distribution overhead; aligns with current plugin boundaries (dev = “workflows”).
- **Cons:** requires disciplined naming and documentation so users don’t accidentally run `dev-auto-*` when they meant interactive.

**Heuristic for when to create a new plugin vs add to an existing one**
- Create a new plugin when the capability is a distinct domain (like `search` or `slides`) or would otherwise dominate/complicate an existing plugin.
- Extend an existing plugin when it’s a mode of the same workflows and reuses the same skills, tools, and mental model (as `dev-auto-*` does for the `dev` workflows).

**Open (non-blocking):**
- Exact file layout / directory structure for the new `dev-auto-*` prompts (within `dev` plugin, and whether we also mirror them repo-locally for versioning).
- How we wire and operationalize plugin → Codex prompt sync for team use (local-only vs shared repo + bootstrap).
- If/when to extract shared “auto-safe” behavior into a skill once the variants exist and patterns are clear (recommended, but not required for v0).

## Data Types (sketch)

```ts
type Phase = "dev" | "review" | "fix";

type ReviewStatus = "pass" | "changes_required" | "blocked";

interface MilestoneDoc {
  id: string;
  title: string;
  path: string;
}

interface IssueDoc {
  id: string;
  title: string;
  milestone: string;
  blockedBy?: string[];
  blocks?: string[];
  path: string;
}

interface ReviewResult {
  status: ReviewStatus;
  summary: string;
  requiredChanges: string[];
  notes?: string[];
}

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  events: Array<Record<string, unknown>>;
  lastAssistantMessage?: string;
}

interface IssuePlan {
  issue: IssueDoc;
  worktreePath: string;
}
```

## Control Flow (sketch)

1) Parse all issue docs for a milestone using front matter (`milestone`, `blocked_by`, `blocking`).
2) Build a DAG and derive a dependency-aware order (fallback to a stable linear order if needed).
3) For each issue (in order):
   - Create **one worktree** for the issue (or reuse if it already exists).
   - Run **dev-auto-parallel** once (in that worktree).
   - For up to `maxReviewCycles`:
     - Run **dev-auto-review-linear** and parse structured `ReviewResult`.
     - If `status === "pass"`, stop.
     - Else run **dev-auto-fix-review** with review summary.
   - If capped, record unresolved items and continue.
   - Remove the issue worktree **only after the loop finishes**.

## Codex CLI Invocation (CLI-only)

Use subprocess calls to `codex exec --json` and optional `--output-schema` for review.

Example command shape (review):

```
codex exec \
  --json \
  --output-schema /tmp/review.schema.json \
  --full-auto \
  "<rendered prompt>"
```

## Review Schema (sketch)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["status", "summary", "requiredChanges"],
  "properties": {
    "status": {"type": "string", "enum": ["pass", "changes_required", "blocked"]},
    "summary": {"type": "string"},
    "requiredChanges": {"type": "array", "items": {"type": "string"}},
    "notes": {"type": "array", "items": {"type": "string"}}
  }
}
```

## Bun/TypeScript Snippets

### Run Codex with JSONL streaming

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

async function runCodexExec(args: string[], logPath: string): Promise<RunResult> {
  const proc = Bun.spawn(["codex", "exec", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const decoder = new TextDecoder();
  let stdout = "";
  let stderr = "";
  let buffer = "";
  const events: Array<Record<string, unknown>> = [];
  let lastAssistantMessage: string | undefined;

  const logFile = Bun.file(logPath);
  const logWriter = logFile.writer();

  for await (const chunk of proc.stdout) {
    const text = decoder.decode(chunk);
    stdout += text;
    logWriter.write(text);
    buffer += text;

    let lineBreak = buffer.indexOf("\n");
    while (lineBreak >= 0) {
      const line = buffer.slice(0, lineBreak).trim();
      buffer = buffer.slice(lineBreak + 1);
      if (line.length > 0) {
        try {
          const event = JSON.parse(line) as Record<string, unknown>;
          events.push(event);
          if (event.type === "assistant_message" && typeof event.message === "string") {
            lastAssistantMessage = event.message;
          }
        } catch {
          // JSONL parse failures are logged but do not stop the run in this sketch.
        }
      }
      lineBreak = buffer.indexOf("\n");
    }
  }

  for await (const chunk of proc.stderr) {
    stderr += decoder.decode(chunk);
  }

  const exitCode = await proc.exited;
  logWriter.end();

  return { exitCode, stdout, stderr, events, lastAssistantMessage };
}
```

### Orchestration loop (Codex-only, max 2 review/fix cycles)

```ts
const MAX_REVIEW_CYCLES = 2;

async function orchestrateIssue(plan: IssuePlan, milestone: MilestoneDoc) {
  await runPhase("dev", plan, milestone);

  for (let cycle = 0; cycle < MAX_REVIEW_CYCLES; cycle += 1) {
    const review = await runReview(plan, milestone);
    if (review.status === "pass") {
      return { status: "pass", review };
    }

    await runFix(plan, milestone, review);
  }

  return { status: "capped", note: "Max review cycles reached" };
}
```

### Worktree lifecycle (orchestrator-owned)

```ts
async function ensureIssueWorktree(issue: IssueDoc, worktreePath: string) {
  // The orchestrator owns worktrees. Prompts must not create/remove them.
  // If worktree exists, reuse; otherwise create once for the issue.
}

async function runPhase(
  phase: Phase,
  plan: IssuePlan,
  milestone: MilestoneDoc,
  review?: ReviewResult,
) {
  // Run codex exec from the issue worktree path.
  const cwd = plan.worktreePath;
  const prompt = renderAutoPrompt(phase, plan.issue, milestone, review);
  return runCodexExec(["--json", "--full-auto", prompt], `${cwd}/.orchestrator/logs/...`);
}

async function cleanupIssueWorktree(plan: IssuePlan) {
  // Remove the worktree only after the full issue loop completes.
}
```

### Prompt rendering (conceptual)

```ts
function renderPrompt(template: string, issue: IssueDoc, milestone: MilestoneDoc, extra?: string) {
  const header = `I=@${issue.id} M=@${milestone.id}`;
  const body = extra ? `\n\n${extra}` : "";
  return `${header}\n\n${template}${body}`;
}
```

### Auto prompt variants (contract)

- **Autonomous variants are required**:
  - `dev-auto-parallel`
  - `dev-auto-review-linear`
  - `dev-auto-fix-review`
- They must **not** create or remove worktrees.
- They must **not** run their own sub-issue loops (the orchestrator owns iteration).
- They must assume the orchestrator sets `cwd` to the issue worktree and that Graphite context already exists.
- These variants are intended for **orchestration loops** and future **auto-dev** scenarios; interactive prompts remain unchanged.

**Naming:** use a `dev-auto-` prefix (e.g., `dev-auto-parallel`) to group autonomous workflows under a single namespace and keep interactive `dev-*` commands distinct.

**Interactive dev command naming (recommended):**
- Prefer a `dev-` prefix for the `dev` plugin’s user-invoked workflows for discoverability and grouping.
- Canonical renames:
  - `review-linear` → `dev-review-linear`
  - `fix-review` → `dev-fix-review`
  - `check-scope` → `dev-check-scope`
  - `feasibility` → `dev-feasibility`
  - `issue-from-draft` → `dev-issue-from-draft`

### What “auto-safe behavior extracted into a skill” means (concrete)

The `autonomous-development` skill is the shared contract that every `dev-auto-*` command must follow. It should contain:
- **Worktree contract:** orchestrator-owned worktree lifecycle; commands must not create/remove worktrees; commands must assume `cwd` is already the issue worktree.
- **Input contract:** accept explicit inputs (issue doc path / issue id, milestone id, branch name, worktree path) and do not infer branch identity via Linear.
- **Graphite safety:** forbid global restacks; allow only the safe subset already used by `dev-parallel` (e.g., `gt sync --no-restack`, `gt restack --upstack`, `gt ss --draft` / `gt ss -u`).
- **Structured outputs:** required JSON fields for dev/review/fix results (including `status: pass` as convergence signal).
- **Orchestrator handshake:** what the command must do on entry (validate it’s in the right worktree/branch) and what it must do on exit (do not clean up worktrees; emit the structured result).

In practice, each `dev-auto-*` command would:
- Reference the skill as its shared guardrails (so the command text stays focused on the phase-specific workflow).
- Implement only the phase-specific steps (dev vs review vs fix) while inheriting the shared constraints from the skill.

## Local docs as source of truth (fail fast)

```ts
function loadIssueDocsByMilestone(milestoneId: string): IssueDoc[] {
  // Parse all issue docs under docs/projects/**/issues/ for front matter:
  // - id
  // - milestone
  // - blocked_by / blocking (or equivalent)
  // Filter by milestone, then return IssueDoc list.
  return [];
}

function orderIssues(issues: IssueDoc[]): IssueDoc[] {
  // Build a DAG from blocked_by/blocks and return a dependency-aware order.
  // If dependencies are underspecified, fall back to a stable linear order.
  return issues;
}
```

## Seam for Claude later

Keep `runCodexExec` behind a simple interface so you can swap review to a Claude runner later:

```ts
interface AgentRunner {
  run(prompt: string, opts: { schemaPath?: string; logPath: string }): Promise<RunResult>;
}
```

In this sketch, Codex implements `AgentRunner`. Later, Claude can implement the same interface.
