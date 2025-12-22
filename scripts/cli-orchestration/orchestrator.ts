import { join } from "node:path";
import { CodexSdkRunner } from "./codex-sdk-runner.js";
import { loadIssuesByMilestone, orderIssuesLinear, resolveMilestoneDoc } from "./issue-discovery.js";
import { writeJson } from "./logging.js";
import { renderPrompt } from "./prompt-renderer.js";
import type { DevResult, IssueDoc, OrchestratorConfig } from "./types.js";
import { deriveBranchName, ensureWorktree, removeWorktree } from "./worktree.js";

export interface OrchestratorArgs {
  milestoneId: string;
  issueId?: string;
  projectId?: string;
}

function selectIssue(issues: IssueDoc[], issueId?: string): IssueDoc {
  if (!issueId) {
    return issues[0];
  }
  const match = issues.find((issue) => issue.id === issueId);
  if (!match) {
    throw new Error(`Issue ${issueId} not found in milestone list.`);
  }
  return match;
}

export async function runOrchestrator(config: OrchestratorConfig, args: OrchestratorArgs) {
  const milestone = await resolveMilestoneDoc(config.repoRoot, args.milestoneId, args.projectId);
  const issues = orderIssuesLinear(
    await loadIssuesByMilestone(config.repoRoot, args.milestoneId, milestone.project),
  );
  if (issues.length === 0) {
    throw new Error(`No issues found for milestone ${args.milestoneId}.`);
  }

  const issue = selectIssue(issues, args.issueId);
  const branchName = deriveBranchName(issue.id, issue.title);
  const worktreePath = await ensureWorktree(config.repoRoot, branchName, "main");

  try {
    const prompt = await renderPrompt("dev-auto-parallel", {
      issueId: issue.id,
      issueDocPath: issue.path,
      milestoneId: args.milestoneId,
      milestoneDocPath: milestone.path,
      branchName,
      worktreePath,
      maxReviewCycles: config.maxReviewCycles,
      reviewCycle: 1,
    });

    const logRoot = join(config.logsRoot, args.milestoneId, issue.id);
    const runner = new CodexSdkRunner();

    const result = await runner.run<DevResult>({
      prompt,
      cwd: worktreePath,
      schemaPath: join(config.repoRoot, "scripts", "cli-orchestration", "schemas", "dev.schema.json"),
      logPath: join(logRoot, "dev.jsonl"),
      stderrPath: join(logRoot, "dev.stderr.log"),
    });

    await writeJson(join(logRoot, "dev-result.json"), result.result);

    return result;
  } finally {
    await removeWorktree(config.repoRoot, worktreePath);
  }
}
