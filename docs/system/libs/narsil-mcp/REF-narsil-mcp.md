# narsil-mcp: Canonical Reference

> Rust-powered MCP server for deep code intelligence — 76 tools, 14 languages, privacy-first local operation

## Subject and Scope

This reference documents **narsil-mcp**, a Model Context Protocol (MCP) server that provides AI assistants with comprehensive code intelligence capabilities. Focus is on capabilities relevant to AI agents doing planning, architecture, refactoring, and deep codebase analysis.

**Out of scope**: Internal Rust implementation details, WASM browser builds, visualization frontend development.

**Version context**: v1.0.0 (released December 24, 2025)

---

## Overview

narsil-mcp is a Rust-based MCP server that gives AI assistants deep understanding of codebases through 76 specialized tools. It uses tree-sitter for accurate multi-language parsing and provides capabilities ranging from basic symbol search to advanced security analysis.

**Core value proposition**: Unlike simple file-reading tools, narsil-mcp provides *structural understanding* — it knows what functions exist, what calls what, where data flows, and where security risks hide. This enables AI agents to make informed architectural decisions without manually parsing entire codebases.

**Maintainer**: postrv (GitHub)
**Status**: Production-ready (v1.0.0), actively maintained
**License**: MIT OR Apache-2.0 (dual license)

---

## Key Concepts

### Mental Model: Indexed Code Intelligence

narsil-mcp operates by **indexing repositories** into an in-memory structure that supports fast queries:

```
Repository Files → Tree-sitter Parser → Symbol Index + Search Index + Call Graph
                                              ↓
                              MCP Tools query this indexed state
```

The key insight: parsing happens once at startup (or on file changes with `--watch`), then queries are sub-millisecond.

### The Tool Categories

narsil-mcp's 76 tools fall into distinct capability tiers:

| Tier | Capabilities | Example Tools | AI Agent Value |
|------|-------------|---------------|----------------|
| **Navigation** | Find symbols, read code | `find_symbols`, `get_file`, `get_excerpt` | Basic codebase orientation |
| **Structure** | Understand relationships | `get_call_graph`, `get_dependencies`, `get_import_graph` | Architecture comprehension |
| **Search** | Find relevant code | `semantic_search`, `hybrid_search`, `neural_search` | Locate implementation details |
| **Analysis** | Understand behavior | `get_control_flow`, `get_data_flow`, `infer_types` | Refactoring safety |
| **Security** | Find vulnerabilities | `find_injection_vulnerabilities`, `scan_security` | Security-aware changes |
| **History** | Understand evolution | `get_blame`, `get_file_history`, `get_hotspots` | Change risk assessment |

### Feature Flags

Many capabilities require explicit opt-in via CLI flags:

| Flag | Enables | Performance Impact |
|------|---------|-------------------|
| `--git` | Git blame, history, contributors | Moderate (shell out to git) |
| `--call-graph` | Function call analysis | Moderate (extra AST pass) |
| `--neural` | Semantic embeddings search | High (API calls or model load) |
| `--lsp` | Type info via LSP | High (spawns language servers) |
| `--persist` | Index persistence to disk | Low (disk I/O on startup) |
| `--watch` | Auto-reindex on changes | Low (file system events) |

---

## Common Patterns

### Pattern 1: Codebase Orientation

When an AI agent needs to understand an unfamiliar codebase:

```
1. list_repos              → What repositories are indexed?
2. get_project_structure   → What's the directory layout?
3. find_symbols (kind=*)   → What are the main abstractions?
4. get_export_map          → What's the public API surface?
```

### Pattern 2: Architecture Discovery

When planning refactoring or understanding dependencies:

```
1. get_import_graph        → Module dependency structure
2. find_circular_imports   → Problematic dependency cycles
3. get_call_graph          → Function-level relationships
4. get_function_hotspots   → Highly-connected critical code
```

### Pattern 3: Change Impact Analysis

Before modifying code, understand what might break:

```
1. find_references         → Who uses this symbol?
2. get_callers             → What calls this function?
3. get_callees             → What does this function call?
4. find_call_path          → Trace execution between points
```

