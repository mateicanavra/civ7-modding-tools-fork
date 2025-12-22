import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
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

export async function buildAdditionalDirectories(cwd: string): Promise<string[]> {
  const directories: string[] = [];
  const gitCommonDir = await resolveGitCommonDir(cwd);
  if (gitCommonDir) {
    directories.push(gitCommonDir);
  }
  return directories;
}
