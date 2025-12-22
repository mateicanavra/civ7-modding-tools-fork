# Spike Report: Programmatic CLI Orchestration for Claude Code & Codex

**Date:** 2025-12-21
**Type:** Exploratory Investigation
**Status:** Complete

---

## Table of Contents

1. [Objective](#1-objective)
2. [Assumptions and Unknowns](#2-assumptions-and-unknowns)
3. [What We Learned](#3-what-we-learned)
4. [Potential Shapes](#4-potential-shapes)
5. [Minimal Experiment](#5-minimal-experiment)
6. [Risks and Open Questions](#6-risks-and-open-questions)
7. [Next Steps](#7-next-steps)
8. [TL;DR](#tldr)

---

## 1) Objective

Understand how to programmatically invoke Claude Code CLI and Codex CLI, and explore patterns for building a minimal orchestration loop that chains agent invocations without heavy framework overhead.

---

## 2) Assumptions and Unknowns

### Assumptions Made

- You want to run these CLIs from an outer script (Python/Node/Bun), not from within an already-running Claude Code session
- "Finish" means the CLI process exits (not streaming event handling)
- Both CLIs are already installed and authenticated
- The orchestration can be single-threaded (sequential chaining); parallel orchestration is a nice-to-have

### Unknowns That Remain

- Exact latency/overhead of spawning CLI processes repeatedly (likely acceptable for most workflows)
- Whether you need structured output parsing or just care about exit codes
- Your tolerance for session management complexity (resuming vs. fresh sessions)

---

## 3) What We Learned

### Claude Code CLI

#### Non-interactive mode (`-p` / `--print`)

Core invocation:

```bash
claude -p "your prompt" --allowedTools "Bash,Read,Edit"
```

#### Key flags for automation

| Flag | Purpose |
|------|---------|
| `--output-format json` | Structured JSON with `session_id`, result, metadata |
| `--output-format stream-json` | Newline-delimited JSON events for real-time streaming |
| `--allowedTools` | Auto-approve specific tools without prompting |
| `--dangerously-skip-permissions` | Skip all permission prompts (use cautiously) |
| `--max-turns N` | Limit agentic turns |
| `--continue` / `--resume <session_id>` | Continue previous conversations |
| `--json-schema` | Get validated structured JSON output matching a schema |

#### Multi-turn conversations

```bash
# First request, capture session_id
session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id')

# Continue that specific session
claude -p "Continue the review" --resume "$session_id"
```

#### Agent SDK (Python/TypeScript)

- Claude has a full Agent SDK that wraps the CLI
- Python: `claude_agent_sdk`; TypeScript: `@anthropic-ai/claude-agent-sdk`
- Provides async iterators over events, structured outputs, hooks, and more
- Uses the CLI under the hood but gives programmatic control

---

### Codex CLI

#### Non-interactive mode (`codex exec`)

Core invocation:

```bash
codex exec "your prompt"
```

#### Key flags for automation

| Flag | Purpose |
|------|---------|
| `--full-auto` | Workspace-write sandbox + auto-approve on failure |
| `--sandbox workspace-write` / `danger-full-access` | Control write permissions |
| `--json` | Newline-delimited JSON events (JSONL stream) |
| `--output-last-message <path>` | Write final message to file |
| `--output-schema <path>` | Structured JSON output matching a schema |
| `--skip-git-repo-check` | Run outside git repos |

#### Session resumption

```bash
codex exec "Start the task"
codex exec resume --last "Continue where you left off"
# Or specific session:
codex exec resume <SESSION_ID> "Follow-up"
```

#### Notification hooks

Codex supports a `notify` config option that invokes an external program with JSON for each event:

```toml
# ~/.codex/config.toml
notify = ["python3", "/path/to/notify.py"]
```

The script receives JSON with `type`, `thread-id`, `cwd`, `input-messages`, `last-assistant-message`.

#### TypeScript SDK

- Package: `@openai/codex-sdk`
- Wraps the CLI binary, exchanges JSONL over stdin/stdout
- Provides `Thread.run()` and `Thread.runStreamed()` for programmatic control

---

### Key Similarities

| Feature | Claude Code | Codex |
|---------|-------------|-------|
| Non-interactive mode | `-p "prompt"` | `exec "prompt"` |
| JSON output | `--output-format json` | `--json` |
| Streaming JSON | `--output-format stream-json` | `--json` (same) |
| Session resumption | `--resume <id>` / `--continue` | `exec resume <id>` / `--last` |
| Structured output | `--json-schema` | `--output-schema` |
| SDK | Python + TypeScript | TypeScript |
| Finish hook | Hooks API (config-based) | `notify` config |

---

## 4) Potential Shapes

### Shape A: Pure CLI Subprocess Loop (Minimal)

A simple script that spawns CLI processes, waits for completion, parses output, and decides next steps.

#### Python (subprocess)

```python
import subprocess
import json

def run_claude(prompt, session_id=None):
    cmd = ["claude", "-p", prompt, "--output-format", "json", "--allowedTools", "Bash,Read,Edit"]
    if session_id:
        cmd.extend(["--resume", session_id])
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)

def run_codex(prompt, resume_last=False):
    cmd = ["codex", "exec", "--full-auto", "--json", prompt]
    result = subprocess.run(cmd, capture_output=True, text=True)
    # Parse last line for final message or parse all JSONL
    return result.stdout

# Simple orchestration loop
session = None
tasks = ["Analyze the codebase", "Create a plan", "Implement step 1"]
for task in tasks:
    result = run_claude(task, session)
    session = result.get("session_id")
    print(f"Completed: {task}")
```

#### Bun/Node (exec)

```typescript
import { execSync } from 'child_process';

function runClaude(prompt: string, sessionId?: string) {
  const args = ['-p', prompt, '--output-format', 'json', '--allowedTools', 'Bash,Read,Edit'];
  if (sessionId) args.push('--resume', sessionId);
  const result = execSync(`claude ${args.join(' ')}`).toString();
  return JSON.parse(result);
}

// Loop
let session: string | undefined;
for (const task of ["Review", "Fix", "Test"]) {
  const result = runClaude(task, session);
  session = result.session_id;
}
```

**Pros:** Zero dependencies, dead simple, full control
**Cons:** No streaming, blocking, manual error handling, timeout management is DIY

---

### Shape B: SDK-Based Loop (More Structure)

Use the official SDKs for a cleaner programmatic interface.

#### Python (Claude Agent SDK)

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def orchestrate():
    tasks = [
        "Find bugs in the codebase",
        "Prioritize by severity",
        "Fix the top bug"
    ]
    for task in tasks:
        async for message in query(
            prompt=task,
            options=ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Bash"])
        ):
            if hasattr(message, "result"):
                print(f"Completed: {message.result}")

asyncio.run(orchestrate())
```

#### TypeScript (Codex SDK)

```typescript
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();
const thread = codex.startThread();

const tasks = ["Diagnose", "Plan fix", "Implement"];
for (const task of tasks) {
  const turn = await thread.run(task);
  console.log(turn.finalResponse);
}
```

**Pros:** Streaming support, session management built-in, typed events, easier error handling
**Cons:** Adds a dependency, still wraps CLI under the hood

---

### Shape C: Event-Driven with Notify Hooks (Codex only)

Configure Codex's `notify` hook to call your script on completion, enabling a push-based model.

```toml
# ~/.codex/config.toml
notify = ["node", "/path/to/orchestrator.js"]
```

```javascript
// orchestrator.js - receives JSON arg on each Codex event
const event = JSON.parse(process.argv[2]);
if (event.type === "agent-turn-complete") {
  // Decide next action, spawn next Codex/Claude task
  // Could write to a queue, call an API, etc.
}
```

**Pros:** Event-driven, decoupled
**Cons:** Codex only (Claude Code uses hooks differently), more complex setup, requires external coordination

---

## 5) Minimal Experiment

### Recommended first experiment: Shape A with Python

Create a single `orchestrate.py` file that:

1. Defines a list of sequential tasks
2. Runs each through Claude Code `-p` with `--output-format json`
3. Captures `session_id` for continuity
4. Logs completion and moves to next task
5. On error, logs and stops (or retries)

This validates:

- CLI invocation works from subprocess
- Session resumption works across calls
- Output parsing is reliable
- Latency is acceptable for your use case

### Stretch goal

Add a parallel mode using `asyncio.create_subprocess_exec` to run Claude Code and Codex simultaneously on independent tasks.

---

## 6) Risks and Open Questions

### Risks

| Risk | Description |
|------|-------------|
| **Process overhead** | Spawning CLI processes has ~100-500ms overhead; fine for most workflows, but may matter at scale |
| **Authentication state** | Both CLIs need to be authenticated; if auth expires mid-loop, the script will fail |
| **Error handling** | CLI errors come as non-zero exit codes + stderr; need robust parsing |
| **Streaming complexity** | If you need real-time progress, you'll need to parse JSONL streams, which adds complexity |
| **Concurrency** | Running multiple CLI instances in parallel is possible but needs care around working directory conflicts |

### Open Questions

1. Do you need multi-turn sessions (resume) or are fresh sessions per task acceptable?
2. Do you need structured output schemas, or is plain text/JSON sufficient?
3. What's your error recovery strategy—retry, skip, or halt?
4. Will you mix Claude Code and Codex in the same loop, or use one primarily?

### Hard/Brittle Areas

- Parsing JSONL streams robustly (partial lines, encoding)
- Handling timeouts (CLI may hang on network issues)
- Managing working directories when tasks need different contexts

---

## 7) Next Steps

| If you want to... | Do this |
|-------------------|---------|
| Start simple | Build the Python subprocess loop (Shape A) for a single CLI |
| Get streaming | Use the TypeScript SDK (`@openai/codex-sdk` or `@anthropic-ai/claude-agent-sdk`) |
| Go event-driven | Explore Codex's `notify` hooks for push-based orchestration |
| Mix both CLIs | Start with subprocess approach—both CLIs are similar enough to wrap uniformly |
| Avoid dependencies | Pure subprocess + JSON parsing; no SDK needed |

### Suggested Progression

1. **Now:** Minimal Python subprocess loop with Claude Code `-p`
2. **If that works:** Add Codex `exec` to the same loop
3. **If you need streaming:** Migrate to SDK-based approach
4. **If you need parallelism:** Use `asyncio` subprocess or Node `child_process.spawn`

---

## TL;DR

Both CLIs have excellent automation support. Here's the quick reference:

### Claude Code

```bash
claude -p "prompt" --output-format json --resume <session_id>
```

### Codex

```bash
codex exec --json "prompt"
codex exec resume --last "follow-up"
```

### Simplest Orchestration Loop

```python
import subprocess, json

def run_agent(cli, prompt, session=None):
    if cli == "claude":
        cmd = ["claude", "-p", prompt, "--output-format", "json"]
        if session: cmd += ["--resume", session]
    else:  # codex
        cmd = ["codex", "exec", "--json", "--full-auto", prompt]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout) if cli == "claude" else result.stdout

# Chain tasks
for task in ["analyze", "plan", "implement"]:
    result = run_agent("claude", task)
```

The subprocess approach is the simplest path—no framework overhead, just CLI calls and JSON parsing. SDKs are there when you need streaming or tighter integration.

---

## References

- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code Headless Mode](https://code.claude.com/docs/en/headless)
- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Codex CLI Reference](https://developers.openai.com/codex/cli/reference/)
- [Codex SDK Documentation](https://developers.openai.com/codex/sdk/)
- [Codex Configuration (notify hooks)](https://github.com/openai/codex/blob/main/docs/config.md)
