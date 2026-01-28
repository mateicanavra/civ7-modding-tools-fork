# narsil-mcp: Installation and Setup Guide

> Step-by-step setup for global and project-based MCP server configuration

## Prerequisites

- **macOS/Linux** (Windows not officially supported)
- **Rust 1.70+** (for source builds) or pre-built binary
- **C compiler** (for tree-sitter): `xcode-select --install` on macOS, `build-essential` on Ubuntu

---

## Installation Methods

### Method 1: One-Click Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/postrv/narsil-mcp/main/install.sh | bash
```

This script:
1. Detects your platform (macOS/Linux, x86_64/arm64)
2. Downloads pre-built binary if available, otherwise builds from source
3. Installs to `~/.local/bin/narsil-mcp`
4. Adds to PATH in your shell config
5. Detects installed AI tools (Claude Desktop, Cursor, VS Code) and shows config

### Method 2: Cargo Install (Rust users)

```bash
# Basic install
cargo install narsil-mcp

# With specific features
cargo install narsil-mcp --features neural    # TF-IDF + API embeddings
cargo install narsil-mcp --features frontend  # Web visualization UI
```

### Method 3: Build from Source

```bash
git clone https://github.com/postrv/narsil-mcp.git
cd narsil-mcp
cargo build --release

# Binary at: ./target/release/narsil-mcp
```

### Verify Installation

```bash
narsil-mcp --version
# Expected: narsil-mcp 1.0.0

# Quick test
narsil-mcp --repos . --verbose
# Should show indexing output
```

---

## Configuration

### Global Configuration (Claude Desktop)

Location:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "narsil-mcp": {
      "command": "narsil-mcp",
      "args": [
        "--repos", "/path/to/projects",
        "--git",
        "--call-graph",
        "--persist"
      ]
    }
  }
}
```

**For multiple repositories**:
```json
{
  "mcpServers": {
    "narsil-mcp": {
      "command": "narsil-mcp",
      "args": [
        "--repos", "~/code/project-a",
        "--repos", "~/code/project-b",
        "--git",
        "--call-graph"
      ]
    }
  }
}
```

### Project-Based Configuration (Cursor)

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "narsil-mcp": {
      "command": "narsil-mcp",
      "args": [
        "--repos", ".",
        "--git",
        "--call-graph",
        "--watch"
      ]
    }
  }
}
```

### Project-Based Configuration (VS Code + Copilot)

Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "narsil-mcp": {
      "command": "narsil-mcp",
      "args": [
        "--repos", "${workspaceFolder}",
        "--git",
        "--call-graph"
      ]
    }
  }
}
```

> **Note**: VS Code MCP support requires VS Code 1.102+ and Copilot Enterprise with MCP enabled by org admin.

### Project-Based Configuration (Claude Code)

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "narsil-code-intel": {
      "command": "narsil-mcp",
      "args": [
        "--repos", ".",
        "--git",
        "--call-graph",
        "--watch"
      ]
    }
  }
}
```

---

## Configuration Profiles

### Minimal (Quick exploration)

```json
"args": ["--repos", "."]
```
- ~30MB memory
- Basic symbol search and file reading
- No git integration or call graphs

### Standard (Development assistance)

```json
"args": [
  "--repos", ".",
  "--git",
  "--call-graph",
  "--persist",
  "--watch"
]
```
- ~100-500MB memory (scales with repo)
- Full symbol navigation
- Git blame/history
- Call graph analysis
- Persists index for fast restarts
- Auto-reindex on changes

### Security Audit

```json
"args": [
  "--repos", ".",
  "--call-graph"
]
```
- Security tools work without special flags
- Call graph enables taint analysis paths
- Use `scan_security`, `check_owasp_top10`, etc.

### Neural Search (Semantic code search)

```json
"args": [
  "--repos", ".",
  "--neural",
  "--neural-backend", "api",
  "--neural-model", "voyage-code-2"
],
"env": {
  "VOYAGE_API_KEY": "your-key-here"
}
```

Or with OpenAI:
```json
"args": [
  "--repos", ".",
  "--neural",
  "--neural-backend", "api",
  "--neural-model", "text-embedding-3-small"
],
"env": {
  "OPENAI_API_KEY": "your-key-here"
}
```

Or local ONNX (no API, larger binary):
```json
"args": [
  "--repos", ".",
  "--neural",
  "--neural-backend", "onnx"
]
```

---

## Integration: civ7-modding-tools Example

For this repository, create `.mcp.json` at repo root:

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

**Why these flags for this repo**:
- `--git`: Leverage git history for blame/hotspots (useful for understanding evolved codebase)
- `--call-graph`: Pipeline has complex function relationships
- `--persist`: Large codebase benefits from cached index
- `--watch`: Active development benefits from auto-reindex

**Expected behavior**:
- First run: 2-5 seconds to index (depending on file count)
- Subsequent runs: <1 second (loads persisted index)
- Tools available: All 76 tools except neural search and LSP

---

## CLI Reference

### Core Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--repos <path>` | Repository path(s) to index | Required |
| `--verbose` | Enable debug logging | Off |
| `--reindex` | Force re-index on startup | Off |

