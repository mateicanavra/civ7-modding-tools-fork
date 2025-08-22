import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Civ7 plugin-git
 *
 * Stable, reusable Git utilities for other packages (e.g., plugin-mods, CLI).
 * - Safe command execution with typed results
 * - Environment checks (git availability, subtree support)
 * - Repository state queries (root path, shallow status, worktree cleanliness)
 * - Remote management (exists/get-url/add/set-url/fetch)
 * - Subtree workflows (add/push/pull)
 * - Generic helpers (local git config get/set)
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
  // Use '-h' to avoid invoking a pager; some Git versions return 129 for help usage.
  const res = await execGit(['subtree', '-h'], { ...opts, allowNonZeroExit: true });
  if (res.code === 0 || res.code === 129) return true;
  const combined = `${res.stdout}\n${res.stderr}`.toLowerCase();
  return combined.includes('usage: git subtree') || combined.includes('git-subtree');
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

/** Configure a remote (if url provided) and fetch with options. */
export async function configureRemoteAndFetch(
  name: string,
  url: string | undefined,
  options: { tags?: boolean; prune?: boolean; depth?: number } = {},
  opts: GitExecOptions = {},
): Promise<'added' | 'updated' | 'unchanged' | 'skipped'> {
  let status: 'added' | 'updated' | 'unchanged' | 'skipped' = 'skipped';
  if (url) {
    status = await addOrUpdateRemote(name, url, opts);
  } else {
    const exists = await remoteExists(name, opts);
    if (!exists) {
      throw new GitError(`Remote "${name}" does not exist and no URL provided to create it`, ['remote', 'get-url', name]);
    }
  }
  await fetchRemote(name, options, opts);
  return status;
}

/** Execute GitHub CLI commands. */
export async function execGh(args: string[], opts: GitExecOptions = {}): Promise<ExecResult> {
  const { cwd, env, verbose, allowNonZeroExit } = opts;
  if (verbose) {
    console.log(`$ gh ${args.join(' ')}`);
  }
  try {
    const { stdout, stderr } = await execFile('gh', args, {
      cwd,
      env,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10,
    });
    return { stdout: stdout ?? '', stderr: stderr ?? '', code: 0 };
  } catch (err: any) {
    const stdout = err?.stdout ?? '';
    const stderr = err?.stderr ?? '';
    const code = typeof err?.code === 'number' ? err.code : 1;
    const result: ExecResult = { stdout, stderr, code };
    if (allowNonZeroExit) return result;
    throw new GitError(`gh ${args.join(' ')} failed with code ${code}`, args, result);
  }
}

/** Whether GitHub CLI is available on PATH. */
export async function isGhAvailable(opts: GitExecOptions = {}): Promise<boolean> {
  try {
    await execGh(['--version'], { ...opts, allowNonZeroExit: false });
    return true;
  } catch {
    return false;
  }
}

