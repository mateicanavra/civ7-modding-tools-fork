import type { TSchema } from "typebox";

/**
 * Canonical operation schema shape: a single TypeBox object that bundles `input`, `config`, and
 * `output` schemas.
 *
 * This exists to eliminate boilerplate at op definition sites: callers can pass the full schema to
 * `createOp({ schema, ... })` and let types infer from `schema.properties.*` internally.
 */
export type DomainOpSchema<
  InputSchema extends TSchema,
  ConfigSchema extends TSchema,
  OutputSchema extends TSchema,
> = Readonly<{
  properties: Readonly<{
    input: InputSchema;
    config: ConfigSchema;
    output: OutputSchema;
  }>;
}>;

export type AnyDomainOpSchema = DomainOpSchema<TSchema, TSchema, TSchema>;
export type SchemaInput<TSchema3 extends AnyDomainOpSchema> = TSchema3["properties"]["input"];
export type SchemaConfig<TSchema3 extends AnyDomainOpSchema> = TSchema3["properties"]["config"];
export type SchemaOutput<TSchema3 extends AnyDomainOpSchema> = TSchema3["properties"]["output"];
