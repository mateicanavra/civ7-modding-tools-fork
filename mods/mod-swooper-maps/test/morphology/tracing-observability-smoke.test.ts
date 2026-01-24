import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";
import type { TraceEvent } from "@swooper/mapgen-core";

import standardRecipe from "../../src/recipes/standard/recipe.js";
import { initializeStandardRuntime } from "../../src/recipes/standard/runtime.js";
import { swooperEarthlikeConfig } from "../../src/maps/presets/swooper-earthlike.config.js";

type KindEvent = { kind: string };

function isKindEvent(value: unknown): value is KindEvent {
  return Boolean(value) && typeof value === "object" && typeof (value as KindEvent).kind === "string";
}

describe("Morphology tracing (observability hardening smoke)", () => {
  it("emits required morphology.* kind events when steps are verbose", () => {
    const width = 20;
    const height = 12;
    const seed = 424242;

    const mapInfo = {
      GridWidth: width,
      GridHeight: height,
      MinLatitude: -60,
      MaxLatitude: 60,
      PlayersLandmass1: 4,
      PlayersLandmass2: 4,
      StartSectorRows: 4,
      StartSectorCols: 4,
    };

    const full = (stageId: string, stepId: string) => `mod-swooper-maps.standard.${stageId}.${stepId}`;
    const verboseSteps = [
      full("morphology-pre", "landmass-plates"),
      full("morphology-mid", "routing"),
      full("morphology-mid", "geomorphology"),
      full("morphology-mid", "rugged-coasts"),
      full("morphology-post", "islands"),
      full("morphology-post", "volcanoes"),
      full("map-morphology", "plot-mountains"),
    ];

    const env = {
      seed,
      dimensions: { width, height },
      latitudeBounds: {
        topLatitude: mapInfo.MaxLatitude,
        bottomLatitude: mapInfo.MinLatitude,
      },
      trace: {
        steps: Object.fromEntries(verboseSteps.map((id) => [id, "verbose"])),
      },
    };

    const adapter = createMockAdapter({
      width,
      height,
      mapInfo,
      mapSizeId: 1,
      rng: createLabelRng(seed),
    });
    const context = createExtendedMapContext({ width, height }, adapter, env);
    initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });

    const events: TraceEvent[] = [];
    standardRecipe.run(context, env, swooperEarthlikeConfig, {
      log: () => {},
      traceSink: { emit: (event) => events.push(event) },
    });

    const kinds = new Set(
      events
        .filter((event) => event.kind === "step.event")
        .map((event) => event.data)
        .filter(isKindEvent)
        .map((event) => event.kind)
    );

    const requiredKinds = [
      "morphology.landmassPlates.summary",
      "morphology.landmassPlates.ascii.landMask",
      "morphology.routing.summary",
      "morphology.geomorphology.summary",
      "morphology.coastlines.summary",
      "morphology.coastlines.ascii.coastMask",
      "morphology.islands.summary",
      "morphology.islands.ascii.edits",
      "morphology.mountains.summary",
      "morphology.mountains.ascii.reliefMask",
      "morphology.volcanoes.summary",
      "morphology.volcanoes.ascii.indices",
    ];

    for (const required of requiredKinds) {
      expect(kinds.has(required)).toBe(true);
    }
  });
});