### Pattern 4: Security Assessment

When auditing or security-conscious development:

```
1. get_security_summary    → Overall risk assessment
2. find_injection_vulnerabilities → SQL/XSS/command injection
3. trace_taint             → Follow user input through code
4. check_owasp_top10       → Standard vulnerability check
```

### Pattern 5: Semantic Code Search

Finding code by behavior rather than exact text:

```
# With --neural flag enabled:
neural_search("pagination logic")
find_semantic_clones("my_function")  # Find similar implementations

# Without neural (TF-IDF based):
hybrid_search("error handling retry")
find_similar_code("<code snippet>")
```

---

## AI Agent Affordances (Deep Dive)

### For Planning Agents

**Capability**: Understand system architecture before proposing changes

| Tool | What It Reveals | Planning Value |
|------|-----------------|----------------|
| `get_project_structure` | File organization, module boundaries | Understand where new code belongs |
| `get_import_graph` | Module dependencies | Identify coupling points |
| `get_call_graph` | Runtime relationships | Map execution flows |
| `get_complexity` | Cyclomatic/cognitive complexity | Identify refactoring candidates |
| `get_hotspots` | High-churn + high-complexity files | Risk areas for changes |

**Example workflow**: A planning agent asked to "add authentication" can first use `get_import_graph` to understand existing module boundaries, `find_symbols(pattern="auth|user|session")` to find existing auth-related code, then `get_call_graph` on key entry points to understand where auth checks should be inserted.

### For Refactoring Agents

**Capability**: Safely transform code with full impact awareness

| Tool | What It Reveals | Refactoring Value |
|------|-----------------|-------------------|
| `find_references` | All usages of a symbol | Know what breaks if renamed |
| `find_symbol_usages` | Cross-file usage with imports | Track symbol across modules |
| `get_callers` / `get_callees` | Function relationships | Understand call chains |
| `find_dead_code` | Unreachable code | Safe deletion candidates |
| `find_dead_stores` | Unused assignments | Cleanup opportunities |
| `find_uninitialized` | Potential bugs | Fix opportunities |

**Example workflow**: Before extracting a method, use `get_data_flow` to understand variable dependencies, `find_references` to see if any variables are used elsewhere, then `get_control_flow` to ensure the extraction doesn't break control flow.

### For Code Search Agents

**Capability**: Find relevant code without knowing exact names

| Tool | Search Type | Best For |
|------|------------|----------|
| `search_code` | Keyword (exact) | Known identifiers |
| `semantic_search` | BM25 ranking | Natural language queries |
| `hybrid_search` | BM25 + TF-IDF | Best general-purpose |
| `neural_search` | Embedding similarity | "Find code that does X" |
| `find_similar_code` | TF-IDF snippet match | "Find code like this" |
| `find_semantic_clones` | Type-3/4 clone detection | Dedupe candidates |

**Key insight**: `hybrid_search` is the best default for most queries. `neural_search` requires `--neural` flag and API keys but finds functionally similar code even with different naming.

### For Security-Aware Agents

**Capability**: Understand and address security implications

| Tool | Coverage | What It Finds |
|------|----------|---------------|
| `find_injection_vulnerabilities` | SQL, XSS, command, path traversal | Direct injection risks |
| `trace_taint` | Data flow from sources to sinks | How user input propagates |
| `get_taint_sources` | User input, files, network | Entry points for taint |
| `scan_security` | OWASP, CWE, crypto, secrets | Comprehensive scan |
| `check_owasp_top10` | OWASP Top 10 2021 | Standard web vulnerabilities |
| `check_cwe_top25` | CWE Top 25 | Common weakness enumeration |
| `check_dependencies` | OSV database | Known vulnerable deps |
| `check_licenses` | License analysis | Compliance issues |

**Example workflow**: Before accepting user input in new code, use `get_taint_sources` to understand existing input patterns, `trace_taint` from similar sources to see how they're sanitized, then apply consistent patterns.

---

## Best Practices

### 1. Start with Structure, Then Depth

