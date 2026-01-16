import { createStep } from "@swooper/mapgen-core/authoring";
import { addIslandChains } from "@mapgen/domain/morphology/islands/index.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/index.js";
import {
  readOverlayCorridors,
  readOverlayMotifsHotspots,
  readOverlayMotifsMargins,
} from "../../../overlays.js";
import IslandsStepContract from "./islands.contract.js";

export default createStep(IslandsStepContract, {
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const overlays = deps.artifacts.overlays.read(context);
    const margins = readOverlayMotifsMargins(overlays);
    const hotspots = readOverlayMotifsHotspots(overlays);
    const corridors = readOverlayCorridors(overlays);
    const result = addIslandChains(width, height, context, config, {
      margins,
      hotspots,
      corridors,
    });

    const motifsOverlays = (overlays as { motifs?: Array<{ key?: string; summary?: unknown; active?: unknown }> })
      .motifs;
    let priorSummary: Record<string, unknown> = {};
    let priorActive: string[] | null = null;
    if (Array.isArray(motifsOverlays)) {
      for (let i = motifsOverlays.length - 1; i >= 0; i -= 1) {
        const overlay = motifsOverlays[i];
        if (overlay?.key !== STORY_OVERLAY_KEYS.HOTSPOTS) continue;
        const summary = overlay?.summary;
        if (summary && typeof summary === "object" && !Array.isArray(summary)) {
          priorSummary = summary as Record<string, unknown>;
        }
        const active = overlay?.active;
        if (Array.isArray(active)) {
          priorActive = active.filter((entry): entry is string => typeof entry === "string");
        }
        break;
      }
    }

    publishStoryOverlay(context, STORY_OVERLAY_KEYS.HOTSPOTS, {
      kind: STORY_OVERLAY_KEYS.HOTSPOTS,
      version: 1,
      width,
      height,
      active: priorActive ?? Array.from(result.motifs.points),
      summary: {
        ...priorSummary,
        paradise: Array.from(result.motifs.paradise),
        volcanic: Array.from(result.motifs.volcanic),
      },
    });
  },
});
