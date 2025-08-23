import * as fs from 'node:fs';
import {
  configureRemoteAndFetch,
  subtreeAddFromRemote,
  subtreePushWithFetch,
  subtreePullWithFetch,
  parseGithubRepoSlugFromUrl,
  getLocalConfig,
  getRemotePushConfig,
  type RemotePushConfig,
} from '@civ7/plugin-git';

/**
 * Returns true if the directory exists and contains entries.
 * Non-directory paths are treated as non-empty.
 */
export function isNonEmptyDir(dir: string): boolean {
  try {
    const s = fs.statSync(dir);
    if (!s.isDirectory()) return true;
    const entries = fs.readdirSync(dir);
    return entries.length > 0;
  } catch {
    return false;
  }
}

/**
 * Infer a git remote name from its URL.
 * Strips ".git" suffix and normalizes to kebab-case.
 */
export function inferRemoteNameFromUrl(remoteUrl: string): string {
  const slug = parseGithubRepoSlugFromUrl(remoteUrl) ?? remoteUrl;
  const repo = slug.split('/').pop() || 'remote';
  const base = repo.replace(/\.git$/i, '');
  const kebab = base.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return kebab || 'remote';
}

// Generic git subtree helpers -----------------------------------------------

export interface Logger {
  log: (msg: string) => void;
}

function getLogger(logger?: Logger): Logger {
  return logger ?? console;
}

export interface ResolveRemoteNameOptions {
  domain: string;
  slug?: string;
  remoteName?: string;
  remoteUrl?: string;
  verbose?: boolean;
  logger?: Logger;
}

export async function resolveRemoteName(opts: ResolveRemoteNameOptions): Promise<string | undefined> {
  const { domain, slug, remoteName, remoteUrl, verbose = false, logger } = opts;
  if (remoteName) return remoteName;
  const log = getLogger(logger).log;
  if (slug) {
    try {
      const saved = await getLocalConfig(`civ7.${domain}.${slug}.remoteName`, { verbose });
      if (saved) {
        log(`Using remote from config: ${saved}`);
        return saved;
      }
    } catch {}
  }
  if (remoteUrl) return inferRemoteNameFromUrl(remoteUrl);
  return slug;
}

export async function requireRemoteName(opts: ResolveRemoteNameOptions): Promise<string> {
  const name = await resolveRemoteName(opts);
  if (!name) {
    throw new Error('Unable to determine remote name. Pass --remote-name or --remote-url, or run setup to persist configuration.');
  }
  return name;
}

export interface ResolveBranchOptions {
  domain: string;
  slug: string;
  branch?: string;
  verbose?: boolean;
  logger?: Logger;
}

export async function resolveBranch(opts: ResolveBranchOptions): Promise<string | undefined> {
  const { domain, slug, branch, verbose = false, logger } = opts;
  if (branch) return branch;
  const log = getLogger(logger).log;
  try {
    const saved = (await getLocalConfig(`civ7.${domain}.${slug}.branch`, { verbose })) ?? undefined;
    if (saved) {
      log(`Using branch from config: ${saved}`);
      return saved;
    }
  } catch {}
  return undefined;
}

export async function requireBranch(opts: ResolveBranchOptions): Promise<string> {
  const branch = await resolveBranch(opts);
  if (!branch) {
    throw new Error(`No branch specified and none configured for slug "${opts.slug}". Re-run with --branch <name> or run setup first.`);
  }
  return branch;
}

export interface ConfigureRemoteOptions {
  remoteName: string;
  remoteUrl: string;
  branch: string;
  verbose?: boolean;
  logger?: Logger;
}

export interface LogRemotePushConfigOptions {
  verbose?: boolean;
  logger?: Logger;
}

export async function logRemotePushConfig(
  remoteName: string,
  opts: LogRemotePushConfigOptions = {},
): Promise<void> {
  const { verbose = false, logger } = opts;
  const log = getLogger(logger).log;
  try {
    const cfg = await getRemotePushConfig(remoteName, { verbose });
    log('Push config:');
    log(`  trunk: ${cfg.trunk ?? '(auto)'}`);
    log(`  autoFastForwardTrunk: ${cfg.autoFastForwardTrunk ?? false}`);
    log(`  createPrOnFfBlock: ${cfg.createPrOnFfBlock ?? false}`);
    if (cfg.prTitle) log(`  prTitle: ${cfg.prTitle}`);
    if (cfg.prBody) log(`  prBody: ${cfg.prBody}`);
    log(`  prDraft: ${cfg.prDraft ?? false}`);
    log(`  prAutoMerge: ${cfg.prAutoMerge ?? true}`);
    log(`  prMergeStrategy: ${cfg.prMergeStrategy ?? 'rebase'}`);
  } catch {}
}

