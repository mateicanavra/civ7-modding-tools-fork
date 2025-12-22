import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { runCommand } from "./shell.js";

async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function branchExists(repoRoot: string, branchName: string): Promise<boolean> {
  const result = await runCommand(
    "git",
    ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`],
    { cwd: repoRoot },
  );
  return result.exitCode === 0;
}

async function resolveCheckedOutBranch(worktreePath: string): Promise<string> {
  const result = await runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: worktreePath });
  if (result.exitCode !== 0) {
    throw new Error(`Failed to resolve current branch in worktree: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

async function isAncestor(repoRoot: string, ancestor: string, descendant: string): Promise<boolean> {
  const result = await runCommand("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: repoRoot,
  });
  return result.exitCode === 0;
}

export function deriveBranchName(issueId: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${issueId}-${slug}`;
}

export function issueWorktreePath(repoRoot: string, branchName: string): string {
  return resolve(repoRoot, "..", `wt-${branchName}`);
}

export async function ensureWorktree(
  repoRoot: string,
  branchName: string,
  parentBranch: string,
): Promise<string> {
  const worktreePath = issueWorktreePath(repoRoot, branchName);

  if (await pathExists(worktreePath)) {
    const checkedOut = await resolveCheckedOutBranch(worktreePath);
    if (checkedOut !== branchName) {
      throw new Error(
        `Existing worktree at ${worktreePath} is checked out on ${checkedOut}, expected ${branchName}.`,
      );
    }
    const parentOk = await isAncestor(repoRoot, parentBranch, branchName);
    if (!parentOk) {
      throw new Error(
        `Existing branch ${branchName} is not based on ${parentBranch}. Remove wt-${branchName} and re-run with --base-branch ${parentBranch}.`,
      );
    }
    return worktreePath;
  }

  const exists = await branchExists(repoRoot, branchName);
  if (exists) {
    const parentOk = await isAncestor(repoRoot, parentBranch, branchName);
    if (!parentOk) {
      throw new Error(
        `Branch ${branchName} exists but is not based on ${parentBranch}. Rebase it or delete it before running the orchestrator.`,
      );
    }
  }
  const args = exists
    ? ["worktree", "add", worktreePath, branchName]
    : ["worktree", "add", "-b", branchName, worktreePath, parentBranch];

  const result = await runCommand("git", args, { cwd: repoRoot });
  if (result.exitCode !== 0) {
    throw new Error(`Failed to create worktree: ${result.stderr || result.stdout}`);
  }

  return worktreePath;
}

export async function removeWorktree(repoRoot: string, worktreePath: string): Promise<void> {
  const result = await runCommand("git", ["worktree", "remove", worktreePath], { cwd: repoRoot });
  if (result.exitCode !== 0) {
    throw new Error(`Failed to remove worktree: ${result.stderr || result.stdout}`);
  }
}
