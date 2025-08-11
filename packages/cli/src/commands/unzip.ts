import { Args, Command, Flags } from "@oclif/core";
import * as fs from "node:fs";
import { spawn } from "node:child_process";
import { loadConfig, resolveUnzipDir, resolveZipPath, findProjectRoot } from "../utils";

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

        // --- 2. Determine Source Zip File ---
        const zipFile = resolveZipPath({ projectRoot, profile: args.profile }, config, args.zipfile);

        if (!fs.existsSync(zipFile)) {
            this.error(`Source zip file not found: ${zipFile}`);
        }

        this.log(`→ Using source: ${zipFile}`);

        // --- 3. Determine Extraction Destination ---
        const destDir = resolveUnzipDir({ projectRoot, profile: args.profile }, config, args.extractpath);
        this.log(`→ Extracting to: ${destDir}`);

        // --- 4. Prepare Destination ---
        this.log("→ Cleaning destination directory...");
        if (fs.existsSync(destDir)) {
            fs.rmSync(destDir, { recursive: true, force: true });
        }

        fs.mkdirSync(destDir, { recursive: true });

        // --- 5. Execute Unzip Command ---
        const unzipArgs = ["-q", zipFile, "-d", destDir];
        this.log("→ Unpacking all resources from archive...");

        const unzipProcess = spawn("unzip", unzipArgs, {
            stdio: "pipe",
        });

        return new Promise((resolve, reject) => {
            unzipProcess.on("close", (code) => {
                if (code !== 0) {
                    this.error(`Unzip process exited with code ${code}.`, {
                        exit: code ?? 1,
                    });
                    return reject();
                }

                // --- 6. Final Summary ---
                if (!fs.existsSync(destDir)) {
                    this.error("Failed to unpack resources.");
                    return reject();
                }

                this.log(`✅ Successfully unpacked resources to: ${destDir}`);

                const archiveStats = fs.statSync(zipFile);
                const archiveSize = archiveStats.size;

                // Get the uncompressed size from zip metadata for consistency
                const unzipL = spawn("unzip", ["-l", zipFile]);
                let output = "";
                unzipL.stdout.on("data", (data) => {
                    output += data.toString();
                });

                unzipL.on("close", () => {
                    const lastLine = output.trim().split("\n").pop();
                    const uncompressedSize = lastLine
                        ? parseInt(lastLine.trim().split(/\s+/)[0], 10)
                        : 0;

                    this.log("");
                    this.log(
                        "+--------------------------------------------------------+",
                    );
                    this.log(
                        `| Unzip Operation Summary for Profile: '${args.profile!.padEnd(18)}' |`,
                    );
                    this.log(
                        "+-----------------------------+--------------------------+",
                    );
                    this.log(
                        `| Archive Size                | ${this.formatBytes(archiveSize).padEnd(24)} |`,
                    );
                    this.log(
                        `| Uncompressed Size           | ${this.formatBytes(uncompressedSize).padEnd(24)} |`,
                    );
                    this.log(
                        "+-----------------------------+--------------------------+",
                    );
                    this.log("");
                    resolve();
                });
            });

            unzipProcess.on("error", (err) => {
                this.error(`Failed to start unzip process: ${err.message}`);
                reject(err);
            });
        });
    }
}
