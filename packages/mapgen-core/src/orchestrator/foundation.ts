import type { FoundationConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext, FoundationContext } from "@mapgen/core/types.js";
import {
  DEV,
  devWarn,
  logBoundaryMetrics,
  logFoundationAscii,
  logFoundationHistograms,
  logFoundationSummary,
  type FoundationPlates,
} from "@mapgen/dev/index.js";
import { runFoundationStage } from "@mapgen/pipeline/foundation/producer.js";

export interface FoundationDiagnosticsOptions {
  logPrefix?: string;
}

export function runFoundationWithDiagnostics(
  ctx: ExtendedMapContext,
  config: FoundationConfig,
  options: FoundationDiagnosticsOptions = {}
): FoundationContext {
  const prefix = options.logPrefix || "[SWOOPER_MOD]";
  console.log(`${prefix} Initializing foundation...`);
  const foundationContext = runFoundationStage(ctx, config);

  console.log(`${prefix} Foundation context initialized`);

  if (DEV.ENABLED && ctx.adapter) {
    const plates: FoundationPlates = {
      plateId: foundationContext.plates.id,
      boundaryType: foundationContext.plates.boundaryType,
      boundaryCloseness: foundationContext.plates.boundaryCloseness,
      upliftPotential: foundationContext.plates.upliftPotential,
      riftPotential: foundationContext.plates.riftPotential,
    };
    logFoundationSummary(ctx.adapter, ctx.dimensions.width, ctx.dimensions.height, plates);
    logFoundationAscii(ctx.adapter, ctx.dimensions.width, ctx.dimensions.height, plates);
    logFoundationHistograms(ctx.dimensions.width, ctx.dimensions.height, plates);
    logBoundaryMetrics(ctx.adapter, ctx.dimensions.width, ctx.dimensions.height, plates);

    const plateId = foundationContext.plates.id;
    if (!plateId || plateId.length === 0) {
      devWarn("[smoke] foundation enabled but produced empty plate data");
    } else {
      const uniquePlates = new Set<number>();
      for (let i = 0; i < plateId.length; i++) {
        uniquePlates.add(plateId[i]);
      }
      if (uniquePlates.size === 0) {
        devWarn("[smoke] foundation enabled but produced zero plates");
      }
    }
  }

  return foundationContext;
}
