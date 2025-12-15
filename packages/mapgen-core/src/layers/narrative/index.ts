import type { ExtendedMapContext } from "../../core/types.js";
import { DEV, devWarn } from "../../dev/index.js";
import { publishClimateFieldArtifact } from "../../pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type StepRegistry } from "../../pipeline/index.js";
import { resetStoryOverlays } from "../../story/overlays.js";
import { resetCorridorStyleCache, storyTagStrategicCorridors } from "../../story/corridors.js";
import { getOrogenyCache, resetOrogenyCache, storyTagOrogenyBelts } from "../../story/orogeny.js";
import { storyTagClimatePaleo, storyTagClimateSwatches } from "../../story/swatches.js";
import { storyTagContinentalMargins, storyTagHotspotTrails, storyTagRiftValleys } from "../../story/tagging.js";
import { resetStoryTags } from "../../story/tags.js";

export interface NarrativeLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
  logPrefix: string;
}

export function registerNarrativeLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: NarrativeLayerRuntime
): void {
  const stageFlags = runtime.stageFlags;

  registry.register({
    id: "storySeed",
    phase: M3_STANDARD_STAGE_PHASE.storySeed,
    ...runtime.getStageDescriptor("storySeed"),
    shouldRun: () => stageFlags.storySeed,
    run: (context) => {
      resetStoryTags();
      resetStoryOverlays();
      resetOrogenyCache();
      resetCorridorStyleCache();
      console.log(`${runtime.logPrefix} Imprinting continental margins (active/passive)...`);
      const margins = storyTagContinentalMargins(context);

      if (DEV.ENABLED) {
        const activeCount = margins.active?.length ?? 0;
        const passiveCount = margins.passive?.length ?? 0;
        if (activeCount + passiveCount === 0) {
          devWarn("[smoke] storySeed enabled but margins overlay is empty");
        }
      }
    },
  });

  registry.register({
    id: "storyHotspots",
    phase: M3_STANDARD_STAGE_PHASE.storyHotspots,
    ...runtime.getStageDescriptor("storyHotspots"),
    shouldRun: () => stageFlags.storyHotspots,
    run: (context) => {
      console.log(`${runtime.logPrefix} Imprinting hotspot trails...`);
      const summary = storyTagHotspotTrails(context);
      if (DEV.ENABLED && summary.points === 0) {
        devWarn("[smoke] storyHotspots enabled but no hotspot points were emitted");
      }
    },
  });

  registry.register({
    id: "storyRifts",
    phase: M3_STANDARD_STAGE_PHASE.storyRifts,
    ...runtime.getStageDescriptor("storyRifts"),
    shouldRun: () => stageFlags.storyRifts,
    run: (context) => {
      console.log(`${runtime.logPrefix} Imprinting rift valleys...`);
      const summary = storyTagRiftValleys(context);
      if (DEV.ENABLED && summary.lineTiles === 0) {
        devWarn("[smoke] storyRifts enabled but no rift tiles were emitted");
      }
    },
  });

  registry.register({
    id: "storyOrogeny",
    phase: M3_STANDARD_STAGE_PHASE.storyOrogeny,
    ...runtime.getStageDescriptor("storyOrogeny"),
    shouldRun: () => stageFlags.storyOrogeny,
    run: (context) => {
      storyTagOrogenyBelts(context);
    },
  });

  registry.register({
    id: "storyCorridorsPre",
    phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPre,
    ...runtime.getStageDescriptor("storyCorridorsPre"),
    shouldRun: () => stageFlags.storyCorridorsPre,
    run: (context) => {
      storyTagStrategicCorridors(context, "preIslands");
    },
  });

  registry.register({
    id: "storySwatches",
    phase: M3_STANDARD_STAGE_PHASE.storySwatches,
    ...runtime.getStageDescriptor("storySwatches"),
    shouldRun: () => stageFlags.storySwatches,
    run: (context) => {
      storyTagClimateSwatches(context, { orogenyCache: getOrogenyCache() });
      if (context?.config?.toggles?.STORY_ENABLE_PALEO) {
        storyTagClimatePaleo(context);
      }
      publishClimateFieldArtifact(context);
    },
  });

  registry.register({
    id: "storyCorridorsPost",
    phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPost,
    ...runtime.getStageDescriptor("storyCorridorsPost"),
    shouldRun: () => stageFlags.storyCorridorsPost,
    run: (context) => {
      storyTagStrategicCorridors(context, "postRivers");
    },
  });
}

