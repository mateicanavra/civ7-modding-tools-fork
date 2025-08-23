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

export { getRemotePushConfig, type RemotePushConfig } from '@civ7/plugin-git';

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
  domain: string;
  slug?: string;
  remoteName?: string;
  remoteUrl?: string;
  branch?: string;
  defaultBranch?: string;
  verbose?: boolean;
  logger?: Logger;
  /** Custom message when remoteUrl or remoteName cannot be resolved. */
  remoteRequiredMessage?: string;
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

export async function configureRemote(
  opts: ConfigureRemoteOptions,
): Promise<'added' | 'updated' | 'unchanged' | 'skipped'> {
  const {
    domain,
    slug,
    remoteName,
    remoteUrl,
    branch,
    defaultBranch = 'main',
    verbose = false,
    logger,
    remoteRequiredMessage,
  } = opts;
  if (!remoteUrl) {
    throw new Error(
      remoteRequiredMessage ?? 'remoteUrl is required to configure a remote.',
    );
  }
  const rName = await requireRemoteName({
    domain,
    slug,
    remoteName,
    remoteUrl,
    verbose,
    logger,
  }).catch((err) => {
    if (remoteRequiredMessage) throw new Error(remoteRequiredMessage);
    throw err;
  });
  const branchName = branch ?? defaultBranch;
  const log = getLogger(logger).log;
  log(`Configuring remote "${rName}" → ${remoteUrl} ...`);
  const res = await configureRemoteAndFetch(rName, remoteUrl, { tags: true }, { verbose });
  const badge =
    res === 'added'
      ? 'added'
      : res === 'updated'
      ? 'updated'
      : res === 'unchanged'
      ? 'unchanged'
      : 'skipped';
  log(`Remote "${rName}" ${badge}: ${remoteUrl}`);
  log(`Fetched tags from "${rName}". Tracking branch: ${branchName}`);
  await logRemotePushConfig(rName, { logger, verbose });
  return res;
}

export interface ImportSubtreeOptions {
  domain: string;
  slug: string;
  prefix: string;
  branch?: string;
  remoteName?: string;
  remoteUrl?: string;
  defaultBranch?: string;
  squash?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
  verbose?: boolean;
  logger?: Logger;
  remoteRequiredMessage?: string;
}

export async function importSubtree(opts: ImportSubtreeOptions): Promise<void> {
  const {
    domain,
    slug,
    prefix,
    branch,
    remoteName,
    remoteUrl,
    defaultBranch = 'main',
    squash = false,
    allowDirty = false,
    autoUnshallow = false,
    verbose = false,
    logger,
    remoteRequiredMessage,
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

  const rName = await requireRemoteName({
    domain,
    slug,
    remoteName,
    remoteUrl,
    verbose,
    logger,
  }).catch((err) => {
    if (remoteRequiredMessage) throw new Error(remoteRequiredMessage);
    throw err;
  });
  const branchName = branch ?? defaultBranch;

  log(
    `Importing subtree: prefix=${prefix} remote=${rName} branch=${branchName} squash=${
      squash ? 'yes' : 'no'
    } autoUnshallow=${autoUnshallow ? 'yes' : 'no'}`,
  );
  await configureRemoteAndFetch(rName, remoteUrl, { tags: true }, { verbose });
  await subtreeAddFromRemote(
    prefix,
    rName,
    branchName,
    { squash, autoUnshallow, allowDirty },
    { verbose },
  );
  log(`✅ Imported ${rName}/${branchName} into ${prefix}`);
}

export interface PushSubtreeOptions {
  domain: string;
  slug: string;
  prefix: string;
  branch?: string;
  remoteName?: string;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
  autoFastForwardTrunk?: boolean;
  trunk?: string;
  verbose?: boolean;
  logger?: Logger;
  pushConfig?: RemotePushConfig;
  remoteRequiredMessage?: string;
  branchRequiredMessage?: string;
}

export async function pushSubtree(opts: PushSubtreeOptions): Promise<void> {
  const {
    domain,
    slug,
    prefix,
    branch,
    remoteName,
    allowDirty = false,
    autoUnshallow = false,
    autoFastForwardTrunk = false,
    trunk,
    verbose = false,
    logger,
    pushConfig,
    remoteRequiredMessage,
    branchRequiredMessage,
  } = opts;
  const log = getLogger(logger).log;

  const rName = await requireRemoteName({
    domain,
    slug,
    remoteName,
    verbose,
    logger,
  }).catch((err) => {
    if (remoteRequiredMessage) throw new Error(remoteRequiredMessage);
    throw err;
  });
  const branchName = await requireBranch({
    domain,
    slug,
    branch,
    verbose,
    logger,
  }).catch((err) => {
    if (branchRequiredMessage) throw new Error(branchRequiredMessage);
    throw err;
  });

  log(
    `Pushing subtree: prefix=${prefix} → ${rName}/${branchName} autoUnshallow=${
      autoUnshallow ? 'yes' : 'no'
    } autoFFTrunk=${autoFastForwardTrunk ? 'yes' : 'no'}`,
  );
  await subtreePushWithFetch(
    prefix,
    rName,
    branchName,
    { allowDirty, autoUnshallow, autoFastForwardTrunk, trunkOverride: trunk, ...pushConfig },
    { verbose },
  );
  log(`✅ Pushed "${prefix}" to ${rName}/${branchName}`);
}

export interface PullSubtreeOptions {
  domain: string;
  slug: string;
  prefix: string;
  branch?: string;
  remoteName?: string;
  squash?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
  verbose?: boolean;
  logger?: Logger;
  remoteRequiredMessage?: string;
  branchRequiredMessage?: string;
}

export async function pullSubtree(opts: PullSubtreeOptions): Promise<void> {
  const {
    domain,
    slug,
    prefix,
    branch,
    remoteName,
    squash = false,
    allowDirty = false,
    autoUnshallow = false,
    verbose = false,
    logger,
    remoteRequiredMessage,
    branchRequiredMessage,
  } = opts;
  const log = getLogger(logger).log;

  const rName = await requireRemoteName({
    domain,
    slug,
    remoteName,
    verbose,
    logger,
  }).catch((err) => {
    if (remoteRequiredMessage) throw new Error(remoteRequiredMessage);
    throw err;
  });
  const branchName = await requireBranch({
    domain,
    slug,
    branch,
    verbose,
    logger,
  }).catch((err) => {
    if (branchRequiredMessage) throw new Error(branchRequiredMessage);
    throw err;
  });

  log(
    `Pulling into subtree: prefix=${prefix} from ${rName}/${branchName} squash=${
      squash ? 'yes' : 'no'
    } autoUnshallow=${autoUnshallow ? 'yes' : 'no'}`,
  );
  await subtreePullWithFetch(
    prefix,
    rName,
    branchName,
    { squash, allowDirty, autoUnshallow },
    { verbose },
  );
  log(`✅ Pulled updates into "${prefix}" from ${rName}/${branchName}`);
}