### Feature Flags

| Flag | Description | Memory Impact |
|------|-------------|---------------|
| `--git` | Git blame, history, contributors | Moderate |
| `--call-graph` | Function call analysis | Moderate |
| `--persist` | Save index to disk | Disk I/O |
| `--watch` | Auto-reindex on file changes | Low |
| `--lsp` | LSP integration for types | High |
| `--streaming` | Stream large results | Low |
| `--remote` | GitHub remote repo support | Network |

### Neural Search Flags

| Flag | Description |
|------|-------------|
| `--neural` | Enable neural embeddings |
| `--neural-backend <api\|onnx>` | API (Voyage/OpenAI) or local ONNX |
| `--neural-model <model>` | Model name (e.g., `voyage-code-2`) |

### Environment Variables (for neural)

```bash
export VOYAGE_API_KEY="pa-..."      # Voyage AI
export OPENAI_API_KEY="sk-..."      # OpenAI
export EMBEDDING_API_KEY="..."      # Generic fallback
```

---

## Troubleshooting

### "Command not found: narsil-mcp"

```bash
# Check if installed
which narsil-mcp
ls ~/.local/bin/narsil-mcp
ls ~/.cargo/bin/narsil-mcp

# Add to PATH manually
export PATH="$PATH:$HOME/.local/bin"
# Or for cargo install:
export PATH="$PATH:$HOME/.cargo/bin"
```

### Build errors (tree-sitter)

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt install build-essential

# Verify
cc --version
```

### Index not finding files

```bash
# Check what's being indexed
narsil-mcp --repos /path --verbose 2>&1 | head -100

# Common causes:
# 1. Files in .gitignore
# 2. Unsupported file extensions
# 3. Path doesn't exist
```

### Memory issues with large repos

```bash
# Increase stack size
RUST_MIN_STACK=8388608 narsil-mcp --repos /path

# Or index subdirectories
narsil-mcp --repos /path/src --repos /path/lib
```

### Neural search not working

```bash
# Check API key
echo $VOYAGE_API_KEY

# Verify key format
# Voyage: starts with "pa-"
# OpenAI: starts with "sk-"

# Test with verbose
narsil-mcp --repos . --neural --verbose
```

---

## Testing the Integration

After configuration, test with MCP Inspector:

```bash
bunx @modelcontextprotocol/inspector narsil-mcp --repos .
```

Or verify in Claude Desktop:
1. Restart Claude Desktop after config change
2. Ask Claude: "List the tools available from narsil-mcp"
3. Expected: List of 76+ tools including `find_symbols`, `get_call_graph`, etc.

### Quick Verification Queries

```
# Basic
"Use find_symbols to show me all classes in this codebase"

# Structure
"Use get_project_structure to show the directory layout"

# Call graph (requires --call-graph)
"Use get_call_graph to show the main function relationships"

# Git (requires --git)
"Use get_hotspots to find high-churn files"
```

---

## Updating

```bash
# One-click reinstall
curl -fsSL https://raw.githubusercontent.com/postrv/narsil-mcp/main/install.sh | bash

# Or cargo update
cargo install narsil-mcp --force

# Or rebuild from source
cd narsil-mcp
git pull
cargo build --release
```

---

## Uninstalling

```bash
# Remove binary
rm ~/.local/bin/narsil-mcp
# Or
rm ~/.cargo/bin/narsil-mcp

# Remove persisted indexes (if used --persist)
rm -rf ~/.cache/narsil-mcp/

# Remove from MCP configs
# Edit claude_desktop_config.json, .cursor/mcp.json, etc.
```
