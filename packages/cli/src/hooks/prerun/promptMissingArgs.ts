import {Hook} from '@oclif/core';
import readline from 'node:readline/promises';
import process from 'node:process';

const repoUrlCommands = new Set([
  'mod:git:setup',
  'git:subtree:setup',
  'mod:git:import',
  'git:subtree:import',
  'mod:git:update',
  'git:subtree:update',
]);

const slugCommands = new Set([
  'mod:git:setup',
  'git:subtree:setup',
  'mod:git:import',
  'git:subtree:import',
  'mod:git:pull',
  'git:subtree:pull',
  'mod:git:push',
  'git:subtree:push',
  'mod:git:status',
  'git:subtree:status',
  'mod:git:update',
  'git:subtree:update',
  'mod:git:remove',
  'git:subtree:remove',
]);

const hook: Hook.Prerun = async function (opts) {
  const id = opts.Command.id;
  const argv = opts.argv;

  const needsSlug = slugCommands.has(id) && !argv.some(a => !a.startsWith('-'));

  const needsRepoUrl = repoUrlCommands.has(id) &&
    !argv.some(
      (a, i) =>
        a === '--repoUrl' ||
        a === '-u' ||
        a.startsWith('--repoUrl=') ||
        a.startsWith('-u=') ||
        argv[i - 1] === '--repoUrl' ||
        argv[i - 1] === '-u'
    );

  if ((!needsSlug && !needsRepoUrl) || !process.stdin.isTTY) return;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  if (needsSlug) {
    const slug = await rl.question('Enter slug: ');
    if (slug) argv.unshift(slug);
  }

  if (needsRepoUrl) {
    const url = await rl.question('Enter repository URL: ');
    if (url) argv.push('--repoUrl', url);
  }

  rl.close();
};

export default hook;
