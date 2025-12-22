# Spike: Mastra step graph + ACP context (v0 loop)

## Objective
Draft a Mastra step-graph shape that maps 1:1 (simplified) to our current orchestration loop, and capture what Zed ACP affords for agent CLI comms.

## Sources
- Mastra workflows overview: https://mastra.ai/docs/workflows/overview
- ACP overview: https://agentclientprotocol.com/overview/introduction
- ACP architecture: https://agentclientprotocol.com/overview/architecture
- Zed ACP page: https://zed.dev/acp

## What we learned (Mastra)
- Workflows are composed from steps with explicit `inputSchema` and `outputSchema`, and can stream execution events. This matches our need for schema-driven orchestration with logs and progress visibility.
- `createWorkflow()` + `.then()` composition is the natural fit for a linear core loop with branch logic (review pass vs changes).
- Workflow state and stream modes are built-in, so the orchestrator can surface per-step events without hand-rolled JSONL parsing.

## Step graph (simplified, 1:1 with current loop)

```
load-config
  -> discover-issues
    -> order-issues
      -> for each issue
        -> create-worktree
          -> dev-auto-parallel
            -> review (attempt 1)
              - pass -> teardown
              - blocked -> teardown (record blocked)
              - changes_required -> fix -> review (attempt 2)
                                 - pass -> teardown
                                 - changes_required/blocked -> teardown (cap)
```

Notes:
- This mirrors the current v0 loop: dev -> review -> fix -> review, max 2 review cycles, converge on review `status: pass`.
- Inputs/outputs remain the same as the dev-auto contract (issueId, issueDocPath, milestoneId, branchName, worktreePath).

## ACP context (for multi-agent CLI interop)
- ACP is a JSON-RPC protocol over stdio for editor <-> agent communication; agents run as subprocesses and stream updates via notifications.
- It is MCP-friendly and supports tool permission requests, which aligns with our need to run git/Graphite commands with explicit approvals.
- Zed lists adapters for Claude Code and Codex, and Gemini CLI as a reference implementation.

## Implications for our orchestration
- Mastra can model our workflow graph with strong schema validation and streaming out-of-the-box.
- ACP is not a workflow engine; it is a transport layer that could standardize how we talk to agent CLIs, but it does not replace orchestration logic.
- If we adopt ACP, the orchestrator becomes an ACP client (or runs inside an ACP host) while the workflow graph (Mastra or custom) remains the coordination layer.

## Open questions
- Whether we want Mastra as the core engine vs a thin custom loop with schema validation (TypeBox/Zod).
- How much ACP integration we need for v0 vs keeping the current direct Codex SDK runner.
