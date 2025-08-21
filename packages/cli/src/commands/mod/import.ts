import { Command, Flags } from "@oclif/core";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  addOrUpdateRemote,
  assertSubtreeReady,
  fetchRemote,
  getRemoteUrl,
  getRepoRoot,
  getStatusSnapshot,
  isWorktreeClean,
  remoteExists,
} from "@civ7/plugin-git";
import { importModFromRemote, pushModToRemote, pullModFromRemote } from "@civ7/plugin-mods";

type Action = "config-remote" | "import" | "push" | "pull" | "status";

export default class ModsImport extends Command {
  static id = "mod import";
  static summary = "Manage subtree-based mod imports and mirroring under mods/<slug>";
  static description = `Make this monorepo the source of truth for a mod while mirroring to a read-only repo.

This command wraps git subtree operations to:
- Configure (or update) a remote for a mod
- Import a remote repo's history under mods/<slug>
- Push changes from mods/<slug> back to the mirror repo
- Pull any last-minute fixes from the mirror into mods/<slug>
- Inspect status (repo, remotes, subtree presence)

Use --yes to skip safety prompts (non-interactive environments).
`;

  static examples = [
    // Configure the remote
    "<%= config.bin %> mod import --action config-remote --slug my-civ-mod --remote-url git@github.com:you/my-civ-mod.git",
    // Import (preserve history)
    "<%= config.bin %> mod import --action import --slug my-civ-mod --branch main",
    // Import (squash history)
    "<%= config.bin %> mod import --action import --slug my-civ-mod --branch main --squash",
    // Push subtree updates to mirror
    "<%= config.bin %> mod import --action push --slug my-civ-mod --branch main",
    // Pull hotfixes from mirror into subtree (must match --squash mode used on add)
    "<%= config.bin %> mod import --action pull --slug my-civ-mod --branch main",
    // Show status and diagnostics
    "<%= config.bin %> mod import --action status --slug my-civ-mod",
  ];

