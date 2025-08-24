import { Args, Command, Flags } from "@oclif/core";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as fssync from "node:fs";
import { crawlGraph, graphToJson, graphToDot } from "@civ7/plugin-graph";
import { findProjectRoot, loadConfig, resolveGraphOutDir } from "@civ7/config";
import { resolveRootFromConfigOrFlag } from "../../utils";

export default class Crawl extends Command {
  static id = "crawl";
  static summary = "Crawl Civ XML resources and output a dependency graph + manifest";

  static description = `
Given a root folder (or single XML file) and a seed (e.g., LEADER_*, TRAIT_*, or Table:ID),
this command builds an in-memory index of Civ-style XML and performs a breadth-first crawl
to discover related rows. It writes a graph (JSON + DOT) and a manifest of XML files.
`;

  static examples = [
    "<%= config.bin %> crawl LEADER_AMANITORE",
    "<%= config.bin %> crawl Traits:TRAIT_SOME_TRAIT --profile default",
    "<%= config.bin %> crawl LEADER_AMANITORE ./out/genghis",
  ];

  static flags = {
    config: Flags.string({ description: "Path to config file", required: false }),
    profile: Flags.string({
      description: "Profile key from config",
      required: false,
      default: "default",
    }),
    root: Flags.string({
      description: "Override root folder (XML dir) if not using config",
      required: false,
    }),
  } as const;

  static args = {
    seed: Args.string({
      description: "Seed identifier: either Table:ID or an ID with a known prefix (e.g., LEADER_*)",
      required: true,
    }),
    outDir: Args.string({ description: "Output directory (default: out/<seed>)", required: false }),
  } as const;

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Crawl);

    const projectRoot = findProjectRoot(process.cwd());
    const cfg = await loadConfig(projectRoot, flags.config);
    const root = await resolveRootFromConfigOrFlag({
      projectRoot,
      profile: flags.profile!,
      flagsRoot: flags.root,
      flagsConfig: flags.config,
    });
    if (!root)
      this.error(
        "Could not determine XML root directory. Provide --root or define 'outputs.unzip.dir' in the config file."
      );
    if (!fssync.existsSync(root)) {
      this.error(`Root path not found: ${root}`);
    }

    const seed = args.seed;
    const outDir = resolveGraphOutDir(
      { projectRoot, profile: flags.profile },
      cfg.raw ?? {},
      seed,
      args.outDir
    );

    const { graph, manifestFiles } = await crawlGraph(root, seed, this.log.bind(this));

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
      path.join(outDir, "graph.json"),
      JSON.stringify(graphToJson(graph), null, 2),
      "utf8"
    );
    await fs.writeFile(path.join(outDir, "graph.dot"), graphToDot(graph), "utf8");
    await fs.writeFile(path.join(outDir, "manifest.txt"), manifestFiles.join("\n"), "utf8");

    this.log(`Graph + manifest written to: ${outDir}`);
  }
}
