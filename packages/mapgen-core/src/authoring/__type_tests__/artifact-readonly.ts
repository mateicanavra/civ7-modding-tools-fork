import { Type } from "typebox";
import { defineArtifact, type ArtifactReadValueOf } from "../artifact/contract.js";

const artifact = defineArtifact({
  name: "artifactFoo",
  id: "artifact:test.foo",
  schema: Type.Object({
    nested: Type.Object({
      value: Type.Number(),
    }),
  }),
});

type ArtifactRead = ArtifactReadValueOf<typeof artifact>;

const value = null as unknown as ArtifactRead;

// @ts-expect-error read values are deep readonly
value.nested.value = 1;

export {};
