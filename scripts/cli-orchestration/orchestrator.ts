import { join } from "node:path";
import { CodexSdkRunner } from "./codex-sdk-runner.js";
import { loadIssuesByMilestone, orderIssuesLinear, resolveMilestoneDoc } from "./issue-discovery.js";
import { writeJson } from "./logging.js";
import { renderPrompt } from "./prompt-renderer.js";
import type { DevResult, IssueDoc, OrchestratorConfig, ReviewResult } from "./types.js";
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

interface PhaseRunResult<T> {
  result: T;
  logPath: string;
  stderrPath: string;
}

async function runDevOrFixPhase(
  runner: CodexSdkRunner,
  prompt: string,
  schemaPath: string,
  logRoot: string,
  worktreePath: string,
  phase: "dev" | "fix",
): Promise<PhaseRunResult<DevResult>> {
  const logPath = join(logRoot, `${phase}.jsonl`);
  const stderrPath = join(logRoot, `${phase}.stderr.log`);
  const result = await runner.run<DevResult>({
    prompt,
    cwd: worktreePath,
    schemaPath,
    logPath,
    stderrPath,
  });
  await writeJson(join(logRoot, `${phase}-result.json`), result.result);
  return { result: result.result, logPath, stderrPath };
}

async function runReviewPhase(
  runner: CodexSdkRunner,
  prompt: string,
  schemaPath: string,
  logRoot: string,
  worktreePath: string,
  cycle: number,
): Promise<PhaseRunResult<ReviewResult>> {
  const logPath = join(logRoot, `review-${cycle}.jsonl`);
  const stderrPath = join(logRoot, `review-${cycle}.stderr.log`);
  const result = await runner.run<ReviewResult>({
    prompt,
    cwd: worktreePath,
    schemaPath,
    logPath,
    stderrPath,
  });
  await writeJson(join(logRoot, `review-${cycle}-result.json`), result.result);
  return { result: result.result, logPath, stderrPath };
}

async function runFixPhase(
  runner: CodexSdkRunner,
  prompt: string,
  schemaPath: string,
  logRoot: string,
  worktreePath: string,
  cycle: number,
): Promise<PhaseRunResult<DevResult>> {
  const logPath = join(logRoot, `fix-${cycle}.jsonl`);
  const stderrPath = join(logRoot, `fix-${cycle}.stderr.log`);
  const result = await runner.run<DevResult>({
    prompt,
    cwd: worktreePath,
    schemaPath,
    logPath,
    stderrPath,
  });
  await writeJson(join(logRoot, `fix-${cycle}-result.json`), result.result);
  return { result: result.result, logPath, stderrPath };
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
  const logRoot = join(config.logsRoot, args.milestoneId, issue.id);
  const runner = new CodexSdkRunner();
  const devSchemaPath = join(
    config.repoRoot,
    "scripts",
    "cli-orchestration",
    "schemas",
    "dev.schema.json",
  );
  const reviewSchemaPath = join(
    config.repoRoot,
    "scripts",
    "cli-orchestration",
    "schemas",
    "review.schema.json",
  );

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
    const devResult = await runDevOrFixPhase(
      runner,
      prompt,
      devSchemaPath,
      logRoot,
      worktreePath,
      "dev",
    );
    let lastResult: PhaseRunResult<DevResult | ReviewResult> = devResult;
    if (devResult.result.status !== "pass") {
      return devResult;
    }

    let priorFixSummary: string | undefined;
    for (let cycle = 1; cycle <= config.maxReviewCycles; cycle += 1) {
      const reviewPrompt = await renderPrompt("dev-auto-review-linear", {
        issueId: issue.id,
        issueDocPath: issue.path,
        milestoneId: args.milestoneId,
        milestoneDocPath: milestone.path,
        branchName,
        worktreePath,
        maxReviewCycles: config.maxReviewCycles,
        reviewCycle: cycle,
        priorFixSummary,
      });

      const reviewResult = await runReviewPhase(
        runner,
        reviewPrompt,
        reviewSchemaPath,
        logRoot,
        worktreePath,
        cycle,
      );
      lastResult = reviewResult;
      if (reviewResult.result.status === "pass" || reviewResult.result.status === "blocked") {
        return reviewResult;
      }

      const fixPrompt = await renderPrompt("dev-auto-fix-review", {
        issueId: issue.id,
        issueDocPath: issue.path,
        milestoneId: args.milestoneId,
        milestoneDocPath: milestone.path,
        branchName,
        worktreePath,
        maxReviewCycles: config.maxReviewCycles,
        reviewCycle: cycle,
        reviewResult: reviewResult.result,
      });

      const fixResult = await runFixPhase(
        runner,
        fixPrompt,
        devSchemaPath,
        logRoot,
        worktreePath,
        cycle,
      );
      lastResult = fixResult;
      priorFixSummary = fixResult.result.summary;
      if (fixResult.result.status !== "pass") {
        return fixResult;
      }
    }

    return lastResult;
  } finally {
    await removeWorktree(config.repoRoot, worktreePath);
  }
}
