import type { RunSettings } from "@mapgen/engine/execution-plan.js";

export type OpDefinitionResolveConfigHook<ConfigSchema> = Readonly<{
  /**
   * Optional compile-time config normalization hook (called by step resolvers).
   * This is never invoked at runtime.
   */
  resolveConfig?: (config: ConfigSchema, settings: RunSettings) => ConfigSchema;
}>;
