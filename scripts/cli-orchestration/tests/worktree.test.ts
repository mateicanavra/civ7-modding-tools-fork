import { describe, expect, it } from "bun:test";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { ensureWorktree } from "../worktree.js";

const execFileAsync = promisify(execFile);
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test Bot",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test Bot",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

async function runGit(cwd: string, args: string[]) {
  await execFileAsync("git", args, { cwd, env: gitEnv });
}

async function getCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
    env: gitEnv,
  });
  return stdout.trim();
}

async function withTempRepo<T>(fn: (repoDir: string) => Promise<T>) {
  const baseDir = await mkdtemp(join(tmpdir(), "orch-worktree-"));
  try {
    await runGit(baseDir, ["init"]);
    await writeFile(join(baseDir, "README.md"), "temp");
    await runGit(baseDir, ["add", "README.md"]);
    await runGit(baseDir, ["commit", "-m", "init"]);
    return await fn(baseDir);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
}

describe("worktree", () => {
  it("refuses to create a worktree when an existing branch is not based on the requested parent", async () => {
    await withTempRepo(async (repoDir) => {
      const trunk = await getCurrentBranch(repoDir);
      await runGit(repoDir, ["checkout", "-b", "base"]);
      await writeFile(join(repoDir, "base.txt"), "base");
      await runGit(repoDir, ["add", "base.txt"]);
      await runGit(repoDir, ["commit", "-m", "base"]);

      await runGit(repoDir, ["checkout", trunk]);
      await runGit(repoDir, ["checkout", "-b", "issue-branch"]);

      await expect(ensureWorktree(repoDir, "issue-branch", "base")).rejects.toThrow(/not based on base/);

      try {
        await ensureWorktree(repoDir, "issue-branch", "base");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toMatch(/rebase/i);
        expect(message).toMatch(/gt move/);
      }
    });
  });
});
