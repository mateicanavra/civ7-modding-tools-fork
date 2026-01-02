import { Type } from "typebox";

/**
 * Metadata key marking schema nodes as engine-internal (not part of the public
 * mod-facing API). Used by schema filtering tooling to remove internal fields.
 */
export const INTERNAL_METADATA_KEY = "xInternal" as const;

/**
 * Open-ended record used for layers that still consume untyped knobs.
 * These survive while we gradually migrate layer-specific structures into
 * strongly typed schemas.
 */
export const UnknownRecord = Type.Record(Type.String(), Type.Unknown(), {
  default: {},
  description:
    "String-keyed bag for layer-specific knobs that have not yet been formalized in the schema.",
});
