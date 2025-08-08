import { Args, Command, Flags } from "@oclif/core";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as fssync from "node:fs";
import { Graphviz } from "@hpcc-js/wasm";
import { buildIndexFromXml, crawl, graphToDot, graphToJson, parseSeed } from "../tools/civ7-xml-crawler";
import { findProjectRoot, resolveOutDir, resolveRootFromConfigOrFlag } from "../utils/cli-helpers";
import { spawn } from "node:child_process";

export default class Explore extends Command {
  static id = "explore";
  static summary = "Crawl + render + open a visualization in one pipeline.";
  static description = `Runs the full pipeline: crawl resources for a seed, emit graph.json/graph.dot, render SVG, and optionally open a visualizer (local SVG or Graphviz Online).`;

  static examples = [
    "<%= config.bin %> explore LEADER_AMINA",
    "<%= config.bin %> explore CIVILIZATION_ROME --openOnline",
  ];

  static flags = {
    config: Flags.string({ description: "Path to civ-zip-config.jsonc", required: false }),
    profile: Flags.string({ description: "Profile key from config", required: false, default: "default" }),
    root: Flags.string({ description: "Override root folder (XML dir) if not using config", required: false }),
    engine: Flags.string({ description: "Graphviz engine", options: ["dot", "neato", "fdp", "sfdp", "circo", "twopi"], default: "dot" }),
    open: Flags.boolean({ description: "Open the generated SVG in your default browser", default: true }),
    openOnline: Flags.boolean({ description: "Open GraphvizOnline with DOT in the URL hash (may be too long for big graphs)", default: false }),
    maxUrlLength: Flags.integer({ description: "Max URL length for online viewer (guard)", default: 8000 }),
  } as const;

  static args = {
    seed: Args.string({ description: "Seed identifier: Table:ID or an ID with a known prefix (e.g., LEADER_*)", required: true }),
    outDir: Args.string({ description: "Output directory (default: out/<seed>)", required: false }),
  } as const;

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Explore);

    const projectRoot = findProjectRoot(process.cwd());
    const root = await resolveRootFromConfigOrFlag({ projectRoot, profile: flags.profile!, flagsRoot: flags.root, flagsConfig: flags.config });
    if (!root) this.error("Could not determine XML root directory. Provide --root or define unzip.extract_path in civ-zip-config.jsonc");
    if (!fssync.existsSync(root)) this.error(`Root path not found: ${root}`);

    const seed = args.seed;
    const outDir = resolveOutDir(projectRoot, seed, args.outDir);

    // Crawl
    const idx = await buildIndexFromXml(root);
    const parsedSeed = parseSeed(seed);
    if (!parsedSeed) this.error(`Could not parse seed: ${seed}`);
    const { graph, manifestFiles } = crawl(idx, parsedSeed);

    // Persist graph
    await fs.mkdir(outDir, { recursive: true });
    const dot = graphToDot(graph);
    await fs.writeFile(path.join(outDir, "graph.json"), JSON.stringify(graphToJson(graph), null, 2), "utf8");
    await fs.writeFile(path.join(outDir, "graph.dot"), dot, "utf8");
    await fs.writeFile(path.join(outDir, "manifest.txt"), manifestFiles.join("\n"), "utf8");

    // Render SVG
    const gv = await Graphviz.load();
    const svg = gv.layout(dot, "svg", flags.engine!);
    const svgPath = path.join(outDir, "graph.svg");
    await fs.writeFile(svgPath, svg, "utf8");

    this.log(`Explore pipeline complete. Output: ${outDir}`);

    // Open visualization(s)
    if (flags.open) {
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
}


