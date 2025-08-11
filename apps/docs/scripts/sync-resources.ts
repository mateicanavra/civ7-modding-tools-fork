import { promises as fs } from 'fs';
import path from 'path';
import { unzipResources } from '@civ7/plugin-files';

// When run from apps/docs (package cwd), resolve central outputs under repo root
const SOURCE_DIR = path.resolve(process.cwd(), '../../.civ7/outputs/resources');
const DEST_DIR = path.resolve(process.cwd(), 'site/civ7-official/resources');
const SOURCE_ZIP = path.resolve(process.cwd(), '../../.civ7/outputs/archives/civ7-official-resources.zip');
const DEST_ZIP = path.resolve(process.cwd(), 'site/civ7-official/civ7-official-resources.zip');

async function sync() {
  console.log('🔄 Syncing documentation resources...');

  try {
    // Ensure the destination directories exist
    await fs.mkdir(path.dirname(DEST_DIR), { recursive: true });
    await fs.mkdir(path.dirname(DEST_ZIP), { recursive: true });

    // 1. Prefer fast unzip directly from archive; fallback to copying pre-extracted resources
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

    // 2. Sync the zip archive
    console.log(`\nChecking for source archive at: ${SOURCE_ZIP}`);
    if (await fs.stat(SOURCE_ZIP).catch(() => null)) {
      console.log(`  > Found source archive. Copying to ${DEST_ZIP}`);
      await fs.copyFile(SOURCE_ZIP, DEST_ZIP);
      console.log('  ✅ Archive synced successfully.');
    } else {
      console.log('  > Source archive not found, skipping sync. Run `pnpm dev:cli -- zip default` at repo root.');
    }

    console.log('\n✅ Sync complete.');
  } catch (error) {
    console.error('❌ An error occurred during resource synchronization:');
    console.error(error);
    process.exit(1);
  }
}

sync();
