import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
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
  const hasSite = existsSync(resolve(process.cwd(), 'site'));
  if (hasSite) {
    await runCommand('bun', ['run', 'scripts/fix-links.ts']);
    await runCommand('bun', ['run', 'scripts/migrate-site-to-pages.ts']);
  }

  // Ensure navigation includes migrated entry if present
  await runCommand('bun', ['run', 'scripts/ensure-navigation.ts']);

  const mintBin = resolve(process.cwd(), 'node_modules/.bin/mint');
  const command = existsSync(mintBin) ? mintBin : 'mint';
  await runCommand(command, ['dev', '-p', '4000', '--no-open']);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});