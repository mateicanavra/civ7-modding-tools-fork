#!/usr/bin/env node
/**
 * Minimal build script for a Civ7 mod colocated in this monorepo.
 * - Uses @mateicanavra/civ7-sdk
 * - Writes build output to ./mod/
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import * as Civ7 from "@mateicanavra/civ7-sdk";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const getArg = (name, fallback = undefined) => {
  const idx = args.findIndex((a) => a === name);
  return idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--")
    ? args[idx + 1]
    : fallback;
};

const MOD_ID = process.env.CIV7_MOD_ID || "example-mod";
const MOD_NAME = process.env.CIV7_MOD_NAME || "Example Mod";
const MOD_VERSION = process.env.CIV7_MOD_VERSION || "0.0.1";
const MOD_DESCRIPTION =
  process.env.CIV7_MOD_DESCRIPTION ||
  "Example mod built with @mateicanavra/civ7-sdk";

const OUT_DIR = path.resolve(__dirname, "..", "mod");
const OUT = path.resolve(getArg("--out", OUT_DIR));

/**
 * Attempt to create a Mod instance using common SDK entry points.
 */
function createModInstance() {
  // Common patterns:
  // - Civ7.createMod({...})
  // - new Civ7.Mod({...})
  // - Civ7.default.createMod({...}) (if default export exists)
  const init = {
    id: MOD_ID,
    title: MOD_NAME,
    name: MOD_NAME, // in case SDK expects 'name' instead of 'title'
    version: MOD_VERSION,
    description: MOD_DESCRIPTION,
  };

  if (typeof Civ7.createMod === "function") {
    return Civ7.createMod(init);
  }

  if (Civ7?.default && typeof Civ7.default.createMod === "function") {
    return Civ7.default.createMod(init);
  }

  if (typeof Civ7?.Mod === "function") {
    try {
      return new Civ7.Mod(init);
    } catch {
      // Some constructors may expect different args; ignore and continue.
    }
  }

  // If the SDK publishes named builders (e.g., Civ7.builders?.mod)
  const maybeBuilder = Civ7?.builders?.mod || Civ7?.builders?.createMod;
  if (typeof maybeBuilder === "function") {
    return maybeBuilder(init);
  }

  return null;
}

/**
 * Attempt to build the Mod using common SDK entry points.
 */
async function buildWithSDK(mod, outDir) {
  if (mod && typeof mod.build === "function") {
    await mod.build(outDir);
    return true;
  }

  // Some SDKs may expose a static build function
  if (typeof Civ7.buildMod === "function") {
    await Civ7.buildMod(mod ?? {}, outDir);
    return true;
  }

  if (Civ7?.default && typeof Civ7.default.buildMod === "function") {
    await Civ7.default.buildMod(mod ?? {}, outDir);
    return true;
  }

  return false;
}

/**
 * Fallback: write a minimal `.modinfo` + basic structure if SDK build entry
 * points are not found. This keeps the contract of "writes to ./mod/" intact.
 * We still import the SDK at top-level, so the script validates that the SDK
 * is installed and available.
 */
async function writeMinimalScaffold(outDir) {
  await fsp.mkdir(outDir, { recursive: true });

  const modinfo = `<?xml version="1.0" encoding="UTF-8"?>
<ModInfo id="${MOD_ID}" version="${MOD_VERSION}">
  <Name>${escapeXml(MOD_NAME)}</Name>
  <Description>${escapeXml(MOD_DESCRIPTION)}</Description>
  <ActionGroups>
    <ActionGroup id="BaseGame">
      <Items>
        <!-- Add your items here: civilizations/, units/, constructibles/, progression-trees/, etc. -->
      </Items>
    </ActionGroup>
  </ActionGroups>
</ModInfo>
`;

  await fsp.writeFile(path.join(outDir, `${MOD_ID}.modinfo`), modinfo, "utf8");

  // Create typical folders to guide authors
  const typical = [
    "civilizations",
    "traditions",
    "units",
    "constructibles",
    "progression-trees",
    "imports",
  ];
  await Promise.all(
    typical.map((p) => fsp.mkdir(path.join(outDir, p), { recursive: true }))
  );
}

function escapeXml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function buildOnce() {
  // Ensure output dir exists
  await fsp.mkdir(OUT, { recursive: true });

  const mod = createModInstance();

  // Optionally, add trivial content if the SDK exposes simple APIs.
  // We keep this minimal and defensive so the script runs even if APIs differ.
  try {
    if (mod) {
      // If the SDK offers metadata setters or similar, use them defensively.
      if (typeof mod.setMetadata === "function") {
        mod.setMetadata({
          id: MOD_ID,
          name: MOD_NAME,
          version: MOD_VERSION,
          description: MOD_DESCRIPTION,
        });
      }
    }
  } catch {
    // Non-fatal; keep going toward build()
  }

  const built = await buildWithSDK(mod, OUT);

  if (!built) {
    console.warn(
      "[civ7/example-mod] SDK build entry points not detected. Writing minimal scaffold instead."
    );
    await writeMinimalScaffold(OUT);
  }

  console.log(`[civ7/example-mod] Built to: ${OUT}`);
}

function setupWatch() {
  // Lightweight watch: re-run build on changes within this workspace (excluding output dir).
  const root = path.resolve(__dirname, "..");
  const ignore = new Set([
    path.resolve(root, "mod"),
    path.resolve(root, "node_modules"),
  ]);

  console.log("[civ7/example-mod] Watching for changes... (Ctrl+C to stop)");

  const rebuild = debounce(async () => {
    try {
      await buildOnce();
    } catch (err) {
      console.error("[civ7/example-mod] Build error (watch):", err);
    }
  }, 150);

  const watcher = fs.watch(
    root,
    { recursive: true },
    (eventType, filename = "") => {
      const full = path.resolve(root, filename);
      if ([...ignore].some((p) => full.startsWith(p))) return;
      rebuild();
    }
  );

  process.on("SIGINT", () => {
    watcher.close();
    process.exit(0);
  });
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

(async function main() {
  const isWatch = flags.has("--watch");
  await buildOnce();
  if (isWatch) setupWatch();
})().catch((err) => {
  console.error("[civ7/example-mod] Build failed:", err);
  process.exit(1);
});
