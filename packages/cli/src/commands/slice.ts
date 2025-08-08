import { Args, Command, Flags } from "@oclif/core";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as fssync from "node:fs";
import { parse } from "jsonc-parser";
import { expandPath, findConfig, findProjectRoot } from "../utils/cli-helpers";

export default class Slice extends Command {
  static id = "slice";
  static summary = "Copy files from manifest.txt into a destination folder (preserving paths).";
  static description = `
Reads a manifest.txt (one absolute path per line) and copies those files from a given root into a destination folder,
preserving relative directory structure.
`;

  static examples = [
    "<%= config.bin %> slice ./out/<seed>/manifest.txt",
    "<%= config.bin %> slice --profile default ./out/<seed>/manifest.txt ./out/<seed>-slice",
  ];

  static flags = {
    config: Flags.string({ description: "Path to config file", required: false }),
    profile: Flags.string({ description: "Profile key from config", required: false, default: "default" }),
    root: Flags.string({ description: "Override root directory (XML source) if not using config", required: false }),
    dest: Flags.string({ description: "Override destination directory", required: false }),
  } as const;

  static args = {
    manifest: Args.string({ description: "Path to manifest.txt (defaults to out/<seed>/manifest.txt)", required: true }),
  } as const;

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Slice);
    const projectRoot = findProjectRoot(process.cwd());

    // Resolve root from config or flag
    let rootFromConfig: string | undefined;
    const configPath = findConfig(projectRoot, flags.config);
    if (configPath) {
      const cfgRaw = await fs.readFile(configPath, "utf8");
      const cfg: Record<string, any> = parse(cfgRaw);
      const profileCfg = cfg[flags.profile!];
      if (profileCfg?.unzip?.extract_path) {
        rootFromConfig = path.resolve(projectRoot, expandPath(profileCfg.unzip.extract_path));
      }
    }

    const root = path.resolve(projectRoot, expandPath(flags.root || rootFromConfig || ""));
    if (!root) this.error("Could not determine root. Provide --root or define unzip.extract_path in config.");
    if (!fssync.existsSync(root)) this.error(`Root not found: ${root}`);

    const manifestPath = path.resolve(projectRoot, expandPath(args.manifest));
    const defaultDest = path.join(path.dirname(manifestPath), "slice");
    const dest = path.resolve(projectRoot, expandPath(flags.dest || defaultDest));

    const manifestRaw = await fs.readFile(manifestPath, "utf8");
    const files = manifestRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    await fs.mkdir(dest, { recursive: true });

    let copied = 0;
    for (const abs of files) {
      const rel = abs.startsWith(root) ? abs.slice(root.length + (abs[root.length] === path.sep ? 1 : 0)) : path.basename(abs);
      const src = abs;
      const outPath = path.join(dest, rel);

      await fs.mkdir(path.dirname(outPath), { recursive: true });
      try {
        await fs.copyFile(src, outPath);
        copied += 1;
      } catch (e) {
        // If a file listed in manifest no longer exists, skip with a message
        this.warn(`Skipping missing file: ${src}`);
      }
    }

    this.log(`Slice complete. Copied ${copied} files to: ${dest}`);
  }
}


