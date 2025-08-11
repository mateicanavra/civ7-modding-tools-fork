import { Args, Command, Flags } from "@oclif/core";
import * as fs from "node:fs";
import { loadConfig, resolveInstallDir, resolveZipPath, findProjectRoot } from "../utils";
import { zipResources } from "@civ7/plugin-files";

export default class Zip extends Command {
    static id = "zip";
    static summary = "Zips Civilization VII resources based on a profile.";
    static description = `
Reads profiles from the CLI config to create a zip archive of the game's resources.
Automatically detects OS defaults but can be overridden. Supports include/exclude patterns and prints a summary.
`;
    static examples = [
        "<%= config.bin %> zip",
        "<%= config.bin %> zip full",
        "<%= config.bin %> zip --verbose assets",
        "<%= config.bin %> zip --config ./my-config.jsonc default",
        "<%= config.bin %> zip default ./my-custom-archive.zip",
    ];

    static flags = {
        verbose: Flags.boolean({
            char: "v",
            description: "Enables verbose output from the zip command.",
            required: false,
            default: false,
        }),
        config: Flags.string({
            description: "Path to the configuration file.",
            required: false,
        }),
        installDir: Flags.string({
            description: "Override Civ7 install directory (source)",
            required: false,
        }),
    };

    static args = {
        profile: Args.string({
            description: "The profile to use from the config file.",
            required: false,
            default: "default",
        }),
        zipfile: Args.string({
            description: "Overrides the output path for the zip archive.",
            required: false,
        }),
    };

    private formatBytes(bytes: number): string {
        if (bytes === 0) return "0 B";
        const units = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Zip);

        // --- 1. Find and Parse Config ---
        const projectRoot = findProjectRoot(process.cwd());
        const cfg = await loadConfig(projectRoot, flags.config);
        if (!cfg.path) {
            this.warn("Config file not found; using default settings. To create a config, run 'civ7 config:init'.");
        } else {
            this.log(`→ Using config: ${cfg.path}`);
        }
        const config = cfg.raw;
        const profile = config.profiles?.[args.profile!] ?? {};

        if (args.profile && !profile.description) {
            this.warn(`Profile '${args.profile}' not found in ${cfg.path ?? 'config'}. Using default settings.`);
        }

        // --- 2. Determine Source Directory ---
        const srcDir = resolveInstallDir(config, flags.installDir);

        if (!srcDir || !fs.existsSync(srcDir)) {
            this.error(
                `Source directory not found: ${srcDir}\nPlease ensure the path is correct or set 'inputs.installDir' in the config.`,
            );
        }

        this.log(`→ Using source: ${srcDir}`);

        // --- 3. Execute via plugin lib ---
        this.log(`→ Zipping resources with profile '${args.profile}'...`);
        const out = args.zipfile ? resolveZipPath({ projectRoot, profile: args.profile }, config, args.zipfile) : undefined;
        const summary = await zipResources({
            projectRoot,
            profile: args.profile,
            srcDir,
            out,
            verbose: flags.verbose,
            configPath: flags.config,
        });

        // --- 4. Final Summary ---
        this.log(`✅ Successfully created archive: ${summary.outputPath}`);
        this.log("");
        this.log("+------------------------------------------------------+");
        this.log(`| Zip Operation Summary for Profile: '${args.profile!.padEnd(18)}' |`);
        this.log("+-----------------------------+------------------------+");
        this.log(`| Uncompressed Size           | ${this.formatBytes(summary.uncompressedSizeBytes).padEnd(22)} |`);
        this.log(`| Final Archive Size          | ${this.formatBytes(summary.archiveSizeBytes).padEnd(22)} |`);
        this.log("+-----------------------------+------------------------+");

        // GitHub Size Limit Check
        const GITHUB_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB
        if (summary.archiveSizeBytes > GITHUB_LIMIT_BYTES) {
            this.log("");
            this.warn(
                `Archive size (${this.formatBytes(summary.archiveSizeBytes)}) exceeds GitHub's 100 MB file limit.`,
            );
            this.log("   Consider using Git LFS or a different hosting solution.");
        }
    }
}
