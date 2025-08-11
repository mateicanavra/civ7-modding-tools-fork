import { Args, Command, Flags } from "@oclif/core";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as fssync from "node:fs";
import { exploreGraph } from "@civ7/plugin-graph";
import { loadConfig, resolveGraphOutDir, findProjectRoot, resolveRootFromConfigOrFlag } from "../utils";
import { spawn } from "node:child_process";
import * as http from "node:http";

export default class Explore extends Command {
  static id = "explore";
  static summary = "Crawl + render + open a visualization in one pipeline.";
  static description = `Runs the full pipeline: crawl resources for a seed, emit graph.json/graph.dot, render SVG, and optionally open a visualizer (local SVG or Graphviz Online).`;

  static examples = [
    "<%= config.bin %> explore LEADER_AMINA",
    "<%= config.bin %> explore CIVILIZATION_ROME --openOnline",
  ];

  static flags = {
    config: Flags.string({ description: "Path to config file", required: false }),
    profile: Flags.string({ description: "Profile key from config", required: false, default: "default" }),
    root: Flags.string({ description: "Override root folder (XML dir) if not using config", required: false }),
    engine: Flags.string({ description: "Graphviz engine", options: ["dot", "neato", "fdp", "sfdp", "circo", "twopi"], default: "dot" }),
    open: Flags.boolean({ description: "Open the generated visualization (HTML viewer by default) in your default browser", default: true }),
    openOnline: Flags.boolean({ description: "Open GraphvizOnline with DOT in the URL hash (may be too long for big graphs)", default: false }),
    maxUrlLength: Flags.integer({ description: "Max URL length for online viewer (guard)", default: 8000 }),
    // Viewer options
    vizHtml: Flags.boolean({ description: "Emit a local HTML viewer (graph.html) that embeds the generated SVG and adds pan/zoom", default: true, aliases: ["viz.html"] }),
    serve: Flags.boolean({ description: "Serve the output directory and open http://localhost:<port>/graph.html", default: false }),
    port: Flags.integer({ description: "Port for --serve (default 3000 or next free)", default: 3000 }),
  } as const;

