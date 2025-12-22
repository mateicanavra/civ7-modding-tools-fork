import { describe, expect, it } from "bun:test";
import { execFile } from "node:child_process";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { buildAdditionalDirectories, resolveGitCommonDir } from "../git-utils.js";

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

async function withTempRepo<T>(fn: (repoDir: string) => Promise<T>) {
  const baseDir = await mkdtemp(join(tmpdir(), "orch-git-utils-"));
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

describe("git-utils", () => {
  it("resolves git common dir in a standard repo", async () => {
    await withTempRepo(async (repoDir) => {
      const commonDir = await resolveGitCommonDir(repoDir);
      const expected = await realpath(join(repoDir, ".git"));
      expect(commonDir).toBe(expected);
    });
  });

  it("resolves git common dir from a worktree", async () => {
    await withTempRepo(async (repoDir) => {
      const worktreeDir = join(repoDir, "..", "wt-test");
      try {
        await runGit(repoDir, ["worktree", "add", worktreeDir, "-b", "wt-test"]);
        const commonDir = await resolveGitCommonDir(worktreeDir);
        const expected = await realpath(join(repoDir, ".git"));
        expect(commonDir).toBe(expected);
      } finally {
        await rm(worktreeDir, { recursive: true, force: true });
      }
    });
  });

  it("builds additionalDirectories with the git common dir", async () => {
    await withTempRepo(async (repoDir) => {
      const directories = await buildAdditionalDirectories(repoDir);
      const expected = await realpath(join(repoDir, ".git"));
      expect(directories).toContain(expected);
    });
  });
});
