import { promises as fs } from 'fs';
import path from 'path';
import { unzipResources } from '@civ7/plugin-files';

// When run from apps/docs (package cwd), resolve central outputs under repo root
const SOURCE_DIR = path.resolve(process.cwd(), '../../.civ7/outputs/resources');
const DEST_DIR = path.resolve(process.cwd(), 'public/civ7-official/resources');
const SOURCE_ZIP = path.resolve(process.cwd(), '../../.civ7/outputs/archives/civ7-official-resources.zip');

async function sync() {
  // Temporarily disabled by default. Opt-in by setting DOCS_ENABLE_RESOURCES=1.
  if (process.env.DOCS_ENABLE_RESOURCES !== '1') {
    console.log('⏭️  Skipping resources sync (disabled by default). Set DOCS_ENABLE_RESOURCES=1 to enable.');
    return;
  }
  console.log('🔄 Resources sync enabled (DOCS_ENABLE_RESOURCES=1)');

  try {
    // Ensure the destination directories exist
    await fs.mkdir(path.dirname(DEST_DIR), { recursive: true });

    // Prefer fast unzip directly from archive; fallback to copying pre-extracted resources
    if (await fs.stat(SOURCE_ZIP).catch(() => null)) {
      console.log(`  > Using archive. Extracting to ${DEST_DIR}`);
      await unzipResources({ zip: SOURCE_ZIP, dest: DEST_DIR });
      console.log('  ✅ Resources extracted successfully.');
    } else if (await fs.stat(SOURCE_DIR).catch(() => null)) {
      console.log(`  > Archive not found. Copying pre-extracted resources from ${SOURCE_DIR}`);
      await fs.rm(DEST_DIR, { recursive: true, force: true });
      await fs.cp(SOURCE_DIR, DEST_DIR, { recursive: true });
      console.log('  ✅ Resources synced successfully (fallback).');
    } else {
      console.log('  > Neither archive nor pre-extracted resources found. Run `pnpm refresh:data` at repo root.');
    }

    console.log('\n✅ Resources sync complete.');
  } catch (error) {
    console.error('❌ An error occurred during resource synchronization:');
    console.error(error);
    process.exit(1);
  }
}

sync();
