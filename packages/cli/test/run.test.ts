import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const binPath = path.join(__dirname, "..", "bin", "run.js");
const repoRoot = path.resolve(__dirname, "..", "..", "..",);

describe("cli bin", () => {
  it("shows help", () => {
    const output = execFileSync("node", [binPath, "--help"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(output).toContain("COMMANDS");
  });

  it("zips and unzips with provided config", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
    try {
      const srcDir = path.join(tmpDir, "src");
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, "hello.txt"), "hi");

      const configPath = path.join(tmpDir, "civ-zip-config.jsonc");
      fs.writeFileSync(
        configPath,
        JSON.stringify({ src_path: srcDir, default: {} })
      );

      const zipPath = path.join(tmpDir, "test.zip");

      execFileSync(
        "node",
        [binPath, "zip", "--config", configPath, "default", zipPath],
        { cwd: repoRoot, stdio: "pipe" }
      );

      expect(fs.existsSync(zipPath)).toBe(true);

      const extractDir = path.join(tmpDir, "extract");
      execFileSync(
        "node",
        [
          binPath,
          "unzip",
          "--config",
          configPath,
          "default",
          zipPath,
          extractDir,
        ],
        { cwd: repoRoot, stdio: "pipe" }
      );

      const extractedFile = path.join(extractDir, "hello.txt");
      expect(fs.readFileSync(extractedFile, "utf8")).toBe("hi");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