/** Parse a GitHub repo slug (owner/repo) from a remote URL. */
export function parseGithubRepoSlugFromUrl(url: string): string | null {
  if (!url) return null;
  // Normalize: strip protocol and .git suffix
  const sshMatch = url.match(/^git@[^:]+:([^#]+?)(?:\.git)?$/);
  if (sshMatch && sshMatch[1]) return sshMatch[1];
  const httpsMatch = url.match(/^https?:\/\/[^/]+\/([^#]+?)(?:\.git)?$/);
  if (httpsMatch && httpsMatch[1]) return httpsMatch[1];
  const sshProto = url.match(/^ssh:\/\/git@[^/]+\/([^#]+?)(?:\.git)?$/);
  if (sshProto && sshProto[1]) return sshProto[1];
  return null;
}

/** Resolve the GitHub repo slug (owner/repo) for a given remote name. */
export async function getGithubRepoSlugForRemote(remote: string, opts: GitExecOptions = {}): Promise<string | null> {
  const url = await getRemoteUrl(remote, opts);
  if (!url) return null;
  return parseGithubRepoSlugFromUrl(url);
}

/** Create (or return existing) pull request via gh between source → base. */
export async function createOrGetPullRequest(
  remote: string,
  sourceBranch: string,
  baseBranch: string,
  options: { title?: string; body?: string; draft?: boolean; repoSlugOverride?: string } = {},
  opts: GitExecOptions = {},
): Promise<{ action: 'created' | 'existing'; number?: number; url?: string } | null> {
  if (!(await isGhAvailable(opts))) {
    return null;
  }
  const repo = options.repoSlugOverride ?? (await getGithubRepoSlugForRemote(remote, opts));
  if (!repo) return null;

  // Check for existing open PR
  const list = await execGh(
    ['pr', 'list', '-R', repo, '--base', baseBranch, '--head', sourceBranch, '--state', 'open', '--json', 'number,url'],
    { ...opts, allowNonZeroExit: true },
  );
  if (list.code === 0) {
    try {
      const arr = JSON.parse(list.stdout || '[]') as Array<{ number: number; url: string }>;
      if (arr.length > 0) {
        return { action: 'existing', number: arr[0].number, url: arr[0].url };
      }
    } catch {
      // ignore parse errors
    }
  }

  const args = ['pr', 'create', '-R', repo, '--base', baseBranch, '--head', sourceBranch];
  if (options.title) args.push('--title', options.title);
  if (options.body) args.push('--body', options.body);
  if (options.draft) args.push('--draft');
  const res = await execGh(args, { ...opts, allowNonZeroExit: true });
  if (res.code !== 0) {
    return null;
  }
  const urlMatch = (res.stdout || '').trim().split(/\s+/).find((s) => s.startsWith('http'));
  return { action: 'created', url: urlMatch };
}

/** Determine the remote's default branch using a symbolic ref lookup of HEAD. */
export async function getRemoteDefaultBranch(remote: string, opts: GitExecOptions = {}): Promise<string | null> {
  // Prefer: git ls-remote --symref <remote> HEAD
  const res = await execGit(['ls-remote', '--symref', remote, 'HEAD'], { ...opts, allowNonZeroExit: true });
  if (res.code !== 0) return null;
  // Expected line: "ref: refs/heads/<branch> HEAD"
  const symrefLine = res.stdout
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('ref: '));
  if (!symrefLine) return null;
  const match = symrefLine.match(/^ref:\s+refs\/heads\/([^\s]+)\s+HEAD$/);
  if (!match) return null;
  const branch = match[1]?.trim();
  return branch && branch.length ? branch : null;
}

/** Resolve the trunk branch name, preferring remote default, then provided candidates, then common defaults. */
export async function resolveTrunkBranch(
  remote: string,
  options: { candidates?: string[] } = {},
  opts: GitExecOptions = {},
): Promise<string> {
  const candidates: string[] = [];
  const remoteDefault = await getRemoteDefaultBranch(remote, opts);
  if (remoteDefault) candidates.push(remoteDefault);
  if (options.candidates && options.candidates.length) {
    candidates.push(...options.candidates);
  }
  // Common defaults
  candidates.push('main', 'master');

  // Deduplicate, preserving order
  const seen = new Set<string>();
  const unique = candidates.filter((b) => {
    if (seen.has(b)) return false;
    seen.add(b);
    return true;
  });

  // If any exist on the remote, pick the first match; otherwise return the first candidate
  const remoteBranches = await listRemoteBranches(remote, opts);
  for (const b of unique) {
    if (remoteBranches.includes(b)) return b;
  }
  return unique[0];
}

/**
 * Add a subtree after ensuring environment, fetching, and (optionally) full history.
 */
export async function subtreeAddFromRemote(
  prefix: string,
  remote: string,
  branch: string,
  options: { squash?: boolean; autoUnshallow?: boolean; allowDirty?: boolean } = {},
  opts: GitExecOptions = {},
): Promise<void> {
  await assertSubtreeReady(opts);
  const root = await getRepoRoot({ ...opts, allowNonZeroExit: true });
  if (!root) throw new GitError('Not inside a git repository', ['rev-parse', '--show-toplevel']);
  if (!options.allowDirty) {
    const clean = await isWorktreeClean(opts);
    if (!clean) throw new GitError('Working tree is not clean. Commit/stash or pass allowDirty=true.', ['status', '--porcelain']);
  }
  await fetchRemote(remote, { tags: true }, opts);
  if (options.autoUnshallow) {
    await assertFullHistory(remote, opts);
  }
  await execGit(['subtree', 'add', `--prefix=${prefix}`, remote, branch, ...(options.squash ? ['--squash'] : [])], opts);
}

/**
 * Push a subtree after ensuring environment, fetching, and (optionally) full history.
 */
export async function subtreePushWithFetch(
  prefix: string,
  remote: string,
  branch: string,
  options: {
    autoUnshallow?: boolean;
    allowDirty?: boolean;
    autoFastForwardTrunk?: boolean;
    trunkOverride?: string;
    createPrOnFfBlock?: boolean;
    prTitle?: string;
    prBody?: string;
    prDraft?: boolean;
    ghRepoOverride?: string;
    prAutoMerge?: boolean;
    prMergeStrategy?: 'merge' | 'squash' | 'rebase';
  } = {},
  opts: GitExecOptions = {},
): Promise<void> {
  await assertSubtreeReady(opts);
  const root = await getRepoRoot({ ...opts, allowNonZeroExit: true });
  if (!root) throw new GitError('Not inside a git repository', ['rev-parse', '--show-toplevel']);
  const abs = path.join(root, prefix);
  if (!fs.existsSync(abs)) throw new GitError(`Subtree directory "${prefix}" does not exist.`, ['subtree', 'push']);
  if (!options.allowDirty) {
    const clean = await isWorktreeClean(opts);
    if (!clean) throw new GitError('Working tree is not clean. Commit/stash or pass allowDirty=true.', ['status', '--porcelain']);
  }
  await fetchRemote(remote, { tags: true }, opts);
  if (options.autoUnshallow) {
    await assertFullHistory(remote, opts);
  }
  await execGit(['subtree', 'push', `--prefix=${prefix}`, remote, branch], opts);

  // Optionally fast-forward the remote trunk branch to the pushed branch
  const stored = await getRemotePushConfig(remote, opts);
  const merged = {
    autoFastForwardTrunk: options.autoFastForwardTrunk ?? stored.autoFastForwardTrunk ?? false,
    trunkOverride: options.trunkOverride ?? stored.trunk,
    createPrOnFfBlock: options.createPrOnFfBlock ?? stored.createPrOnFfBlock ?? false,
    prTitle: options.prTitle ?? stored.prTitle,
    prBody: options.prBody ?? stored.prBody,
    prDraft: options.prDraft ?? stored.prDraft,
    ghRepoOverride: options.ghRepoOverride ?? stored.ghRepoOverride,
    prAutoMerge: options.prAutoMerge ?? stored.prAutoMerge ?? true,
    prMergeStrategy: options.prMergeStrategy ?? stored.prMergeStrategy ?? 'rebase',
  };

  if (merged.autoFastForwardTrunk) {
    const trunk = merged.trunkOverride ?? (await resolveTrunkBranch(remote, {}, opts));
    if (trunk && trunk !== branch) {
      try {
        await fastForwardRemoteTrunk(remote, branch, trunk, opts);
      } catch (err: any) {
        const isGitErr = err && typeof err === 'object' && err.name === 'GitError';
        const stderr = isGitErr ? err.result?.stderr ?? '' : '';
        const hint = 'Fast-forward was blocked. This can happen if the trunk branch is protected.';
        if (opts.verbose) {
          console.error(hint);
          if (stderr) console.error(stderr.trim());
        }
        if (merged.createPrOnFfBlock) {
          const title = merged.prTitle ?? `Merge ${branch} into ${trunk}`;
          const body = merged.prBody ?? 'Automated PR created because direct fast-forward was blocked by branch protection.';
          const pr = await createOrGetPullRequest(remote, branch, trunk, {
            title,
            body,
            draft: merged.prDraft ?? false,
            repoSlugOverride: merged.ghRepoOverride,
          }, opts);
          if (opts.verbose && pr) {
            console.log(pr.action === 'created' ? `Opened PR: ${pr.url ?? ''}` : `Existing PR: ${pr.url ?? ''}`);
          }
          // If auto-merge requested, attempt it via gh
          if (pr && merged.prAutoMerge) {
            try {
              const strategyArg = merged.prMergeStrategy === 'squash' ? '--squash' : merged.prMergeStrategy === 'rebase' ? '--rebase' : '--merge';
              if (pr.number) {
                await execGh(['pr', 'merge', String(pr.number), strategyArg, '--auto'], { ...opts, allowNonZeroExit: true });
              } else if (pr.url) {
                await execGh(['pr', 'merge', pr.url, strategyArg, '--auto'], { ...opts, allowNonZeroExit: true });
              }
            } catch {
              // best-effort; leave PR open if merge can't proceed
            }
          }
        } else {
          throw err;
        }
      }
    }
  }
}

/**
 * Pull a subtree after ensuring environment, fetching, and (optionally) full history.
 */
export async function subtreePullWithFetch(
  prefix: string,
  remote: string,
  branch: string,
  options: { squash?: boolean; autoUnshallow?: boolean; allowDirty?: boolean } = {},
  opts: GitExecOptions = {},
): Promise<void> {
  await assertSubtreeReady(opts);
  const root = await getRepoRoot({ ...opts, allowNonZeroExit: true });
  if (!root) throw new GitError('Not inside a git repository', ['rev-parse', '--show-toplevel']);
  const abs = path.join(root, prefix);
  if (!fs.existsSync(abs)) throw new GitError(`Subtree directory "${prefix}" does not exist.`, ['subtree', 'pull']);
  if (!options.allowDirty) {
    const clean = await isWorktreeClean(opts);
    if (!clean) throw new GitError('Working tree is not clean. Commit/stash or pass allowDirty=true.', ['status', '--porcelain']);
  }
  await fetchRemote(remote, { tags: true }, opts);
  if (options.autoUnshallow) {
    await assertFullHistory(remote, opts);
  }
  const args = ['subtree', 'pull', `--prefix=${prefix}`, remote, branch];
  if (options.squash) args.push('--squash');
  await execGit(args, opts);
}

/** List branch heads available on a remote (names only). */
export async function listRemoteBranches(remote: string, opts: GitExecOptions = {}): Promise<string[]> {
  const res = await execGit(['ls-remote', '--heads', remote], { ...opts, allowNonZeroExit: true });
  if (res.code !== 0) return [];
  return res.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\t')[1] || '')
    .filter(Boolean)
    .map((ref) => ref.replace(/^refs\/heads\//, ''));
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

function formatSubtreeHelpMessage(): string {
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';
  const lines = [
    'git-subtree is required to use subtree operations (add/push/pull).',
    isMac
      ? 'macOS: Install Homebrew Git and ensure it is first in PATH:\n  brew install git\n  which git\n  git --version\n  git subtree -h'
      : isLinux
      ? 'Linux: Install the git-subtree package (or ensure git includes subtree):\n  Debian/Ubuntu: sudo apt-get update && sudo apt-get install -y git-subtree\n  Fedora: sudo dnf install -y git-subtree\n  Arch: sudo pacman -S git\n  Then: git subtree -h'
      : "Install Git with subtree support and ensure 'git subtree -h' works in your shell.",
    "If multiple Git installations exist, ensure the one with subtree appears first in PATH.",
  ];
  return lines.join('\n');
}

/** Convenience guard to ensure environment supports subtree operations. */
export async function assertSubtreeReady(opts: GitExecOptions = {}): Promise<void> {
  if (!(await isGitAvailable(opts))) {
    throw new GitError('git is not available on PATH', ['--version']);
  }
  if (!(await hasSubtree(opts))) {
    throw new GitError(`git-subtree is not available in this environment.\n\n${formatSubtreeHelpMessage()}`, ['subtree', '-h']);
  }
}

/**
 * Fast-forward update the remote trunk branch from a given source branch.
 * If trunk does not exist, this will create it from source.
 * Returns a status string describing the outcome.
 */
export async function fastForwardRemoteTrunk(
  remote: string,
  sourceBranch: string,
  trunkBranch?: string,
  opts: GitExecOptions = {},
): Promise<'updated' | 'created' | 'skipped' | 'blocked'> {
  const trunk = trunkBranch ?? (await getRemoteDefaultBranch(remote, opts)) ?? 'main';
  if (sourceBranch === trunk) return 'skipped';

  // Ensure we have up-to-date remote refs
  await fetchRemote(remote, { tags: false, prune: false }, opts);

  const srcRef = `${remote}/${sourceBranch}`;
  const trunkRef = `${remote}/${trunk}`;

  const srcRes = await execGit(['rev-parse', srcRef], { ...opts, allowNonZeroExit: true });
  if (srcRes.code !== 0) {
    throw new GitError(`Remote branch ${srcRef} not found after push`, ['rev-parse', srcRef], srcRes);
  }

  const trunkRes = await execGit(['rev-parse', trunkRef], { ...opts, allowNonZeroExit: true });
  const trunkExists = trunkRes.code === 0;

  if (trunkExists) {
    const anc = await execGit(['merge-base', '--is-ancestor', trunkRef, srcRef], { ...opts, allowNonZeroExit: true });
    if (anc.code !== 0) {
      return 'blocked';
    }
  }

  const pushRes = await execGit(['push', remote, `${sourceBranch}:refs/heads/${trunk}`], { ...opts, allowNonZeroExit: true });
  if (pushRes.code !== 0) {
    const suggestion = 'Push was rejected, possibly due to branch protection. Consider creating a PR.';
    throw new GitError(`Fast-forward push to ${remote}/${trunk} failed. ${suggestion}`, ['push', remote, `${sourceBranch}:refs/heads/${trunk}`], pushRes);
  }
  return trunkExists ? 'updated' : 'created';
}

/** Check (best-effort) whether pushing to a remote branch is allowed, using a dry run. */
export async function isRemoteBranchPushAllowed(
  remote: string,
  branch: string,
  opts: GitExecOptions = {},
): Promise<boolean> {
  // Ensure refs are up-to-date
  await fetchRemote(remote, {}, opts);

  const remoteRef = `${remote}/${branch}`;
  const revRes = await execGit(['rev-parse', remoteRef], { ...opts, allowNonZeroExit: true });
  let refspec: string;
  if (revRes.code === 0) {
    const sha = revRes.stdout.trim();
    if (!sha) return false;
    // Attempt a no-op update to the same commit
    refspec = `${sha}:refs/heads/${branch}`;
  } else {
    // Branch does not exist; attempt to create it from current HEAD
    refspec = `HEAD:refs/heads/${branch}`;
  }
  const pushRes = await execGit(['push', '--dry-run', remote, refspec], { ...opts, allowNonZeroExit: true });
  return pushRes.code === 0;
}

/** A brief status snapshot for diagnostics and UX. */
export interface GitStatusSnapshot {
  repoRoot: string | null;
  shallow: boolean;
  clean: boolean;
  hasSubtree: boolean;
  remotes: Array<{
    name: string;
    url: string | null;
    defaultBranch: string | null;
    resolvedTrunk: string | null;
    trunkPushAllowed: boolean | null;
  }>;
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
  const remotes: Array<{ name: string; url: string | null; defaultBranch: string | null; resolvedTrunk: string | null; trunkPushAllowed: boolean | null }> = [];
  for (const name of remoteNames) {
    let url: string | null = null;
    let defaultBranch: string | null = null;
    let resolvedTrunk: string | null = null;
    let trunkPushAllowed: boolean | null = null;
    try {
      url = await getRemoteUrl(name, opts);
    } catch {
      url = null;
    }
    try {
      defaultBranch = await getRemoteDefaultBranch(name, opts);
    } catch {
      defaultBranch = null;
    }
    try {
      resolvedTrunk = await resolveTrunkBranch(name, {}, opts);
    } catch {
      resolvedTrunk = defaultBranch;
    }
    if (resolvedTrunk) {
      try {
        trunkPushAllowed = await isRemoteBranchPushAllowed(name, resolvedTrunk, opts);
      } catch {
        trunkPushAllowed = null;
      }
    }
    remotes.push({ name, url, defaultBranch, resolvedTrunk, trunkPushAllowed });
  }

  return { repoRoot: root, shallow, clean, hasSubtree: subtreeOk, remotes };
}

/** Local git config helpers. */
export async function setLocalConfig(key: string, value: string, opts: GitExecOptions = {}): Promise<void> {
  // Replace any existing occurrences to avoid duplicate-key errors
  await execGit(['config', '--local', '--replace-all', key, value], opts);
}

export async function getLocalConfig(key: string, opts: GitExecOptions = {}): Promise<string | null> {
  const res = await execGit(['config', '--local', key], { ...opts, allowNonZeroExit: true });
  if (res.code !== 0) return null;
  const v = res.stdout.trim();
  return v.length ? v : null;
}

/** Unset a local git config key (best-effort). */
export async function unsetLocalConfig(key: string, opts: GitExecOptions = {}): Promise<void> {
  const res = await execGit(['config', '--local', '--unset-all', key], { ...opts, allowNonZeroExit: true });
  if (res.code !== 0) return; // ignore if not set
}

/** Remove an entire [section "subsection"] from local git config (best-effort). */
export async function removeConfigSubsection(section: string, subsection: string, opts: GitExecOptions = {}): Promise<void> {
  const res = await execGit(['config', '--local', '--remove-section', `${section}.${subsection}`], { ...opts, allowNonZeroExit: true });
  if (res.code !== 0) return; // ignore if not present
}

/**
 * Helpers for storing remote-level push configuration in git config.
 * Keys are stored as civ7.remote.<remoteName>.<key>
 */
export interface RemotePushConfig {
  trunk?: string;
  autoFastForwardTrunk?: boolean;
  createPrOnFfBlock?: boolean;
  prTitle?: string;
  prBody?: string;
  prDraft?: boolean;
  ghRepoOverride?: string;
  prAutoMerge?: boolean;
  prMergeStrategy?: 'merge' | 'squash' | 'rebase';
}

export function sanitizeRepoKeyForSubsection(repoKey: string): string {
  // Git config: section[.subsection].variable → only one dot allowed between subsection and variable
  // Use subsection "repo-<sanitized>" where sanitized removes dots and whitespace
  return `repo-${repoKey.replace(/\s+/g, '-').replace(/\.+/g, '-').replace(/[^A-Za-z0-9_-]+/g, '-')}`;
}

function cfgKeyForRepoKey(repoKey: string, key: string): string {
  const subsection = sanitizeRepoKeyForSubsection(repoKey);
  return `civ7.${subsection}.${key}`;
}

function getCanonicalRepoKeyFromUrl(url: string): string {
  const lower = url.trim().toLowerCase();
  // git@host:owner/repo.git
  let m = lower.match(/^git@([^:]+):([^#]+?)(?:\.git)?$/);
  if (m) return `${m[1]}-${m[2].replace(/[\/]+/g, '-')}`;
  // https://host/owner/repo.git
  m = lower.match(/^https?:\/\/([^/]+)\/([^#]+?)(?:\.git)?$/);
  if (m) return `${m[1]}-${m[2].replace(/[\/]+/g, '-')}`;
  // ssh://git@host/owner/repo.git
  m = lower.match(/^ssh:\/\/git@([^/]+)\/([^#]+?)(?:\.git)?$/);
  if (m) return `${m[1]}-${m[2].replace(/[\/]+/g, '-')}`;
  // fallback to sanitized full url
  return lower.replace(/[^a-z0-9]+/g, '-');
}

async function getCanonicalRepoKeyForRemote(remote: string, opts: GitExecOptions = {}): Promise<string | null> {
  const url = await getRemoteUrl(remote, opts);
  if (!url) return null;
  return getCanonicalRepoKeyFromUrl(url);
}

function parseBoolean(value: string | null | undefined): boolean | undefined {
  if (value == null) return undefined;
  const v = String(value).trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return undefined;
}

/** Read stored remote push config from local git config. */
function varNameForField(field: keyof RemotePushConfig): string {
  switch (field) {
    case 'trunk': return 'trunk';
    case 'autoFastForwardTrunk': return 'auto-fast-forward-trunk';
    case 'createPrOnFfBlock': return 'create-pr-on-ff-block';
    case 'prTitle': return 'pr-title';
    case 'prBody': return 'pr-body';
    case 'prDraft': return 'pr-draft';
    case 'ghRepoOverride': return 'gh-repo-override';
    case 'prAutoMerge': return 'pr-auto-merge';
    case 'prMergeStrategy': return 'pr-merge-strategy';
    default: return String(field);
  }
}

export async function getRemotePushConfig(remote: string, opts: GitExecOptions = {}): Promise<RemotePushConfig> {
  const repoKey = await getCanonicalRepoKeyForRemote(remote, opts);
  if (!repoKey) return {};
  const [trunk, autoFF, prOnBlock, prTitle, prBody, prDraft, ghRepoOverride] = await Promise.all([
    getLocalConfig(cfgKeyForRepoKey(repoKey, varNameForField('trunk')), opts),
    getLocalConfig(cfgKeyForRepoKey(repoKey, varNameForField('autoFastForwardTrunk')), opts),
    getLocalConfig(cfgKeyForRepoKey(repoKey, varNameForField('createPrOnFfBlock')), opts),
    getLocalConfig(cfgKeyForRepoKey(repoKey, varNameForField('prTitle')), opts),
    getLocalConfig(cfgKeyForRepoKey(repoKey, varNameForField('prBody')), opts),
    getLocalConfig(cfgKeyForRepoKey(repoKey, varNameForField('prDraft')), opts),
    getLocalConfig(cfgKeyForRepoKey(repoKey, varNameForField('ghRepoOverride')), opts),
  ]);
  const [prAutoMerge, prMergeStrategy] = await Promise.all([
    getLocalConfig(cfgKeyForRepoKey(repoKey, varNameForField('prAutoMerge')), opts),
    getLocalConfig(cfgKeyForRepoKey(repoKey, varNameForField('prMergeStrategy')), opts),
  ]);
  return {
    trunk: trunk ?? undefined,
    autoFastForwardTrunk: parseBoolean(autoFF),
    createPrOnFfBlock: parseBoolean(prOnBlock),
    prTitle: prTitle ?? undefined,
    prBody: prBody ?? undefined,
    prDraft: parseBoolean(prDraft),
    ghRepoOverride: ghRepoOverride ?? undefined,
    prAutoMerge: parseBoolean(prAutoMerge),
    prMergeStrategy: ((): 'merge' | 'squash' | 'rebase' | undefined => {
      const v = (prMergeStrategy ?? '').trim().toLowerCase();
      if (v === 'merge' || v === 'squash' || v === 'rebase') return v;
      return undefined;
    })(),
  };
}

/** Idempotently write provided remote push config keys to local git config. */
export async function setRemotePushConfig(
  remote: string,
  partial: RemotePushConfig,
  opts: GitExecOptions = {},
): Promise<void> {
  const repoKey = await getCanonicalRepoKeyForRemote(remote, opts);
  if (!repoKey) return;
  const current = await getRemotePushConfig(remote, opts);
  const tasks: Array<Promise<void>> = [];
  const writeIfChanged = (key: keyof RemotePushConfig, value: string | boolean | undefined) => {
    if (value === undefined) return;
    const cfgKey = cfgKeyForRepoKey(repoKey, varNameForField(key));
    const desired = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
    const existing = (current as any)[key];
    const existingStr = typeof existing === 'boolean' ? (existing ? 'true' : 'false') : (existing ?? undefined);
    if (existingStr !== desired) {
      tasks.push(setLocalConfig(cfgKey, desired, opts));
    }
  };

  writeIfChanged('trunk', partial.trunk);
  writeIfChanged('autoFastForwardTrunk', partial.autoFastForwardTrunk);
  writeIfChanged('createPrOnFfBlock', partial.createPrOnFfBlock);
  writeIfChanged('prTitle', partial.prTitle);
  writeIfChanged('prBody', partial.prBody);
  writeIfChanged('prDraft', partial.prDraft);
  writeIfChanged('ghRepoOverride', partial.ghRepoOverride);
  writeIfChanged('prAutoMerge', partial.prAutoMerge);
  if (partial.prMergeStrategy) writeIfChanged('prMergeStrategy', partial.prMergeStrategy);
  await Promise.all(tasks);
}

/** Initialize sensible defaults for a remote's push behavior (idempotent). */
export async function initRemotePushConfig(
  remote: string,
  opts: GitExecOptions = {},
): Promise<void> {
  // Resolve default trunk from remote
  const trunk = await resolveTrunkBranch(remote, {}, opts);
  // Reset config under this repo and legacy remote subsection to avoid duplicate keys
  const repoKey = await getCanonicalRepoKeyForRemote(remote, opts);
  if (repoKey) {
    await removeConfigSubsection('civ7', sanitizeRepoKeyForSubsection(repoKey), { ...opts, allowNonZeroExit: true });
  }
  // Also clear any legacy remote-scoped subsection if present
  const legacySubsection = `remote-${remote.replace(/\s+/g, '-').replace(/\.+/g, '-').replace(/[^A-Za-z0-9_-]+/g, '-')}`;
  await removeConfigSubsection('civ7', legacySubsection, { ...opts, allowNonZeroExit: true });
  // Set defaults only if not present: trunk, autoFF enabled by default, PR creation enabled by default
  const current = await getRemotePushConfig(remote, opts);
  const desired: RemotePushConfig = {
    trunk: current.trunk ?? trunk,
    autoFastForwardTrunk: current.autoFastForwardTrunk ?? true,
    createPrOnFfBlock: current.createPrOnFfBlock ?? true,
    prDraft: current.prDraft ?? false,
    prAutoMerge: current.prAutoMerge ?? true,
    prMergeStrategy: current.prMergeStrategy ?? 'rebase',
  };
  await setRemotePushConfig(remote, desired, opts);
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
  configureRemoteAndFetch,
  listRemoteBranches,
  getRemoteDefaultBranch,
  resolveTrunkBranch,
  execGh,
  isGhAvailable,
  parseGithubRepoSlugFromUrl,
  getGithubRepoSlugForRemote,
  createOrGetPullRequest,
  subtreeAdd,
  subtreePush,
  subtreePull,
  subtreeAddFromRemote,
  subtreePushWithFetch,
  subtreePullWithFetch,
  fastForwardRemoteTrunk,
  isRemoteBranchPushAllowed,
  assertSubtreeReady,
  getStatusSnapshot,
  setLocalConfig,
  getLocalConfig,
  unsetLocalConfig,
  GitError,
};
