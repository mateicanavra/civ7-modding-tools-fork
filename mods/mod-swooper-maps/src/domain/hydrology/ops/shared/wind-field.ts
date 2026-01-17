import { Type, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

/**
 * Combined wind + surface current field used by Hydrology steps.
 *
 * Notes:
 * - Winds and currents are distinct signals: currents are ocean-only coupling; winds are atmosphere-wide forcing.
 * - Values are discrete `i8` components for compactness; consumers should treat them as direction/intensity proxies.
 */
export const HydrologyWindFieldSchema = Type.Object(
  {
    /** Wind U component per tile (-127..127). */
    windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
    /** Wind V component per tile (-127..127). */
    windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
    /** Current U component per tile (-127..127). */
    currentU: TypedArraySchemas.i8({ description: "Current U component per tile (-127..127)." }),
    /** Current V component per tile (-127..127). */
    currentV: TypedArraySchemas.i8({ description: "Current V component per tile (-127..127)." }),
  },
  {
    additionalProperties: false,
    description: "Hydrology wind and surface current field (U/V components).",
  }
);

export type HydrologyWindFields = Static<typeof HydrologyWindFieldSchema>;
