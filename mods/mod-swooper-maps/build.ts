import path from "node:path";
import { buildMapMod } from "@civ7/plugin-mapgen";

export async function build(
  srcDir = path.resolve("./dist"),
  outDir = path.resolve("./mod")
): Promise<void> {
  await buildMapMod(srcDir, outDir);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
