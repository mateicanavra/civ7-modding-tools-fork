import { describe, expect, it } from "bun:test";

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function listFilesRecursive(rootDir: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(rootDir);
  for (const entry of entries) {
    const full = path.join(rootDir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFilesRecursive(full));
      continue;
    }
    out.push(full);
  }
  return out;
}

describe("foundation contract guardrails", () => {
  it("does not import domain config bag schemas from op contracts", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const foundationOpsDir = path.join(repoRoot, "src/domain/foundation/ops");
    const contractFiles = listFilesRecursive(foundationOpsDir).filter((file) =>
      file.endsWith(path.join("contract.ts"))
    );

    expect(contractFiles.length).toBeGreaterThan(0);

    for (const file of contractFiles) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("@mapgen/domain/config");
      expect(text).not.toContain("FoundationConfigSchema");
    }
  });

  it("does not import domain config bags from the foundation step contract", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const stepsDir = path.join(repoRoot, "src/recipes/standard/stages/foundation/steps");
    const contractFiles = listFilesRecursive(stepsDir).filter((file) => file.endsWith("contract.ts"));

    expect(contractFiles.length).toBeGreaterThan(0);

    for (const file of contractFiles) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("@mapgen/domain/config");
      expect(text).not.toContain("FoundationConfigSchema");
    }
  });
});
