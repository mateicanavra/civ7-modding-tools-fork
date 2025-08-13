#!/usr/bin/env -S bun run

import { promises as fs } from "node:fs";
import * as fssync from "node:fs";
import * as path from "node:path";

async function listMarkdownFiles(rootDir: string): Promise<string[]> {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(rootDir, entry.name);
            if (entry.isDirectory()) return listMarkdownFiles(fullPath);
            if (
                entry.isFile() &&
                (entry.name.endsWith(".md") || entry.name.endsWith(".markdown"))
            ) {
                return [fullPath];
            }
            return [] as string[];
        })
    );
    return files.flat();
}

function rewriteLinks(content: string): { content: string; changed: boolean } {
    let updated = content;
    const before = updated;

    // 1) Remove any leading docs/ prefix in links like (docs/guides/...)
    updated = updated.replace(
        /\((?:\.\/|\.\.\/)*docs\/((?:guides|reference|examples)\/[A-Za-z0-9._\/\-]+\.md)\)/g,
        "(/$1)"
    );

    // 2) Ensure internal links are root-absolute for guides/reference/examples
    updated = updated.replace(
        /\((?:\.\/|\.\.\/)*((?:guides|reference|examples)\/[A-Za-z0-9._\/\-]+\.md)\)/g,
        "(/$1)"
    );

    // 3) Collapse accidental doubled slashes, avoiding protocols like http:// or https://
    updated = updated.replace(/([^:])\/\/+\//g, "$1/");
    updated = updated.replace(/([^:])\/\/+\/+/g, "$1/");
    updated = updated.replace(/([^:])\/\/+\)/g, "$1/)");
    updated = updated.replace(/\(\/docs\//g, "(/");

    return { content: updated, changed: updated !== before };
}

async function main() {
    const rootArg = process.argv[2];
    const siteRoot = path.resolve(process.cwd(), rootArg ?? ".archive/site");
    if (!fssync.existsSync(siteRoot)) {
        console.error(`Site root not found: ${siteRoot}`);
        process.exit(1);
    }

    const files = await listMarkdownFiles(siteRoot);
    let changedCount = 0;
    for (const file of files) {
        const original = await fs.readFile(file, "utf8");
        const { content, changed } = rewriteLinks(original);
        if (changed) {
            await fs.writeFile(file, content, "utf8");
            changedCount++;
            console.log(`Updated: ${path.relative(siteRoot, file)}`);
        }
    }
    console.log(`Link normalization complete. Files updated: ${changedCount}/${files.length}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
