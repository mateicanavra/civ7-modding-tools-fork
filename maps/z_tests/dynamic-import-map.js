/**
 * Dynamic Import Test Map
 *
 * Purpose:
 * - Minimal harness to empirically test whether the Civ VII scripting VM
 *   supports dynamic import() within a map entry file context.
 *
 * How to use:
 * 1) Add this file to config/config.xml as a map entry:
 *    <Row File="{epic-diverse-huge-map}maps/z_tests/dynamic-import-map.js"
 *         Name="LOC_MAP_DYNAMIC_IMPORT_TEST_NAME"
 *         Description="LOC_MAP_DYNAMIC_IMPORT_TEST_DESC"
 *         SortIndex="999"/>
 * 2) Launch the game and select this map.
 * 3) Inspect Scripting.log for lines beginning with [DYN-IMPORT-TEST].
 *
 * Expected observations:
 * - If dynamic import is supported, you should see the “SUCCESS” log
 *   and then subsequent logs from the imported module.
 * - If dynamic import is NOT supported, you should see a caught error
 *   with “Not supported” or similar phrasing from the VM.
 *
 * Notes:
 * - This file deliberately avoids any other project imports so the test
 *   isolates dynamic import behavior in the VM.
 */

console.log(
    "[DYN-IMPORT-TEST] Map file loaded; starting dynamic import probe...",
);

// Provide minimal shims the engine expects in a map script so this file is a valid entry.
function requestMapData(initParams) {
    console.log(
        "[DYN-IMPORT-TEST] requestMapData called:",
        safeStr(initParams),
    );
    try {
        if (typeof engine?.call === "function") {
            engine.call("SetMapInitData", initParams);
            console.log("[DYN-IMPORT-TEST] SetMapInitData invoked");
        } else {
            console.log(
                "[DYN-IMPORT-TEST] engine.call not available (ok for test)",
            );
        }
    } catch (e) {
        console.log(
            "[DYN-IMPORT-TEST] requestMapData engine.call error:",
            safeStr(e),
        );
    }
}

function generateMap() {
    console.log(
        "[DYN-IMPORT-TEST] generateMap starting; attempting dynamic import()",
    );

    // Attempt a dynamic import using a promise chain so this function need not be async
    import("./dynamic-import-module.js")
        .then((mod) => {
            try {
                console.log(
                    "[DYN-IMPORT-TEST] SUCCESS: dynamic import() resolved:",
                    Object.keys(mod),
                );
                if (typeof mod?.sayHello === "function") {
                    mod.sayHello();
                }
            } catch (e) {
                console.log(
                    "[DYN-IMPORT-TEST] Post-import handler error:",
                    safeStr(e),
                );
            }
        })
        .catch((err) => {
            console.log(
                "[DYN-IMPORT-TEST] ERROR: dynamic import() failed:",
                safeStr(err),
            );
        })
        .finally(() => {
            // Minimal, safe termination to satisfy engine expectations
            try {
                if (
                    typeof TerrainBuilder?.validateAndFixTerrain === "function"
                ) {
                    TerrainBuilder.validateAndFixTerrain();
                    console.log(
                        "[DYN-IMPORT-TEST] TerrainBuilder.validateAndFixTerrain called (no-op ok)",
                    );
                }
            } catch (e) {
                console.log(
                    "[DYN-IMPORT-TEST] TerrainBuilder error (benign for test):",
                    safeStr(e),
                );
            }
            console.log("[DYN-IMPORT-TEST] generateMap complete");
        });
}

// Utility: safe stringify for logs
function safeStr(v) {
    try {
        return typeof v === "string" ? v : JSON.stringify(v);
    } catch {
        return String(v);
    }
}

// Provide a tiny companion module (same directory) that dynamic import will load.
// The engine will fetch this during the import() call above.
/* Module: dynamic-import-module.js
export function sayHello() {
  try {
    console.log("[DYN-IMPORT-TEST][MODULE] Hello from dynamically imported module!");
  } catch {}
}
*/