```
# Good: Orient first
get_project_structure → find_symbols → get_call_graph → specific queries

# Avoid: Jumping to specific searches without context
search_code("config") without knowing module structure
```

### 2. Use Appropriate Search Granularity

```
# For known symbol names:
find_symbols(pattern="UserService")

# For conceptual queries:
hybrid_search("authentication middleware")

# For "find similar code":
find_similar_code("<snippet>") or neural_search("validate email")
```

### 3. Enable Features Appropriate to Task

```bash
# Quick exploration (minimal features):
narsil-mcp --repos /path

# Architecture analysis:
narsil-mcp --repos /path --call-graph --git

# Security audit:
narsil-mcp --repos /path --call-graph

# Full development assistance:
narsil-mcp --repos /path --git --call-graph --persist --watch
```

### 4. Leverage Incremental Context

narsil-mcp tools return rich context. Use excerpts and surrounding code:

```
# get_excerpt expands to syntactic boundaries
# get_symbol_definition includes surrounding context
# Use these rather than raw get_file for relevant snippets
```

---

## Constraints and Pitfalls

### Language Coverage Gaps

| Language | Symbols Extracted | Limitations |
|----------|-------------------|-------------|
| Rust | Full (functions, structs, enums, traits, impls, mods) | - |
| Python | functions, classes | No decorators as symbols |
| TypeScript | Full (functions, classes, interfaces, types, enums) | - |
| Go | functions, methods, types | No interface method sigs |
| Bash | functions, variables | Limited shell constructs |

### Performance Considerations

| Repository Size | Indexing Time | Memory | Recommendation |
|----------------|---------------|---------|----------------|
| Small (<1K files) | <1s | ~50MB | All features OK |
| Medium (1K-10K files) | 1-5s | 100-500MB | Use `--persist` |
| Large (10K-50K files) | 5-30s | 500MB-2GB | Use `--persist`, selective dirs |
| Very Large (>50K files) | 30s-2min | 2GB+ | Index subdirectories, not root |

### Neural Search Costs

With `--neural` enabled:
- **API mode**: Each query incurs API costs (Voyage AI or OpenAI)
- **ONNX mode**: ~50MB binary, no API costs, slower startup
- **Recommendation**: Use for specific semantic searches, not every query

### Common Mistakes

1. **Forgetting feature flags**: Call graph tools fail silently without `--call-graph`
2. **Over-indexing**: Pointing at monorepo root when you need one service
3. **Neural for everything**: Expensive; use `hybrid_search` as default
4. **Ignoring .gitignore**: narsil respects .gitignore; check `--verbose` if files missing

---

## Annotated Sources

### Official Documentation
- [Official] **GitHub README**: https://github.com/postrv/narsil-mcp — Primary documentation, tool reference, configuration
- [Official] **crates.io**: https://crates.io/crates/narsil-mcp — Rust package, installation via cargo

### Tool Registries
- [Community] **MCP Market**: https://mcpmarket.com/server/narsil — Third-party listing with use cases
- [Community] **LobeChat MCP Directory**: https://lobechat.com/discover/mcp/postrv-narsil-mcp — Integration guide

### Technology References
- [Official] **MCP Specification**: https://modelcontextprotocol.io/ — Model Context Protocol standard
- [Official] **tree-sitter**: https://tree-sitter.github.io/ — Underlying parser technology

---

## Summary

**Key Takeaways**:

1. **narsil-mcp is a structural code intelligence server** — it understands code as symbols, relationships, and flows, not just text
2. **76 tools in tiered capabilities** — from basic navigation to advanced security analysis
3. **Feature flags control capability/performance tradeoff** — enable `--call-graph`, `--git`, `--neural` based on need
4. **Sub-millisecond queries after indexing** — index once, query fast
5. **Privacy-first** — all processing local, no data leaves machine (except neural API mode)

**When to use this reference**:
- Configuring narsil-mcp for a project
- Understanding which tools to use for AI agent workflows
- Debugging why expected features aren't working (check flags!)

**Next steps**:
- See `SETUP-narsil-mcp.md` for installation and configuration
- Run `/dev-spike-feasibility` if integrating into existing tooling
