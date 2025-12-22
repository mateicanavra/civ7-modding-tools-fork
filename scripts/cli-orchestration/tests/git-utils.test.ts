import { describe, expect, it } from "bun:test";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
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

async function withTempGraphiteConfig<T>(fn: (configDir: string) => Promise<T>) {
  const baseDir = await mkdtemp(join(tmpdir(), "orch-graphite-"));
  const previousConfigHome = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = baseDir;
  const graphiteDir = join(baseDir, "graphite");
  try {
    await mkdir(graphiteDir, { recursive: true });
    return await fn(graphiteDir);
  } finally {
    if (previousConfigHome) {
      process.env.XDG_CONFIG_HOME = previousConfigHome;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
    await rm(baseDir, { recursive: true, force: true });
  }
}

async function withTempGraphiteData<T>(fn: (dataDir: string) => Promise<T>) {
  const baseDir = await mkdtemp(join(tmpdir(), "orch-graphite-data-"));
  const previousDataHome = process.env.XDG_DATA_HOME;
  process.env.XDG_DATA_HOME = baseDir;
  const graphiteDir = join(baseDir, "graphite");
  try {
    return await fn(graphiteDir);
  } finally {
    if (previousDataHome) {
      process.env.XDG_DATA_HOME = previousDataHome;
    } else {
      delete process.env.XDG_DATA_HOME;
    }
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

  it("includes graphite config dir when present", async () => {
    await withTempRepo(async (repoDir) => {
      await withTempGraphiteConfig(async (graphiteDir) => {
        const directories = await buildAdditionalDirectories(repoDir);
        const expected = await realpath(graphiteDir);
        expect(directories).toContain(expected);
      });
    });
  });

  it("includes graphite data dir (and creates it) when XDG_DATA_HOME is set", async () => {
    await withTempRepo(async (repoDir) => {
      await withTempGraphiteData(async (graphiteDir) => {
        const directories = await buildAdditionalDirectories(repoDir);
        const expected = await realpath(graphiteDir);
        expect(directories).toContain(expected);
      });
    });
  });
});