  static args = {
    seed: Args.string({ description: "Seed identifier: Table:ID or an ID with a known prefix (e.g., LEADER_*)", required: true }),
    outDir: Args.string({ description: "Output directory (default: out/<seed>)", required: false }),
  } as const;

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Explore);

    const projectRoot = findProjectRoot(process.cwd());
    const cfg = await loadConfig(projectRoot, flags.config);
    const root = await resolveRootFromConfigOrFlag({ projectRoot, profile: flags.profile!, flagsRoot: flags.root, flagsConfig: flags.config });
    if (!root) this.error("Could not determine XML root directory. Provide --root or define 'outputs.unzip.dir' in the config file.");
    if (!fssync.existsSync(root)) this.error(`Root path not found: ${root}`);

    const seed = args.seed;
    // Guard against accidental boolean strings being parsed as OUTDIR (e.g., --open=false)
    let outDirArg = args.outDir as string | undefined;
    if (outDirArg === 'false' || outDirArg === 'true' || (outDirArg && outDirArg.startsWith('--'))) {
      outDirArg = undefined;
    }
    const outDir = resolveGraphOutDir({ projectRoot, profile: flags.profile }, cfg.raw ?? {}, seed, outDirArg);

    const useHtmlViewer = Boolean((flags as any)["viz.html"]) || Boolean((flags as any).vizHtml);
    const { dot, json, svg, html, manifestFiles } = await exploreGraph({
      rootDir: root,
      seed,
      engine: flags.engine as 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi',
      emitHtml: useHtmlViewer,
    });

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, "graph.json"), JSON.stringify(json, null, 2), "utf8");
    await fs.writeFile(path.join(outDir, "graph.dot"), dot, "utf8");
    await fs.writeFile(path.join(outDir, "manifest.txt"), manifestFiles.join("\n"), "utf8");

    const svgPath = path.join(outDir, "graph.svg");
    await fs.writeFile(svgPath, svg, "utf8");

    let htmlPath: string | null = null;
    if (html) {
      htmlPath = path.join(outDir, "graph.html");
      await fs.writeFile(htmlPath, html, "utf8");
    }

    this.log(`Explore pipeline complete. Output: ${outDir}`);

    const shouldOpen = Boolean(flags.open) && Boolean(process.stdout.isTTY) && !process.env.CI;
    if (useHtmlViewer) {
      if (flags.serve) {
        const { url } = await this.startStaticServer(outDir, flags.port!);
        await this.openUrl(`${url}/graph.html`);
        this.log(`Serving ${outDir} at ${url} (Ctrl+C to stop)`);
        await new Promise(() => {});
      } else if (shouldOpen && htmlPath) {
        await this.openInBrowser(htmlPath);
      }
    } else if (shouldOpen) {
      await this.openInBrowser(svgPath);
    }
    if (flags.openOnline) {
      const url = this.buildGraphvizOnlineUrl(dot, flags.maxUrlLength!);
      if (url) await this.openUrl(url);
      else this.warn(`DOT too large for URL (>${flags.maxUrlLength}). Skipping online viewer.`);
    }
  }

  private async openInBrowser(absPath: string): Promise<void> {
    const platform = process.platform;
    const target = absPath;
    const args: string[] = [];
    if (platform === "darwin") {
      await this.execDetached("open", [target]);
    } else if (platform === "win32") {
      await this.execDetached("cmd", ["/c", "start", "", target]);
    } else {
      await this.execDetached("xdg-open", [target]);
    }
  }

  private async openUrl(url: string): Promise<void> {
    const platform = process.platform;
    if (platform === "darwin") {
      await this.execDetached("open", [url]);
    } else if (platform === "win32") {
      await this.execDetached("cmd", ["/c", "start", "", url]);
    } else {
      await this.execDetached("xdg-open", [url]);
    }
  }

  private buildGraphvizOnlineUrl(dot: string, maxLen: number): string | null {
    const base = "https://dreampuf.github.io/GraphvizOnline/?engine=dot#";
    const enc = encodeURIComponent(dot);
    const url = base + enc;
    if (url.length > maxLen) return null;
    return url;
  }

  private execDetached(cmd: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: "ignore", detached: true });
      child.on("error", reject);
      child.unref();
      resolve();
    });
  }

  /**
   * Start a minimal static server rooted at rootDir. If the requested port is busy, falls back to an ephemeral port.
   */
  private startStaticServer(rootDir: string, desiredPort: number): Promise<{ server: http.Server; url: string; port: number }> {
    const root = path.resolve(rootDir);
    const contentTypes: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".svg": "image/svg+xml; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".txt": "text/plain; charset=utf-8",
      ".dot": "text/vnd.graphviz; charset=utf-8",
      ".xml": "application/xml; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
    };

    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) { res.statusCode = 400; res.end("Bad Request"); return; }
        const url = new URL(req.url, "http://localhost");
        let pathname = decodeURIComponent(url.pathname);
        if (pathname === "/") pathname = "/graph.html";
        const safePath = path.normalize(path.join(root, pathname));
        if (!safePath.startsWith(root)) { res.statusCode = 403; res.end("Forbidden"); return; }
        const stat = await fs.stat(safePath).catch(() => null);
        if (!stat || !stat.isFile()) { res.statusCode = 404; res.end("Not Found"); return; }
        const ext = path.extname(safePath).toLowerCase();
        const ctype = contentTypes[ext] || "application/octet-stream";
        res.setHeader("Content-Type", ctype);
        const data = await fs.readFile(safePath);
        res.statusCode = 200;
        res.end(data);
      } catch (_err) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    function listen(port: number): Promise<{ port: number }> {
      return new Promise((resolve) => {
        server.once("error", () => {
          // Retry with ephemeral port 0
          server.removeAllListeners("error");
          server.listen(0, "127.0.0.1", () => {
            const addr = server.address();
            const actual = typeof addr === "string" ? port : (addr?.port ?? port);
            resolve({ port: actual });
          });
        });
        server.listen(port, "127.0.0.1", () => {
          const addr = server.address();
          const actual = typeof addr === "string" ? port : (addr?.port ?? port);
          resolve({ port: actual });
        });
      });
    }

    return listen(Math.max(0, desiredPort || 3000)).then(({ port }) => {
      const url = `http://localhost:${port}`;
      return { server, url, port };
    });
  }
}


