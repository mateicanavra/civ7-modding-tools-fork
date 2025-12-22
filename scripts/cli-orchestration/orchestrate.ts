import { parseArgs } from "node:util";
import { join } from "node:path";
import { runOrchestrator } from "./orchestrator.js";
import type { OrchestratorConfig } from "./types.js";

function usage(): string {
  return [
    "Usage:",
    "  bun run scripts/cli-orchestration/orchestrate.ts --milestone <ID>",
    "",
    "Options:",
    "  -m, --milestone   Milestone ID to run (required)",
    "  --logs-root       Override logs root (default: logs/orch)",
  ].join("\n");
}

function parseCliArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      milestone: { type: "string", short: "m" },
      "logs-root": { type: "string" },
    },
  });

  if (!values.milestone) {
    console.error(usage());
    process.exit(1);
  }

  return {
    milestoneId: values.milestone,
    logsRoot: values["logs-root"],
  };
}

async function main() {
  const { milestoneId, logsRoot } = parseCliArgs();
  const repoRoot = process.cwd();

  const config: OrchestratorConfig = {
    repoRoot,
    logsRoot: logsRoot ?? join(repoRoot, "logs", "orch"),
    maxReviewCycles: 2,
  };

  await runOrchestrator(config, { milestoneId });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
