import type { Static, TSchema } from "typebox";

import { applySchemaConventions } from "../schema.js";

const ARTIFACT_NAME_RE = /^[a-z][a-zA-Z0-9]*$/;
const RESERVED_ARTIFACT_NAMES = new Set(["__proto__", "prototype", "constructor"]);
const ARTIFACT_ID_PREFIX = "artifact:";
const ARTIFACT_ID_SUFFIX_RE = /@v\d+/;

export type ArtifactContract<
  Name extends string = string,
  Id extends string = string,
  Schema extends TSchema = TSchema,
> = Readonly<{
  name: Name;
  id: Id;
  schema: Schema;
}>;

export type ArtifactValueOf<C extends ArtifactContract<any, any, any>> = Static<C["schema"]>;

export type DeepReadonly<T> =
  T extends (...args: any[]) => any
    ? T
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepReadonly<U>>
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

export type ArtifactReadValueOf<C extends ArtifactContract<any, any, any>> = DeepReadonly<
  ArtifactValueOf<C>
>;

function assertValidArtifactName(name: string): void {
  if (!ARTIFACT_NAME_RE.test(name)) {
    throw new Error(
      `artifact name "${name}" must be camelCase (e.g. "featureIntents") and contain only letters/numbers`
    );
  }
  if (RESERVED_ARTIFACT_NAMES.has(name)) {
    throw new Error(`artifact name "${name}" is reserved and cannot be used`);
  }
}

function assertValidArtifactId(id: string): void {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("artifact id must be a non-empty string");
  }
  if (!id.startsWith(ARTIFACT_ID_PREFIX)) {
    throw new Error(`artifact id "${id}" must start with "${ARTIFACT_ID_PREFIX}"`);
  }
  if (id.length === ARTIFACT_ID_PREFIX.length) {
    throw new Error(`artifact id "${id}" must include a name after "${ARTIFACT_ID_PREFIX}"`);
  }
  if (ARTIFACT_ID_SUFFIX_RE.test(id)) {
    throw new Error(`artifact id "${id}" must not include fake @vN suffixes`);
  }
}

export function defineArtifact<
  const Name extends string,
  const Id extends string,
  const Schema extends TSchema,
>(def: {
  name: Name;
  id: Id;
  schema: Schema;
}): ArtifactContract<Name, Id, Schema> {
  assertValidArtifactName(def.name);
  assertValidArtifactId(def.id);
  applySchemaConventions(def.schema, `artifact:${def.id}`);
  return Object.freeze({ ...def });
}
