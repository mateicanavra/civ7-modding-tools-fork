import {Hook} from '@oclif/core';
import readline from 'node:readline/promises';
import process from 'node:process';

const targetCommands = new Set([
  'mod:git:setup',
  'git:subtree:setup',
  'mod:git:import',
  'git:subtree:import',
  'mod:git:update',
  'git:subtree:update',
]);

const hook: Hook.Prerun = async function (opts) {
  const id = opts.Command.id;
  if (!targetCommands.has(id)) return;
  const argv = opts.argv;
  const hasRepoUrl = argv.some(
    (a, i) =>
      a === '--repoUrl' ||
      a === '-u' ||
      a.startsWith('--repoUrl=') ||
      a.startsWith('-u=') ||
      argv[i - 1] === '--repoUrl' ||
      argv[i - 1] === '-u'
  );
  if (hasRepoUrl || !process.stdin.isTTY) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Enter repository URL: ');
  rl.close();
  if (answer) {
    argv.push('--repoUrl', answer);
  }
};

export default hook;
