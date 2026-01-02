import { Type, type TSchema, type TSchemaOptions } from "typebox";

type AnyOptions = TSchemaOptions & Readonly<{ description?: string }>;

function unsafe<T>(options?: AnyOptions): TSchema {
  // NOTE: TypeBox 1.0.x does not have first-class TypedArray schema builders.
  // We treat typed arrays as POJO-ish runtime values and use `Type.Unsafe<T>` purely for Static typing.
  return Type.Unsafe<T>(Type.Any({ ...options }));
}

export const TypedArraySchemas = Object.freeze({
  u8: (options?: AnyOptions): TSchema => unsafe<Uint8Array>(options),
  i8: (options?: AnyOptions): TSchema => unsafe<Int8Array>(options),
  u16: (options?: AnyOptions): TSchema => unsafe<Uint16Array>(options),
  i16: (options?: AnyOptions): TSchema => unsafe<Int16Array>(options),
  i32: (options?: AnyOptions): TSchema => unsafe<Int32Array>(options),
  f32: (options?: AnyOptions): TSchema => unsafe<Float32Array>(options),
});

