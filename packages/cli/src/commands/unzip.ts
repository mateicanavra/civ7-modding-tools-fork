import { Args, Command, Flags } from "@oclif/core";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";
import { parse } from "jsonc-parser";

// Define the structure of the config file for type safety
interface UnzipConfig {
    [profile: string]: any;
}

export default class Unzip extends Command {
    static id = "unzip";
    static summary = "Unzips Civilization VII resources based on a profile.";

    static description = `
This command reads profiles from 'civ-zip-config.jsonc' to extract a resource archive.
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

    // Helper function to find the project root from any script location
    private findProjectRoot(startDir: string): string {
        let currentDir = startDir;
        while (currentDir !== path.parse(currentDir).root) {
            if (fs.existsSync(path.join(currentDir, "pnpm-workspace.yaml"))) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }
        throw new Error(
            "Could not find project root. Are you in a pnpm workspace?",
        );
    }

    // Helper to find the config file by searching in prioritized locations.
    private findConfig(configPath?: string): string | null {
        const projectRoot = this.findProjectRoot(process.cwd());
        // Use a Set to avoid checking the same path twice if cwd is root
        const searchPaths = new Set<string | undefined>([
            configPath, // 1. Path from --config flag
            path.join(process.cwd(), "civ-zip-config.jsonc"), // 2. Current working directory
            path.join(projectRoot, "civ-zip-config.jsonc"), // 3. Project root
        ]);

        for (const p of searchPaths) {
            if (p && fs.existsSync(p)) {
                return p;
            }
        }
        return null;
    }

    // Helper to format bytes into KB, MB, GB, etc.
    private formatBytes(bytes: number): string {
        if (bytes === 0) return "0 B";
        const units = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
    }

    // Helper to expand ~ to the user's home directory
    private expandPath(filePath: string): string {
        if (filePath.startsWith("~")) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Unzip);

        // --- 1. Find and Parse Config ---
        const configPath = this.findConfig(flags.config);
        if (!configPath) {
            this.error(
                "Config file not found. Please create 'civ-zip-config.jsonc' or use the --config flag.",
            );
        }
        this.log(`→ Using config: ${configPath}`);

        const configFileContent = fs.readFileSync(configPath, "utf8");
        const config: UnzipConfig = parse(configFileContent);
        const profileConfig = config[args.profile];

        if (!profileConfig) {
            this.error(`Profile '${args.profile}' not found in ${configPath}`);
        }

        const projectRoot = this.findProjectRoot(process.cwd());

        // --- 2. Determine Source Zip File ---
        const zipPathFromConfig = profileConfig.zip?.zip_path;
        let zipFile = args.zipfile || zipPathFromConfig;

        if (!zipFile) {
            this.error(
                `Source zip file not defined for profile '${args.profile}' and no override provided.`,
            );
        }

        zipFile = path.resolve(projectRoot, this.expandPath(zipFile));

        if (!fs.existsSync(zipFile)) {
            this.error(`Source zip file not found: ${zipFile}`);
        }

        this.log(`→ Using source: ${zipFile}`);

        // --- 3. Determine Extraction Destination ---
        const extractPathFromConfig = profileConfig.unzip?.extract_path;
        let destDir = args.extractpath || extractPathFromConfig;

        if (!destDir) {
            this.error(
                `Extraction path not defined for profile '${args.profile}' and no override provided.`,
            );
        }

        destDir = path.resolve(projectRoot, this.expandPath(destDir));
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
