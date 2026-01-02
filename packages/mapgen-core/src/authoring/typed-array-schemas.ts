import { Type, type TSchema, type TSchemaOptions } from "typebox";

type GridShape = Readonly<{ kind: "grid"; dims: readonly [string, string] }>;

export type TypedArraySchemaOptions = TSchemaOptions &
  Readonly<{
    description?: string;
    /**
     * Runtime shape coupling information used by op-entry validation wrappers.
     *
     * Defaults to a grid coupled to `width` × `height` on the op input.
     * Set to `null` to omit length coupling checks.
     */
    shape?: GridShape | null;
  }>;

function unsafe<T>(ctor: string, options?: TypedArraySchemaOptions): TSchema {
  // NOTE: TypeBox 1.0.x does not have first-class TypedArray schema builders.
  // We treat typed arrays as POJO-ish runtime values and use `Type.Unsafe<T>` purely for Static typing.
  const { shape, ...rest } = options ?? {};
  const runtimeShape: GridShape | undefined =
    shape === undefined ? { kind: "grid", dims: ["width", "height"] } : shape ?? undefined;

  return Type.Unsafe<T>(
    Type.Any({
      ...rest,
      "x-runtime": {
        kind: "typed-array",
        ctor,
        ...(runtimeShape ? { shape: runtimeShape } : null),
      },
    })
  );
}

export const TypedArraySchemas = Object.freeze({
  u8: (options?: TypedArraySchemaOptions): TSchema => unsafe<Uint8Array>("Uint8Array", options),
  i8: (options?: TypedArraySchemaOptions): TSchema => unsafe<Int8Array>("Int8Array", options),
  u16: (options?: TypedArraySchemaOptions): TSchema => unsafe<Uint16Array>("Uint16Array", options),
  i16: (options?: TypedArraySchemaOptions): TSchema => unsafe<Int16Array>("Int16Array", options),
  i32: (options?: TypedArraySchemaOptions): TSchema => unsafe<Int32Array>("Int32Array", options),
  f32: (options?: TypedArraySchemaOptions): TSchema => unsafe<Float32Array>("Float32Array", options),
});
