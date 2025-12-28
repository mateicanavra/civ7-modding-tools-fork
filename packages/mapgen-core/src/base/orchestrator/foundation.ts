<<<<<<<< HEAD:packages/mapgen-core/src/base/orchestrator/foundation.ts
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
import { runFoundationStage } from "@mapgen/base/pipeline/foundation/producer.js";
========
export { runFoundationWithDiagnostics } from "@mapgen/base/orchestrator/foundation.js";
export type { FoundationDiagnosticsOptions } from "@mapgen/base/orchestrator/foundation.js";
>>>>>>>> 1e5db401 (M5-U04: extract foundation pipeline into base mod):packages/mapgen-core/src/orchestrator/foundation.ts

