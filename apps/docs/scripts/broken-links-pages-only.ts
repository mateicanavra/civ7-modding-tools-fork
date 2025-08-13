import { mkdtempSync, rmSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

async function run(): Promise<void> {
  const projectRoot = process.cwd();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'mint-pages-only-'));
  try {
    // Copy minimal inputs
    const docsJson = resolve(projectRoot, 'docs.json');
    if (!existsSync(docsJson)) {
      console.error('docs.json missing');
      process.exit(1);
    }
    cpSync(docsJson, join(tmpRoot, 'docs.json'));

    // Copy only *.mdx from project root recursively, excluding .archive and node_modules
    const { readdirSync, mkdirSync, copyFileSync } = await import('node:fs');
    function copyMdx(srcDir: string, dstDir: string): void {
      readdirSync(srcDir, { withFileTypes: true }).forEach((entry) => {
        const srcPath = join(srcDir, entry.name);
        const dstPath = join(dstDir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.archive' || entry.name.startsWith('.turbo')) return;
          mkdirSync(dstPath, { recursive: true });
          copyMdx(srcPath, dstPath);
        } else if (entry.isFile()) {
          if (entry.name.toLowerCase().endsWith('.mdx')) {
            mkdirSync(dstDir, { recursive: true });
            copyFileSync(srcPath, dstPath);
          }
        }
      });
    }
    copyMdx(projectRoot, tmpRoot);

    // Use local mint binary from original project node_modules
    const mintBin = resolve(projectRoot, 'node_modules/.bin/mint');
    const result = spawnSync(mintBin, ['broken-links'], {
      cwd: tmpRoot,
      stdio: 'inherit',
      env: process.env,
    });
    if (typeof result.status === 'number') {
      process.exit(result.status);
    }
    // If status is null but error exists, throw
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
  } finally {
    // Cleanup temp directory
    try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
  }
}

run();


