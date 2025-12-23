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

async function isGraphiteTracked(repoRoot: string, branchName: string): Promise<boolean> {
  try {
    const result = await runCommand("gt", ["log", "--classic", "--no-interactive", "--all"], { cwd: repoRoot });
    if (result.exitCode !== 0) return false;
    return result.stdout.includes(branchName);
  } catch {
    return false;
  }
}

async function graphiteMoveOnto(
  repoRoot: string,
  branchName: string,
  parentBranch: string,
): Promise<{ ok: boolean; details?: string }> {
  try {
    const result = await runCommand(
      "gt",
      ["move", "--onto", parentBranch, "--source", branchName, "--no-interactive"],
      { cwd: repoRoot },
    );
    if (result.exitCode !== 0) {
      return { ok: false, details: result.stderr || result.stdout };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, details: error instanceof Error ? error.message : String(error) };
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
      const tracked = await isGraphiteTracked(repoRoot, branchName);
      if (tracked) {
        const moved = await graphiteMoveOnto(repoRoot, branchName, parentBranch);
        if (moved.ok && (await isAncestor(repoRoot, parentBranch, branchName))) {
          return worktreePath;
        }
        throw new Error(
          `Existing branch ${branchName} is Graphite-tracked but is not based on ${parentBranch}. Failed to move it onto ${parentBranch} via Graphite: ${moved.details ?? "unknown error"}`,
        );
      }
      throw new Error(
        [
          `Existing branch ${branchName} is not based on ${parentBranch}.`,
          `This orchestrator will not rewrite untracked branches automatically.`,
          `Choose one of:`,
          `- Track the branch with Graphite, then use Graphite to re-parent it (e.g. \`gt move --onto ${parentBranch} --source ${branchName}\`).`,
          `- Run the orchestrator with a different branch name for this issue (so the existing branch is left untouched).`,
          `- If you intentionally want to discard the existing branch/worktree, do that manually and re-run.`,
        ].join(" "),
      );
    }
    return worktreePath;
  }

  const exists = await branchExists(repoRoot, branchName);
  if (exists) {
    const parentOk = await isAncestor(repoRoot, parentBranch, branchName);
    if (!parentOk) {
      const tracked = await isGraphiteTracked(repoRoot, branchName);
      if (tracked) {
        const moved = await graphiteMoveOnto(repoRoot, branchName, parentBranch);
        const ok = moved.ok && (await isAncestor(repoRoot, parentBranch, branchName));
        if (!ok) {
          throw new Error(
            `Branch ${branchName} is Graphite-tracked but is not based on ${parentBranch}. Failed to move it onto ${parentBranch} via Graphite: ${moved.details ?? "unknown error"}`,
          );
        }
      } else {
        throw new Error(
          [
            `Branch ${branchName} exists but is not based on ${parentBranch}.`,
            `This orchestrator will not rewrite untracked branches automatically.`,
            `Choose one of:`,
            `- Track the branch with Graphite, then use Graphite to re-parent it (e.g. \`gt move --onto ${parentBranch} --source ${branchName}\`).`,
            `- Run the orchestrator with a different branch name for this issue (so the existing branch is left untouched).`,
            `- If you intentionally want to discard the existing branch, do that manually and re-run.`,
          ].join(" "),
        );
      }
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
