import * as path from "node:path";
import * as fs from "node:fs";
import {
  copyDirectoryRecursive,
  ensureDirectory,
  resolveModsDir as resolveModsDirFs,
} from "@civ7/plugin-files";
import {
  addOrUpdateRemote,
  fetchRemote,
  getRemoteUrl,
  remoteExists,
  isWorktreeClean,
  getRepoRoot,
  getStatusSnapshot,
  listRemoteBranches,
  resolveTrunkBranch,
  setLocalConfig,
  getLocalConfig,
  configureRemoteAndFetch,
  initRemotePushConfig,
  subtreeAddFromRemote,
  subtreePushWithFetch,
  subtreePullWithFetch,
  execGit,
} from "@civ7/plugin-git";

// Persistent link configuration (stored in local git config)
async function setLinkedBranch(slug: string, branch: string, opts: { verbose?: boolean } = {}) {
  await setLocalConfig(`civ7.mod.${slug}.branch`, branch, { verbose: opts.verbose });
}
async function getLinkedBranch(slug: string, opts: { verbose?: boolean } = {}): Promise<string | null> {
  return getLocalConfig(`civ7.mod.${slug}.branch`, { verbose: opts.verbose });
}
async function setLinkedRemoteName(slug: string, remoteName: string, opts: { verbose?: boolean } = {}) {
  await setLocalConfig(`civ7.mod.${slug}.remoteName`, remoteName, { verbose: opts.verbose });
}
async function getLinkedRemoteName(slug: string, opts: { verbose?: boolean } = {}): Promise<string | null> {
  return getLocalConfig(`civ7.mod.${slug}.remoteName`, { verbose: opts.verbose });
}
async function setLinkedTrunk(slug: string, branch: string, opts: { verbose?: boolean } = {}) {
  await setLocalConfig(`civ7.mod.${slug}.trunk`, branch, { verbose: opts.verbose });
}
async function getLinkedTrunk(slug: string, opts: { verbose?: boolean } = {}): Promise<string | null> {
  return getLocalConfig(`civ7.mod.${slug}.trunk`, { verbose: opts.verbose });
}

/**
 * Information about the OS-specific Civilization VII Mods directory
 * (the in-game install location, not the monorepo 'mods/' folder).
 */
export interface ModsDirInfo {
  platform: NodeJS.Platform;
  modsDir: string;
}

/**
 * Return the OS-specific Mods directory info for the local machine.
 * This is separate from the monorepo 'mods/' folder used for sources.
 */
export function resolveModsDir(): ModsDirInfo {
  return resolveModsDirFs();
}

/**
 * List child directories inside the given Mods directory path.
 * Defaults to the OS-specific Mods directory if not provided.
 */
