import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const docsJsonPath = join(process.cwd(), 'docs.json');
  const indexMdxPath = join(process.cwd(), 'pages', 'index.mdx');
  const llmsTxtPath = join(process.cwd(), 'public', 'llms.txt');

  if (!existsSync(docsJsonPath)) fail('docs.json missing');
  if (!existsSync(indexMdxPath)) fail('pages/index.mdx missing');
  if (!existsSync(llmsTxtPath)) fail('public/llms.txt missing');

  const json = JSON.parse(readFileSync(docsJsonPath, 'utf8'));
  if (!json.name) fail('docs.json: missing name');
  if (!Array.isArray(json.navigation)) fail('docs.json: navigation must be an array');
  console.log('Docs validation OK');
}

main();


