import type { MapDimensions } from "@civ7/adapter";

import type { FoundationPlateFields } from "@mapgen/core/types.js";
import { validateFoundationPlatesArtifact } from "@mapgen/core/types.js";

export function assertFoundationPlates(
  value: unknown,
  dimensions: MapDimensions
): FoundationPlateFields {
  validateFoundationPlatesArtifact(value, dimensions);
  return value as FoundationPlateFields;
}
