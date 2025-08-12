import { mkdtempSync, rmSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function run(): void {
  const projectRoot = process.cwd();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'mint-pages-only-'));
  try {
    // Copy minimal inputs
    const docsJson = resolve(projectRoot, 'docs.json');
    const pagesDir = resolve(projectRoot, 'pages');
    if (!existsSync(docsJson) || !existsSync(pagesDir)) {
      console.error('docs.json or pages/ missing');
      process.exit(1);
    }
    cpSync(docsJson, join(tmpRoot, 'docs.json'));
    cpSync(pagesDir, join(tmpRoot, 'pages'), { recursive: true });
    // Exclude migrated legacy content from parsing for now
    const migratedPath = join(tmpRoot, 'pages', 'migrated');
    if (existsSync(migratedPath)) {
      rmSync(migratedPath, { recursive: true, force: true });
    }

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