export async function configureRemote(opts: ConfigureRemoteOptions): Promise<'added' | 'updated' | 'unchanged' | 'skipped'> {
  const { remoteName, remoteUrl, branch, verbose = false, logger } = opts;
  const log = getLogger(logger).log;
  log(`Configuring remote "${remoteName}" → ${remoteUrl} ...`);
  const res = await configureRemoteAndFetch(remoteName, remoteUrl, { tags: true }, { verbose });
  const badge = res === 'added' ? 'added' : res === 'updated' ? 'updated' : res === 'unchanged' ? 'unchanged' : 'skipped';
  log(`Remote "${remoteName}" ${badge}: ${remoteUrl}`);
  log(`Fetched tags from "${remoteName}". Tracking branch: ${branch}`);
  await logRemotePushConfig(remoteName, { logger, verbose });
  return res;
}

export interface ImportSubtreeOptions {
  prefix: string;
  remoteName: string;
  branch: string;
  remoteUrl?: string;
  squash?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
  verbose?: boolean;
  logger?: Logger;
}

export async function importSubtree(opts: ImportSubtreeOptions): Promise<void> {
  const {
    prefix,
    remoteName,
    branch,
    remoteUrl,
    squash = false,
    allowDirty = false,
    autoUnshallow = false,
    verbose = false,
    logger,
  } = opts;
  const log = getLogger(logger).log;

  if (fs.existsSync(prefix)) {
    const nonEmpty = isNonEmptyDir(prefix);
    if (nonEmpty && !allowDirty) {
      throw new Error(
        `Target directory "${prefix}" already exists and is not empty. ` +
          'If this was not previously imported using subtree, add may fail. Re-run with allowDirty=true to continue anyway.',
      );
    }
  }

  log(
    `Importing subtree: prefix=${prefix} remote=${remoteName} branch=${branch} squash=${
      squash ? 'yes' : 'no'
    } autoUnshallow=${autoUnshallow ? 'yes' : 'no'}`,
  );
  await configureRemoteAndFetch(remoteName, remoteUrl, { tags: true }, { verbose });
  await subtreeAddFromRemote(
    prefix,
    remoteName,
    branch,
    { squash, autoUnshallow, allowDirty },
    { verbose },
  );
  log(`✅ Imported ${remoteName}/${branch} into ${prefix}`);
}

export interface PushSubtreeOptions {
  prefix: string;
  remoteName: string;
  branch: string;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
  autoFastForwardTrunk?: boolean;
  trunk?: string;
  verbose?: boolean;
  logger?: Logger;
  pushConfig?: RemotePushConfig;
}

export async function pushSubtree(opts: PushSubtreeOptions): Promise<void> {
  const {
    prefix,
    remoteName,
    branch,
    allowDirty = false,
    autoUnshallow = false,
    autoFastForwardTrunk = false,
    trunk,
    verbose = false,
    logger,
    pushConfig,
  } = opts;
  const log = getLogger(logger).log;

  log(
    `Pushing subtree: prefix=${prefix} → ${remoteName}/${branch} autoUnshallow=${
      autoUnshallow ? 'yes' : 'no'
    } autoFFTrunk=${autoFastForwardTrunk ? 'yes' : 'no'}`,
  );
  await subtreePushWithFetch(
    prefix,
    remoteName,
    branch,
    { allowDirty, autoUnshallow, autoFastForwardTrunk, trunkOverride: trunk, ...pushConfig },
    { verbose },
  );
  log(`✅ Pushed "${prefix}" to ${remoteName}/${branch}`);
}

export interface PullSubtreeOptions {
  prefix: string;
  remoteName: string;
  branch: string;
  squash?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
  verbose?: boolean;
  logger?: Logger;
}

export async function pullSubtree(opts: PullSubtreeOptions): Promise<void> {
  const {
    prefix,
    remoteName,
    branch,
    squash = false,
    allowDirty = false,
    autoUnshallow = false,
    verbose = false,
    logger,
  } = opts;
  const log = getLogger(logger).log;

  log(
    `Pulling into subtree: prefix=${prefix} from ${remoteName}/${branch} squash=${
      squash ? 'yes' : 'no'
    } autoUnshallow=${autoUnshallow ? 'yes' : 'no'}`,
  );
  await subtreePullWithFetch(
    prefix,
    remoteName,
    branch,
    { squash, allowDirty, autoUnshallow },
    { verbose },
  );
  log(`✅ Pulled updates into "${prefix}" from ${remoteName}/${branch}`);
}

