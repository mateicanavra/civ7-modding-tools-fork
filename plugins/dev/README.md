# Dev Plugin (Repo-Local Source)

This folder mirrors the local Claude/Codex `dev` plugin content so the orchestration prompts are versioned in-repo.

## Sync to Codex

1. Copy or symlink this folder into `~/.claude/plugins/local/plugins/dev`.
2. Run the sync script to populate Codex:

```bash
python ~/.claude/plugins/local/plugins/meta/scripts/sync_to_codex.py --force
```

This updates `~/.codex/prompts/` and `~/.codex/skills/` with the repo-local `dev-auto-*` commands and `autonomous-development` skill.
