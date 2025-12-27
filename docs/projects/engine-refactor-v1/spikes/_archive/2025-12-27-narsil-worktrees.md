# Spike: narsil-mcp Worktree Support

**Date:** 2025-12-27
**Status:** Complete
**Branch:** `spike-narsil-worktrees`

## Objective

Explore how to configure `narsil-mcp` to work correctly with Git worktrees, so AI agents running in worktrees see and index the worktree's files (not just the main repo checkout), and changes in worktrees trigger proper re-indexing.

## Context

- Our development workflow uses Git worktrees extensively
- Currently, `narsil-mcp` is configured with a hardcoded path to the main repo
- Agents working in worktrees need the call graph and code search to reflect the worktree's state

## Assumptions and Unknowns

### Assumptions Made
- Claude Code spawns MCP servers from the project root directory (verified via `lsof`)
- The `PWD` environment variable is available when Claude Code starts an MCP server
- Each worktree is a complete checkout with its own `.mcp.json` copy (verified)

### Unknowns
- Whether Claude Code actually passes `PWD` through to MCP server args (needs live testing)
- Performance implications of having multiple narsil-mcp instances (one per worktree session)
- Whether `--watch` mode correctly handles worktree-specific `.git` structure

## Findings

### Current Configuration Problem

The current `.mcp.json` hardcodes the main repo path:

```json
{
  "mcpServers": {
    "narsil-code-intel": {
      "command": "/Users/mateicanavra/.cargo/bin/narsil-mcp",
      "args": [
        "--repos", "/Users/mateicanavra/Documents/.nosync/DEV/civ7-modding-tools",
        "--git",
        "--call-graph",
        "--persist",
        "--watch"
      ]
    }
  }
}
```

This means any agent in a worktree still indexes the main repo, not the worktree.

### Key Discovery: Environment Variable Expansion

Claude Code supports `${VAR}` expansion in `.mcp.json` (documented at [code.claude.com/docs/en/mcp.md](https://code.claude.com/docs/en/mcp.md)). This enables dynamic path resolution.

Supported syntax:
- `${VAR}` — expands to the environment variable value
- `${VAR:-default}` — uses a default if the variable isn't set

Variables can be expanded in `command`, `args`, `env`, `url`, and `headers` fields.

### narsil-mcp Capabilities

| Flag | Purpose |
|------|---------|
| `--repos <PATH>` | Accepts any valid git repository path, including worktrees |
| `--discover <DIR>` | Auto-discover repos at a path |
| `--index-path <PATH>` | Custom index storage location |
| `--watch` | Auto-reindex on file changes |
| `--persist` | Save/load index to/from disk |

Worktrees are recognized as valid repositories (`validate_repo` confirms this).

### MCP Server Execution Context

Verified that narsil-mcp runs with `cwd` set to the project root where Claude Code was started. This means `PWD` should correctly reflect the worktree path when an agent is spawned in a worktree.

## Recommended Solution

### Option 1: Dynamic `${PWD}` Configuration (Recommended)

Update `.mcp.json` to use `${PWD}` for the repo path:

```json
{
  "mcpServers": {
    "narsil-code-intel": {
      "command": "/Users/mateicanavra/.cargo/bin/narsil-mcp",
      "args": [
        "--repos", "${PWD}",
        "--index-path", "${PWD}/.narsil-cache",
        "--git",
        "--call-graph",
        "--persist",
        "--watch"
      ]
    }
  }
}
```

**Pros:**
- Each worktree gets its own narsil-mcp instance pointing at the worktree
- Each worktree gets its own persistent index (at `.narsil-cache/`)
- `--watch` sees changes in the worktree
- No manual configuration per worktree

**Cons:**
- Requires adding `.narsil-cache/` to `.gitignore`
- Multiple concurrent narsil-mcp instances (one per active Claude session)
- First run in each worktree incurs indexing cost

### Option 2: Shared Index Fallback

If per-worktree indexing is too heavy:

```json
{
  "mcpServers": {
    "narsil-code-intel": {
      "command": "/Users/mateicanavra/.cargo/bin/narsil-mcp",
      "args": [
        "--repos", "${PWD}",
        "--git",
        "--call-graph"
      ]
    }
  }
}
```

Without `--persist`, the index is in-memory only. Faster startup but no persistence across sessions.

## Implementation Checklist

- [ ] Validate `${PWD}` expansion works in Claude Code (minimal experiment)
- [ ] Update `.mcp.json` to use `${PWD}` pattern
- [ ] Add `.narsil-cache/` to `.gitignore`
- [ ] Document the pattern in project docs

## Minimal Experiment

To validate the `${PWD}` approach:

1. Create a test `.mcp.json` with `${PWD}` in a worktree
2. Start a new Claude Code session in the worktree
3. Call `list_repos` to verify it indexed the worktree path (not main repo)
4. Make a file change in the worktree
5. Verify the change is reflected in search/call-graph results

## Risks

| Risk | Mitigation |
|------|------------|
| `PWD` expansion not working | Fallback to wrapper script or untracked `.mcp.json` |
| Multiple instances resource usage | Monitor; consider shared global instance with multiple `--repos` |
| Watch mode with worktrees | Test; worktrees have `.git` file not directory |

## References

- [Claude Code MCP docs](https://code.claude.com/docs/en/mcp.md)
- [narsil-mcp GitHub](https://github.com/postrv/narsil-mcp)
- narsil-mcp help: `~/.cargo/bin/narsil-mcp --help`
