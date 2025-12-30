# narsil-mcp Implementation Plan: civ7-modding-tools

> Concrete steps to integrate narsil-mcp code intelligence into civ7-modding-tools

## Overview

**Goal**: Add narsil-mcp as an MCP server for deep code intelligence in civ7-modding-tools, available both globally (Claude Desktop) and project-locally (Claude Code).

**Expected outcome**: 76 code intelligence tools available including symbol search, call graphs, security scanning, and semantic search.

---

## Pre-Implementation State

| Item | Status |
|------|--------|
| narsil-mcp binary | Not installed |
| Cargo | 1.86.0 (meets Rust 1.70+ requirement) |
| Global MCP config | Exists at `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Project `.mcp.json` | Does not exist |
| `~/.local/bin/` | Exists, in PATH |

---

## Phase 1: Install narsil-mcp Binary

### Command

```bash
cargo install narsil-mcp
```

### Expected Result

- Binary installed to `~/.cargo/bin/narsil-mcp`
- Version: 1.0.0+

### Verification

```bash
narsil-mcp --version
# Expected: narsil-mcp 1.0.0

# Quick index test
narsil-mcp --repos /Users/mateicanavra/Documents/.nosync/DEV/civ7-modding-tools --verbose 2>&1 | head -20
```

---

## Phase 2: Configure Global MCP (Claude Desktop)

### File

`~/Library/Application Support/Claude/claude_desktop_config.json`

### Addition

Add to `mcpServers` object:

```json
"narsil-code-intel": {
  "command": "narsil-mcp",
  "args": [
    "--repos", "/Users/mateicanavra/Documents/.nosync/DEV/civ7-modding-tools",
    "--git",
    "--call-graph",
    "--persist"
  ]
}
```

### Flag Rationale

| Flag | Purpose | Impact |
|------|---------|--------|
| `--repos` | Points to civ7-modding-tools | Required |
| `--git` | Git blame, history, hotspots | Moderate memory |
| `--call-graph` | Function call analysis | Moderate memory |
| `--persist` | Cache index to disk | Fast restarts |

**Note**: `--watch` omitted for global config (Claude Desktop doesn't benefit from live reindexing).

### Verification

1. Restart Claude Desktop
2. Ask: "List the tools available from narsil-code-intel"
3. Expected: 76+ tools including `find_symbols`, `get_call_graph`, etc.

---

## Phase 3: Configure Project-level MCP (Claude Code)

### File

`/Users/mateicanavra/Documents/.nosync/DEV/civ7-modding-tools/.mcp.json`

### Content

```json
{
  "mcpServers": {
    "narsil-code-intel": {
      "command": "narsil-mcp",
      "args": [
        "--repos", ".",
        "--git",
        "--call-graph",
        "--persist",
        "--watch"
      ]
    }
  }
}
```

### Flag Rationale

| Flag | Purpose | Impact |
|------|---------|--------|
| `--repos .` | Current directory (relative) | Required |
| `--git` | Git blame, history, hotspots | Moderate memory |
| `--call-graph` | Function call analysis | Moderate memory |
| `--persist` | Cache index to disk | Fast restarts |
| `--watch` | Auto-reindex on file changes | Low overhead |

**Note**: `--watch` included for project-level (active development benefits from live reindexing).

### Verification

1. Start new Claude Code session in civ7-modding-tools
2. Check MCP servers are loaded
3. Test: "Use find_symbols to show all classes in this codebase"

---

## Phase 4: Verification Queries

### Basic Navigation

```
"Use find_symbols to show me all Python classes in this codebase"
"Use get_project_structure to show the directory layout"
```

### Architecture

```
"Use get_call_graph to show function relationships in the pipeline"
"Use get_import_graph to show module dependencies"
```

### Git Integration

```
"Use get_hotspots to find high-churn files"
"Use get_blame for src/pipeline/main.py"
```

### Security

```
"Use get_security_summary to assess the codebase"
"Use scan_security for a comprehensive check"
```

---

## Expected Performance

| Metric | Expected Value |
|--------|---------------|
| Initial indexing | 2-5 seconds |
| Subsequent startup (with --persist) | <1 second |
| Query response | Sub-millisecond |
| Memory usage | 100-500MB |

---

## Troubleshooting

### "Command not found: narsil-mcp"

```bash
# Check cargo bin in PATH
echo $PATH | grep -q ".cargo/bin" && echo "In PATH" || echo "Not in PATH"

# Add to shell config if needed
echo 'export PATH="$PATH:$HOME/.cargo/bin"' >> ~/.zshrc
source ~/.zshrc
```

### MCP not loading in Claude Code

1. Ensure `.mcp.json` is at repo root
2. Start fresh Claude Code session
3. Check with: "What MCP servers are connected?"

### Index not finding files

```bash
# Check what's being indexed
narsil-mcp --repos . --verbose 2>&1 | head -100

# Common causes:
# - Files in .gitignore
# - Unsupported file extensions
```

---

## Commit Strategy

Changes will be committed via Graphite branches:

1. **Branch**: `feat/narsil-mcp-integration`
2. **Commits**:
   - `chore: add .mcp.json for narsil-mcp code intelligence`
   - Update global config (manual, outside repo)

---

## References

- [REF-narsil-mcp.md](./REF-narsil-mcp.md) — Canonical reference
- [SETUP-narsil-mcp.md](./SETUP-narsil-mcp.md) — Installation guide
- https://github.com/postrv/narsil-mcp — Official repo
