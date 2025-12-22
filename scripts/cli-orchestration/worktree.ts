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
    return worktreePath;
  }

  const exists = await branchExists(repoRoot, branchName);
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
