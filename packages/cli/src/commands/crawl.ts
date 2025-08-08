import { Args, Command, Flags } from "@oclif/core";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as fssync from "node:fs";
import { parse } from "jsonc-parser";
import { buildIndexFromXml, parseSeed, crawl, graphToJson, graphToDot } from "../tools/civ7-xml-crawler";

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
        config: Flags.string({ description: "Path to civ-zip-config.jsonc", required: false }),
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

    // Helper function to find the project root from any script location
    private findProjectRoot(startDir: string): string {
        let currentDir = startDir;
        while (currentDir !== path.parse(currentDir).root) {
            if (fssync.existsSync(path.join(currentDir, "pnpm-workspace.yaml"))) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }
        throw new Error("Could not find project root. Are you in a pnpm workspace?");
    }

    private expandPath(filePath: string): string {
        if (filePath.startsWith("~")) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }

    // Helper to find the config file by searching in prioritized locations.
    private findConfig(configFlag?: string): string | null {
        const projectRoot = this.findProjectRoot(process.cwd());
        const searchPaths = new Set<string | undefined>([configFlag, path.join(process.cwd(), "civ-zip-config.jsonc"), path.join(projectRoot, "civ-zip-config.jsonc")]);
        for (const p of searchPaths) {
            if (p && fssync.existsSync(p)) return p;
        }
        return null;
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Crawl);

        const projectRoot = this.findProjectRoot(process.cwd());

        // Determine root from config (default) or flag
        let rootFromConfig: string | undefined;
        const configPath = this.findConfig(flags.config);
        if (configPath) {
            const configFileContent = await fs.readFile(configPath, "utf8");
            const cfg: Record<string, any> = parse(configFileContent);
            const profileCfg = cfg[flags.profile!];
            if (profileCfg?.unzip?.extract_path) {
                rootFromConfig = path.resolve(projectRoot, this.expandPath(profileCfg.unzip.extract_path));
            }
        }

        const root = path.resolve(projectRoot, this.expandPath(flags.root || rootFromConfig || ""));
        if (!root) {
            this.error("Could not determine XML root directory. Provide --root or define unzip.extract_path in civ-zip-config.jsonc");
        }
        if (!fssync.existsSync(root)) {
            this.error(`Root path not found: ${root}`);
        }

        const seed = args.seed;
        const defaultOut = path.join(projectRoot, "out", seed.replace(/[^A-Za-z0-9_\-:.]/g, "_"));
        const outDir = path.resolve(projectRoot, args.outDir ? this.expandPath(args.outDir) : defaultOut);

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
