import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';

/**
 * Civ7 plugin-git
 *
 * Stable, reusable Git utilities for other packages (e.g., plugin-mods, CLI).
 * - Safe command execution with typed results
 * - Environment checks (git availability, subtree support)
 * - Repository state queries (root path, shallow status, worktree cleanliness)
 * - Remote management (exists/get-url/add/set-url/fetch)
 * - Subtree workflows (add/push/pull)
 *
 * This module is implementation-agnostic and contains no CLI/UX logic.
 */

const execFile = promisify(_execFile);

/** Options for executing git commands. */
export interface GitExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  verbose?: boolean;
  /**
   * If true, non-zero exit codes will not throw; the result will be returned instead.
   * Default is false (throws on non-zero exit).
   */
  allowNonZeroExit?: boolean;
}

/** The result of a git command execution. */
export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

/** Error thrown by git helpers when a command fails (unless allowNonZeroExit=true). */
export class GitError extends Error {
  public readonly args: string[];
  public readonly result?: ExecResult;

  constructor(message: string, args: string[], result?: ExecResult) {
    super(message);
    this.name = 'GitError';
    this.args = args;
    this.result = result;
  }
}

/**
 * Execute a git command with safe argument handling.
 * Throws GitError on non-zero exit unless allowNonZeroExit=true.
 */
export async function execGit(args: string[], opts: GitExecOptions = {}): Promise<ExecResult> {
  const { cwd, env, verbose, allowNonZeroExit } = opts;
  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(`$ git ${args.join(' ')}`);
  }
  try {
    const { stdout, stderr } = await execFile('git', args, {
      cwd,
      env,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });
    return { stdout: stdout ?? '', stderr: stderr ?? '', code: 0 };
  } catch (err: any) {
    const stdout = err?.stdout ?? '';
    const stderr = err?.stderr ?? '';
    const code = typeof err?.code === 'number' ? err.code : 1;
    const result: ExecResult = { stdout, stderr, code };

    if (allowNonZeroExit) {
      return result;
    }
    throw new GitError(`git ${args.join(' ')} failed with code ${code}`, args, result);
  }
}

/** Whether git is available on PATH. */
export async function isGitAvailable(opts: GitExecOptions = {}): Promise<boolean> {
  try {
    await execGit(['--version'], { ...opts, allowNonZeroExit: false });
    return true;
  } catch {
    return false;
  }
}

/** Whether the current git has the subtree command available. */
export async function hasSubtree(opts: GitExecOptions = {}): Promise<boolean> {
  try {
    await execGit(['subtree', '--help'], { ...opts, allowNonZeroExit: false });
    return true;
  } catch {
    return false;
  }
}

/** Resolve repository root directory, or null if not in a git repo. */
export async function getRepoRoot(opts: GitExecOptions = {}): Promise<string | null> {
  const res = await execGit(['rev-parse', '--show-toplevel'], { ...opts, allowNonZeroExit: true });
  if (res.code !== 0) return null;
  const root = res.stdout.trim();
  return root.length ? root : null;
}

/** Whether the repository is a shallow clone. */
export async function isShallowRepo(opts: GitExecOptions = {}): Promise<boolean> {
  const res = await execGit(['rev-parse', '--is-shallow-repository'], { ...opts, allowNonZeroExit: true });
  if (res.code !== 0) return false;
  return res.stdout.trim() === 'true';
}

/**
 * Ensure the repository has full history; throws if shallow and cannot auto-fix.
 * If remote is provided, fetches from that remote; otherwise uses default.
 */
export async function assertFullHistory(remote?: string, opts: GitExecOptions = {}): Promise<void> {
  if (!(await isShallowRepo(opts))) return;
  const fetchArgs = remote ? ['fetch', remote, '--unshallow'] : ['fetch', '--unshallow'];
  await execGit(fetchArgs, opts);
}

/** Check whether the working tree is clean (no staged or unstaged changes). */
export async function isWorktreeClean(opts: GitExecOptions = {}): Promise<boolean> {
  const res = await execGit(['status', '--porcelain'], { ...opts, allowNonZeroExit: false });
  return res.stdout.trim().length === 0;
}

/** Whether a git remote with the given name exists. */
export async function remoteExists(name: string, opts: GitExecOptions = {}): Promise<boolean> {
  const res = await execGit(['remote'], { ...opts, allowNonZeroExit: false });
  return res.stdout.split('\n').map((s) => s.trim()).filter(Boolean).includes(name);
}

/** Get a remote's URL, or null if it does not exist. */
export async function getRemoteUrl(name: string, opts: GitExecOptions = {}): Promise<string | null> {
  const exists = await remoteExists(name, opts);
  if (!exists) return null;
  const res = await execGit(['remote', 'get-url', name], { ...opts, allowNonZeroExit: true });
  if (res.code !== 0) return null;
  return res.stdout.trim() || null;
}

