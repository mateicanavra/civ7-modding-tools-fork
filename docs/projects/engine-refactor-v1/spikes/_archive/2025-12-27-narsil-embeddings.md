# Spike: narsil-mcp neural embeddings + indexing/query scoping

## 1) Objective

Understand what “neural embeddings” mean in `narsil-mcp`, why they’re not active for `civ7-modding-tools` right now, and what controls exist for:

- which directories get indexed
- which directories queries should consider (even if indexing is broad)

## 2) Assumptions and Unknowns

- “Not activated” means `neural_search` / embedding-based semantic search isn’t available via our current MCP server config (not “narsil isn’t installed”).
- “Directory scoping” might mean:
  - index-time scoping (don’t load data at all), or
  - query-time scoping (index all, but search within a subset)

## 3) What We Learned

### What “neural embeddings” are (in narsil-mcp)

`narsil-mcp` builds an in-memory code intelligence index for structural queries (symbols, call graphs, etc.) and supports multiple search modes. “Neural embeddings” are an *optional* capability that enables embedding-similarity search (exposed as the `neural_search` tool) and requires explicit opt-in.

- `narsil-mcp --help` shows neural flags:
  - `--neural` (enable neural embeddings)
  - `--neural-backend` (api vs onnx)
  - `--neural-model`
  - and notes API key requirements

Upstream docs/README also describe this as “Neural semantic search … with Voyage AI or OpenAI embeddings”:

- https://raw.githubusercontent.com/postrv/narsil-mcp/main/README.md

### Why neural embeddings aren’t currently activated for civ7-modding-tools

This repo’s MCP config does not pass `--neural`, so narsil runs without neural search enabled:

- `.mcp.json#L5`

The local setup doc also frames the default civ7 profile as “All 76 tools except neural search and LSP”:

- `docs/system/libs/narsil-mcp/SETUP-narsil-mcp.md#L245`

### Can we specify which directories get indexed?

Yes, primarily via “what you point `--repos` at” plus ignore rules:

1) Index-time scoping: point narsil at specific directories instead of the monorepo root (multiple `--repos` supported).

- `docs/system/libs/narsil-mcp/SETUP-narsil-mcp.md#L360`

2) Ignore-based scoping: narsil’s repo walker respects `.gitignore` (including global + exclude), so ignored paths won’t be indexed.

- Upstream implementation uses `ignore::WalkBuilder` with `.git_ignore(true)`, `.git_global(true)`, `.git_exclude(true)`:
  - https://raw.githubusercontent.com/postrv/narsil-mcp/7d8057b777af852cf086e20943b838cb100b6827/src/index.rs

### Can we scope queries to particular directories?

Yes: many tools have parameters that narrow scope at query-time.

Examples (upstream):

- `search_code(repo?, query, file_pattern?, max_results)` supports a `file_pattern` glob filter, and `repo` can be omitted to search all indexed repos:
  - https://raw.githubusercontent.com/postrv/narsil-mcp/7d8057b777af852cf086e20943b838cb100b6827/src/tool_handlers/search.rs
  - https://raw.githubusercontent.com/postrv/narsil-mcp/7d8057b777af852cf086e20943b838cb100b6827/src/index.rs
- `find_symbols(repo, ..., file_pattern?)` supports `file_pattern` (glob) as well:
  - https://raw.githubusercontent.com/postrv/narsil-mcp/7d8057b777af852cf086e20943b838cb100b6827/src/index.rs
- “Read” tools like `get_file`/`get_excerpt` take explicit `repo` + `path` so you can naturally keep an investigation scoped:
  - https://raw.githubusercontent.com/postrv/narsil-mcp/7d8057b777af852cf086e20943b838cb100b6827/src/tool_handlers/repo.rs

If multiple repos are indexed, discover the repo identifiers via `list_repos`:

- `docs/system/libs/narsil-mcp/REF-narsil-mcp.md#L69`

## 4) Potential Shapes

- Index less: configure narsil to index only relevant subtrees via multiple `--repos`.
- Index all, query narrow: keep indexing broad, but standardize on `file_pattern` / `path` for search-heavy workflows.
- Neural on-demand: keep default config without `--neural`, and use a separate MCP server entry (or temporary run) with `--neural` when needed.

## 5) Minimal Experiment (Optional)

Run narsil once with `--neural` enabled and a narrow `--repos` target, then compare `neural_search` vs `hybrid_search` for “find code that does X” queries (where naming differs).

## 6) Risks and Open Questions

- API cost + key management (when using `--neural-backend api`).
- Signal/noise: indexing the monorepo root can produce too many matches unless queries are scoped.
- Naming UX: when indexing multiple `--repos`, you need to use the repo names from `list_repos`.

## 7) Next Steps

- If the next question is “should we enable `--neural` here, and how should we structure configs for subtrees?” → run `/dev-spike-feasibility`.
- If you want a durable “how to use narsil scoping in this repo” reference (with examples) → run `/dev-spike-resource`.