export function listMods(modsDir?: string): string[] {
  const target = modsDir ?? resolveModsDir().modsDir;
  if (!target || !fs.existsSync(target)) return [];
  const entries = fs.readdirSync(target, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/**
 * Ensure the monorepo-level "mods" directory exists and return absolute paths.
 */
export async function ensureModsFolder(): Promise<{ repoRoot: string; modsDir: string }> {
  const root = await getRepoRoot({ allowNonZeroExit: true });
  if (!root) throw new Error("Not inside a git repository.");
  const modsDir = path.join(root, "mods");
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
  return { repoRoot: root, modsDir };
}

/**
 * High-level status for a specific mod subtree and its remote, including repo-level info.
 */
export async function getModStatus(params: {
  slug?: string;
  remoteName?: string;
  branch?: string;
  verbose?: boolean;
}): Promise<{
  // Repo-level
  repoRoot: string | null;
  shallow: boolean;
  clean: boolean;
  hasSubtree: boolean;
  remotes: Array<{ name: string; url: string | null; defaultBranch: string | null; resolvedTrunk: string | null; trunkPushAllowed: boolean | null }>;
  // Mod-level (may be null if no slug provided)
  modsPrefix: string | null;
  modsPathExists: boolean;
  subtreeExists: boolean;
  remoteConfigured: boolean;
  remoteUrl: string | null;
  branch: string;
}> {
  const { slug, remoteName, branch = "main", verbose = false } = params;
  const snapshot = await getStatusSnapshot({ verbose });
  const prefix = slug ? path.posix.join("mods", slug) : null;
  const abs = snapshot.repoRoot && prefix ? path.join(snapshot.repoRoot, prefix) : null;

  let remoteConfigured = false;
  let remoteUrl: string | null = null;
  if (remoteName) {
    remoteUrl = await getRemoteUrl(remoteName, { verbose });
    remoteConfigured = !!remoteUrl;
  }

  return {
    repoRoot: snapshot.repoRoot,
    shallow: !!snapshot.shallow,
    clean: !!snapshot.clean,
    hasSubtree: !!snapshot.hasSubtree,
    remotes: snapshot.remotes ?? [],
    modsPrefix: prefix,
    modsPathExists: !!snapshot.repoRoot && fs.existsSync(path.join(snapshot.repoRoot, "mods")),
    subtreeExists: !!snapshot.repoRoot && !!abs && fs.existsSync(abs),
    remoteConfigured,
    remoteUrl,
    branch,
  };
}

/**
 * Configure or update a mod mirror remote and fetch tags.
 * Returns whether the remote was added/updated/unchanged.
 */
export async function configureModRemote(options: {
  remoteName: string;
  remoteUrl: string;
  verbose?: boolean;
}): Promise<"added" | "updated" | "unchanged"> {
  const { remoteName, remoteUrl, verbose = false } = options;
  const res = await addOrUpdateRemote(remoteName, remoteUrl, { verbose });
  await fetchRemote(remoteName, { tags: true }, { verbose });
  // Initialize remote-level push defaults (idempotent)
  await initRemotePushConfig(remoteName, { verbose });
  return res;
}

/**
 * Deploy a built mod from a local folder to the user's OS Mods directory.
 * This copies the exact contents of inputDir into Mods/<modId>.
 */
export interface DeployOptions {
  inputDir: string;
  modId: string;
  modsDir?: string;
}
export interface DeployResult {
  modsDir: string;
  targetDir: string;
  filesCopied: number;
}
export function deployMod(options: DeployOptions): DeployResult {
  const { inputDir, modId } = options;
  if (!inputDir || !fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }
  if (!modId || !/^[A-Za-z0-9_-]+$/.test(modId)) {
    throw new Error(`Invalid mod id: ${modId}. Use alphanumeric, dash or underscore.`);
  }

  const modsDir = options.modsDir ?? resolveModsDir().modsDir;
  ensureDirectory(modsDir);
  const targetDir = path.join(modsDir, modId);
  ensureDirectory(targetDir);

  const summary = copyDirectoryRecursive(inputDir, targetDir);
  const filesCopied = summary.copiedFiles;

  return { modsDir, targetDir, filesCopied };
}

/**
 * Import a mod repository into the monorepo as a subtree at mods/<slug>.
 * Optionally configure the remote if it doesn't exist.
 */
export interface ImportModOptions {
  slug: string;
  remoteName?: string;
  remoteUrl?: string;
  branch?: string;
  squash?: boolean;
  verbose?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
}
export async function importModFromRemote(opts: ImportModOptions): Promise<void> {
  const {
    slug,
    remoteName,
    remoteUrl,
    branch = "main",
    squash = false,
    verbose = false,
    allowDirty = false,
    autoUnshallow = false,
  } = opts;

  // Ensure repo and mods dir (mods dir creation is still mod-specific)
  const root = await getRepoRoot({ allowNonZeroExit: true, verbose });
  if (!root) throw new Error("Not inside a git repository.");
  const modsDir = path.join(root, "mods");
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

  const prefix = path.posix.join("mods", slug);

  const rName =
    remoteName ??
    (await getLinkedRemoteName(slug, { verbose })) ??
    (remoteUrl ? inferSlugFromRemoteUrl(remoteUrl) : `mod-${slug}`);

  // Ensure/configure remote and fetch
  await configureRemoteAndFetch(rName, remoteUrl, { tags: true }, { verbose });
  // Initialize remote-level push defaults (idempotent)
  await initRemotePushConfig(rName, { verbose });

  // Let git plugin handle subtree readiness, allowDirty, unshallow, and add
  await subtreeAddFromRemote(prefix, rName, branch, { squash, autoUnshallow, allowDirty }, { verbose });
  await setLinkedRemoteName(slug, rName, { verbose });
}

/**
 * Push a subtree at mods/<slug> out to its mirror remote.
 */
export interface PushModOptions {
  slug: string;
  remoteName?: string;
  branch?: string;
  verbose?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
  autoFastForwardTrunk?: boolean;
  trunk?: string;
  createPrOnFfBlock?: boolean;
  prTitle?: string;
  prBody?: string;
  prDraft?: boolean;
}
export async function pushModToRemote(opts: PushModOptions): Promise<void> {
  const { slug, remoteName, branch, verbose = false, allowDirty = false, autoUnshallow = false, autoFastForwardTrunk = false, trunk } = opts;

  const root = await getRepoRoot({ allowNonZeroExit: true, verbose });
  if (!root) throw new Error("Not inside a git repository.");
  const prefix = path.posix.join("mods", slug);
  if (!fs.existsSync(path.join(root, prefix))) {
    throw new Error(`Subtree directory "${prefix}" does not exist.`);
  }

  const rName = remoteName ?? (await getLinkedRemoteName(slug, { verbose })) ?? `mod-${slug}`;
  const effectiveBranch = branch ?? (await getLinkedBranch(slug, { verbose }));
  if (!effectiveBranch) {
    const branches = await listRemoteBranches(rName, { verbose });
    const hint = branches.length ? `Available remote branches for ${rName}:\n- ${branches.join("\n- ")}` : `No heads found on remote ${rName}.`;
    throw new Error(
      `No branch specified and none configured for slug "${slug}". Re-run with --branch <name> or set a default via setup.\n\n${hint}`
    );
  }

  const trunkOverride = trunk ?? (await getLinkedTrunk(slug, { verbose })) ?? undefined;
  await subtreePushWithFetch(
    prefix,
    rName,
    effectiveBranch,
    {
      autoUnshallow,
      allowDirty,
      autoFastForwardTrunk,
      trunkOverride,
      createPrOnFfBlock: opts.createPrOnFfBlock,
      prTitle: opts.prTitle,
      prBody: opts.prBody,
      prDraft: opts.prDraft,
    },
    { verbose },
  );
}

/**
 * Pull updates from the mirror remote into the subtree at mods/<slug>.
 */
export interface PullModOptions {
  slug: string;
  remoteName?: string;
  branch?: string;
  squash?: boolean;
  verbose?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
}
export async function pullModFromRemote(opts: PullModOptions): Promise<void> {
  const { slug, remoteName, branch, squash = false, verbose = false, allowDirty = false, autoUnshallow = false } = opts;

  const root = await getRepoRoot({ allowNonZeroExit: true, verbose });
  if (!root) throw new Error("Not inside a git repository.");
  const prefix = path.posix.join("mods", slug);
  if (!fs.existsSync(path.join(root, prefix))) {
    throw new Error(`Subtree directory "${prefix}" does not exist.`);
  }

  const rName = remoteName ?? (await getLinkedRemoteName(slug, { verbose })) ?? `mod-${slug}`;
  const effectiveBranch = branch ?? (await getLinkedBranch(slug, { verbose }));
  if (!effectiveBranch) {
    const branches = await listRemoteBranches(rName, { verbose });
    const hint = branches.length ? `Available remote branches for ${rName}:\n- ${branches.join("\n- ")}` : `No heads found on remote ${rName}.`;
    throw new Error(
      `No branch specified and none configured for slug "${slug}". Re-run with --branch <name> or set a default via setup.\n\n${hint}`
    );
  }

  await subtreePullWithFetch(prefix, rName, effectiveBranch, { squash, autoUnshallow, allowDirty }, { verbose });
}

/**
 * Link a mod by configuring the remote and importing the subtree in one step.
 * Sensible defaults: branch=main, squash=false, autoUnshallow=true, remoteName=mod-<slug>, slug derived from repo name if not provided.
 */
export interface LinkModOptions {
  remoteUrl: string;
  branch?: string;
  slug?: string;
  remoteName?: string;
  squash?: boolean;
  verbose?: boolean;
  allowDirty?: boolean;
  autoUnshallow?: boolean;
  trunk?: string;
  overwrite?: boolean;
}

function inferSlugFromRemoteUrl(remoteUrl: string): string {
  // Handle common git URL formats: git@host:owner/repo.git, https://host/owner/repo.git, file paths
  const sanitized = remoteUrl.replace(/\\+/g, "/");
  const parts = sanitized
    .replace(/^git@[^:]+:/, "")
    .replace(/^https?:\/\//, "")
    .split("/");
  const last = parts[parts.length - 1] || "mod";
  const base = last.replace(/\.git$/i, "");
  const kebab = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return kebab || "mod";
}

export async function link(opts: LinkModOptions): Promise<{ slug: string; remoteName: string; branch: string; prefix: string }> {
  const {
    remoteUrl,
    branch = "main",
    verbose = false,
    squash = false,
    allowDirty = false,
    trunk,
    overwrite = false,
  } = opts;
  if (!remoteUrl) throw new Error("remoteUrl is required for link");

  const slug = opts.slug ?? inferSlugFromRemoteUrl(remoteUrl);
  const remoteName = opts.remoteName ?? inferSlugFromRemoteUrl(remoteUrl);
  const autoUnshallow = opts.autoUnshallow ?? true; // default to full history
  const prefix = path.posix.join("mods", slug);

  await configureModRemote({ remoteName, remoteUrl, verbose });

  // Idempotent: if the subtree path already exists and is non-empty, treat monorepo as source of truth and push;
  // otherwise import the remote history into a new subtree. If overwrite=true, replace local dir with import.
  const root = await getRepoRoot({ allowNonZeroExit: true, verbose });
  if (!root) throw new Error("Not inside a git repository.");
  const abs = path.join(root, prefix);
  let existsAndNonEmpty = false;
  try {
    if (fs.existsSync(abs)) {
      const entries = fs.readdirSync(abs);
      existsAndNonEmpty = entries.length > 0;
    }
  } catch {
    existsAndNonEmpty = false;
  }

  if (existsAndNonEmpty) {
    if (overwrite) {
      // Replace local dir with clean import
      try {
        fs.rmSync(abs, { recursive: true, force: true });
      } catch {}
      // Ensure parent exists
      const parent = path.dirname(abs);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      await importModFromRemote({
        slug,
        remoteName,
        remoteUrl,
        branch,
        squash,
        verbose,
        allowDirty,
        autoUnshallow,
      });
    } else {
      // Skip import; caller (CLI) should inform user next steps.
    }
  } else {
    await importModFromRemote({
      slug,
      remoteName,
      remoteUrl,
      branch,
      squash,
      verbose,
      allowDirty,
      autoUnshallow,
    });
  }

  // Persist link defaults for subsequent commands
  await setLinkedBranch(slug, branch, { verbose });
  await setLinkedRemoteName(slug, remoteName, { verbose });
  const resolvedTrunk = trunk ?? (await resolveTrunkBranch(remoteName, {}, { verbose }));
  if (resolvedTrunk) await setLinkedTrunk(slug, resolvedTrunk, { verbose });

  return { slug, remoteName, branch, prefix };
}

/** List registered slugs from local git config (civ7.mod.<slug>.*). */
export async function listRegisteredSlugs(opts: { verbose?: boolean } = {}): Promise<string[]> {
  try {
    const res = await execGit(["config", "--local", "--list", "--name-only"], { allowNonZeroExit: true, verbose: opts.verbose });
    if (res.code !== 0) return [];
    const slugs = new Set<string>();
    for (const line of (res.stdout || "").split("\n")) {
      const m = line.trim().match(/^civ7\.mod\.([^\.]+)\.(?:branch|remoteName|trunk)$/);
      if (m && m[1]) slugs.add(m[1]);
    }
    return Array.from(slugs).sort();
  } catch {
    return [];
  }
}

/**
 * Optional: plan and validation helpers for future flows.
 */

export interface CreateModOptions {
  modId: string;
  name?: string;
  description?: string;
  authors?: string;
}
export interface CreateModPlan {
  files: Array<{ path: string; description: string }>;
}
export function planCreateMod(options: CreateModOptions): CreateModPlan {
  const { modId } = options;
  return {
    files: [
      {
        path: `${modId}/${modId}.modinfo`,
        description: "Mod descriptor with Properties, Dependencies, ActionGroups, LocalizedText",
      },
      { path: `${modId}/config/config.xml`, description: "Core config: Database > Maps > Rows" },
      {
        path: `${modId}/text/en_us/MapText.xml`,
        description: "Localization stub for names/descriptions",
      },
    ],
  };
}

export interface ValidateResult {
  valid: boolean;
  errors: string[];
}
export function validateModStructure(_modDir: string): ValidateResult {
  // Stub: later will check required files, XML schema, etc.
  return { valid: true, errors: [] };
}

export interface PackagePlan {
  archivePath: string;
}
export function planPackageMod(modDir: string, outZip?: string): PackagePlan {
  // Stub: later integrate with zip in plugin-files
  const archivePath = outZip ?? `${modDir}.zip`;
  return { archivePath };
}

export interface SteamUploadPlan {
  notes: string;
}
export function planSteamUpload(archivePath: string): SteamUploadPlan {
  // Stub: will integrate with Steam APIs later
  return { notes: `Upload ${archivePath} to Steam Workshop (stub)` };
}

/**
 * Default export convenience.
 */
export default {
  resolveModsDir,
  listMods,
  ensureModsFolder,
  getModStatus,
  configureModRemote,
  deployMod,
  importModFromRemote,
  pushModToRemote,
  pullModFromRemote,
  link,
  listRegisteredSlugs,
  planCreateMod,
  validateModStructure,
  planPackageMod,
  planSteamUpload,
};
