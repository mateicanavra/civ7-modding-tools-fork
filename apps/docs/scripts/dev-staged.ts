import { spawn } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { resolve } from 'node:path';

function runCommand(command: string, args: string[], options: { cwd?: string } = {}): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      shell: false,
      stdio: 'inherit',
      env: process.env,
    });

    const handleSignal = (signal: NodeJS.Signals) => {
      try { child.kill(signal); } catch {}
    };
    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);

    child.on('exit', (code) => {
      process.removeListener('SIGINT', handleSignal);
      process.removeListener('SIGTERM', handleSignal);
      if (typeof code === 'number' && code !== 0) {
        rejectPromise(new Error(`${command} exited with code ${code}`));
        return;
      }
      resolvePromise();
    });
    child.on('error', (err) => rejectPromise(err));
  });
}

async function main(): Promise<void> {
  const skipMigration = process.env.DOCS_SKIP_MIGRATION === '1' || process.env.DOCS_FAST_DEV === '1';
  const hasSite = existsSync(resolve(process.cwd(), 'site'));
  if (hasSite && !skipMigration) {
    await runCommand('bun', ['run', 'scripts/fix-links.ts']);
    await runCommand('bun', ['run', 'scripts/migrate-site-to-pages.ts']);
  } else if (skipMigration) {
    console.log('⏭️  Skipping site migration (DOCS_SKIP_MIGRATION/DOCS_FAST_DEV enabled).');
  }

  // Ensure navigation includes migrated entry if present
  await runCommand('bun', ['run', 'scripts/ensure-navigation.ts']);

  // Normalize code blocks once before starting dev server
  try {
    console.log('🧹 Normalizing code blocks (pre-dev)...');
    await runCommand('bun', ['run', 'scripts/update-code-blocks.ts']);
  } catch (e) {
    console.warn('⚠️  Code block normalization failed (continuing):', e);
  }

  // Watch docs for changes and re-run code block normalization
  try {
    const debounce = (fn: () => void, ms: number) => {
      let t: NodeJS.Timeout | null = null;
      return () => {
        if (t) clearTimeout(t);
        t = setTimeout(fn, ms);
      };
    };
    const reNormalize = debounce(() => {
      runCommand('bun', ['run', 'scripts/update-code-blocks.ts']).catch(() => {});
    }, 200);
    const watchDir = (dir: string) => {
      if (!existsSync(dir)) return;
      watch(dir, { recursive: true }, (event, filename) => {
        if (!filename) return;
        const lower = filename.toLowerCase();
        if (lower.endsWith('.md') || lower.endsWith('.mdx')) {
          reNormalize();
        }
      });
    };
    watchDir(resolve(process.cwd(), 'official'));
    watchDir(resolve(process.cwd(), 'community'));
    // Also watch the code-blocks config so toggling options (e.g., lines) re-normalizes immediately
    const configPath = resolve(process.cwd(), 'code-blocks.config.json');
    if (existsSync(configPath)) {
      watch(configPath, { persistent: true }, () => {
        reNormalize();
      });
    }
    console.log('👀 Watching docs for code block changes...');
  } catch (e) {
    console.warn('⚠️  Failed to start watcher (continuing):', e);
  }

  const mintBin = resolve(process.cwd(), 'node_modules/.bin/mint');
  const command = existsSync(mintBin) ? mintBin : 'mint';
  await runCommand(command, ['dev', '-p', '4000', '--no-open']);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});