import { Args, Command, Flags } from "@oclif/core";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";
import { parse } from "jsonc-parser";

// Define the structure of the config file for type safety
interface ZipConfig {
    src_path?: string;
    [profile: string]: any;
}

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
    private findConfig(configFlag?: string): string | null {
        const projectRoot = this.findProjectRoot(process.cwd());
        // Use a Set to avoid checking the same path twice if cwd is root
        const searchPaths = new Set<string | undefined>([
            configFlag, // 1. Path from --config flag
            path.join(process.cwd(), "civ.config.jsonc"), // 2. Current working directory
            path.join(projectRoot, "civ.config.jsonc"), // 3. Project root
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
        const { args, flags } = await this.parse(Zip);

        // --- 1. Find and Parse Config ---
        const configPath = this.findConfig(flags.config);

        if (!configPath) {
            this.error("Config file not found. Provide --config or create a config file in the project root.", { exit: 1 });
        }

        this.log(`→ Using config: ${configPath}`);
        const configFileContent = fs.readFileSync(configPath, "utf8");
        const config: ZipConfig = parse(configFileContent);
        const profileConfig = config[args.profile];

        if (!profileConfig) {
            this.error(`Profile '${args.profile}' not found in ${configPath}`);
        }

        // --- 2. Determine Source Directory ---
        let srcDir: string;
        if (config.src_path) {
            srcDir = this.expandPath(config.src_path);
        } else {
            const platform = os.platform();
            if (platform === "darwin") {
                srcDir = this.expandPath(
                    "~/Library/Application Support/Steam/steamapps/common/Sid Meier's Civilization VII/CivilizationVII.app/Contents/Resources",
                );
            } else if (platform === "win32") {
                srcDir =
                    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sid Meier's Civilization VII\\Base";
            } else {
                this.warn(
                    "Unsupported OS detected. Please specify 'src_path' in the config file.",
                );
                srcDir = ""; // Will cause the script to exit gracefully below
            }
        }

        if (!srcDir || !fs.existsSync(srcDir)) {
            this.error(
                `Source directory not found: ${srcDir}\nPlease ensure the path is correct or set 'src_path' in the config.`,
            );
        }

        this.log(`→ Using source: ${srcDir}`);

        // --- 3. Determine Zip Destination ---
        const zipPathOverride = args.zipfile;
        const zipPathFromConfig = profileConfig.zip?.zip_path;
        let zipPath = zipPathOverride || zipPathFromConfig;

        if (!zipPath) {
            this.error(
                `Zip destination path not defined for profile '${args.profile}' and no override provided.`,
            );
        }

        zipPath = path.resolve(
            this.findProjectRoot(process.cwd()),
            this.expandPath(zipPath),
        );
        this.log(`→ Saving to: ${zipPath}`);

        // --- 4. Prepare Destination ---
        const outputDir = path.dirname(zipPath);
        fs.mkdirSync(outputDir, { recursive: true });

        this.log("→ Cleaning old archive...");
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }

        // --- 5. Execute Zip Command ---
        const zipArgs: string[] = ["-r"];
        if (!flags.verbose) {
            zipArgs.push("-q");
        }

        zipArgs.push("-X", zipPath);

        const includePatterns: string[] = profileConfig.zip?.include || [];
        const excludePatterns: string[] = profileConfig.zip?.exclude || [];

        if (includePatterns.length > 0) {
            zipArgs.push(...includePatterns);
        } else {
            zipArgs.push("."); // Zip current directory
            for (const pat of excludePatterns) {
                zipArgs.push("-x", pat);
            }
        }

        this.log(`→ Zipping resources with profile '${args.profile}'...`);

        const zipProcess = spawn("zip", zipArgs, {
            cwd: srcDir,
            stdio: flags.verbose ? "inherit" : "pipe",
        });

        return new Promise((resolve, reject) => {
            zipProcess.on("close", (code) => {
                if (code !== 0) {
                    this.error(`Zip process exited with code ${code}.`, {
                        exit: code ?? 1,
                    });
                    return reject();
                }

                // --- 6. Final Summary ---
                if (!fs.existsSync(zipPath)) {
                    this.error("Failed to create archive.");
                    return reject();
                }

                this.log(`✅ Successfully created archive: ${zipPath}`);

                const archiveStats = fs.statSync(zipPath);
                const archiveSize = archiveStats.size;

                // We still need `unzip` to get the uncompressed size from metadata
                const unzipL = spawn("unzip", ["-l", zipPath]);
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
                        "+------------------------------------------------------+",
                    );
                    this.log(
                        `| Zip Operation Summary for Profile: '${args.profile!.padEnd(18)}' |`,
                    );
                    this.log(
                        "+-----------------------------+------------------------+",
                    );
                    this.log(
                        `| Uncompressed Size           | ${this.formatBytes(uncompressedSize).padEnd(22)} |`,
                    );
                    this.log(
                        `| Final Archive Size          | ${this.formatBytes(archiveSize).padEnd(22)} |`,
                    );
                    this.log(
                        "+-----------------------------+------------------------+",
                    );

                    // GitHub Size Limit Check
                    const GITHUB_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB
                    if (archiveSize > GITHUB_LIMIT_BYTES) {
                        this.log("");
                        this.warn(
                            `Archive size (${this.formatBytes(archiveSize)}) exceeds GitHub's 100 MB file limit.`,
                        );
                        this.log(
                            "   Consider using Git LFS or a different hosting solution.",
                        );
                    }

                    this.log("");
                    resolve();
                });
            });

            zipProcess.on("error", (err) => {
                this.error(`Failed to start zip process: ${err.message}`);
                reject(err);
            });
        });
    }
}
