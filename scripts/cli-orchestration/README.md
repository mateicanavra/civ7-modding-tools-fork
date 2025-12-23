# CLI Orchestration (v0)

This folder hosts the v0 orchestration thin slice (single-issue dev loop). It is intentionally minimal and relies on the dev-auto contract.

## Prerequisites

- Prompts synced to `~/.codex/prompts/`:
  - Source prompts live in `plugins/dev/commands/` and the skill in `plugins/dev/skills/autonomous-development/`.
  - Sync with: `python ~/.claude/plugins/local/plugins/meta/scripts/sync_to_codex.py --force`.
- Codex CLI auth configured (run `codex login` once if needed).
- Run from the repo root so `repoRoot` resolves correctly.

## Manual invocation (v0)

```bash
bun run scripts/cli-orchestration/orchestrate.ts --milestone M1 --project cli-orchestration-v0 --issue LOCAL-TBD
```

### What to look for

- Logs written under `logs/orch/<milestone>/<issue>/`.
- A `dev-result.json` file containing the structured output from `dev-auto-parallel`.

## Notes

- Worktree lifecycle is orchestrator-owned; the prompts must not create/remove worktrees.
- Milestone docs must exist under `docs/projects/<project>/milestones/` for `milestoneDocPath` resolution.
- Use `--project <projectId>` to disambiguate if multiple projects share the same milestone ID.
- Codex SDK defaults (v0):
  - Streaming: **on** (events are written to stdout as JSONL).
  - Auto-approve: **on** (`approvalPolicy: "never"`).
  - Sandbox: `workspace-write`, network access enabled.
  - Additional writable dirs: git common dir (via `git rev-parse --git-common-dir`) and Graphite config (`$XDG_CONFIG_HOME/graphite` or `~/.config/graphite`) when present.
  - To change these defaults, edit the `startThread` options in `scripts/cli-orchestration/codex-sdk-runner.ts`.
