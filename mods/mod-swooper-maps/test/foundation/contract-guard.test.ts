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
  it("requires volcanism in foundation plates schema", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const artifactsFile = path.join(repoRoot, "src/recipes/standard/stages/foundation/artifacts.ts");
    const text = readFileSync(artifactsFile, "utf8");
    expect(text).toContain("volcanism");
  });

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

  it("does not reintroduce removed foundation surfaces", () => {
    const repoRoot = path.resolve(import.meta.dir, "../..");
    const roots = [
      path.join(repoRoot, "src/domain/foundation"),
      path.join(repoRoot, "src/recipes/standard/stages/foundation"),
      path.join(repoRoot, "src/maps"),
    ];

    const files = roots.flatMap((root) =>
      listFilesRecursive(root).filter((file) => file.endsWith(".ts"))
    );

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("directionality");
      expect(text).not.toContain("foundation.dynamics");
      expect(text).not.toContain("foundation.config");
      expect(text).not.toContain("foundation.seed");
      expect(text).not.toContain("foundation.diagnostics");
      expect(text).not.toContain("wrap_x");
      expect(text).not.toContain("wrap_y");
      expect(text).not.toContain("environment_wrap");
    }
  });
});
