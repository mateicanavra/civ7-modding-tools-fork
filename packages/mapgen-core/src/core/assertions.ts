import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { validateFoundationContext } from "@mapgen/core/types.js";

/**
 * Asserts that foundation context is available.
 * Throws an error if foundation is missing - this surfaces manifest/wiring issues
 * rather than silently degrading to fallback behavior.
 */
export function assertFoundationContext(
  ctx: ExtendedMapContext | null,
  stageName: string
): asserts ctx is ExtendedMapContext & {
  foundation: NonNullable<ExtendedMapContext["foundation"]>;
} {
  if (!ctx) {
    throw new Error(`Stage "${stageName}" requires ExtendedMapContext but ctx is null`);
  }
  if (!ctx.foundation) {
    throw new Error(
      `Stage "${stageName}" requires FoundationContext but ctx.foundation is null. ` +
        `Ensure the "foundation" stage is enabled and runs before "${stageName}".`
    );
  }

  validateFoundationContext(ctx.foundation, ctx.dimensions);
}
