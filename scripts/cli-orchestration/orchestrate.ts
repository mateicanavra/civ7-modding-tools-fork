import { parseArgs } from "node:util";
import { join } from "node:path";
import { formatIssuePlan, planOrchestration, runOrchestrator } from "./orchestrator.js";
import { runCommand } from "./shell.js";
import type { OrchestratorConfig } from "./types.js";

function usage(): string {
  return [
    "Usage:",
    "  bun run scripts/cli-orchestration/orchestrate.ts --milestone <ID> [--project <ID>]",
    "",
    "Options:",
    "  -m, --milestone   Milestone ID to run (required)",
    "  -p, --project     Project ID to disambiguate milestones (optional)",
    "  -i, --issue       Issue ID to run (optional, defaults to first)",
    "  -b, --base-branch Base branch to create issue worktrees from (default: current branch)",
    "  --logs-root       Override logs root (default: logs/orch)",
    "  --dry-run         Print planned issue order + worktree/branch and exit",
  ].join("\n");
}

function parseCliArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      milestone: { type: "string", short: "m" },
      project: { type: "string", short: "p" },
      issue: { type: "string", short: "i" },
      "base-branch": { type: "string", short: "b" },
      "logs-root": { type: "string" },
      "dry-run": { type: "boolean" },
    },
  });

  if (!values.milestone) {
    console.error(usage());
    process.exit(1);
  }

  return {
    milestoneId: values.milestone,
    projectId: values.project,
    issueId: values.issue,
    baseBranch: values["base-branch"],
    logsRoot: values["logs-root"],
    dryRun: values["dry-run"] ?? false,
  };
}

async function resolveBaseBranch(repoRoot: string, override?: string): Promise<string> {
  if (override) {
    return override;
  }
  const result = await runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoRoot });
  const branch = result.exitCode === 0 ? result.stdout.trim() : "";
  if (branch && branch !== "HEAD") {
    return branch;
  }
  return "main";
}

async function main() {
  const { milestoneId, issueId, projectId, logsRoot, baseBranch, dryRun } = parseCliArgs();
  const repoRoot = process.cwd();
  const resolvedBaseBranch = await resolveBaseBranch(repoRoot, baseBranch);

  const config: OrchestratorConfig = {
    repoRoot,
    logsRoot: logsRoot ?? join(repoRoot, "logs", "orch"),
    maxReviewCycles: 2,
    baseBranch: resolvedBaseBranch,
  };

  if (dryRun) {
    const plan = await planOrchestration(config, { milestoneId, projectId, issueId });
    console.log(formatIssuePlan(plan));
    return;
  }

  await runOrchestrator(config, { milestoneId, projectId, issueId });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