  static flags = {
    action: Flags.string({
      description: "Operation to perform",
      options: ["config-remote", "import", "push", "pull", "status"],
      required: true,
    }),
    slug: Flags.string({
      description: 'Mod slug (directory under mods/, e.g., "my-civ-mod")',
    }),
    remoteName: Flags.string({
      description: "Git remote name (default: mod-<slug>)",
    }),
    remoteUrl: Flags.string({
      description: "Git remote URL (e.g., git@github.com:you/repo.git)",
    }),
    branch: Flags.string({
      description: "Branch to track for import/push/pull",
      default: "main",
    }),
    squash: Flags.boolean({
      description: "Use history squash for add/pull (must match across operations)",
      default: false,
    }),
    yes: Flags.boolean({
      description: 'Assume "yes" to safety prompts (non-interactive)',
      default: false,
    }),
    autoUnshallow: Flags.boolean({
      description: "Automatically unshallow the repo if required for subtree operations",
      default: false,
    }),
    verbose: Flags.boolean({
      description: "Show underlying git commands (verbose)",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ModsImport);
    const action = flags.action as Action;
    const slug = flags.slug;
    const branch = flags.branch ?? "main";
    const squash = !!flags.squash;
    const yes = !!flags.yes;
    const verbose = !!flags.verbose;
    const autoUnshallow = !!flags.autoUnshallow;

    // Derived defaults
    const remoteName = flags.remoteName ?? (slug ? `mod-${slug}` : undefined);
    const prefix = slug ? path.posix.join("mods", slug) : undefined;

    // Status is the only action that can meaningfully run without slug
    if (action !== "status") {
      if (!slug) this.error("Missing required --slug <slug>");
      if (!remoteName) this.error("Unable to infer --remote-name; please pass it explicitly.");
    }

    // Diagnostics: ensure git+subtree available (except for pure status we still want to verify)
    await this.assertSubtreeReadyVerbose(verbose);

    // Route actions
    switch (action) {
      case "status":
        await this.handleStatus(slug ?? undefined, remoteName, branch, verbose);
        return;

      case "config-remote":
        await this.handleConfigRemote(remoteName!, flags.remoteUrl, branch, verbose);
        return;

      case "import":
        await this.handleImport(prefix!, remoteName!, flags.remoteUrl, branch, {
          squash,
          yes,
          verbose,
          autoUnshallow,
        });
        return;

      case "push":
        await this.handlePush(prefix!, remoteName!, branch, { yes, verbose, autoUnshallow });
        return;

      case "pull":
        await this.handlePull(prefix!, remoteName!, branch, {
          squash,
          yes,
          verbose,
          autoUnshallow,
        });
        return;

      default:
        this.error(`Unknown action: ${action}`);
    }
  }

  // Actions

  private async handleStatus(
    slug: string | undefined,
    remoteName: string | undefined,
    branch: string,
    verbose: boolean
  ) {
    const snapshot = await getStatusSnapshot({ verbose });
    this.log("Git status:");
    this.log(`- Repo root: ${snapshot.repoRoot ?? "(not a git repo)"}`);
    this.log(`- Shallow: ${snapshot.shallow ? "yes" : "no"}`);
    this.log(`- Clean worktree: ${snapshot.clean ? "yes" : "no"}`);
    this.log(`- Subtree available: ${snapshot.hasSubtree ? "yes" : "no"}`);
    this.log("- Remotes:");
    if (snapshot.remotes.length === 0) this.log("  (none)");
    for (const r of snapshot.remotes) {
      this.log(`  - ${r.name}: ${r.url ?? "(no url)"}`);
    }

    if (slug) {
      const prefix = path.posix.join("mods", slug);
      this.log("");
      this.log(`Subtree target for slug "${slug}":`);
      this.log(`- Prefix: ${prefix}`);
      this.log(`- Exists: ${fs.existsSync(prefix) ? "yes" : "no"}`);
      if (remoteName) {
        const exists = await remoteExists(remoteName, { verbose });
        const url = exists ? await getRemoteUrl(remoteName, { verbose }) : null;
        this.log(`- Remote: ${exists ? `${remoteName} (${url ?? "no url"})` : "(not configured)"}`);
        this.log(`- Branch: ${branch}`);
      }
    }
  }

  private async handleConfigRemote(
    remoteName: string,
    remoteUrl: string | undefined,
    branch: string,
    verbose: boolean
  ) {
    if (!remoteUrl) this.error("config-remote requires --remote-url <url>");
    const res = await addOrUpdateRemote(remoteName, remoteUrl, { verbose });
    const badge = res === "added" ? "added" : res === "updated" ? "updated" : "unchanged";
    this.log(`Remote "${remoteName}" ${badge}: ${remoteUrl}`);
    await fetchRemote(remoteName, { tags: true }, { verbose });
    this.log(`Fetched tags from "${remoteName}". Tracking branch: ${branch}`);
  }

  private async handleImport(
    prefix: string,
    remoteName: string,
    remoteUrl: string | undefined,
    branch: string,
    opts: { squash: boolean; yes: boolean; verbose: boolean; autoUnshallow: boolean }
  ) {
    await this.ensureMonorepoRoot();
    await this.ensureModsDir();

    // Optional safety check for pre-existing non-empty directory
    if (fs.existsSync(prefix)) {
      const nonEmpty = this.isNonEmptyDir(prefix);
      if (nonEmpty && !opts.yes) {
        this.error(
          `Target directory "${prefix}" already exists and is not empty. ` +
            "If this was not previously imported using subtree, add may fail. Re-run with --yes to continue anyway."
        );
      }
    }

    await importModFromRemote({
      slug: path.posix.basename(prefix),
      remoteName,
      remoteUrl,
      branch,
      squash: opts.squash,
      verbose: opts.verbose,
      allowDirty: opts.yes,
      autoUnshallow: opts.autoUnshallow,
    });
    this.log(`✅ Imported ${remoteName}/${branch} into ${prefix}`);
  }

  private async handlePush(
    prefix: string,
    remoteName: string,
    branch: string,
    opts: { yes: boolean; verbose: boolean; autoUnshallow: boolean }
  ) {
    await this.ensureMonorepoRoot();

    if (!fs.existsSync(prefix)) this.error(`Subtree directory "${prefix}" does not exist.`);

    await pushModToRemote({
      slug: path.posix.basename(prefix),
      remoteName,
      branch,
      verbose: opts.verbose,
      allowDirty: opts.yes,
      autoUnshallow: opts.autoUnshallow,
    });
    this.log(`✅ Pushed "${prefix}" to ${remoteName}/${branch}`);
  }

  private async handlePull(
    prefix: string,
    remoteName: string,
    branch: string,
    opts: { squash: boolean; yes: boolean; verbose: boolean; autoUnshallow: boolean }
  ) {
    await this.ensureMonorepoRoot();

    if (!fs.existsSync(prefix)) this.error(`Subtree directory "${prefix}" does not exist.`);

    await pullModFromRemote({
      slug: path.posix.basename(prefix),
      remoteName,
      branch,
      squash: opts.squash,
      verbose: opts.verbose,
      allowDirty: opts.yes,
      autoUnshallow: opts.autoUnshallow,
    });
    this.log(`✅ Pulled updates into "${prefix}" from ${remoteName}/${branch}`);
  }

  // Helpers

  private async assertSubtreeReadyVerbose(verbose: boolean) {
    try {
      await assertSubtreeReady({ verbose });
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "git subtree not available";
      this.error(msg);
    }
  }

  private async ensureMonorepoRoot() {
    const root = await getRepoRoot({ allowNonZeroExit: true });
    if (!root) this.error("Not inside a git repository.");
    if (!fs.existsSync(path.join(root!, "mods"))) {
      fs.mkdirSync(path.join(root!, "mods"), { recursive: true });
    }
  }

  private async ensureModsDir() {
    const root = await getRepoRoot({ allowNonZeroExit: true });
    if (!root) this.error("Not inside a git repository.");
    const modsDir = path.join(root!, "mods");
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
  }

  private async ensureRemoteConfigured(remoteName: string, verbose: boolean) {
    if (!(await remoteExists(remoteName, { verbose }))) {
      this.error(
        `Remote "${remoteName}" not found. Run with --action config-remote and --remote-url to configure it.`
      );
    }
  }

  private async ensureFullHistoryMaybe(
    remoteName: string,
    autoUnshallow: boolean,
    verbose: boolean
  ) {
    // No-op: subtree history handling now lives in @civ7/plugin-mods.
    // This stub remains for backward compatibility with older command flows.
    return;
  }

  private isNonEmptyDir(dir: string): boolean {
    try {
      const s = fs.statSync(dir);
      if (!s.isDirectory()) return true;
      const entries = fs.readdirSync(dir);
      return entries.length > 0;
    } catch {
      return false;
    }
  }
}
