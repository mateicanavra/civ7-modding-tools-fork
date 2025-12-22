# Spike: ACP + Mastra integration (how we'd do it)

## Objective
Show a concrete, simplified way to combine Mastra workflows (engine) with ACP (agent transport) for our dev/review/fix loop, with streaming visibility and structured I/O.

## Sources
- Mastra workflows overview: https://mastra.ai/docs/workflows/overview
- Mastra workflow reference: https://mastra.ai/reference/workflows/workflow
- ACP introduction: https://agentclientprotocol.com/overview/introduction
- ACP architecture: https://agentclientprotocol.com/overview/architecture
- ACP agents list: https://agentclientprotocol.com/overview/agents
- Zed ACP page: https://zed.dev/acp

## What we learned (relevant to the design)
- Mastra workflows are step-based, with explicit `inputSchema` and `outputSchema` and built-in streaming via `run.stream()`. This matches our need for schema-validated inputs/outputs and streaming progress without custom JSONL parsers.
- Mastra supports workflow state and restart/resume, which map cleanly to our per-issue loop and max-2 review/fix cycles.
- ACP is a JSON-RPC protocol over stdio for editor <-> agent communication. The client (editor/orchestrator) spawns the agent subprocess and receives streaming notifications. ACP reuses MCP types where possible and is designed for tool permission requests and rich UX updates.
- ACP already lists adapters for Codex and Claude Code (via Zed adapters), and Gemini CLI as a reference agent, so ACP can standardize agent transport without binding to a single vendor CLI.

## How we'd do it (target shape, simplified)

### Layering
- **Mastra** is the workflow engine and state machine (issue loop, review/fix cycles).
- **ACP** is the transport layer for agent CLIs (Codex/Claude/Gemini) used inside specific workflow steps.
- **dev-auto-* contract** remains the same; only the transport changes (ACP instead of direct SDK/CLI).

### Step graph (simplified)

```
load-config
  -> discover-issues
    -> order-issues
      -> for each issue
        -> create-worktree
          -> dev-auto-parallel (ACP)
            -> review (ACP)
              - pass -> teardown
              - blocked -> teardown (record blocked)
              - changes_required -> fix (ACP) -> review (ACP)
                                 - pass -> teardown
                                 - changes_required/blocked -> teardown (cap)
```

### Core ACP-backed steps
Each ACP step does three things:
1. **Start ACP session** (or reuse an existing one) with the target agent CLI.
2. **Send a structured task** that includes the dev-auto inputs:
   - `issueId`, `issueDocPath`, `milestoneId`, `branchName`, `worktreePath`.
3. **Stream ACP notifications** to stdout while capturing a final JSON result for the workflow step output.

### Mastra step sketch (conceptual)
- `dev-auto-parallel` step:
  - `inputSchema`: dev-auto inputs + `agentId`/`agentCommand`.
  - `outputSchema`: dev-auto result schema (status, branch, testsRun, notes, etc.).
  - `execute`: connect to ACP agent, send task, stream updates, return structured JSON.
- `dev-auto-review-linear` step:
  - Same pattern; output schema expects `status: pass | changes_required | blocked`.
- `dev-auto-fix-review` step:
  - Same pattern; output schema expects `status: pass | failed | deferred`.

## ACP transport details (what we can assume)
- ACP uses **JSON-RPC over stdio** with the editor/orchestrator spawning the agent subprocess.
- ACP relies on **notifications** for streaming updates and **requests** for actions (including permission requests).
- ACP is **MCP-friendly**, so tool access (git, Graphite, filesystem) can be passed via MCP configuration.

## Where validation happens
- Mastra step schemas provide **input/output validation** (Zod-based). This replaces manual JSON schema validation and helps avoid the schema drift errors we saw.
- If we want TypeBox-based schema types, we can bridge them into Zod or maintain parallel schemas, but Mastra natively prefers Zod.

## Minimal experiment (if we test this)
- Implement a single Mastra step that calls an ACP agent (Codex via ACP adapter) and returns a stubbed dev-auto result.
- Stream ACP notifications to stdout and capture the final structured JSON result.
- Verify the step runs with Mastra `run.stream()` so we see both workflow-level stream events and agent-level ACP stream events.

## Risks / open questions
- ACP method/message names for agent tasks are not fully enumerated in the public overview docs; we may need to consult the ACP schema/docs in depth to avoid guessing.
- How to pass tool permissions and workspace scoping cleanly via ACP in a headless (non-editor) CLI environment.
- Whether we want Mastra as the core engine vs. a lighter custom loop plus schema validation.

## Takeaway
Mastra + ACP is a clean architectural fit: Mastra handles the orchestration graph and schema validation, while ACP standardizes agent transport and streaming. The dev-auto contract stays intact. The main unknown is the exact ACP request surface needed for a headless orchestrator.
