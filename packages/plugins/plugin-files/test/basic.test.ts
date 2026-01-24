import { describe, it, expect, vi } from "vitest";
import * as path from "node:path";

// For unit tests we focus on error handling (no system deps)

// Mock @civ7/config to return deterministic paths
vi.mock("@civ7/config", async () => {
  return {
    findProjectRoot: () => path.resolve(process.cwd()),
    loadConfig: async () => ({ raw: {}, path: null }),
    resolveInstallDir: () => path.resolve("/tmp/src"),
    resolveZipPath: () => path.resolve("/tmp/out/archive.zip"),
    resolveUnzipDir: () => path.resolve("/tmp/out/resources"),
  };
});

// Mock fs for existence checks
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<any>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => ""),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    readdirSync: vi.fn(() => []),
    copyFileSync: vi.fn(),
  };
});

import { zipResources, unzipResources, copyDirectoryRecursive, resolveModsDir } from "../src/index";
import * as os from "node:os";
import * as fs from "node:fs";

describe("@civ7/plugin-files error handling", () => {
  it("unzipResources throws when archive is missing", async () => {
    await expect(unzipResources({})).rejects.toThrow(/Source zip not found/);
  });

  it("unzipResources refuses to overwrite a configured submodule directory", async () => {
    const projectRoot = path.resolve(process.cwd());
    const dest = path.join(projectRoot, ".civ7/outputs/resources");
    const zip = path.join(projectRoot, "archive.zip");

    (fs.existsSync as any).mockImplementation((p: string) => {
      if (p === zip) return true;
      if (p === dest) return true;
      if (p === path.join(projectRoot, ".gitmodules")) return true;
      if (p === path.join(dest, ".git")) return false;
      return false;
    });

    (fs.readFileSync as any).mockReturnValue(`[submodule \".civ7/outputs/resources\"]\n\tpath = .civ7/outputs/resources\n\turl = https://example.com/repo.git\n`);

    await expect(unzipResources({ projectRoot, zip, dest })).rejects.toThrow(/configured as a git submodule/i);
  });

  it("zipResources throws when source dir is missing", async () => {
    await expect(zipResources({})).rejects.toThrow(/Source directory not found/);
  });
});

describe("@civ7/plugin-files utilities", () => {
  it("copyDirectoryRecursive respects filter", () => {
    // use fs mock
    const entries = [
      { name: 'a.js', isDirectory: () => false, isSymbolicLink: () => false },
      { name: 'b.map', isDirectory: () => false, isSymbolicLink: () => false },
    ];
    (fs.existsSync as any) = vi.fn(() => true);
    (fs.readdirSync as any) = vi.fn(() => entries);
    (fs.copyFileSync as any) = vi.fn();
    const res = copyDirectoryRecursive('/src', '/dest', {
      filter: (rel, entry) => rel.endsWith('.js') || entry.isDirectory(),
    });
    expect(res.copiedFiles).toBe(1);
    expect(res.skippedEntries).toBe(1);
  });

  it("resolveModsDir returns platform-specific Mods path", () => {
    const info = resolveModsDir();
    expect(info.modsDir).toMatch(/Mods$/);
  });
});
