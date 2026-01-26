import { Command, Flags } from "@oclif/core";
import * as path from "node:path";
import { promises as fs } from "node:fs";
import * as fssync from "node:fs";
import { findProjectRoot } from "@civ7/config";
import { unzipResources } from "@civ7/plugin-files";

export default class DocsServe extends Command {
  static id = "docs serve";
  static summary = "Serve the Mintlify documentation (apps/docs) with synced resources.";
  static description = `
  Synchronizes documentation resources from central outputs (if available) and serves the Mintlify site.

  By default, serves the directory apps/docs under the project root. You can override with --siteDir.
  `;

  static examples = [
    "<%= config.bin %> docs serve",
    "<%= config.bin %> docs serve --port 4000",
    "<%= config.bin %> docs serve --siteDir ./apps/docs --no-open",
    "<%= config.bin %> docs serve --engine docsify",
  ];

  static flags = {
    siteDir: Flags.string({ description: "Path to docs directory (Mintlify: apps/docs, Docsify: apps/docs/site)", required: false }),
    engine: Flags.string({ description: "Docs engine to serve", options: ["mint", "docsify"], default: "mint" }),
    port: Flags.integer({ description: "Port to serve on", default: 4000 }),
    host: Flags.string({ description: "Host/interface to bind (docsify only)", default: "127.0.0.1" }),
    open: Flags.boolean({ description: "Open the server URL in your default browser", default: true }),
    skipSync: Flags.boolean({ description: "Skip syncing documentation resources before serving", default: false }),
  } as const;

  public async run(): Promise<void> {
    const { flags } = await this.parse(DocsServe);

    const projectRoot = findProjectRoot(process.cwd());
    const engine = (flags.engine as "mint" | "docsify");
    const defaultDir = engine === "docsify" ? path.join("apps", "docs", "site") : path.join("apps", "docs");
    const siteDir = path.resolve(projectRoot, flags.siteDir ? flags.siteDir : defaultDir);

    if (!fssync.existsSync(siteDir)) {
      this.error(`Docs site directory not found: ${siteDir}`);
    }

    if (!flags.skipSync) {
      await this.syncResourcesForEngine(engine, projectRoot, siteDir);
    }

    if (engine === "docsify") {
      const { proc, url } = await this.startDocsifyServer(projectRoot, siteDir, flags.port!, flags.host!, flags.open!);
      this.log(`Serving docs (Docsify) from ${siteDir} at ${url}`);
      if (process.env.CI) { try { proc.kill(); } catch {} return; }
      await proc.exited;
      return;
    }

    const { proc, url } = await this.startMintlifyServer(projectRoot, siteDir, flags.port!, flags.open!);
    this.log(`Serving docs (Mintlify) from ${siteDir} at ${url}`);

    if (process.env.CI) {
      // Do not block in CI; shut down immediately
      try { proc.kill(); } catch {}
      return;
    }

    // Block until the docsify process exits (Ctrl+C to stop)
    await proc.exited;
  }

  private async syncResourcesForEngine(engine: "mint" | "docsify", projectRoot: string, siteDir: string): Promise<void> {
    const SOURCE_DIR = path.resolve(projectRoot, ".civ7/outputs/resources");
    const SOURCE_ZIP = path.resolve(projectRoot, ".civ7/outputs/archives/civ7-official-resources.zip");
    const mintPublicDir = path.resolve(siteDir, engine === "docsify" ? path.join("..") : ".", "public", "civ7-official", "resources");
    const mintZipDest = path.resolve(siteDir, engine === "docsify" ? path.join("..") : ".", "public", "civ7-official", "civ7-official-resources.zip");
    const docsifyResourcesDir = engine === "docsify" ? path.resolve(siteDir, "civ7-official", "resources") : null;
    const docsifyZipDest = engine === "docsify" ? path.resolve(siteDir, "civ7-official", "civ7-official-resources.zip") : null;

    this.log("Syncing documentation resources...");
    await fs.mkdir(path.dirname(mintPublicDir), { recursive: true });
    await fs.mkdir(path.dirname(mintZipDest), { recursive: true });
    if (docsifyResourcesDir) {
      await fs.mkdir(path.dirname(docsifyResourcesDir), { recursive: true });
      await fs.mkdir(path.dirname(docsifyZipDest!), { recursive: true });
    }

    const zipExists = await fs.stat(SOURCE_ZIP).then(() => true).catch(() => false);
    const dirExists = await fs.stat(SOURCE_DIR).then(() => true).catch(() => false);

    if (zipExists) {
      this.log(`  > Using archive. Extracting to ${mintPublicDir}`);
      await unzipResources({ zip: SOURCE_ZIP, dest: mintPublicDir });
      if (docsifyResourcesDir) {
        this.log(`  > Also extracting for Docsify to ${docsifyResourcesDir}`);
        await unzipResources({ zip: SOURCE_ZIP, dest: docsifyResourcesDir });
      }
      this.log("  ✅ Resources extracted successfully.");
    } else if (dirExists) {
      this.log(`  > Archive not found. Copying pre-extracted resources from ${SOURCE_DIR}`);
      await fs.rm(mintPublicDir, { recursive: true, force: true });
      await fs.cp(SOURCE_DIR, mintPublicDir, { recursive: true });
      if (docsifyResourcesDir) {
        await fs.rm(docsifyResourcesDir, { recursive: true, force: true });
        await fs.cp(SOURCE_DIR, docsifyResourcesDir, { recursive: true });
      }
      this.log("  ✅ Resources synced successfully (fallback).");
    } else {
      this.log("  > Neither archive nor pre-extracted resources found. Run `bun run refresh:data` at repo root.");
    }

    if (zipExists) {
      this.log(`  > Copying archive to ${mintZipDest}`);
      await fs.copyFile(SOURCE_ZIP, mintZipDest);
      if (docsifyZipDest) {
        this.log(`  > Also copying archive to ${docsifyZipDest}`);
        await fs.copyFile(SOURCE_ZIP, docsifyZipDest);
      }
      this.log("  ✅ Archive synced successfully.");
    }

    this.log("✅ Sync complete.");
  }

  private async startMintlifyServer(projectRoot: string, siteDir: string, port: number, open: boolean): Promise<{ proc: any; url: string }> {
    const docsAppDir = path.resolve(projectRoot, 'apps', 'docs');
    const url = `http://localhost:${port || 4000}`;
    const args = ['mint', 'dev', '-p', String(port || 4000), '--no-open'];
    const proc = Bun.spawn({
      cmd: ['bunx', ...args],
      cwd: docsAppDir,
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const shouldOpen = Boolean(open) && Boolean(process.stdout.isTTY) && !process.env.CI;
    if (shouldOpen) {
      setTimeout(() => { this.openUrl(url).catch(() => {}); }, 500);
    }

    return { proc, url };
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

