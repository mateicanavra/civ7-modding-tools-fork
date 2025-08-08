import { Args, Command, Flags } from "@oclif/core";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as fssync from "node:fs";
import { buildIndexFromXml, parseSeed, crawl } from "../tools/crawler";
import { graphToJson, graphToDot } from "../tools/graph";
import { findProjectRoot, resolveOutDir, resolveRootFromConfigOrFlag } from "../utils/cli-helpers";

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
        profile: Flags.string({ description: "Profile key from config", required: false, default: "default" }),
        root: Flags.string({ description: "Override root folder (XML dir) if not using config", required: false }),
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
        const root = await resolveRootFromConfigOrFlag({ projectRoot, profile: flags.profile!, flagsRoot: flags.root, flagsConfig: flags.config });
        if (!root) this.error("Could not determine XML root directory. Provide --root or define unzip.extract_path in the config file.");
        if (!fssync.existsSync(root)) {
            this.error(`Root path not found: ${root}`);
        }

        const seed = args.seed;
        const outDir = resolveOutDir(projectRoot, seed, args.outDir);

        const idx = await buildIndexFromXml(root);
        const parsedSeed = parseSeed(seed);
        if (!parsedSeed) this.error(`Could not parse seed: ${seed}`);

        const { graph, manifestFiles } = crawl(idx, parsedSeed!);

        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(path.join(outDir, "graph.json"), JSON.stringify(graphToJson(graph), null, 2), "utf8");
        await fs.writeFile(path.join(outDir, "graph.dot"), graphToDot(graph), "utf8");
        await fs.writeFile(path.join(outDir, "manifest.txt"), manifestFiles.join("\n"), "utf8");

        this.log(`Graph + manifest written to: ${outDir}`);
    }
}
