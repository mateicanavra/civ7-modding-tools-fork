# Notes

- Goal: feasibility for milestone -> issue -> dev/review/fix orchestration loop using Codex/Claude CLIs.
- Sources to check: root spike doc, CLI prompt/command definitions, any existing automation scripts.

## Key sources
- Root spike: `docs/projects/cli-orchestration-v0/spikes/claude-codex-cli-orchestration-spike.md` (CLI/SDK shapes, notify hook, JSON/JSONL, resume)
- Global prompts: `/Users/mateicanavra/.codex/prompts/dev.md`, `dev-parallel.md`, `review-linear.md`, `fix-review.md`
- Milestone doc example: `docs/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`
- Issue doc example: `docs/projects/engine-refactor-v1/issues/CIV-41-task-graph-mvp.md`
- Linear doc front matter requirements: `docs/process/LINEAR.md` (issue/milestone YAML fields)
- Graphite external tool import helpers: `docs/process/GRAPHITE.md`
