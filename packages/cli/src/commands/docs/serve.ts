import { Command, Flags } from "@oclif/core";
import * as path from "node:path";
import { promises as fs } from "node:fs";
import * as fssync from "node:fs";
import { findProjectRoot } from "@civ7/config";
import { unzipResources } from "@civ7/plugin-files";

export default class DocsServe extends Command {
  static id = "docs serve";
  static summary = "Serve the documentation site (apps/docs/site) with synced resources.";
  static description = `
Synchronizes documentation resources from central outputs (if available) and serves the Docsify site.

By default, serves the directory apps/docs/site under the project root. You can override with --siteDir.
  `;

  static examples = [
    "<%= config.bin %> docs serve",
    "<%= config.bin %> docs serve --port 4000",
    "<%= config.bin %> docs serve --siteDir ./apps/docs/site --no-open",
  ];

  static flags = {
    siteDir: Flags.string({ description: "Path to docs site directory (defaults to apps/docs/site)", required: false }),
    port: Flags.integer({ description: "Port to serve on", default: 4000 }),
    host: Flags.string({ description: "Host/interface to bind", default: "127.0.0.1" }),
    open: Flags.boolean({ description: "Open the server URL in your default browser", default: true }),
    skipSync: Flags.boolean({ description: "Skip syncing documentation resources before serving", default: false }),
  } as const;

  public async run(): Promise<void> {
    const { flags } = await this.parse(DocsServe);

    const projectRoot = findProjectRoot(process.cwd());
    const siteDir = path.resolve(
      projectRoot,
      flags.siteDir ? flags.siteDir : path.join("apps", "docs", "site")
    );

    if (!fssync.existsSync(siteDir)) {
      this.error(`Docs site directory not found: ${siteDir}`);
    }

    if (!flags.skipSync) {
      await this.syncResources(projectRoot, siteDir);
    }

    const { proc, url } = await this.startDocsifyServer(projectRoot, siteDir, flags.port!, flags.host!, flags.open!);
    this.log(`Serving docs from ${siteDir} at ${url}`);

    if (process.env.CI) {
      // Do not block in CI; shut down immediately
      try { proc.kill(); } catch {}
      return;
    }

    // Block until the docsify process exits (Ctrl+C to stop)
    await proc.exited;
  }

  private async syncResources(projectRoot: string, siteDir: string): Promise<void> {
    const SOURCE_DIR = path.resolve(projectRoot, ".civ7/outputs/resources");
    const DEST_DIR = path.resolve(siteDir, "civ7-official/resources");
    const SOURCE_ZIP = path.resolve(projectRoot, ".civ7/outputs/archives/civ7-official-resources.zip");
    const DEST_ZIP = path.resolve(siteDir, "civ7-official/civ7-official-resources.zip");

    this.log("Syncing documentation resources...");
    await fs.mkdir(path.dirname(DEST_DIR), { recursive: true });
    await fs.mkdir(path.dirname(DEST_ZIP), { recursive: true });

    const zipExists = await fs.stat(SOURCE_ZIP).then(() => true).catch(() => false);
    const dirExists = await fs.stat(SOURCE_DIR).then(() => true).catch(() => false);

    if (zipExists) {
      this.log(`  > Using archive. Extracting to ${DEST_DIR}`);
      await unzipResources({ zip: SOURCE_ZIP, dest: DEST_DIR });
      this.log("  ✅ Resources extracted successfully.");
    } else if (dirExists) {
      this.log(`  > Archive not found. Copying pre-extracted resources from ${SOURCE_DIR}`);
      await fs.rm(DEST_DIR, { recursive: true, force: true });
      await fs.cp(SOURCE_DIR, DEST_DIR, { recursive: true });
      this.log("  ✅ Resources synced successfully (fallback).");
    } else {
      this.log("  > Neither archive nor pre-extracted resources found. Run `pnpm refresh:data` at repo root.");
    }

    if (zipExists) {
      this.log(`  > Copying archive to ${DEST_ZIP}`);
      await fs.copyFile(SOURCE_ZIP, DEST_ZIP);
      this.log("  ✅ Archive synced successfully.");
    }

    this.log("✅ Sync complete.");
  }

  private async startDocsifyServer(projectRoot: string, siteDir: string, port: number, host: string, open: boolean): Promise<{ proc: any; url: string }> {
    const docsAppDir = path.resolve(projectRoot, 'apps', 'docs');
    const url = `http://${host === '127.0.0.1' ? 'localhost' : host}:${port || 4000}`;
    const args = ['docsify-cli', 'serve', './site', '-p', String(port || 4000), '-h', host, '--no-open'];
    const proc = Bun.spawn({
      cmd: ['bunx', ...args],
      cwd: docsAppDir,
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    // Best-effort open browser shortly after spawn, if requested and interactive
    const shouldOpen = Boolean(open) && Boolean(process.stdout.isTTY) && !process.env.CI;
    if (shouldOpen) {
      setTimeout(() => { this.openUrl(url).catch(() => {}); }, 500);
    }

    return { proc, url };
  }

  private async openUrl(url: string): Promise<void> {
    const platform = process.platform;
    const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
    const args = platform === "win32" ? ["/c", "start", "", url] : [url];
    // Use Bun.spawn to avoid Node child_process
    const proc = Bun.spawn({ cmd: [command, ...args], stdout: "ignore", stderr: "ignore" });
    // Don't await; best-effort fire-and-forget
    void proc;
  }
}


