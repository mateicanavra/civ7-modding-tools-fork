import { execFile } from "node:child_process";
import { access, mkdir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function resolveGitCommonDir(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--git-common-dir"], { cwd });
    const trimmed = stdout.trim();
    if (!trimmed) {
      return undefined;
    }
    const resolved = isAbsolute(trimmed) ? trimmed : resolve(cwd, trimmed);
    return await realpath(resolved);
  } catch {
    return undefined;
  }
}

async function resolveGraphiteConfigDir(): Promise<string | undefined> {
  const configBase = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  const graphiteDir = join(configBase, "graphite");
  try {
    await access(graphiteDir);
    return await realpath(graphiteDir);
  } catch {
    return undefined;
  }
}

async function resolveGraphiteDataDir(): Promise<string | undefined> {
  const dataBase = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  const graphiteDir = join(dataBase, "graphite");
  try {
    await mkdir(graphiteDir, { recursive: true });
    return await realpath(graphiteDir);
  } catch {
    return undefined;
  }
}

export async function buildAdditionalDirectories(cwd: string): Promise<string[]> {
  const directories: string[] = [];
  const gitCommonDir = await resolveGitCommonDir(cwd);
  if (gitCommonDir) {
    directories.push(gitCommonDir);
  }
  const graphiteDir = await resolveGraphiteConfigDir();
  if (graphiteDir) {
    directories.push(graphiteDir);
  }
  const graphiteDataDir = await resolveGraphiteDataDir();
  if (graphiteDataDir) {
    directories.push(graphiteDataDir);
  }
  return directories;
}