/**
 * Add a remote if missing or update URL if different.
 * Returns: "added" | "updated" | "unchanged"
 */
export async function addOrUpdateRemote(
  name: string,
  url: string,
  opts: GitExecOptions = {},
): Promise<'added' | 'updated' | 'unchanged'> {
  const exists = await remoteExists(name, opts);
  if (!exists) {
    await execGit(['remote', 'add', name, url], opts);
    return 'added';
  }
  const current = await getRemoteUrl(name, opts);
  if (current !== url) {
    await execGit(['remote', 'set-url', name, url], opts);
    return 'updated';
  }
  return 'unchanged';
}

/** Fetch a remote with optional tags/prune/depth options. */
export async function fetchRemote(
  name: string,
  options: { tags?: boolean; prune?: boolean; depth?: number } = {},
  opts: GitExecOptions = {},
): Promise<void> {
  const args = ['fetch', name];
  if (options.tags) args.push('--tags');
  if (options.prune) args.push('--prune');
  if (typeof options.depth === 'number' && options.depth > 0) {
    args.push('--depth', String(options.depth));
  }
  await execGit(args, opts);
}

/**
 * Add a subtree into the repository at the given prefix.
 * By default preserves history; pass {squash:true} to squash.
 */
export async function subtreeAdd(
  prefix: string,
  remote: string,
  branch: string,
  options: { squash?: boolean } = {},
  opts: GitExecOptions = {},
): Promise<void> {
  const args = ['subtree', 'add', `--prefix=${prefix}`, remote, branch];
  if (options.squash) args.push('--squash');
  await execGit(args, opts);
}

/** Push a subtree out to its mirror repository. */
export async function subtreePush(
  prefix: string,
  remote: string,
  branch: string,
  opts: GitExecOptions = {},
): Promise<void> {
  const args = ['subtree', 'push', `--prefix=${prefix}`, remote, branch];
  await execGit(args, opts);
}

/**
 * Pull updates into a subtree from its mirror repository.
 * If the subtree was added with --squash, pass {squash:true} here too.
 */
export async function subtreePull(
  prefix: string,
  remote: string,
  branch: string,
  options: { squash?: boolean } = {},
  opts: GitExecOptions = {},
): Promise<void> {
  const args = ['subtree', 'pull', `--prefix=${prefix}`, remote, branch];
  if (options.squash) args.push('--squash');
  await execGit(args, opts);
}

/** Convenience guard to ensure environment supports subtree operations. */
export async function assertSubtreeReady(opts: GitExecOptions = {}): Promise<void> {
  if (!(await isGitAvailable(opts))) {
    throw new GitError('git is not available on PATH', ['--version']);
  }
  if (!(await hasSubtree(opts))) {
    throw new GitError('git-subtree is not available in this environment', ['subtree', '--help']);
  }
}

/** A brief status snapshot for diagnostics and UX. */
export interface GitStatusSnapshot {
  repoRoot: string | null;
  shallow: boolean;
  clean: boolean;
  hasSubtree: boolean;
  remotes: Array<{ name: string; url: string | null }>;
}

/** Return a brief status snapshot for diagnostics and UX. */
export async function getStatusSnapshot(opts: GitExecOptions = {}): Promise<GitStatusSnapshot> {
  const [root, shallow, clean, subtreeOk] = await Promise.all([
    getRepoRoot(opts),
    isShallowRepo(opts),
    isWorktreeClean(opts),
    hasSubtree(opts),
  ]);

  // List remotes and URLs (best-effort).
  const remotesRes = await execGit(['remote'], { ...opts, allowNonZeroExit: true });
  const remoteNames = remotesRes.code === 0
    ? remotesRes.stdout.split('\n').map((s) => s.trim()).filter(Boolean)
    : [];
  const remotes: Array<{ name: string; url: string | null }> = [];
  for (const name of remoteNames) {
    let url: string | null = null;
    try {
      url = await getRemoteUrl(name, opts);
    } catch {
      url = null;
    }
    remotes.push({ name, url });
  }

  return { repoRoot: root, shallow, clean, hasSubtree: subtreeOk, remotes };
}

/** Aggregate default export for convenience in JS consumers. */
export default {
  // Types are not part of runtime export
  execGit,
  isGitAvailable,
  hasSubtree,
  getRepoRoot,
  isShallowRepo,
  assertFullHistory,
  isWorktreeClean,
  remoteExists,
  getRemoteUrl,
  addOrUpdateRemote,
  fetchRemote,
  subtreeAdd,
  subtreePush,
  subtreePull,
  assertSubtreeReady,
  getStatusSnapshot,
  GitError,
};
