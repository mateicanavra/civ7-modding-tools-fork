export type SupportedTypedArray =
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Int32Array
  | Float32Array;

export type TypedArrayConstructor<T extends SupportedTypedArray> = Readonly<{
  // Typed array constructors support multiple overloads; we only need `new (length)` for typing.
  new (length: number): T;
  readonly BYTES_PER_ELEMENT: number;
}>;

export function expectedGridSize(width: number, height: number): number {
  const w = width | 0;
  const h = height | 0;
  if (!Number.isFinite(width) || !Number.isFinite(height) || w <= 0 || h <= 0) {
    throw new Error(`expectedGridSize() requires positive finite width/height (got ${width}x${height})`);
  }
  return w * h;
}

export function isTypedArrayOf<T extends SupportedTypedArray>(
  value: unknown,
  ctor: TypedArrayConstructor<T>,
  expectedLength?: number
): value is T {
  const ctorAny = ctor as unknown as { new (...args: unknown[]): T };
  if (!(value instanceof ctorAny)) return false;
  if (expectedLength == null) return true;
  return (value as T).length === expectedLength;
}

export function assertTypedArrayOf<T extends SupportedTypedArray>(
  name: string,
  value: unknown,
  ctor: TypedArrayConstructor<T>,
  expectedLength?: number
): T {
  if (!isTypedArrayOf(value, ctor, expectedLength)) {
    const expectedLen = expectedLength == null ? "" : ` (len=${expectedLength})`;
    throw new Error(`[typed-arrays] Invalid "${name}" (expected ${ctorAnyName(ctor)}${expectedLen})`);
  }
  return value;
}

function ctorAnyName(ctor: TypedArrayConstructor<SupportedTypedArray>): string {
  return ((ctor as unknown as { name?: string }).name as string | undefined) ?? "TypedArray";
}

export function isUint8Array(value: unknown, expectedLength?: number): value is Uint8Array {
  return isTypedArrayOf(value, Uint8Array, expectedLength);
}
export function assertUint8Array(name: string, value: unknown, expectedLength?: number): Uint8Array {
  return assertTypedArrayOf(name, value, Uint8Array, expectedLength);
}

export function isInt8Array(value: unknown, expectedLength?: number): value is Int8Array {
  return isTypedArrayOf(value, Int8Array, expectedLength);
}
export function assertInt8Array(name: string, value: unknown, expectedLength?: number): Int8Array {
  return assertTypedArrayOf(name, value, Int8Array, expectedLength);
}

export function isUint16Array(value: unknown, expectedLength?: number): value is Uint16Array {
  return isTypedArrayOf(value, Uint16Array, expectedLength);
}
export function assertUint16Array(name: string, value: unknown, expectedLength?: number): Uint16Array {
  return assertTypedArrayOf(name, value, Uint16Array, expectedLength);
}

export function isInt16Array(value: unknown, expectedLength?: number): value is Int16Array {
  return isTypedArrayOf(value, Int16Array, expectedLength);
}
export function assertInt16Array(name: string, value: unknown, expectedLength?: number): Int16Array {
  return assertTypedArrayOf(name, value, Int16Array, expectedLength);
}

export function isInt32Array(value: unknown, expectedLength?: number): value is Int32Array {
  return isTypedArrayOf(value, Int32Array, expectedLength);
}
export function assertInt32Array(name: string, value: unknown, expectedLength?: number): Int32Array {
  return assertTypedArrayOf(name, value, Int32Array, expectedLength);
}

export function isFloat32Array(value: unknown, expectedLength?: number): value is Float32Array {
  return isTypedArrayOf(value, Float32Array, expectedLength);
}
export function assertFloat32Array(name: string, value: unknown, expectedLength?: number): Float32Array {
  return assertTypedArrayOf(name, value, Float32Array, expectedLength);
}
