import { Args, Command, Flags } from "@oclif/core";
import { loadConfig, resolveUnzipDir, resolveZipPath, findProjectRoot } from "../utils";
import { unzipResources } from "@civ7/plugin-files";

export default class Unzip extends Command {
    static id = "unzip";
    static summary = "Unzips Civilization VII resources based on a profile.";

    static description = `
Reads profiles from the CLI config to extract a resource archive.
The source zip file and extraction path are determined by the profile, but can be overridden.
`;

    static examples = [
        "<%= config.bin %> unzip",
        "<%= config.bin %> unzip full",
        "<%= config.bin %> unzip --config ./my-config.jsonc default",
        "<%= config.bin %> unzip default ./my-custom-archive.zip ./my-custom-output-dir",
    ];

    static flags = {
        config: Flags.string({
            description: "Path to the configuration file.",
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
            description: "Overrides the source path for the zip archive.",
            required: false,
        }),
        extractpath: Args.string({
            description: "Overrides the output directory for extraction.",
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
        const { args, flags } = await this.parse(Unzip);

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

        // --- 2. Execute via plugin lib ---
        const zipOverride = args.zipfile ? resolveZipPath({ projectRoot, profile: args.profile }, config, args.zipfile) : undefined;
        const destOverride = args.extractpath ? resolveUnzipDir({ projectRoot, profile: args.profile }, config, args.extractpath) : undefined;
        const summary = await unzipResources({
            projectRoot,
            profile: args.profile,
            zip: zipOverride,
            dest: destOverride,
            configPath: flags.config,
        });

        // --- 3. Final Summary ---
        this.log(`✅ Successfully unpacked resources to: ${summary.outputPath}`);
        this.log("");
        this.log("+--------------------------------------------------------+");
        this.log(`| Unzip Operation Summary for Profile: '${args.profile!.padEnd(18)}' |`);
        this.log("+-----------------------------+--------------------------+");
        this.log(`| Archive Size                | ${this.formatBytes(summary.archiveSizeBytes).padEnd(24)} |`);
        this.log(`| Uncompressed Size           | ${this.formatBytes(summary.uncompressedSizeBytes).padEnd(24)} |`);
        this.log("+-----------------------------+--------------------------+");
        this.log("");
    }
}
