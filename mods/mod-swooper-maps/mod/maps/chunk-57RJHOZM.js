var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// ../../packages/mapgen-core/dist/chunk-IRMAJG7Q.js
if (typeof globalThis.TextEncoder === "undefined") {
  class TextEncoderPolyfill {
    encoding = "utf-8";
    encode(input = "") {
      const bytes = [];
      for (let i = 0; i < input.length; i++) {
        let codePoint = input.codePointAt(i);
        if (codePoint === void 0) continue;
        if (codePoint > 65535) {
          i++;
        }
        if (codePoint <= 127) {
          bytes.push(codePoint);
        } else if (codePoint <= 2047) {
          bytes.push(192 | codePoint >> 6, 128 | codePoint & 63);
        } else if (codePoint <= 65535) {
          bytes.push(
            224 | codePoint >> 12,
            128 | codePoint >> 6 & 63,
            128 | codePoint & 63
          );
        } else {
          bytes.push(
            240 | codePoint >> 18,
            128 | codePoint >> 12 & 63,
            128 | codePoint >> 6 & 63,
            128 | codePoint & 63
          );
        }
      }
      return new Uint8Array(bytes);
    }
    encodeInto(source, destination) {
      const encoded = this.encode(source);
      const writeLength = Math.min(encoded.length, destination.length);
      for (let i = 0; i < writeLength; i++) {
        destination[i] = encoded[i];
      }
      return { read: source.length, written: writeLength };
    }
  }
  globalThis.TextEncoder = TextEncoderPolyfill;
}

// ../../packages/mapgen-core/dist/chunk-R5U7XKVJ.js
var __defProp = Object.defineProperty;
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof __require !== "undefined" ? __require : a)[b]
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../packages/mapgen-core/dist/chunk-D3KHFIYJ.js
var memory_exports = {};
__export(memory_exports, {
  Assign: () => Assign,
  Clone: () => Clone,
  Create: () => Create,
  Discard: () => Discard,
  Metrics: () => Metrics,
  Update: () => Update
});
var Metrics = {
  assign: 0,
  create: 0,
  clone: 0,
  discard: 0,
  update: 0
};
function Assign(left, right) {
  Metrics.assign += 1;
  return { ...left, ...right };
}
var guard_exports = {};
__export(guard_exports, {
  Entries: () => Entries,
  EntriesRegExp: () => EntriesRegExp,
  Every: () => Every,
  EveryAll: () => EveryAll,
  HasPropertyKey: () => HasPropertyKey,
  IsArray: () => IsArray,
  IsAsyncIterator: () => IsAsyncIterator,
  IsBigInt: () => IsBigInt,
  IsBoolean: () => IsBoolean,
  IsClassInstance: () => IsClassInstance,
  IsConstructor: () => IsConstructor,
  IsDeepEqual: () => IsDeepEqual,
  IsEqual: () => IsEqual,
  IsFunction: () => IsFunction,
  IsGreaterEqualThan: () => IsGreaterEqualThan,
  IsGreaterThan: () => IsGreaterThan,
  IsInteger: () => IsInteger,
  IsIterator: () => IsIterator,
  IsLessEqualThan: () => IsLessEqualThan,
  IsLessThan: () => IsLessThan,
  IsMultipleOf: () => IsMultipleOf,
  IsNull: () => IsNull,
  IsNumber: () => IsNumber,
  IsObject: () => IsObject,
  IsObjectNotArray: () => IsObjectNotArray,
  IsString: () => IsString,
  IsSymbol: () => IsSymbol,
  IsUndefined: () => IsUndefined,
  IsValueLike: () => IsValueLike,
  Keys: () => Keys,
  StringGraphemeCount: () => StringGraphemeCount,
  Symbols: () => Symbols,
  Values: () => Values
});
function IsArray(value) {
  return Array.isArray(value);
}
function IsAsyncIterator(value) {
  return IsObject(value) && Symbol.asyncIterator in value;
}
function IsBigInt(value) {
  return IsEqual(typeof value, "bigint");
}
function IsBoolean(value) {
  return IsEqual(typeof value, "boolean");
}
function IsConstructor(value) {
  if (IsUndefined(value) || !IsFunction(value))
    return false;
  const result = Function.prototype.toString.call(value);
  if (/^class\s/.test(result))
    return true;
  if (/\[native code\]/.test(result))
    return true;
  return false;
}
function IsFunction(value) {
  return IsEqual(typeof value, "function");
}
function IsInteger(value) {
  return Number.isInteger(value);
}
function IsIterator(value) {
  return IsObject(value) && Symbol.iterator in value;
}
function IsNull(value) {
  return IsEqual(value, null);
}
function IsNumber(value) {
  return Number.isFinite(value);
}
function IsObjectNotArray(value) {
  return IsObject(value) && !IsArray(value);
}
function IsObject(value) {
  return IsEqual(typeof value, "object") && !IsNull(value);
}
function IsString(value) {
  return IsEqual(typeof value, "string");
}
function IsSymbol(value) {
  return IsEqual(typeof value, "symbol");
}
function IsUndefined(value) {
  return IsEqual(value, void 0);
}
function IsEqual(left, right) {
  return left === right;
}
function IsGreaterThan(left, right) {
  return left > right;
}
function IsLessThan(left, right) {
  return left < right;
}
function IsLessEqualThan(left, right) {
  return left <= right;
}
function IsGreaterEqualThan(left, right) {
  return left >= right;
}
function IsMultipleOf(dividend, divisor) {
  if (IsBigInt(dividend) || IsBigInt(divisor)) {
    return BigInt(dividend) % BigInt(divisor) === 0n;
  }
  const tolerance = 1e-10;
  if (!IsNumber(dividend))
    return true;
  if (IsInteger(dividend) && 1 / divisor % 1 === 0)
    return true;
  const mod = dividend % divisor;
  return Math.min(Math.abs(mod), Math.abs(mod - divisor)) < tolerance;
}
function IsClassInstance(value) {
  if (!IsObject(value))
    return false;
  const proto = globalThis.Object.getPrototypeOf(value);
  if (IsNull(proto))
    return false;
  return IsEqual(typeof proto.constructor, "function") && !(IsEqual(proto.constructor, globalThis.Object) || IsEqual(proto.constructor.name, "Object"));
}
function IsValueLike(value) {
  return IsBigInt(value) || IsBoolean(value) || IsNull(value) || IsNumber(value) || IsString(value) || IsUndefined(value);
}
function StringGraphemeCount(value) {
  return Array.from(value).length;
}
function Every(value, offset, callback) {
  for (let index = offset; index < value.length; index++) {
    if (!callback(value[index], index))
      return false;
  }
  return true;
}
function EveryAll(value, offset, callback) {
  let result = true;
  for (let index = offset; index < value.length; index++) {
    if (!callback(value[index], index))
      result = false;
  }
  return result;
}
function HasPropertyKey(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function EntriesRegExp(value) {
  return Keys(value).map((key) => [new RegExp(`^${key}$`), value[key]]);
}
function Entries(value) {
  return Object.entries(value);
}
function Keys(value) {
  return Object.getOwnPropertyNames(value);
}
function Symbols(value) {
  return Object.getOwnPropertySymbols(value);
}
function Values(value) {
  return Object.values(value);
}
function DeepEqualObject(left, right) {
  if (!IsObject(right))
    return false;
  const keys = Keys(left);
  return IsEqual(keys.length, Keys(right).length) && keys.every((key) => IsDeepEqual(left[key], right[key]));
}
function DeepEqualArray(left, right) {
  return IsArray(right) && IsEqual(left.length, right.length) && left.every((_, index) => IsDeepEqual(left[index], right[index]));
}
function IsDeepEqual(left, right) {
  return IsArray(left) ? DeepEqualArray(left, right) : IsObject(left) ? DeepEqualObject(left, right) : IsEqual(left, right);
}
var globals_exports = {};
__export(globals_exports, {
  IsBigInt64Array: () => IsBigInt64Array,
  IsBigUint64Array: () => IsBigUint64Array,
  IsBoolean: () => IsBoolean2,
  IsDate: () => IsDate,
  IsFloat32Array: () => IsFloat32Array,
  IsFloat64Array: () => IsFloat64Array,
  IsInt16Array: () => IsInt16Array,
  IsInt32Array: () => IsInt32Array,
  IsInt8Array: () => IsInt8Array,
  IsMap: () => IsMap,
  IsNumber: () => IsNumber2,
  IsRegExp: () => IsRegExp,
  IsSet: () => IsSet,
  IsString: () => IsString2,
  IsTypeArray: () => IsTypeArray,
  IsUint16Array: () => IsUint16Array,
  IsUint32Array: () => IsUint32Array,
  IsUint8Array: () => IsUint8Array,
  IsUint8ClampedArray: () => IsUint8ClampedArray
});
function IsBoolean2(value) {
  return value instanceof Boolean;
}
function IsNumber2(value) {
  return value instanceof Number;
}
function IsString2(value) {
  return value instanceof String;
}
function IsTypeArray(value) {
  return globalThis.ArrayBuffer.isView(value);
}
function IsInt8Array(value) {
  return value instanceof globalThis.Int8Array;
}
function IsUint8Array(value) {
  return value instanceof globalThis.Uint8Array;
}
function IsUint8ClampedArray(value) {
  return value instanceof globalThis.Uint8ClampedArray;
}
function IsInt16Array(value) {
  return value instanceof globalThis.Int16Array;
}
function IsUint16Array(value) {
  return value instanceof globalThis.Uint16Array;
}
function IsInt32Array(value) {
  return value instanceof globalThis.Int32Array;
}
function IsUint32Array(value) {
  return value instanceof globalThis.Uint32Array;
}
function IsFloat32Array(value) {
  return value instanceof globalThis.Float32Array;
}
function IsFloat64Array(value) {
  return value instanceof globalThis.Float64Array;
}
function IsBigInt64Array(value) {
  return value instanceof globalThis.BigInt64Array;
}
function IsBigUint64Array(value) {
  return value instanceof globalThis.BigUint64Array;
}
function IsRegExp(value) {
  return value instanceof globalThis.RegExp;
}
function IsDate(value) {
  return value instanceof globalThis.Date;
}
function IsSet(value) {
  return value instanceof globalThis.Set;
}
function IsMap(value) {
  return value instanceof globalThis.Map;
}
function IsGuard(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~guard");
}
function FromGuard(value) {
  return value;
}
function FromArray(value) {
  return value.map((value2) => FromValue(value2));
}
function FromObject(value) {
  const result = {};
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Object.keys(descriptors)) {
    const descriptor = descriptors[key];
    if (guard_exports.HasPropertyKey(descriptor, "value")) {
      Object.defineProperty(result, key, { ...descriptor, value: FromValue(descriptor.value) });
    }
  }
  return result;
}
function FromRegExp(value) {
  return new RegExp(value.source, value.flags);
}
function FromUnknown(value) {
  return value;
}
function FromValue(value) {
  return value instanceof RegExp ? FromRegExp(value) : IsGuard(value) ? FromGuard(value) : guard_exports.IsArray(value) ? FromArray(value) : guard_exports.IsObject(value) ? FromObject(value) : FromUnknown(value);
}
function Clone(value) {
  Metrics.clone += 1;
  return FromValue(value);
}
var settings_exports = {};
__export(settings_exports, {
  Get: () => Get,
  Reset: () => Reset,
  Set: () => Set2
});
var settings = {
  immutableTypes: false,
  maxErrors: 8,
  useEval: true,
  exactOptionalPropertyTypes: false,
  enumerableKind: false
};
function Reset() {
  settings.immutableTypes = false;
  settings.maxErrors = 8;
  settings.useEval = true;
  settings.exactOptionalPropertyTypes = false;
  settings.enumerableKind = false;
}
function Set2(options) {
  for (const key of guard_exports.Keys(options)) {
    const value = options[key];
    if (value !== void 0) {
      Object.defineProperty(settings, key, { value });
    }
  }
}
function Get() {
  return settings;
}
function MergeHidden(left, right, configuration = {}) {
  for (const key of Object.keys(right)) {
    Object.defineProperty(left, key, {
      configurable: true,
      writable: true,
      enumerable: false,
      value: right[key]
    });
  }
  return left;
}
function Merge(left, right) {
  return { ...left, ...right };
}
function Create(hidden, enumerable, options = {}) {
  Metrics.create += 1;
  const settings2 = settings_exports.Get();
  const withOptions = Merge(enumerable, options);
  const withHidden = settings2.enumerableKind ? Merge(withOptions, hidden) : MergeHidden(withOptions, hidden);
  return settings2.immutableTypes ? Object.freeze(withHidden) : withHidden;
}
function Discard(value, propertyKeys) {
  Metrics.discard += 1;
  const result = {};
  const descriptors = Object.getOwnPropertyDescriptors(Clone(value));
  const keysToDiscard = new Set(propertyKeys);
  for (const key of Object.keys(descriptors)) {
    if (keysToDiscard.has(key))
      continue;
    Object.defineProperty(result, key, descriptors[key]);
  }
  return result;
}
function Update(current, hidden, enumerable) {
  Metrics.update += 1;
  const settings2 = settings_exports.Get();
  const result = Clone(current);
  for (const key of Object.keys(hidden)) {
    Object.defineProperty(result, key, {
      configurable: true,
      writable: true,
      enumerable: settings2.enumerableKind,
      value: hidden[key]
    });
  }
  for (const key of Object.keys(enumerable)) {
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: enumerable[key]
    });
  }
  return result;
}
function IsKind(value, kind) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.IsEqual(value["~kind"], kind);
}
function IsSchema(value) {
  return guard_exports.IsObject(value);
}
function OptionalAddAction(type) {
  return memory_exports.Create({ ["~kind"]: "OptionalAddAction" }, { type }, {});
}
function IsOptionalAddAction(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "type") && guard_exports.IsEqual(value["~kind"], "OptionalAddAction") && IsSchema(value.type);
}
function OptionalRemoveAction(type) {
  return memory_exports.Create({ ["~kind"]: "OptionalRemoveAction" }, { type }, {});
}
function IsOptionalRemoveAction(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "type") && guard_exports.IsEqual(value["~kind"], "OptionalRemoveAction") && IsSchema(value.type);
}
function ReadonlyAddAction(type) {
  return memory_exports.Create({ ["~kind"]: "ReadonlyAddAction" }, { type }, {});
}
function IsReadonlyAddAction(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "type") && guard_exports.IsEqual(value["~kind"], "ReadonlyAddAction") && IsSchema(value.type);
}
function ReadonlyRemoveAction(type) {
  return memory_exports.Create({ ["~kind"]: "ReadonlyRemoveAction" }, { type }, {});
}
function IsReadonlyRemoveAction(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "type") && guard_exports.IsEqual(value["~kind"], "ReadonlyRemoveAction") && IsSchema(value.type);
}
function Deferred(action, parameters, options) {
  return memory_exports.Create({ "~kind": "Deferred" }, { action, parameters, options }, {});
}
function IsDeferred(value) {
  return IsKind(value, "Deferred");
}
function ImmutableAdd(type) {
  return memory_exports.Update(type, { "~immutable": true }, {});
}
function Immutable(type) {
  return ImmutableAdd(type);
}
function IsImmutable(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~immutable");
}
function OptionalRemove(type) {
  const result = memory_exports.Discard(type, ["~optional"]);
  return result;
}
function OptionalAdd(type) {
  return memory_exports.Update(type, { "~optional": true }, {});
}
function Optional(type) {
  return OptionalAdd(type);
}
function IsOptional(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~optional");
}
function ReadonlyRemove(type) {
  return memory_exports.Discard(type, ["~readonly"]);
}
function ReadonlyAdd(type) {
  return memory_exports.Update(type, { "~readonly": true }, {});
}
function Readonly(type) {
  return ReadonlyAdd(type);
}
function IsReadonly(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~readonly");
}
function Array2(items, options) {
  return memory_exports.Create({ "~kind": "Array" }, { type: "array", items }, options);
}
function IsArray2(value) {
  return IsKind(value, "Array");
}
function ArrayOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "items"]);
}
function AsyncIterator(iteratorItems, options) {
  return memory_exports.Create({ "~kind": "AsyncIterator" }, { type: "asyncIterator", iteratorItems }, options);
}
function IsAsyncIterator2(value) {
  return IsKind(value, "AsyncIterator");
}
function AsyncIteratorOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "iteratorItems"]);
}
function BaseProperty(value) {
  return {
    enumerable: settings_exports.Get().enumerableKind,
    writable: false,
    configurable: false,
    value
  };
}
var Base = class {
  constructor() {
    globalThis.Object.defineProperty(this, "~kind", BaseProperty("Base"));
    globalThis.Object.defineProperty(this, "~guard", BaseProperty({
      check: (value) => this.Check(value),
      errors: (value) => this.Errors(value)
    }));
  }
  /** Checks a value or returns false if invalid */
  Check(value) {
    return true;
  }
  /** Returns errors for a value. Return an empty array if valid.  */
  Errors(value) {
    return [];
  }
  /** Converts a value into this type */
  Convert(value) {
    return value;
  }
  /** Cleans a value according to this type */
  Clean(value) {
    return value;
  }
  /** Returns a default value for this type */
  Default(value) {
    return value;
  }
  /** Creates a new instance of this type */
  Create() {
    throw new Error("Create not implemented");
  }
  /** Clones this type  */
  Clone() {
    throw Error("Clone not implemented");
  }
};
function IsBase(value) {
  return IsKind(value, "Base");
}
function Constructor(parameters, instanceType, options = {}) {
  return memory_exports.Create({ "~kind": "Constructor" }, { type: "constructor", parameters, instanceType }, options);
}
function IsConstructor2(value) {
  return IsKind(value, "Constructor");
}
function ConstructorOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "parameters", "instanceType"]);
}
function Function2(parameters, returnType, options = {}) {
  return memory_exports.Create({ ["~kind"]: "Function" }, { type: "function", parameters, returnType }, options);
}
function IsFunction2(value) {
  return IsKind(value, "Function");
}
function FunctionOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "parameters", "returnType"]);
}
function Ref(ref, options) {
  return memory_exports.Create({ ["~kind"]: "Ref" }, { $ref: ref }, options);
}
function IsRef(value) {
  return IsKind(value, "Ref");
}
function Generic(parameters, expression) {
  return memory_exports.Create({ "~kind": "Generic" }, { type: "generic", parameters, expression });
}
function IsGeneric(value) {
  return IsKind(value, "Generic");
}
var NeverPattern = "(?!)";
function Never(options) {
  return memory_exports.Create({ "~kind": "Never" }, { not: {} }, options);
}
function IsNever(value) {
  return IsKind(value, "Never");
}
function FromNotResolvable() {
  return ["(not-resolvable)", Never()];
}
function FromNotGeneric() {
  return ["(not-generic)", Never()];
}
function FromGeneric(name, parameters, expression) {
  return [name, Generic(parameters, expression)];
}
function FromRef(context, ref, arguments_) {
  return ref in context ? FromType(context, ref, context[ref], arguments_) : FromNotResolvable();
}
function FromType(context, name, target, arguments_) {
  return IsGeneric(target) ? FromGeneric(name, target.parameters, target.expression) : IsRef(target) ? FromRef(context, target.$ref, arguments_) : FromNotGeneric();
}
function ResolveTarget(context, target, arguments_) {
  return FromType(context, "(anonymous)", target, arguments_);
}
function Cyclic($defs, $ref, options) {
  const defs = guard_exports.Keys($defs).reduce((result, key) => {
    return { ...result, [key]: memory_exports.Update($defs[key], {}, { $id: key }) };
  }, {});
  return memory_exports.Create({ ["~kind"]: "Cyclic" }, { $defs: defs, $ref }, options);
}
function IsCyclic(value) {
  return IsKind(value, "Cyclic");
}
var arguments_exports = {};
__export(arguments_exports, {
  Match: () => Match
});
function Match(args, match) {
  return match[args.length]?.(...args) ?? (() => {
    throw Error("Invalid Arguments");
  })();
}
function Unknown(options) {
  return memory_exports.Create({ ["~kind"]: "Unknown" }, {}, options);
}
function IsUnknown(value) {
  return IsKind(value, "Unknown");
}
function Infer(...args) {
  const [name, extends_] = arguments_exports.Match(args, {
    2: (name2, extends_2) => [name2, extends_2, extends_2],
    1: (name2) => [name2, Unknown(), Unknown()]
  });
  return memory_exports.Create({ ["~kind"]: "Infer" }, { type: "infer", name, extends: extends_ }, {});
}
function IsInfer(value) {
  return IsKind(value, "Infer");
}
function Any(options) {
  return memory_exports.Create({ ["~kind"]: "Any" }, {}, options);
}
function IsAny(value) {
  return IsKind(value, "Any");
}
function IsTypeScriptEnumLike(value) {
  return guard_exports.IsObjectNotArray(value);
}
function TypeScriptEnumToEnumValues(type) {
  const keys = guard_exports.Keys(type).filter((key) => isNaN(key));
  return keys.reduce((result, key) => [...result, type[key]], []);
}
function Enum(value, options) {
  const values = IsTypeScriptEnumLike(value) ? TypeScriptEnumToEnumValues(value) : value;
  return memory_exports.Create({ "~kind": "Enum" }, { enum: values }, options);
}
function IsEnum(value) {
  return IsKind(value, "Enum");
}
function Intersect(types, options = {}) {
  return memory_exports.Create({ "~kind": "Intersect" }, { allOf: types }, options);
}
function IsIntersect(value) {
  return IsKind(value, "Intersect");
}
function IntersectOptions(type) {
  return memory_exports.Discard(type, ["~kind", "allOf"]);
}
function Unreachable() {
  throw new Error("Unreachable");
}
var hash_exports = {};
__export(hash_exports, {
  Hash: () => Hash,
  HashCode: () => HashCode
});
function InstanceKeys(value) {
  const propertyKeys = /* @__PURE__ */ new Set();
  let current = value;
  while (current && current !== Object.prototype) {
    for (const key of Reflect.ownKeys(current)) {
      if (key !== "constructor" && typeof key !== "symbol")
        propertyKeys.add(key);
    }
    current = Object.getPrototypeOf(current);
  }
  return [...propertyKeys];
}
function IsIEEE754(value) {
  return typeof value === "number";
}
var ByteMarker;
(function(ByteMarker2) {
  ByteMarker2[ByteMarker2["Array"] = 0] = "Array";
  ByteMarker2[ByteMarker2["BigInt"] = 1] = "BigInt";
  ByteMarker2[ByteMarker2["Boolean"] = 2] = "Boolean";
  ByteMarker2[ByteMarker2["Date"] = 3] = "Date";
  ByteMarker2[ByteMarker2["Constructor"] = 4] = "Constructor";
  ByteMarker2[ByteMarker2["Function"] = 5] = "Function";
  ByteMarker2[ByteMarker2["Null"] = 6] = "Null";
  ByteMarker2[ByteMarker2["Number"] = 7] = "Number";
  ByteMarker2[ByteMarker2["Object"] = 8] = "Object";
  ByteMarker2[ByteMarker2["RegExp"] = 9] = "RegExp";
  ByteMarker2[ByteMarker2["String"] = 10] = "String";
  ByteMarker2[ByteMarker2["Symbol"] = 11] = "Symbol";
  ByteMarker2[ByteMarker2["TypeArray"] = 12] = "TypeArray";
  ByteMarker2[ByteMarker2["Undefined"] = 13] = "Undefined";
})(ByteMarker || (ByteMarker = {}));
var Accumulator = BigInt("14695981039346656037");
var [Prime, Size] = [BigInt("1099511628211"), BigInt(
  "18446744073709551616"
  /* 2 ^ 64 */
)];
var Bytes = Array.from({ length: 256 }).map((_, i) => BigInt(i));
var F64 = new Float64Array(1);
var F64In = new DataView(F64.buffer);
var F64Out = new Uint8Array(F64.buffer);
function FNV1A64_OP(byte) {
  Accumulator = Accumulator ^ Bytes[byte];
  Accumulator = Accumulator * Prime % Size;
}
function FromArray2(value) {
  FNV1A64_OP(ByteMarker.Array);
  for (const item of value) {
    FromValue2(item);
  }
}
function FromBigInt(value) {
  FNV1A64_OP(ByteMarker.BigInt);
  F64In.setBigInt64(0, value);
  for (const byte of F64Out) {
    FNV1A64_OP(byte);
  }
}
function FromBoolean(value) {
  FNV1A64_OP(ByteMarker.Boolean);
  FNV1A64_OP(value ? 1 : 0);
}
function FromConstructor(value) {
  FNV1A64_OP(ByteMarker.Constructor);
  FromValue2(value.toString());
}
function FromDate(value) {
  FNV1A64_OP(ByteMarker.Date);
  FromValue2(value.getTime());
}
function FromFunction(value) {
  FNV1A64_OP(ByteMarker.Function);
  FromValue2(value.toString());
}
function FromNull(_value) {
  FNV1A64_OP(ByteMarker.Null);
}
function FromNumber(value) {
  FNV1A64_OP(ByteMarker.Number);
  F64In.setFloat64(
    0,
    value,
    true
    /* little-endian */
  );
  for (const byte of F64Out) {
    FNV1A64_OP(byte);
  }
}
function FromObject2(value) {
  FNV1A64_OP(ByteMarker.Object);
  for (const key of InstanceKeys(value).sort()) {
    FromValue2(key);
    FromValue2(value[key]);
  }
}
function FromRegExp2(value) {
  FNV1A64_OP(ByteMarker.RegExp);
  FromString(value.toString());
}
var encoder = new TextEncoder();
function FromString(value) {
  FNV1A64_OP(ByteMarker.String);
  for (const byte of encoder.encode(value)) {
    FNV1A64_OP(byte);
  }
}
function FromSymbol(value) {
  FNV1A64_OP(ByteMarker.Symbol);
  FromValue2(value.toString());
}
function FromTypeArray(value) {
  FNV1A64_OP(ByteMarker.TypeArray);
  const buffer = new Uint8Array(value.buffer);
  for (let i = 0; i < buffer.length; i++) {
    FNV1A64_OP(buffer[i]);
  }
}
function FromUndefined(_value) {
  return FNV1A64_OP(ByteMarker.Undefined);
}
function FromValue2(value) {
  return globals_exports.IsTypeArray(value) ? FromTypeArray(value) : globals_exports.IsDate(value) ? FromDate(value) : globals_exports.IsRegExp(value) ? FromRegExp2(value) : globals_exports.IsBoolean(value) ? FromBoolean(value.valueOf()) : globals_exports.IsString(value) ? FromString(value.valueOf()) : globals_exports.IsNumber(value) ? FromNumber(value.valueOf()) : IsIEEE754(value) ? FromNumber(value) : guard_exports.IsArray(value) ? FromArray2(value) : guard_exports.IsBoolean(value) ? FromBoolean(value) : guard_exports.IsBigInt(value) ? FromBigInt(value) : guard_exports.IsConstructor(value) ? FromConstructor(value) : guard_exports.IsNull(value) ? FromNull(value) : guard_exports.IsObject(value) ? FromObject2(value) : guard_exports.IsString(value) ? FromString(value) : guard_exports.IsSymbol(value) ? FromSymbol(value) : guard_exports.IsUndefined(value) ? FromUndefined(value) : guard_exports.IsFunction(value) ? FromFunction(value) : Unreachable();
}
function HashCode(value) {
  Accumulator = BigInt("14695981039346656037");
  FromValue2(value);
  return Accumulator;
}
function Hash(value) {
  return HashCode(value).toString(16).padStart(16, "0");
}
function en_US(error) {
  switch (error.keyword) {
    case "additionalProperties":
      return "must not have additional properties";
    case "anyOf":
      return "must match a schema in anyOf";
    case "boolean":
      return "schema is false";
    case "const":
      return "must be equal to constant";
    case "contains":
      return "must contain at least 1 valid item";
    case "dependencies":
      return `must have properties ${error.params.dependencies.join(", ")} when property ${error.params.property} is present`;
    case "dependentRequired":
      return `must have properties ${error.params.dependencies.join(", ")} when property ${error.params.property} is present`;
    case "enum":
      return "must be equal to one of the allowed values";
    case "exclusiveMaximum":
      return `must be ${error.params.comparison} ${error.params.limit}`;
    case "exclusiveMinimum":
      return `must be ${error.params.comparison} ${error.params.limit}`;
    case "format":
      return `must match format "${error.params.format}"`;
    case "if":
      return `must match "${error.params.failingKeyword}" schema`;
    case "maxItems":
      return `must not have more than ${error.params.limit} items`;
    case "maxLength":
      return `must not have more than ${error.params.limit} characters`;
    case "maxProperties":
      return `must not have more than ${error.params.limit} properties`;
    case "maximum":
      return `must be ${error.params.comparison} ${error.params.limit}`;
    case "minItems":
      return `must not have fewer than ${error.params.limit} items`;
    case "minLength":
      return `must not have fewer than ${error.params.limit} characters`;
    case "minProperties":
      return `must not have fewer than ${error.params.limit} properties`;
    case "minimum":
      return `must be ${error.params.comparison} ${error.params.limit}`;
    case "multipleOf":
      return `must be multiple of ${error.params.multipleOf}`;
    case "not":
      return "must not be valid";
    case "oneOf":
      return "must match exactly one schema in oneOf";
    case "pattern":
      return `must match pattern "${error.params.pattern}"`;
    case "propertyNames":
      return `property names ${error.params.propertyNames.join(", ")} are invalid`;
    case "required":
      return `must have required properties ${error.params.requiredProperties.join(", ")}`;
    case "type":
      return typeof error.params.type === "string" ? `must be ${error.params.type}` : `must be either ${error.params.type.join(" or ")}`;
    case "unevaluatedItems":
      return "must not have unevaluated items";
    case "unevaluatedProperties":
      return "must not have unevaluated properties";
    case "uniqueItems":
      return `must not have duplicate items`;
    case "~guard":
      return `must match check function`;
    case "~refine":
      return error.params.message;
    // deno-coverage-ignore - unreachable
    default:
      return "an unknown validation error occurred";
  }
}
var locale = en_US;
function Get2() {
  return locale;
}
var EncodeBuilder = class {
  constructor(type, decode) {
    this.type = type;
    this.decode = decode;
  }
  Encode(callback) {
    const type = this.type;
    const decode = IsCodec(type) ? (value) => this.decode(type["~codec"].decode(value)) : this.decode;
    const encode = IsCodec(type) ? (value) => type["~codec"].encode(callback(value)) : callback;
    const codec = { decode, encode };
    return memory_exports.Update(this.type, { "~codec": codec }, {});
  }
};
var DecodeBuilder = class {
  constructor(type) {
    this.type = type;
  }
  Decode(callback) {
    return new EncodeBuilder(this.type, callback);
  }
};
function Codec(type) {
  return new DecodeBuilder(type);
}
function Decode(type, callback) {
  return Codec(type).Decode(callback).Encode(() => {
    throw Error("Encode not implemented");
  });
}
function Encode(type, callback) {
  return Codec(type).Decode(() => {
    throw Error("Decode not implemented");
  }).Encode(callback);
}
function IsCodec(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~codec") && guard_exports.IsObject(value["~codec"]) && guard_exports.HasPropertyKey(value["~codec"], "encode") && guard_exports.HasPropertyKey(value["~codec"], "decode");
}
function RefineAdd(type, refinement) {
  const refinements = IsRefine(type) ? [...type["~refine"], refinement] : [refinement];
  return memory_exports.Update(type, { "~refine": refinements }, {});
}
function Refine(type, refine, message = "error") {
  return RefineAdd(type, { refine, message });
}
function IsRefine(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "~refine");
}
var BigIntPattern = "-?(?:0|[1-9][0-9]*)n";
function BigInt2(options) {
  return memory_exports.Create({ "~kind": "BigInt" }, { type: "bigint" }, options);
}
function IsBigInt2(value) {
  return IsKind(value, "BigInt");
}
function Boolean2(options) {
  return memory_exports.Create({ "~kind": "Boolean" }, { type: "boolean" }, options);
}
function IsBoolean3(value) {
  return IsKind(value, "Boolean");
}
function Identifier(name) {
  return memory_exports.Create({ "~kind": "Identifier" }, { name });
}
function IsIdentifier(value) {
  return IsKind(value, "Identifier");
}
var IntegerPattern = "-?(?:0|[1-9][0-9]*)";
function Integer(options) {
  return memory_exports.Create({ "~kind": "Integer" }, { type: "integer" }, options);
}
function IsInteger2(value) {
  return IsKind(value, "Integer");
}
function Iterator(iteratorItems, options) {
  return memory_exports.Create({ "~kind": "Iterator" }, { type: "iterator", iteratorItems }, options);
}
function IsIterator2(value) {
  return IsKind(value, "Iterator");
}
function IteratorOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "iteratorItems"]);
}
var InvalidLiteralValue = class extends Error {
  constructor(value) {
    super(`Invalid Literal value`);
    Object.defineProperty(this, "cause", {
      value: { value },
      writable: false,
      configurable: false,
      enumerable: false
    });
  }
};
function LiteralTypeName(value) {
  return guard_exports.IsBigInt(value) ? "bigint" : guard_exports.IsBoolean(value) ? "boolean" : guard_exports.IsNumber(value) ? "number" : guard_exports.IsString(value) ? "string" : (() => {
    throw new InvalidLiteralValue(value);
  })();
}
function Literal(value, options) {
  return memory_exports.Create({ "~kind": "Literal" }, { type: LiteralTypeName(value), const: value }, options);
}
function IsLiteralValue(value) {
  return guard_exports.IsBigInt(value) || guard_exports.IsBoolean(value) || guard_exports.IsNumber(value) || guard_exports.IsString(value);
}
function IsLiteralBigInt(value) {
  return IsLiteral(value) && guard_exports.IsBigInt(value.const);
}
function IsLiteralBoolean(value) {
  return IsLiteral(value) && guard_exports.IsBoolean(value.const);
}
function IsLiteralNumber(value) {
  return IsLiteral(value) && guard_exports.IsNumber(value.const);
}
function IsLiteralString(value) {
  return IsLiteral(value) && guard_exports.IsString(value.const);
}
function IsLiteral(value) {
  return IsKind(value, "Literal");
}
function Null(options) {
  return memory_exports.Create({ "~kind": "Null" }, { type: "null" }, options);
}
function IsNull2(value) {
  return IsKind(value, "Null");
}
var NumberPattern = "-?(?:0|[1-9][0-9]*)(?:.[0-9]+)?";
function Number2(options) {
  return memory_exports.Create({ "~kind": "Number" }, { type: "number" }, options);
}
function IsNumber3(value) {
  return IsKind(value, "Number");
}
function Symbol2(options) {
  return memory_exports.Create({ "~kind": "Symbol" }, { type: "symbol" }, options);
}
function IsSymbol2(value) {
  return IsKind(value, "Symbol");
}
function RequiredArray(properties) {
  return guard_exports.Keys(properties).filter((key) => !IsOptional(properties[key]));
}
function PropertyKeys(properties) {
  return guard_exports.Keys(properties);
}
function PropertyValues(properties) {
  return guard_exports.Values(properties);
}
function _Object_(properties, options = {}) {
  const requiredKeys = RequiredArray(properties);
  const required = requiredKeys.length > 0 ? { required: requiredKeys } : {};
  return memory_exports.Create({ "~kind": "Object" }, { type: "object", ...required, properties }, options);
}
var Object2 = _Object_;
function IsObject2(value) {
  return IsKind(value, "Object");
}
function ObjectOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "properties", "required"]);
}
function Parameter(...args) {
  const [name, extends_, equals] = arguments_exports.Match(args, {
    3: (name2, extends_2, equals2) => [name2, extends_2, equals2],
    2: (name2, extends_2) => [name2, extends_2, extends_2],
    1: (name2) => [name2, Unknown(), Unknown()]
  });
  return memory_exports.Create({ "~kind": "Parameter" }, { name, extends: extends_, equals }, {});
}
function IsParameter(value) {
  return IsKind(value, "Parameter");
}
function Promise2(item, options) {
  return memory_exports.Create({ ["~kind"]: "Promise" }, { type: "promise", item }, options);
}
function IsPromise(value) {
  return IsKind(value, "Promise");
}
function PromiseOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "item"]);
}
var StringPattern = ".*";
function String2(options) {
  return memory_exports.Create({ "~kind": "String" }, { type: "string" }, options);
}
function IsString3(value) {
  return IsKind(value, "String");
}
function CreateRecord(key, value) {
  const type = "object";
  const patternProperties = { [key]: value };
  return memory_exports.Create({ ["~kind"]: "Record" }, { type, patternProperties });
}
var IntegerKey = `^${IntegerPattern}$`;
var NumberKey = `^${NumberPattern}$`;
var StringKey = `^${StringPattern}$`;
function RecordDeferred(key, value, options = {}) {
  return Deferred("Record", [key, value], options);
}
function RecordConstruct(key, value, options = {}) {
  return Instantiate({}, RecordDeferred(key, value, options));
}
function Record(key, value, options = {}) {
  return RecordConstruct(key, value, options);
}
function RecordFromPattern(key, value) {
  return CreateRecord(key, value);
}
function RecordPattern(type) {
  return guard_exports.Keys(type.patternProperties)[0];
}
function RecordKey(type) {
  const pattern = RecordPattern(type);
  const result = guard_exports.IsEqual(pattern, IntegerKey) ? Integer() : guard_exports.IsEqual(pattern, NumberKey) ? Number2() : String2();
  return result;
}
function RecordValue(type) {
  return type.patternProperties[RecordPattern(type)];
}
function IsRecord(value) {
  return IsKind(value, "Record");
}
function Rest(type) {
  return memory_exports.Create({ "~kind": "Rest" }, { type: "rest", items: type }, {});
}
function IsRest(value) {
  return IsKind(value, "Rest");
}
function This(options) {
  return memory_exports.Create({ ["~kind"]: "This" }, { $ref: "#" }, options);
}
function IsThis(value) {
  return IsKind(value, "This");
}
function Tuple(types, options = {}) {
  const [items, minItems, additionalItems] = [types, types.length, false];
  return memory_exports.Create({ ["~kind"]: "Tuple" }, { type: "array", additionalItems, items, minItems }, options);
}
function IsTuple(value) {
  return IsKind(value, "Tuple");
}
function TupleOptions(type) {
  return memory_exports.Discard(type, ["~kind", "type", "items", "minItems", "additionalItems"]);
}
function Undefined(options) {
  return memory_exports.Create({ "~kind": "Undefined" }, { type: "undefined" }, options);
}
function IsUndefined2(value) {
  return IsKind(value, "Undefined");
}
function Union(anyOf, options = {}) {
  return memory_exports.Create({ "~kind": "Union" }, { anyOf }, options);
}
function IsUnion(value) {
  return IsKind(value, "Union");
}
function UnionOptions(type) {
  return memory_exports.Discard(type, ["~kind", "anyOf"]);
}
function Unsafe(schema) {
  return memory_exports.Create({ ["~kind"]: "Unsafe" }, {}, schema);
}
function IsUnsafe(value) {
  return IsKind(value, "Unsafe");
}
function Void(options) {
  return memory_exports.Create({ "~kind": "Void" }, { type: "void" }, options);
}
function IsVoid(value) {
  return IsKind(value, "Void");
}
function IntrinsicOrCall(ref, parameters) {
  return guard_exports.IsEqual(ref, "Array") ? Array2(parameters[0]) : guard_exports.IsEqual(ref, "AsyncIterator") ? AsyncIterator(parameters[0]) : guard_exports.IsEqual(ref, "Iterator") ? Iterator(parameters[0]) : guard_exports.IsEqual(ref, "Promise") ? Promise2(parameters[0]) : guard_exports.IsEqual(ref, "Awaited") ? AwaitedDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Capitalize") ? CapitalizeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "ConstructorParameters") ? ConstructorParametersDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Evaluate") ? EvaluateDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Exclude") ? ExcludeDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Extract") ? ExtractDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Index") ? IndexDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "InstanceType") ? InstanceTypeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Lowercase") ? LowercaseDeferred(parameters[0]) : guard_exports.IsEqual(ref, "NonNullable") ? NonNullableDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Omit") ? OmitDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Options") ? OptionsDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Parameters") ? ParametersDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Partial") ? PartialDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Pick") ? PickDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Readonly") ? ReadonlyTypeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "KeyOf") ? KeyOfDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Record") ? RecordDeferred(parameters[0], parameters[1]) : guard_exports.IsEqual(ref, "Required") ? RequiredDeferred(parameters[0]) : guard_exports.IsEqual(ref, "ReturnType") ? ReturnTypeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Uncapitalize") ? UncapitalizeDeferred(parameters[0]) : guard_exports.IsEqual(ref, "Uppercase") ? UppercaseDeferred(parameters[0]) : CallConstruct(Ref(ref), parameters);
}
function Unreachable2() {
  throw Error("Unreachable");
}
var DelimitedDecode = (input, result = []) => {
  return input.reduce((result2, left) => {
    return guard_exports.IsArray(left) && guard_exports.IsEqual(left.length, 2) ? [...result2, left[0]] : [...result2, left];
  }, []);
};
var Delimited = (input) => {
  const [left, right] = input;
  return DelimitedDecode([...left, ...right]);
};
function GenericParameterExtendsEqualsMapping(input) {
  return Parameter(input[0], input[2], input[4]);
}
function GenericParameterExtendsMapping(input) {
  return Parameter(input[0], input[2], input[2]);
}
function GenericParameterEqualsMapping(input) {
  return Parameter(input[0], Unknown(), input[2]);
}
function GenericParameterIdentifierMapping(input) {
  return Parameter(input, Unknown(), Unknown());
}
function GenericParameterMapping(input) {
  return input;
}
function GenericParameterListMapping(input) {
  return Delimited(input);
}
function GenericParametersMapping(input) {
  return input[1];
}
function GenericCallArgumentListMapping(input) {
  return Delimited(input);
}
function GenericCallArgumentsMapping(input) {
  return input[1];
}
function GenericCallMapping(input) {
  return IntrinsicOrCall(input[0], input[1]);
}
function OptionalSemiColonMapping(input) {
  return null;
}
function KeywordStringMapping(input) {
  return String2();
}
function KeywordNumberMapping(input) {
  return Number2();
}
function KeywordBooleanMapping(input) {
  return Boolean2();
}
function KeywordUndefinedMapping(input) {
  return Undefined();
}
function KeywordNullMapping(input) {
  return Null();
}
function KeywordIntegerMapping(input) {
  return Integer();
}
function KeywordBigIntMapping(input) {
  return BigInt2();
}
function KeywordUnknownMapping(input) {
  return Unknown();
}
function KeywordAnyMapping(input) {
  return Any();
}
function KeywordObjectMapping(input) {
  return Object2({});
}
function KeywordNeverMapping(input) {
  return Never();
}
function KeywordSymbolMapping(input) {
  return Symbol2();
}
function KeywordVoidMapping(input) {
  return Void();
}
function KeywordThisMapping(input) {
  return This();
}
function KeywordMapping(input) {
  return input;
}
function TemplateInterpolateMapping(input) {
  return input[1];
}
function TemplateSpanMapping(input) {
  return Literal(input);
}
function TemplateBodyMapping(input) {
  return guard_exports.IsEqual(input.length, 3) ? [input[0], input[1], ...input[2]] : [input[0]];
}
function TemplateLiteralTypesMapping(input) {
  return input[1];
}
function TemplateLiteralMapping(input) {
  return TemplateLiteralDeferred(input);
}
function LiteralBigIntMapping(input) {
  return Literal(BigInt(input));
}
function LiteralBooleanMapping(input) {
  return Literal(guard_exports.IsEqual(input, "true"));
}
function LiteralNumberMapping(input) {
  return Literal(parseFloat(input));
}
function LiteralStringMapping(input) {
  return Literal(input);
}
function LiteralMapping(input) {
  return input;
}
function KeyOfMapping(input) {
  return input.length > 0;
}
function IndexArrayMapping(input) {
  return input.reduce((result, current) => {
    return guard_exports.IsEqual(current.length, 3) ? [...result, [current[1]]] : [...result, []];
  }, []);
}
function ExtendsMapping(input) {
  return guard_exports.IsEqual(input.length, 6) ? [input[1], input[3], input[5]] : [];
}
function BaseMapping(input) {
  return guard_exports.IsArray(input) && guard_exports.IsEqual(input.length, 3) ? input[1] : input;
}
var FactorIndexArray = (Type2, indexArray) => {
  return indexArray.reduceRight((result, right) => {
    const _right = right;
    return guard_exports.IsEqual(_right.length, 1) ? IndexDeferred(result, _right[0]) : guard_exports.IsEqual(_right.length, 0) ? Array2(result) : Unreachable2();
  }, Type2);
};
var FactorExtends = (type, extend) => {
  return guard_exports.IsEqual(extend.length, 3) ? ConditionalDeferred(type, extend[0], extend[1], extend[2]) : type;
};
function FactorMapping(input) {
  const [keyOf, type, indexArray, extend] = input;
  return keyOf ? FactorExtends(KeyOfDeferred(FactorIndexArray(type, indexArray)), extend) : FactorExtends(FactorIndexArray(type, indexArray), extend);
}
function ExprBinaryMapping(left, rest) {
  return guard_exports.IsEqual(rest.length, 3) ? (() => {
    const [operator, right, next] = rest;
    const Schema = ExprBinaryMapping(right, next);
    if (guard_exports.IsEqual(operator, "&")) {
      return IsIntersect(Schema) ? Intersect([left, ...Schema.allOf]) : Intersect([left, Schema]);
    }
    if (guard_exports.IsEqual(operator, "|")) {
      return IsUnion(Schema) ? Union([left, ...Schema.anyOf]) : Union([left, Schema]);
    }
    Unreachable2();
  })() : left;
}
function ExprTermTailMapping(input) {
  return input;
}
function ExprTermMapping(input) {
  const [left, rest] = input;
  return ExprBinaryMapping(left, rest);
}
function ExprTailMapping(input) {
  return input;
}
function ExprMapping(input) {
  const [left, rest] = input;
  return ExprBinaryMapping(left, rest);
}
function ExprReadonlyMapping(input) {
  return ImmutableAdd(input[1]);
}
function ExprPipeMapping(input) {
  return input[1];
}
function GenericTypeMapping(input) {
  return Generic(input[0], input[2]);
}
function InferTypeMapping(input) {
  return guard_exports.IsEqual(input.length, 4) ? Infer(input[1], input[3]) : guard_exports.IsEqual(input.length, 2) ? Infer(input[1], Unknown()) : Unreachable2();
}
function TypeMapping(input) {
  return input;
}
function PropertyKeyNumberMapping(input) {
  return `${input}`;
}
function PropertyKeyIdentMapping(input) {
  return input;
}
function PropertyKeyQuotedMapping(input) {
  return input;
}
function PropertyKeyIndexMapping(input) {
  return IsInteger2(input[3]) ? IntegerKey : IsNumber3(input[3]) ? NumberKey : IsSymbol2(input[3]) ? StringKey : IsString3(input[3]) ? StringKey : Unreachable2();
}
function PropertyKeyMapping(input) {
  return input;
}
function ReadonlyMapping(input) {
  return input.length > 0;
}
function OptionalMapping(input) {
  return input.length > 0;
}
function PropertyMapping(input) {
  const [isReadonly, key, isOptional, _colon, type] = input;
  return {
    [key]: isReadonly && isOptional ? ReadonlyAdd(OptionalAdd(type)) : isReadonly && !isOptional ? ReadonlyAdd(type) : !isReadonly && isOptional ? OptionalAdd(type) : type
  };
}
function PropertyDelimiterMapping(input) {
  return input;
}
function PropertyListMapping(input) {
  return Delimited(input);
}
function PropertiesReduce(propertyList) {
  return propertyList.reduce((result, left) => {
    const isPatternProperties = guard_exports.HasPropertyKey(left, IntegerKey) || guard_exports.HasPropertyKey(left, NumberKey) || guard_exports.HasPropertyKey(left, StringKey);
    return isPatternProperties ? [result[0], memory_exports.Assign(result[1], left)] : [memory_exports.Assign(result[0], left), result[1]];
  }, [{}, {}]);
}
function PropertiesMapping(input) {
  return PropertiesReduce(input[1]);
}
function _Object_Mapping(input) {
  const [properties, patternProperties] = input;
  const options = guard_exports.IsEqual(guard_exports.Keys(patternProperties).length, 0) ? {} : { patternProperties };
  return Object2(properties, options);
}
function ElementNamedMapping(input) {
  return guard_exports.IsEqual(input.length, 5) ? ReadonlyAdd(OptionalAdd(input[4])) : guard_exports.IsEqual(input.length, 3) ? input[2] : guard_exports.IsEqual(input.length, 4) ? guard_exports.IsEqual(input[2], "readonly") ? ReadonlyAdd(input[3]) : OptionalAdd(input[3]) : Unreachable2();
}
function ElementReadonlyOptionalMapping(input) {
  return ReadonlyAdd(OptionalAdd(input[1]));
}
function ElementReadonlyMapping(input) {
  return ReadonlyAdd(input[1]);
}
function ElementOptionalMapping(input) {
  return OptionalAdd(input[0]);
}
function ElementBaseMapping(input) {
  return input;
}
function ElementMapping(input) {
  return guard_exports.IsEqual(input.length, 2) ? Rest(input[1]) : guard_exports.IsEqual(input.length, 1) ? input[0] : Unreachable2();
}
function ElementListMapping(input) {
  return Delimited(input);
}
function TupleMapping(input) {
  return Tuple(input[1]);
}
function ParameterReadonlyOptionalMapping(input) {
  return ReadonlyAdd(OptionalAdd(input[4]));
}
function ParameterReadonlyMapping(input) {
  return ReadonlyAdd(input[3]);
}
function ParameterOptionalMapping(input) {
  return OptionalAdd(input[3]);
}
function ParameterTypeMapping(input) {
  return input[2];
}
function ParameterBaseMapping(input) {
  return input;
}
function ParameterMapping(input) {
  return guard_exports.IsEqual(input.length, 2) ? Rest(input[1]) : guard_exports.IsEqual(input.length, 1) ? input[0] : Unreachable2();
}
function ParameterListMapping(input) {
  return Delimited(input);
}
function _Function_Mapping(input) {
  return Function2(input[1], input[4]);
}
function ConstructorMapping(input) {
  return Constructor(input[2], input[5]);
}
function ApplyReadonly(state2, type) {
  return guard_exports.IsEqual(state2, "remove") ? ReadonlyRemoveAction(type) : guard_exports.IsEqual(state2, "add") ? ReadonlyAddAction(type) : type;
}
function MappedReadonlyMapping(input) {
  return guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "-") ? "remove" : guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "+") ? "add" : guard_exports.IsEqual(input.length, 1) ? "add" : "none";
}
function ApplyOptional(state2, type) {
  return guard_exports.IsEqual(state2, "remove") ? OptionalRemoveAction(type) : guard_exports.IsEqual(state2, "add") ? OptionalAddAction(type) : type;
}
function MappedOptionalMapping(input) {
  return guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "-") ? "remove" : guard_exports.IsEqual(input.length, 2) && guard_exports.IsEqual(input[0], "+") ? "add" : guard_exports.IsEqual(input.length, 1) ? "add" : "none";
}
function MappedAsMapping(input) {
  return guard_exports.IsEqual(input.length, 2) ? [input[1]] : [];
}
function MappedMapping(input) {
  return guard_exports.IsArray(input[6]) && guard_exports.IsEqual(input[6].length, 1) ? MappedDeferred(Identifier(input[3]), input[5], input[6][0], ApplyReadonly(input[1], ApplyOptional(input[8], input[10]))) : MappedDeferred(Identifier(input[3]), input[5], Ref(input[3]), ApplyReadonly(input[1], ApplyOptional(input[8], input[10])));
}
function ReferenceMapping(input) {
  return Ref(input);
}
function OptionsMapping(input) {
  return OptionsDeferred(input[2], input[4]);
}
function JsonNumberMapping(input) {
  return parseFloat(input);
}
function JsonBooleanMapping(input) {
  return guard_exports.IsEqual(input, "true");
}
function JsonStringMapping(input) {
  return input;
}
function JsonNullMapping(input) {
  return null;
}
function JsonPropertyMapping(input) {
  return { [input[0]]: input[2] };
}
function JsonPropertyListMapping(input) {
  return Delimited(input);
}
function JsonObjectMappingReduce(propertyList) {
  return propertyList.reduce((result, left) => {
    return memory_exports.Assign(result, left);
  }, {});
}
function JsonObjectMapping(input) {
  return JsonObjectMappingReduce(input[1]);
}
function JsonElementListMapping(input) {
  return Delimited(input);
}
function JsonArrayMapping(input) {
  return input[1];
}
function JsonMapping(input) {
  return input;
}
function PatternBigIntMapping(input) {
  return BigInt2();
}
function PatternStringMapping(input) {
  return String2();
}
function PatternNumberMapping(input) {
  return Number2();
}
function PatternIntegerMapping(input) {
  return Integer();
}
function PatternNeverMapping(input) {
  return Never();
}
function PatternTextMapping(input) {
  return Literal(input);
}
function PatternBaseMapping(input) {
  return input;
}
function PatternGroupMapping(input) {
  return Union(input[1]);
}
function PatternUnionMapping(input) {
  return input.length === 3 ? [...input[0], ...input[2]] : input.length === 1 ? [...input[0]] : [];
}
function PatternTermMapping(input) {
  return [input[0], ...input[1]];
}
function PatternBodyMapping(input) {
  return input;
}
function PatternMapping(input) {
  return input[1];
}
function InterfaceDeclarationHeritageListMapping(input) {
  return Delimited(input);
}
function InterfaceDeclarationHeritageMapping(input) {
  return guard_exports.IsEqual(input.length, 2) ? input[1] : [];
}
function InterfaceDeclarationGenericMapping(input) {
  const parameters = input[2];
  const heritage = input[3];
  const [properties, patternProperties] = input[4];
  const options = guard_exports.IsEqual(guard_exports.Keys(patternProperties).length, 0) ? {} : { patternProperties };
  return { [input[1]]: Generic(parameters, InterfaceDeferred(heritage, properties, options)) };
}
function InterfaceDeclarationMapping(input) {
  const heritage = input[2];
  const [properties, patternProperties] = input[3];
  const options = guard_exports.IsEqual(guard_exports.Keys(patternProperties).length, 0) ? {} : { patternProperties };
  return { [input[1]]: InterfaceDeferred(heritage, properties, options) };
}
function TypeAliasDeclarationGenericMapping(input) {
  return { [input[1]]: Generic(input[2], input[4]) };
}
function TypeAliasDeclarationMapping(input) {
  return { [input[1]]: input[3] };
}
function ExportKeywordMapping(input) {
  return null;
}
function ModuleDeclarationDelimiterMapping(input) {
  return input;
}
function ModuleDeclarationListMapping(input) {
  return PropertiesReduce(Delimited(input));
}
function ModuleDeclarationMapping(input) {
  return input[1];
}
function ModuleMapping(input) {
  const moduleDeclaration = input[0];
  const moduleDeclarationList = input[1];
  return ModuleDeferred(memory_exports.Assign(moduleDeclaration, moduleDeclarationList[0]));
}
function ScriptMapping(input) {
  return input;
}
function IsResult(value) {
  return IsArray(value) && IsEqual(value.length, 2);
}
function TakeVariant(variant, input) {
  return IsEqual(input.indexOf(variant), 0) ? [variant, input.slice(variant.length)] : [];
}
function Take(variants, input) {
  const [left, ...right] = variants;
  return IsString(left) ? (() => {
    const result = TakeVariant(left, input);
    return IsEqual(result.length, 2) ? result : Take(right, input);
  })() : [];
}
function Range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => String.fromCharCode(start + i));
}
var Alpha = [
  ...Range(97, 122),
  // Lowercase
  ...Range(65, 90)
  // Uppercase
];
var Zero = "0";
var NonZero = Range(49, 57);
var Digit = [Zero, ...NonZero];
var WhiteSpace = " ";
var NewLine = "\n";
var UnderScore = "_";
var Dot = ".";
var DollarSign = "$";
var Hyphen = "-";
var LineComment = "//";
var OpenComment = "/*";
var CloseComment = "*/";
function DiscardMultilineComment(input) {
  const index = input.indexOf(CloseComment);
  const result = IsEqual(index, -1) ? "" : input.slice(index + 2);
  return result;
}
function DiscardLineComment(input) {
  const index = input.indexOf(NewLine);
  const result = IsEqual(index, -1) ? "" : input.slice(index);
  return result;
}
function TrimStartUntilNewline(input) {
  return input.replace(/^[ \t\r\f\v]+/, "");
}
function TrimWhitespace(input) {
  const trimmed = TrimStartUntilNewline(input);
  return trimmed.startsWith(OpenComment) ? TrimWhitespace(DiscardMultilineComment(trimmed.slice(2))) : trimmed.startsWith(LineComment) ? TrimWhitespace(DiscardLineComment(trimmed.slice(2))) : trimmed;
}
function Trim(input) {
  const trimmed = input.trimStart();
  return trimmed.startsWith(OpenComment) ? Trim(DiscardMultilineComment(trimmed.slice(2))) : trimmed.startsWith(LineComment) ? Trim(DiscardLineComment(trimmed.slice(2))) : trimmed;
}
function IsDiscard(discard, input) {
  return discard.includes(input);
}
function Many(allowed, discard, input, result = "") {
  const takeResult = Take(allowed, input);
  return IsResult(takeResult) ? IsDiscard(discard, takeResult[0]) ? Many(allowed, discard, takeResult[1], result) : Many(allowed, discard, takeResult[1], `${result}${takeResult[0]}`) : [result, input];
}
function Optional2(value, input) {
  const result = Take([value], input);
  return IsResult(result) ? result : ["", input];
}
function TakeSign(input) {
  return Optional2(Hyphen, input);
}
function TakeNonZero(input) {
  return Take(NonZero, input);
}
var AllowedDigits = [...Digit, UnderScore];
function TakeDigits(input) {
  return Many(AllowedDigits, [UnderScore], input);
}
function TakeInteger(input) {
  const sign = TakeSign(input);
  return IsResult(sign) ? (() => {
    const zero = Take([Zero], sign[1]);
    return IsResult(zero) ? [`${sign[0]}${zero[0]}`, zero[1]] : (() => {
      const nonZero = TakeNonZero(sign[1]);
      return IsResult(nonZero) ? (() => {
        const digits = TakeDigits(nonZero[1]);
        return IsResult(digits) ? [`${sign[0]}${nonZero[0]}${digits[0]}`, digits[1]] : [];
      })() : [];
    })();
  })() : [];
}
function Integer2(input) {
  return TakeInteger(Trim(input));
}
function TakeBigInt(input) {
  const integer = Integer2(input);
  return IsResult(integer) ? (() => {
    const n = Take(["n"], integer[1]);
    return IsResult(n) ? [`${integer[0]}`, n[1]] : [];
  })() : [];
}
function BigInt3(input) {
  return TakeBigInt(input);
}
function TakeConst(const_, input) {
  return Take([const_], input);
}
function Const(const_, input) {
  return IsEqual(const_, "") ? ["", input] : const_.startsWith(NewLine) ? TakeConst(const_, TrimWhitespace(input)) : const_.startsWith(WhiteSpace) ? TakeConst(const_, input) : TakeConst(const_, Trim(input));
}
var Initial = [...Alpha, UnderScore, DollarSign];
function TakeInitial(input) {
  return Take(Initial, input);
}
var Remaining = [...Initial, ...Digit];
function TakeRemaining(input, result = "") {
  const remaining = Take(Remaining, input);
  return IsResult(remaining) ? TakeRemaining(remaining[1], `${result}${remaining[0]}`) : [result, input];
}
function TakeIdent(input) {
  const initial = TakeInitial(input);
  return IsResult(initial) ? (() => {
    const remaining = TakeRemaining(initial[1]);
    return IsResult(remaining) ? [`${initial[0]}${remaining[0]}`, remaining[1]] : [];
  })() : [];
}
function Ident(input) {
  return TakeIdent(Trim(input));
}
var AllowedDigits2 = [...Digit, UnderScore];
function TakeSign2(input) {
  return Optional2(Hyphen, input);
}
function IsLeadingDot(input) {
  return IsResult(Take([Dot], input));
}
function TakeFractional(input) {
  const digits = Many(AllowedDigits2, [UnderScore], input);
  return IsResult(digits) ? IsEqual(digits[0], "") ? [] : [digits[0], digits[1]] : [];
}
function LeadingDot(sign, input) {
  const dot = Take([Dot], input);
  return IsResult(dot) ? (() => {
    const fractional = TakeFractional(dot[1]);
    return IsResult(fractional) ? [`${sign}0${dot[0]}${fractional[0]}`, fractional[1]] : [];
  })() : [];
}
function LeadingInteger(sign, input) {
  const integer = Integer2(input);
  return IsResult(integer) ? (() => {
    const dot = Take([Dot], integer[1]);
    return IsResult(dot) ? (() => {
      const fractional = TakeFractional(dot[1]);
      return IsResult(fractional) ? [`${sign}${integer[0]}${dot[0]}${fractional[0]}`, fractional[1]] : [`${sign}${integer[0]}`, dot[1]];
    })() : [`${sign}${integer[0]}`, integer[1]];
  })() : [];
}
function TakeNumber(input) {
  const sign = TakeSign2(input);
  return IsResult(sign) ? IsLeadingDot(sign[1]) ? LeadingDot(sign[0], sign[1]) : LeadingInteger(sign[0], sign[1]) : [];
}
function Number3(input) {
  return TakeNumber(Trim(input));
}
function IsEnd(end, input) {
  const [left, ...right] = end;
  return IsString(left) ? input.startsWith(left) ? true : IsEnd(right, input) : false;
}
function Until(end, input, result = "") {
  return IsEqual(input, "") ? [] : IsEnd(end, input) ? [result, input] : (() => {
    const [left, right] = [input.slice(0, 1), input.slice(1)];
    return Until(end, right, `${result}${left}`);
  })();
}
function MultiLine(start, end, input) {
  return input.startsWith(start) ? (() => {
    const until = Until([end], input.slice(start.length));
    return IsResult(until) ? (() => {
      return until[1].startsWith(end) ? [`${until[0]}`, until[1].slice(end.length)] : [];
    })() : [];
  })() : [];
}
function SingleLine(start, end, input) {
  return input.startsWith(start) ? (() => {
    const until = Until([NewLine, end], input.slice(start.length));
    return IsResult(until) ? (() => {
      return until[1].startsWith(end) ? [`${until[0]}`, until[1].slice(end.length)] : [];
    })() : [];
  })() : [];
}
function Span(start, end, multiLine, input) {
  return multiLine ? MultiLine(start, end, Trim(input)) : SingleLine(start, end, Trim(input));
}
function TakeInitial2(quotes, input) {
  return Take(quotes, input);
}
function TakeSpan(quote, input) {
  return Span(quote, quote, false, input);
}
function TakeString(quotes, input) {
  const initial = TakeInitial2(quotes, input);
  return IsResult(initial) ? TakeSpan(initial[0], `${initial[0]}${initial[1]}`) : [];
}
function String3(quotes, input) {
  return TakeString(quotes, Trim(input));
}
function Until_1(end, input) {
  const until = Until(end, input);
  return IsResult(until) ? IsEqual(until[0], "") ? [] : until : [];
}
var If = (result, left, right = () => []) => result.length === 2 ? left(result) : right();
var GenericParameterExtendsEquals = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("extends", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => If(Const("=", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [GenericParameterExtendsEqualsMapping(_0), input2]);
var GenericParameterExtends = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("extends", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParameterExtendsMapping(_0), input2]);
var GenericParameterEquals = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("=", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParameterEqualsMapping(_0), input2]);
var GenericParameterIdentifier = (input) => If(Ident(input), ([_0, input2]) => [GenericParameterIdentifierMapping(_0), input2]);
var GenericParameter = (input) => If(If(GenericParameterExtendsEquals(input), ([_0, input2]) => [_0, input2], () => If(GenericParameterExtends(input), ([_0, input2]) => [_0, input2], () => If(GenericParameterEquals(input), ([_0, input2]) => [_0, input2], () => If(GenericParameterIdentifier(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [GenericParameterMapping(_0), input2]);
var GenericParameterList_0 = (input, result = []) => If(If(GenericParameter(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => GenericParameterList_0(input2, [...result, _0]), () => [result, input]);
var GenericParameterList = (input) => If(If(GenericParameterList_0(input), ([_0, input2]) => If(If(If(GenericParameter(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericParameterListMapping(_0), input2]);
var GenericParameters = (input) => If(If(Const("<", input), ([_0, input2]) => If(GenericParameterList(input2), ([_1, input3]) => If(Const(">", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParametersMapping(_0), input2]);
var GenericCallArgumentList_0 = (input, result = []) => If(If(Type(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => GenericCallArgumentList_0(input2, [...result, _0]), () => [result, input]);
var GenericCallArgumentList = (input) => If(If(GenericCallArgumentList_0(input), ([_0, input2]) => If(If(If(Type(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericCallArgumentListMapping(_0), input2]);
var GenericCallArguments = (input) => If(If(Const("<", input), ([_0, input2]) => If(GenericCallArgumentList(input2), ([_1, input3]) => If(Const(">", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericCallArgumentsMapping(_0), input2]);
var GenericCall = (input) => If(If(Ident(input), ([_0, input2]) => If(GenericCallArguments(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericCallMapping(_0), input2]);
var OptionalSemiColon = (input) => If(If(If(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [OptionalSemiColonMapping(_0), input2]);
var KeywordString = (input) => If(Const("string", input), ([_0, input2]) => [KeywordStringMapping(_0), input2]);
var KeywordNumber = (input) => If(Const("number", input), ([_0, input2]) => [KeywordNumberMapping(_0), input2]);
var KeywordBoolean = (input) => If(Const("boolean", input), ([_0, input2]) => [KeywordBooleanMapping(_0), input2]);
var KeywordUndefined = (input) => If(Const("undefined", input), ([_0, input2]) => [KeywordUndefinedMapping(_0), input2]);
var KeywordNull = (input) => If(Const("null", input), ([_0, input2]) => [KeywordNullMapping(_0), input2]);
var KeywordInteger = (input) => If(Const("integer", input), ([_0, input2]) => [KeywordIntegerMapping(_0), input2]);
var KeywordBigInt = (input) => If(Const("bigint", input), ([_0, input2]) => [KeywordBigIntMapping(_0), input2]);
var KeywordUnknown = (input) => If(Const("unknown", input), ([_0, input2]) => [KeywordUnknownMapping(_0), input2]);
var KeywordAny = (input) => If(Const("any", input), ([_0, input2]) => [KeywordAnyMapping(_0), input2]);
var KeywordObject = (input) => If(Const("object", input), ([_0, input2]) => [KeywordObjectMapping(_0), input2]);
var KeywordNever = (input) => If(Const("never", input), ([_0, input2]) => [KeywordNeverMapping(_0), input2]);
var KeywordSymbol = (input) => If(Const("symbol", input), ([_0, input2]) => [KeywordSymbolMapping(_0), input2]);
var KeywordVoid = (input) => If(Const("void", input), ([_0, input2]) => [KeywordVoidMapping(_0), input2]);
var KeywordThis = (input) => If(Const("this", input), ([_0, input2]) => [KeywordThisMapping(_0), input2]);
var Keyword = (input) => If(If(KeywordString(input), ([_0, input2]) => [_0, input2], () => If(KeywordNumber(input), ([_0, input2]) => [_0, input2], () => If(KeywordBoolean(input), ([_0, input2]) => [_0, input2], () => If(KeywordUndefined(input), ([_0, input2]) => [_0, input2], () => If(KeywordNull(input), ([_0, input2]) => [_0, input2], () => If(KeywordInteger(input), ([_0, input2]) => [_0, input2], () => If(KeywordBigInt(input), ([_0, input2]) => [_0, input2], () => If(KeywordUnknown(input), ([_0, input2]) => [_0, input2], () => If(KeywordAny(input), ([_0, input2]) => [_0, input2], () => If(KeywordObject(input), ([_0, input2]) => [_0, input2], () => If(KeywordNever(input), ([_0, input2]) => [_0, input2], () => If(KeywordSymbol(input), ([_0, input2]) => [_0, input2], () => If(KeywordVoid(input), ([_0, input2]) => [_0, input2], () => If(KeywordThis(input), ([_0, input2]) => [_0, input2], () => [])))))))))))))), ([_0, input2]) => [KeywordMapping(_0), input2]);
var TemplateInterpolate = (input) => If(If(Const("${", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TemplateInterpolateMapping(_0), input2]);
var TemplateSpan = (input) => If(Until(["${", "`"], input), ([_0, input2]) => [TemplateSpanMapping(_0), input2]);
var TemplateBody = (input) => If(If(If(TemplateSpan(input), ([_0, input2]) => If(TemplateInterpolate(input2), ([_1, input3]) => If(TemplateBody(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(If(TemplateSpan(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(TemplateSpan(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [TemplateBodyMapping(_0), input2]);
var TemplateLiteralTypes = (input) => If(If(Const("`", input), ([_0, input2]) => If(TemplateBody(input2), ([_1, input3]) => If(Const("`", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TemplateLiteralTypesMapping(_0), input2]);
var TemplateLiteral = (input) => If(TemplateLiteralTypes(input), ([_0, input2]) => [TemplateLiteralMapping(_0), input2]);
var LiteralBigInt = (input) => If(BigInt3(input), ([_0, input2]) => [LiteralBigIntMapping(_0), input2]);
var LiteralBoolean = (input) => If(If(Const("true", input), ([_0, input2]) => [_0, input2], () => If(Const("false", input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [LiteralBooleanMapping(_0), input2]);
var LiteralNumber = (input) => If(Number3(input), ([_0, input2]) => [LiteralNumberMapping(_0), input2]);
var LiteralString = (input) => If(String3(["'", '"'], input), ([_0, input2]) => [LiteralStringMapping(_0), input2]);
var Literal2 = (input) => If(If(LiteralBigInt(input), ([_0, input2]) => [_0, input2], () => If(LiteralBoolean(input), ([_0, input2]) => [_0, input2], () => If(LiteralNumber(input), ([_0, input2]) => [_0, input2], () => If(LiteralString(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [LiteralMapping(_0), input2]);
var KeyOf = (input) => If(If(If(Const("keyof", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [KeyOfMapping(_0), input2]);
var IndexArray_0 = (input, result = []) => If(If(If(Const("[", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(If(Const("[", input), ([_0, input2]) => If(Const("]", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => IndexArray_0(input2, [...result, _0]), () => [result, input]);
var IndexArray = (input) => If(IndexArray_0(input), ([_0, input2]) => [IndexArrayMapping(_0), input2]);
var Extends = (input) => If(If(If(Const("extends", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("?", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => If(Const(":", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExtendsMapping(_0), input2]);
var Base2 = (input) => If(If(If(Const("(", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const(")", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(Keyword(input), ([_0, input2]) => [_0, input2], () => If(_Object_2(input), ([_0, input2]) => [_0, input2], () => If(Tuple2(input), ([_0, input2]) => [_0, input2], () => If(TemplateLiteral(input), ([_0, input2]) => [_0, input2], () => If(Literal2(input), ([_0, input2]) => [_0, input2], () => If(Constructor2(input), ([_0, input2]) => [_0, input2], () => If(_Function_(input), ([_0, input2]) => [_0, input2], () => If(Mapped(input), ([_0, input2]) => [_0, input2], () => If(Options(input), ([_0, input2]) => [_0, input2], () => If(GenericCall(input), ([_0, input2]) => [_0, input2], () => If(Reference(input), ([_0, input2]) => [_0, input2], () => [])))))))))))), ([_0, input2]) => [BaseMapping(_0), input2]);
var Factor = (input) => If(If(KeyOf(input), ([_0, input2]) => If(Base2(input2), ([_1, input3]) => If(IndexArray(input3), ([_2, input4]) => If(Extends(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [FactorMapping(_0), input2]);
var ExprTermTail = (input) => If(If(If(Const("&", input), ([_0, input2]) => If(Factor(input2), ([_1, input3]) => If(ExprTermTail(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExprTermTailMapping(_0), input2]);
var ExprTerm = (input) => If(If(Factor(input), ([_0, input2]) => If(ExprTermTail(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprTermMapping(_0), input2]);
var ExprTail = (input) => If(If(If(Const("|", input), ([_0, input2]) => If(ExprTerm(input2), ([_1, input3]) => If(ExprTail(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExprTailMapping(_0), input2]);
var Expr = (input) => If(If(ExprTerm(input), ([_0, input2]) => If(ExprTail(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprMapping(_0), input2]);
var ExprReadonly = (input) => If(If(Const("readonly", input), ([_0, input2]) => If(Expr(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprReadonlyMapping(_0), input2]);
var ExprPipe = (input) => If(If(Const("|", input), ([_0, input2]) => If(Expr(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprPipeMapping(_0), input2]);
var GenericType = (input) => If(If(GenericParameters(input), ([_0, input2]) => If(Const("=", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericTypeMapping(_0), input2]);
var InferType = (input) => If(If(If(Const("infer", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(Const("extends", input3), ([_2, input4]) => If(Expr(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If(If(Const("infer", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [InferTypeMapping(_0), input2]);
var Type = (input) => If(If(InferType(input), ([_0, input2]) => [_0, input2], () => If(ExprPipe(input), ([_0, input2]) => [_0, input2], () => If(ExprReadonly(input), ([_0, input2]) => [_0, input2], () => If(Expr(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [TypeMapping(_0), input2]);
var PropertyKeyNumber = (input) => If(Number3(input), ([_0, input2]) => [PropertyKeyNumberMapping(_0), input2]);
var PropertyKeyIdent = (input) => If(Ident(input), ([_0, input2]) => [PropertyKeyIdentMapping(_0), input2]);
var PropertyKeyQuoted = (input) => If(String3(["'", '"'], input), ([_0, input2]) => [PropertyKeyQuotedMapping(_0), input2]);
var PropertyKeyIndex = (input) => If(If(Const("[", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(If(KeywordInteger(input4), ([_02, input5]) => [_02, input5], () => If(KeywordNumber(input4), ([_02, input5]) => [_02, input5], () => If(KeywordString(input4), ([_02, input5]) => [_02, input5], () => If(KeywordSymbol(input4), ([_02, input5]) => [_02, input5], () => [])))), ([_3, input5]) => If(Const("]", input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [PropertyKeyIndexMapping(_0), input2]);
var PropertyKey = (input) => If(If(PropertyKeyNumber(input), ([_0, input2]) => [_0, input2], () => If(PropertyKeyIdent(input), ([_0, input2]) => [_0, input2], () => If(PropertyKeyQuoted(input), ([_0, input2]) => [_0, input2], () => If(PropertyKeyIndex(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [PropertyKeyMapping(_0), input2]);
var Readonly2 = (input) => If(If(If(Const("readonly", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ReadonlyMapping(_0), input2]);
var Optional3 = (input) => If(If(If(Const("?", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [OptionalMapping(_0), input2]);
var Property = (input) => If(If(Readonly2(input), ([_0, input2]) => If(PropertyKey(input2), ([_1, input3]) => If(Optional3(input3), ([_2, input4]) => If(Const(":", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [PropertyMapping(_0), input2]);
var PropertyDelimiter = (input) => If(If(If(Const(",", input), ([_0, input2]) => If(Const("\n", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const(";", input), ([_0, input2]) => If(Const("\n", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const(",", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(Const("\n", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))))), ([_0, input2]) => [PropertyDelimiterMapping(_0), input2]);
var PropertyList_0 = (input, result = []) => If(If(Property(input), ([_0, input2]) => If(PropertyDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => PropertyList_0(input2, [...result, _0]), () => [result, input]);
var PropertyList = (input) => If(If(PropertyList_0(input), ([_0, input2]) => If(If(If(Property(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [PropertyListMapping(_0), input2]);
var Properties = (input) => If(If(Const("{", input), ([_0, input2]) => If(PropertyList(input2), ([_1, input3]) => If(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PropertiesMapping(_0), input2]);
var _Object_2 = (input) => If(Properties(input), ([_0, input2]) => [_Object_Mapping(_0), input2]);
var ElementNamed = (input) => If(If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Const("readonly", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [_0, input2], () => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Const("readonly", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [ElementNamedMapping(_0), input2]);
var ElementReadonlyOptional = (input) => If(If(Const("readonly", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("?", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ElementReadonlyOptionalMapping(_0), input2]);
var ElementReadonly = (input) => If(If(Const("readonly", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementReadonlyMapping(_0), input2]);
var ElementOptional = (input) => If(If(Type(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementOptionalMapping(_0), input2]);
var ElementBase = (input) => If(If(ElementNamed(input), ([_0, input2]) => [_0, input2], () => If(ElementReadonlyOptional(input), ([_0, input2]) => [_0, input2], () => If(ElementReadonly(input), ([_0, input2]) => [_0, input2], () => If(ElementOptional(input), ([_0, input2]) => [_0, input2], () => If(Type(input), ([_0, input2]) => [_0, input2], () => []))))), ([_0, input2]) => [ElementBaseMapping(_0), input2]);
var Element = (input) => If(If(If(Const("...", input), ([_0, input2]) => If(ElementBase(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(ElementBase(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ElementMapping(_0), input2]);
var ElementList_0 = (input, result = []) => If(If(Element(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ElementList_0(input2, [...result, _0]), () => [result, input]);
var ElementList = (input) => If(If(ElementList_0(input), ([_0, input2]) => If(If(If(Element(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementListMapping(_0), input2]);
var Tuple2 = (input) => If(If(Const("[", input), ([_0, input2]) => If(ElementList(input2), ([_1, input3]) => If(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TupleMapping(_0), input2]);
var ParameterReadonlyOptional = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Const("readonly", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [ParameterReadonlyOptionalMapping(_0), input2]);
var ParameterReadonly = (input) => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Const("readonly", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [ParameterReadonlyMapping(_0), input2]);
var ParameterOptional = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [ParameterOptionalMapping(_0), input2]);
var ParameterType = (input) => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ParameterTypeMapping(_0), input2]);
var ParameterBase = (input) => If(If(ParameterReadonlyOptional(input), ([_0, input2]) => [_0, input2], () => If(ParameterReadonly(input), ([_0, input2]) => [_0, input2], () => If(ParameterOptional(input), ([_0, input2]) => [_0, input2], () => If(ParameterType(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [ParameterBaseMapping(_0), input2]);
var Parameter2 = (input) => If(If(If(Const("...", input), ([_0, input2]) => If(ParameterBase(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(ParameterBase(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ParameterMapping(_0), input2]);
var ParameterList_0 = (input, result = []) => If(If(Parameter2(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ParameterList_0(input2, [...result, _0]), () => [result, input]);
var ParameterList = (input) => If(If(ParameterList_0(input), ([_0, input2]) => If(If(If(Parameter2(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ParameterListMapping(_0), input2]);
var _Function_ = (input) => If(If(Const("(", input), ([_0, input2]) => If(ParameterList(input2), ([_1, input3]) => If(Const(")", input3), ([_2, input4]) => If(Const("=>", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [_Function_Mapping(_0), input2]);
var Constructor2 = (input) => If(If(Const("new", input), ([_0, input2]) => If(Const("(", input2), ([_1, input3]) => If(ParameterList(input3), ([_2, input4]) => If(Const(")", input4), ([_3, input5]) => If(Const("=>", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [ConstructorMapping(_0), input2]);
var MappedReadonly = (input) => If(If(If(Const("+", input), ([_0, input2]) => If(Const("readonly", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("-", input), ([_0, input2]) => If(Const("readonly", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("readonly", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [MappedReadonlyMapping(_0), input2]);
var MappedOptional = (input) => If(If(If(Const("+", input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("-", input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("?", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [MappedOptionalMapping(_0), input2]);
var MappedAs = (input) => If(If(If(Const("as", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [MappedAsMapping(_0), input2]);
var Mapped = (input) => If(If(Const("{", input), ([_0, input2]) => If(MappedReadonly(input2), ([_1, input3]) => If(Const("[", input3), ([_2, input4]) => If(Ident(input4), ([_3, input5]) => If(Const("in", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => If(MappedAs(input7), ([_6, input8]) => If(Const("]", input8), ([_7, input9]) => If(MappedOptional(input9), ([_8, input10]) => If(Const(":", input10), ([_9, input11]) => If(Type(input11), ([_10, input12]) => If(OptionalSemiColon(input12), ([_11, input13]) => If(Const("}", input13), ([_12, input14]) => [[_0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12], input14]))))))))))))), ([_0, input2]) => [MappedMapping(_0), input2]);
var Reference = (input) => If(Ident(input), ([_0, input2]) => [ReferenceMapping(_0), input2]);
var Options = (input) => If(If(Const("Options", input), ([_0, input2]) => If(Const("<", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => If(Const(",", input4), ([_3, input5]) => If(JsonObject(input5), ([_4, input6]) => If(Const(">", input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [OptionsMapping(_0), input2]);
var JsonNumber = (input) => If(Number3(input), ([_0, input2]) => [JsonNumberMapping(_0), input2]);
var JsonBoolean = (input) => If(If(Const("true", input), ([_0, input2]) => [_0, input2], () => If(Const("false", input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [JsonBooleanMapping(_0), input2]);
var JsonString = (input) => If(String3(['"', "'"], input), ([_0, input2]) => [JsonStringMapping(_0), input2]);
var JsonNull = (input) => If(Const("null", input), ([_0, input2]) => [JsonNullMapping(_0), input2]);
var JsonProperty = (input) => If(If(PropertyKey(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Json(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [JsonPropertyMapping(_0), input2]);
var JsonPropertyList_0 = (input, result = []) => If(If(JsonProperty(input), ([_0, input2]) => If(PropertyDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => JsonPropertyList_0(input2, [...result, _0]), () => [result, input]);
var JsonPropertyList = (input) => If(If(JsonPropertyList_0(input), ([_0, input2]) => If(If(If(JsonProperty(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [JsonPropertyListMapping(_0), input2]);
var JsonObject = (input) => If(If(Const("{", input), ([_0, input2]) => If(JsonPropertyList(input2), ([_1, input3]) => If(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [JsonObjectMapping(_0), input2]);
var JsonElementList_0 = (input, result = []) => If(If(Json(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => JsonElementList_0(input2, [...result, _0]), () => [result, input]);
var JsonElementList = (input) => If(If(JsonElementList_0(input), ([_0, input2]) => If(If(If(Json(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [JsonElementListMapping(_0), input2]);
var JsonArray = (input) => If(If(Const("[", input), ([_0, input2]) => If(JsonElementList(input2), ([_1, input3]) => If(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [JsonArrayMapping(_0), input2]);
var Json = (input) => If(If(JsonNumber(input), ([_0, input2]) => [_0, input2], () => If(JsonBoolean(input), ([_0, input2]) => [_0, input2], () => If(JsonString(input), ([_0, input2]) => [_0, input2], () => If(JsonNull(input), ([_0, input2]) => [_0, input2], () => If(JsonObject(input), ([_0, input2]) => [_0, input2], () => If(JsonArray(input), ([_0, input2]) => [_0, input2], () => [])))))), ([_0, input2]) => [JsonMapping(_0), input2]);
var PatternBigInt = (input) => If(Const("-?(?:0|[1-9][0-9]*)n", input), ([_0, input2]) => [PatternBigIntMapping(_0), input2]);
var PatternString = (input) => If(Const(".*", input), ([_0, input2]) => [PatternStringMapping(_0), input2]);
var PatternNumber = (input) => If(Const("-?(?:0|[1-9][0-9]*)(?:.[0-9]+)?", input), ([_0, input2]) => [PatternNumberMapping(_0), input2]);
var PatternInteger = (input) => If(Const("-?(?:0|[1-9][0-9]*)", input), ([_0, input2]) => [PatternIntegerMapping(_0), input2]);
var PatternNever = (input) => If(Const("(?!)", input), ([_0, input2]) => [PatternNeverMapping(_0), input2]);
var PatternText = (input) => If(Until_1(["-?(?:0|[1-9][0-9]*)n", ".*", "-?(?:0|[1-9][0-9]*)(?:.[0-9]+)?", "-?(?:0|[1-9][0-9]*)", "(?!)", "(", ")", "$", "|"], input), ([_0, input2]) => [PatternTextMapping(_0), input2]);
var PatternBase = (input) => If(If(PatternBigInt(input), ([_0, input2]) => [_0, input2], () => If(PatternString(input), ([_0, input2]) => [_0, input2], () => If(PatternNumber(input), ([_0, input2]) => [_0, input2], () => If(PatternInteger(input), ([_0, input2]) => [_0, input2], () => If(PatternNever(input), ([_0, input2]) => [_0, input2], () => If(PatternGroup(input), ([_0, input2]) => [_0, input2], () => If(PatternText(input), ([_0, input2]) => [_0, input2], () => []))))))), ([_0, input2]) => [PatternBaseMapping(_0), input2]);
var PatternGroup = (input) => If(If(Const("(", input), ([_0, input2]) => If(PatternBody(input2), ([_1, input3]) => If(Const(")", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PatternGroupMapping(_0), input2]);
var PatternUnion = (input) => If(If(If(PatternTerm(input), ([_0, input2]) => If(Const("|", input2), ([_1, input3]) => If(PatternUnion(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(If(PatternTerm(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [PatternUnionMapping(_0), input2]);
var PatternTerm = (input) => If(If(PatternBase(input), ([_0, input2]) => If(PatternBody(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [PatternTermMapping(_0), input2]);
var PatternBody = (input) => If(If(PatternUnion(input), ([_0, input2]) => [_0, input2], () => If(PatternTerm(input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [PatternBodyMapping(_0), input2]);
var Pattern = (input) => If(If(Const("^", input), ([_0, input2]) => If(PatternBody(input2), ([_1, input3]) => If(Const("$", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PatternMapping(_0), input2]);
var InterfaceDeclarationHeritageList_0 = (input, result = []) => If(If(Type(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => InterfaceDeclarationHeritageList_0(input2, [...result, _0]), () => [result, input]);
var InterfaceDeclarationHeritageList = (input) => If(If(InterfaceDeclarationHeritageList_0(input), ([_0, input2]) => If(If(If(Type(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [InterfaceDeclarationHeritageListMapping(_0), input2]);
var InterfaceDeclarationHeritage = (input) => If(If(If(Const("extends", input), ([_0, input2]) => If(InterfaceDeclarationHeritageList(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [InterfaceDeclarationHeritageMapping(_0), input2]);
var InterfaceDeclarationGeneric = (input) => If(If(Const("interface", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(GenericParameters(input3), ([_2, input4]) => If(InterfaceDeclarationHeritage(input4), ([_3, input5]) => If(Properties(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [InterfaceDeclarationGenericMapping(_0), input2]);
var InterfaceDeclaration = (input) => If(If(Const("interface", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(InterfaceDeclarationHeritage(input3), ([_2, input4]) => If(Properties(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [InterfaceDeclarationMapping(_0), input2]);
var TypeAliasDeclarationGeneric = (input) => If(If(Const("type", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(GenericParameters(input3), ([_2, input4]) => If(Const("=", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [TypeAliasDeclarationGenericMapping(_0), input2]);
var TypeAliasDeclaration = (input) => If(If(Const("type", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(Const("=", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [TypeAliasDeclarationMapping(_0), input2]);
var ExportKeyword = (input) => If(If(If(Const("export", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExportKeywordMapping(_0), input2]);
var ModuleDeclarationDelimiter = (input) => If(If(If(Const(";", input), ([_0, input2]) => If(Const("\n", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(Const("\n", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [ModuleDeclarationDelimiterMapping(_0), input2]);
var ModuleDeclarationList_0 = (input, result = []) => If(If(ModuleDeclaration(input), ([_0, input2]) => If(ModuleDeclarationDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ModuleDeclarationList_0(input2, [...result, _0]), () => [result, input]);
var ModuleDeclarationList = (input) => If(If(ModuleDeclarationList_0(input), ([_0, input2]) => If(If(If(ModuleDeclaration(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ModuleDeclarationListMapping(_0), input2]);
var ModuleDeclaration = (input) => If(If(ExportKeyword(input), ([_0, input2]) => If(If(InterfaceDeclarationGeneric(input2), ([_02, input3]) => [_02, input3], () => If(InterfaceDeclaration(input2), ([_02, input3]) => [_02, input3], () => If(TypeAliasDeclarationGeneric(input2), ([_02, input3]) => [_02, input3], () => If(TypeAliasDeclaration(input2), ([_02, input3]) => [_02, input3], () => [])))), ([_1, input3]) => If(OptionalSemiColon(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ModuleDeclarationMapping(_0), input2]);
var Module = (input) => If(If(ModuleDeclaration(input), ([_0, input2]) => If(ModuleDeclarationList(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ModuleMapping(_0), input2]);
var Script = (input) => If(If(Module(input), ([_0, input2]) => [_0, input2], () => If(GenericType(input), ([_0, input2]) => [_0, input2], () => If(Type(input), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [ScriptMapping(_0), input2]);
function ParseTemplateIntoTypes(template) {
  const parsed = TemplateLiteralTypes(`\`${template}\``);
  const result = guard_exports.IsEqual(parsed.length, 2) ? parsed[0] : Unreachable();
  return result;
}
function TemplateLiteralDeferred(types, options = {}) {
  return Deferred("TemplateLiteral", [types], options);
}
function TemplateLiteralFromTypes(types) {
  return Instantiate({}, TemplateLiteralDeferred(types, {}));
}
function TemplateLiteralFromString(template) {
  const types = ParseTemplateIntoTypes(template);
  return TemplateLiteralFromTypes(types);
}
function TemplateLiteral2(input, options = {}) {
  const type = guard_exports.IsString(input) ? TemplateLiteralFromString(input) : TemplateLiteralFromTypes(input);
  return memory_exports.Update(type, {}, options);
}
function IsTemplateLiteral(value) {
  return IsKind(value, "TemplateLiteral");
}
var result_exports = {};
__export(result_exports, {
  ExtendsFalse: () => ExtendsFalse,
  ExtendsTrue: () => ExtendsTrue,
  ExtendsUnion: () => ExtendsUnion,
  IsExtendsFalse: () => IsExtendsFalse,
  IsExtendsTrue: () => IsExtendsTrue,
  IsExtendsTrueLike: () => IsExtendsTrueLike,
  IsExtendsUnion: () => IsExtendsUnion
});
function ExtendsUnion(inferred) {
  return memory_exports.Create({ ["~kind"]: "ExtendsUnion" }, { inferred });
}
function IsExtendsUnion(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "inferred") && guard_exports.IsEqual(value["~kind"], "ExtendsUnion") && guard_exports.IsObject(value.inferred);
}
function ExtendsTrue(inferred) {
  return memory_exports.Create({ ["~kind"]: "ExtendsTrue" }, { inferred });
}
function IsExtendsTrue(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "inferred") && guard_exports.IsEqual(value["~kind"], "ExtendsTrue") && guard_exports.IsObject(value.inferred);
}
function ExtendsFalse() {
  return memory_exports.Create({ ["~kind"]: "ExtendsFalse" }, {});
}
function IsExtendsFalse(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.IsEqual(value["~kind"], "ExtendsFalse");
}
function IsExtendsTrueLike(value) {
  return IsExtendsUnion(value) || IsExtendsTrue(value);
}
function ParsePatternIntoTypes(pattern) {
  const parsed = Pattern(pattern);
  const result = guard_exports.IsEqual(parsed.length, 2) ? parsed[0] : Unreachable();
  return result;
}
function FromLiteral(value) {
  return true;
}
function FromTypesReduce(types) {
  const [left, ...right] = types;
  return IsSchema(left) ? FromType2(left) ? FromTypesReduce(right) : false : true;
}
function FromTypes(types) {
  const result = guard_exports.IsEqual(types.length, 0) ? false : FromTypesReduce(types);
  return result;
}
function FromType2(type) {
  return IsUnion(type) ? FromTypes(type.anyOf) : IsLiteral(type) ? FromLiteral(type.const) : false;
}
function TemplateLiteralFinite(types) {
  const result = FromTypes(types);
  return result;
}
function FromLiteralPush(variants, value, result = []) {
  const [left, ...right] = variants;
  return guard_exports.IsString(left) ? FromLiteralPush(right, value, [...result, `${left}${value}`]) : result;
}
function FromLiteral2(variants, value) {
  return guard_exports.IsEqual(variants.length, 0) ? [`${value}`] : FromLiteralPush(variants, value);
}
function FromUnion(variants, types, result = []) {
  const [left, ...right] = types;
  return IsSchema(left) ? FromUnion(variants, right, [...result, ...FromType3(variants, left)]) : result;
}
function FromType3(variants, type) {
  const result = IsUnion(type) ? FromUnion(variants, type.anyOf) : IsLiteral(type) ? FromLiteral2(variants, type.const) : Unreachable();
  return result;
}
function DecodeFromSpan(variants, types) {
  const [left, ...right] = types;
  return IsSchema(left) ? DecodeFromSpan(FromType3(variants, left), right) : variants;
}
function VariantsToLiterals(variants) {
  return variants.map((variant) => Literal(variant));
}
function DecodeTypesAsUnion(types) {
  const variants = DecodeFromSpan([], types);
  const literals = VariantsToLiterals(variants);
  const result = Union(literals);
  return result;
}
function DecodeTypes(types) {
  return guard_exports.IsEqual(types.length, 0) ? Unreachable() : (
    // Literal('') :
    guard_exports.IsEqual(types.length, 1) && IsLiteral(types[0]) ? types[0] : DecodeTypesAsUnion(types)
  );
}
function TemplateLiteralDecode(pattern) {
  const types = ParsePatternIntoTypes(pattern);
  const finite = TemplateLiteralFinite(types);
  const result = finite ? DecodeTypes(types) : String2();
  return result;
}
function FromEnumValue(value) {
  return guard_exports.IsString(value) || guard_exports.IsNumber(value) ? Literal(value) : guard_exports.IsNull(value) ? Null() : Never();
}
function EnumValuesToVariants(values) {
  const result = values.map((value) => FromEnumValue(value));
  return result;
}
function EnumValuesToUnion(values) {
  const variants = EnumValuesToVariants(values);
  const result = Union(variants);
  return result;
}
function EnumToUnion(type) {
  const result = EnumValuesToUnion(type.enum);
  return result;
}
function ExtendsRightInfer(inferred, name, left, right) {
  const check = ExtendsLeft(inferred, left, right);
  return IsExtendsTrueLike(check) ? ExtendsTrue(memory_exports.Assign(memory_exports.Assign(inferred, check.inferred), { [name]: left })) : ExtendsFalse();
}
function ExtendsRightAny(inferred, left) {
  return ExtendsTrue(inferred);
}
function ExtendsRightEnum(inferred, left, right) {
  const union = EnumValuesToUnion(right);
  return ExtendsLeft(inferred, left, union);
}
function ExtendsRightIntersect(inferred, left, right) {
  const [head, ...tail] = right;
  return IsSchema(head) ? (() => {
    const check = ExtendsLeft(inferred, left, head);
    return IsExtendsTrueLike(check) ? ExtendsRightIntersect(check.inferred, left, tail) : ExtendsFalse();
  })() : ExtendsTrue(inferred);
}
function ExtendsRightTemplateLiteral(inferred, left, right) {
  const decoded = TemplateLiteralDecode(right);
  return ExtendsLeft(inferred, left, decoded);
}
function ExtendsRightUnion(inferred, left, right) {
  const [head, ...tail] = right;
  return IsSchema(head) ? (() => {
    const check = ExtendsLeft(inferred, left, head);
    return IsExtendsTrueLike(check) ? ExtendsTrue(check.inferred) : ExtendsRightUnion(inferred, left, tail);
  })() : ExtendsFalse();
}
function ExtendsRight(inferred, left, right) {
  return IsAny(right) ? ExtendsRightAny(inferred, left) : IsEnum(right) ? ExtendsRightEnum(inferred, left, right.enum) : IsInfer(right) ? ExtendsRightInfer(inferred, right.name, left, right.extends) : IsIntersect(right) ? ExtendsRightIntersect(inferred, left, right.allOf) : IsTemplateLiteral(right) ? ExtendsRightTemplateLiteral(inferred, left, right.pattern) : IsUnion(right) ? ExtendsRightUnion(inferred, left, right.anyOf) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
}
function ExtendsAny(inferred, left, right) {
  return IsInfer(right) ? ExtendsRight(inferred, left, right) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsUnion(inferred);
}
function ExtendsImmutable(left, right) {
  const isImmutableLeft = IsImmutable(left);
  const isImmutableRight = IsImmutable(right);
  return isImmutableLeft && isImmutableRight ? true : !isImmutableLeft && isImmutableRight ? true : isImmutableLeft && !isImmutableRight ? false : true;
}
function ExtendsArray(inferred, arrayLeft, left, right) {
  return IsArray2(right) ? ExtendsImmutable(arrayLeft, right) ? ExtendsLeft(inferred, left, right.items) : ExtendsFalse() : ExtendsRight(inferred, arrayLeft, right);
}
function ExtendsAsyncIterator(inferred, left, right) {
  return IsAsyncIterator2(right) ? ExtendsLeft(inferred, left, right.iteratorItems) : ExtendsRight(inferred, AsyncIterator(left), right);
}
function ExtendsBigInt(inferred, left, right) {
  return IsBigInt2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}
function ExtendsBoolean(inferred, left, right) {
  return IsBoolean3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}
function ParameterCompare(inferred, left, leftRest, right, rightRest) {
  const checkLeft = IsInfer(right) ? left : right;
  const checkRight = IsInfer(right) ? right : left;
  const isLeftOptional = IsOptional(left);
  const isRightOptional = IsOptional(right);
  const check = ExtendsLeft(inferred, checkLeft, checkRight);
  return !isLeftOptional && isRightOptional ? ExtendsFalse() : IsExtendsTrueLike(check) ? ExtendsParameters(check.inferred, leftRest, rightRest) : ExtendsFalse();
}
function ParameterRight(inferred, left, leftRest, rightRest) {
  const [head, ...tail] = rightRest;
  return IsSchema(head) ? ParameterCompare(inferred, left, leftRest, head, tail) : IsOptional(left) ? ExtendsTrue(inferred) : ExtendsFalse();
}
function ParametersLeft(inferred, left, rightRest) {
  const [head, ...tail] = left;
  return IsSchema(head) ? ParameterRight(inferred, head, tail, rightRest) : ExtendsTrue(inferred);
}
function ExtendsParameters(inferred, left, right) {
  return ParametersLeft(inferred, left, right);
}
function ExtendsReturnType(inferred, left, right) {
  return IsVoid(right) ? ExtendsTrue(inferred) : ExtendsLeft(inferred, left, right);
}
function ExtendsConstructor(inferred, parameters, returnType, right) {
  return IsConstructor2(right) ? (() => {
    const check = ExtendsParameters(inferred, parameters, right.parameters);
    return IsExtendsTrueLike(check) ? ExtendsReturnType(check.inferred, returnType, right.instanceType) : ExtendsFalse();
  })() : ExtendsFalse();
}
function ExtendsEnum(inferred, left, right) {
  return ExtendsLeft(inferred, EnumToUnion(left), right);
}
function ExtendsFunction(inferred, parameters, returnType, right) {
  return IsFunction2(right) ? (() => {
    const check = ExtendsParameters(inferred, parameters, right.parameters);
    return IsExtendsTrueLike(check) ? ExtendsReturnType(check.inferred, returnType, right.returnType) : ExtendsFalse();
  })() : ExtendsFalse();
}
function ExtendsInteger(inferred, left, right) {
  return IsInteger2(right) ? ExtendsTrue(inferred) : IsNumber3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}
var ResultEqual = "equal";
var ResultDisjoint = "disjoint";
var ResultLeftInside = "left-inside";
var ResultRightInside = "right-inside";
function Compare(left, right) {
  const extendsCheck = [
    IsUnknown(left) ? result_exports.ExtendsFalse() : Extends2({}, left, right),
    IsUnknown(left) ? result_exports.ExtendsTrue({}) : Extends2({}, right, left)
  ];
  return result_exports.IsExtendsTrueLike(extendsCheck[0]) && result_exports.IsExtendsTrueLike(extendsCheck[1]) ? ResultEqual : result_exports.IsExtendsTrueLike(extendsCheck[0]) && result_exports.IsExtendsFalse(extendsCheck[1]) ? ResultLeftInside : result_exports.IsExtendsFalse(extendsCheck[0]) && result_exports.IsExtendsTrueLike(extendsCheck[1]) ? ResultRightInside : ResultDisjoint;
}
function FlattenType(type) {
  const result = IsUnion(type) ? Flatten(type.anyOf) : [type];
  return result;
}
function Flatten(types) {
  return types.reduce((result, type) => {
    return [...result, ...FlattenType(type)];
  }, []);
}
function TupleElementsToProperties(types) {
  const result = types.reduceRight((result2, right, index) => {
    return { [index]: right, ...result2 };
  }, {});
  return result;
}
function TupleToObject(type) {
  const properties = TupleElementsToProperties(type.items);
  const result = Object2(properties);
  return result;
}
function IsReadonlyProperty(left, right) {
  return IsReadonly(left) ? IsReadonly(right) ? true : false : false;
}
function IsOptionalProperty(left, right) {
  return IsOptional(left) ? IsOptional(right) ? true : false : false;
}
function CompositeProperty(left, right) {
  const isReadonly = IsReadonlyProperty(left, right);
  const isOptional = IsOptionalProperty(left, right);
  const evaluated = EvaluateIntersect([left, right]);
  const property = ReadonlyRemove(OptionalRemove(evaluated));
  return isReadonly && isOptional ? ReadonlyAdd(OptionalAdd(property)) : isReadonly && !isOptional ? ReadonlyAdd(property) : !isReadonly && isOptional ? OptionalAdd(property) : property;
}
function CompositePropertyKey(left, right, key) {
  return key in left ? key in right ? CompositeProperty(left[key], right[key]) : left[key] : key in right ? right[key] : Never();
}
function CompositeProperties(left, right) {
  const keys = /* @__PURE__ */ new Set([...guard_exports.Keys(right), ...guard_exports.Keys(left)]);
  return [...keys].reduce((result, key) => {
    return { ...result, [key]: CompositePropertyKey(left, right, key) };
  }, {});
}
function GetProperties(type) {
  const result = IsObject2(type) ? type.properties : IsTuple(type) ? TupleElementsToProperties(type.items) : Unreachable();
  return result;
}
function Composite(left, right) {
  const leftProperties = GetProperties(left);
  const rightProperties = GetProperties(right);
  const properties = CompositeProperties(leftProperties, rightProperties);
  return Object2(properties);
}
function Narrow(left, right) {
  const result = Compare(left, right);
  return guard_exports.IsEqual(result, ResultLeftInside) ? left : guard_exports.IsEqual(result, ResultRightInside) ? right : guard_exports.IsEqual(result, ResultEqual) ? right : Never();
}
function CanDistribute(type) {
  return IsObject2(type) || IsTuple(type);
}
function DistributeNormalize(type) {
  return IsIntersect(type) ? EvaluateIntersect(type.allOf) : type;
}
function DistributeOperation(left, right) {
  const normalLeft = DistributeNormalize(left);
  const normalRight = DistributeNormalize(right);
  const isObjectLeft = CanDistribute(normalLeft);
  const IsObjectRight = CanDistribute(normalRight);
  const result = isObjectLeft && IsObjectRight ? Composite(EvaluateType(normalLeft), normalRight) : isObjectLeft && !IsObjectRight ? EvaluateType(normalLeft) : !isObjectLeft && IsObjectRight ? normalRight : Narrow(EvaluateType(normalLeft), normalRight);
  return result;
}
function DistributeType(type, types, result = []) {
  const [left, ...right] = types;
  return !guard_exports.IsUndefined(left) ? DistributeType(type, right, [...result, DistributeOperation(type, left)]) : result.length === 0 ? [type] : result;
}
function DistributeUnion(types, distribution, result = []) {
  const [left, ...right] = types;
  return IsSchema(left) ? DistributeUnion(right, distribution, [...result, ...Distribute([left], distribution)]) : result;
}
function Distribute(types, result = []) {
  const [left, ...right] = types;
  return IsSchema(left) ? IsUnion(left) ? Distribute(right, DistributeUnion(left.anyOf, result)) : Distribute(right, DistributeType(left, result)) : result;
}
function EvaluateIntersect(types) {
  const distribution = Distribute(types);
  const result = Broaden(distribution);
  return result;
}
function EvaluateUnion(types) {
  const result = Broaden(types);
  return result;
}
function EvaluateType(type) {
  return IsIntersect(type) ? EvaluateIntersect(type.allOf) : IsUnion(type) ? EvaluateUnion(type.anyOf) : type;
}
function BroadFilter(type, types) {
  return types.filter((left) => {
    return Compare(type, left) === ResultRightInside ? false : true;
  });
}
function IsBroadestType(type, types) {
  const result = types.some((left) => {
    const result2 = Compare(type, left);
    return guard_exports.IsEqual(result2, ResultLeftInside) || guard_exports.IsEqual(result2, ResultEqual);
  });
  return guard_exports.IsEqual(result, false);
}
function BroadenType(type, types) {
  const evaluated = EvaluateType(type);
  return IsAny(evaluated) ? [evaluated] : IsBroadestType(evaluated, types) ? [...BroadFilter(evaluated, types), evaluated] : types;
}
function BroadenTypes(types, result = []) {
  const [left, ...right] = types;
  return IsSchema(left) ? IsObject2(left) ? BroadenTypes(right, [...result, left]) : BroadenTypes(right, BroadenType(left, result)) : result;
}
function Broaden(types) {
  const broadened = BroadenTypes(types);
  const flattened = Flatten(broadened);
  const result = flattened.length === 0 ? Never() : flattened.length === 1 ? flattened[0] : Union(flattened);
  return result;
}
function EvaluateImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(EvaluateType(instantiatedType), {}, options);
}
function EvaluateInstantiate(context, state2, type, options) {
  return (
    // [instantiation-rule]
    //
    // Evaluate instantiation should never defer on instantiate as the caller is specifically 
    // requesting that the type be evaluated in whatever context is available. However, actions 
    // embedded in the Evaluate call may defer local to themselves.
    EvaluateImmediate(context, state2, type, options)
  );
}
function ExtendsIntersect(inferred, left, right) {
  const evaluated = EvaluateIntersect(left);
  return ExtendsLeft(inferred, evaluated, right);
}
function ExtendsIterator(inferred, left, right) {
  return IsIterator2(right) ? ExtendsLeft(inferred, left, right.iteratorItems) : ExtendsRight(inferred, Iterator(left), right);
}
function ExtendsLiteralValue(inferred, left, right) {
  return left === right ? ExtendsTrue(inferred) : ExtendsFalse();
}
function ExtendsLiteralBigInt(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsBigInt2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteralBoolean(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsBoolean3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteralNumber(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsNumber3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteralString(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsString3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteral(inferred, left, right) {
  return guard_exports.IsBigInt(left.const) ? ExtendsLiteralBigInt(inferred, left.const, right) : guard_exports.IsBoolean(left.const) ? ExtendsLiteralBoolean(inferred, left.const, right) : guard_exports.IsNumber(left.const) ? ExtendsLiteralNumber(inferred, left.const, right) : guard_exports.IsString(left.const) ? ExtendsLiteralString(inferred, left.const, right) : Unreachable();
}
function ExtendsNever(inferred, left, right) {
  return IsInfer(right) ? ExtendsRight(inferred, left, right) : ExtendsTrue(inferred);
}
function ExtendsNull(inferred, left, right) {
  return IsNull2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}
function ExtendsNumber(inferred, left, right) {
  return IsNumber3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}
function ExtendsPropertyOptional(inferred, left, right) {
  return IsOptional(left) ? IsOptional(right) ? ExtendsTrue(inferred) : ExtendsFalse() : ExtendsTrue(inferred);
}
function ExtendsProperty(inferred, left, right) {
  return (
    // Right TInfer<TNever> is TExtendsFalse
    IsInfer(right) && IsNever(right.extends) ? ExtendsFalse() : (() => {
      const check = ExtendsLeft(inferred, left, right);
      return IsExtendsTrueLike(check) ? ExtendsPropertyOptional(check.inferred, left, right) : ExtendsFalse();
    })()
  );
}
function ExtractInferredProperties(keys, properties) {
  return keys.reduce((result, key) => {
    return key in properties ? IsExtendsTrueLike(properties[key]) ? { ...result, ...properties[key].inferred } : Unreachable() : Unreachable();
  }, {});
}
function ExtendsPropertiesComparer(inferred, left, right) {
  const properties = {};
  for (const rightKey of guard_exports.Keys(right)) {
    properties[rightKey] = rightKey in left ? ExtendsProperty({}, left[rightKey], right[rightKey]) : IsOptional(right[rightKey]) ? IsInfer(right[rightKey]) ? ExtendsTrue(memory_exports.Assign(inferred, { [right[rightKey].name]: right[rightKey].extends })) : ExtendsTrue(inferred) : ExtendsFalse();
  }
  const checked = guard_exports.Values(properties).every((result) => IsExtendsTrueLike(result));
  const extracted = checked ? ExtractInferredProperties(guard_exports.Keys(properties), properties) : {};
  return checked ? ExtendsTrue(extracted) : ExtendsFalse();
}
function ExtendsProperties(inferred, left, right) {
  const compared = ExtendsPropertiesComparer(inferred, left, right);
  return IsExtendsTrueLike(compared) ? ExtendsTrue(memory_exports.Assign(inferred, compared.inferred)) : ExtendsFalse();
}
function ExtendsObjectToObject(inferred, left, right) {
  return ExtendsProperties(inferred, left, right);
}
function ExtendsObject(inferred, left, right) {
  return IsObject2(right) ? ExtendsObjectToObject(inferred, left, right.properties) : ExtendsRight(inferred, Object2(left), right);
}
function ExtendsPromise(inferred, left, right) {
  return IsPromise(right) ? ExtendsLeft(inferred, left, right.item) : ExtendsRight(inferred, Promise2(left), right);
}
function ExtendsString(inferred, left, right) {
  return IsString3(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}
function ExtendsSymbol(inferred, left, right) {
  return IsSymbol2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}
function ExtendsTemplateLiteral(inferred, left, right) {
  const decoded = TemplateLiteralDecode(left);
  return ExtendsLeft(inferred, decoded, right);
}
function Inferrable(name, type) {
  return memory_exports.Create({ "~kind": "Inferrable" }, { name, type }, {});
}
function IsInferable(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "~kind") && guard_exports.HasPropertyKey(value, "name") && guard_exports.HasPropertyKey(value, "type") && guard_exports.IsEqual(value["~kind"], "Inferrable") && guard_exports.IsString(value.name) && guard_exports.IsObject(value.type);
}
function TryRestInferable(type) {
  return IsRest(type) ? IsInfer(type.items) ? IsArray2(type.items.extends) ? Inferrable(type.items.name, type.items.extends.items) : IsUnknown(type.items.extends) ? Inferrable(type.items.name, type.items.extends) : void 0 : Unreachable() : void 0;
}
function TryInferable(type) {
  return IsInfer(type) ? Inferrable(type.name, type.extends) : void 0;
}
function TryInferResults(rest, right, result = []) {
  const [head, ...tail] = rest;
  return IsSchema(head) ? (() => {
    const check = ExtendsLeft({}, head, right);
    return IsExtendsTrueLike(check) ? TryInferResults(tail, right, [...result, head]) : void 0;
  })() : result;
}
function InferTupleResult(inferred, name, left, right) {
  const results = TryInferResults(left, right);
  return guard_exports.IsArray(results) ? ExtendsTrue(memory_exports.Assign(inferred, { [name]: Tuple(results) })) : ExtendsFalse();
}
function InferUnionResult(inferred, name, left, right) {
  const results = TryInferResults(left, right);
  return guard_exports.IsArray(results) ? ExtendsTrue(memory_exports.Assign(inferred, { [name]: Union(results) })) : ExtendsFalse();
}
function Reverse(types) {
  return [...types].reverse();
}
function ApplyReverse(types, reversed) {
  return reversed ? Reverse(types) : types;
}
function Reversed(types) {
  const first = types.length > 0 ? types[0] : void 0;
  const inferrable = IsSchema(first) ? TryRestInferable(first) : void 0;
  return IsSchema(inferrable);
}
function ElementsCompare(inferred, reversed, left, leftRest, right, rightRest) {
  const check = ExtendsLeft(inferred, left, right);
  return IsExtendsTrueLike(check) ? Elements(check.inferred, reversed, leftRest, rightRest) : ExtendsFalse();
}
function ElementsLeft(inferred, reversed, leftRest, right, rightRest) {
  const inferable = TryRestInferable(right);
  return IsInferable(inferable) ? InferTupleResult(inferred, inferable.name, ApplyReverse(leftRest, reversed), inferable.type) : (() => {
    const [head, ...tail] = leftRest;
    return IsSchema(head) ? ElementsCompare(inferred, reversed, head, tail, right, rightRest) : ExtendsFalse();
  })();
}
function ElementsRight(inferred, reversed, leftRest, rightRest) {
  const [head, ...tail] = rightRest;
  return IsSchema(head) ? ElementsLeft(inferred, reversed, leftRest, head, tail) : guard_exports.IsEqual(leftRest.length, 0) ? ExtendsTrue(inferred) : ExtendsFalse();
}
function Elements(inferred, reversed, leftRest, rightRest) {
  return ElementsRight(inferred, reversed, leftRest, rightRest);
}
function ExtendsTupleToTuple(inferred, left, right) {
  const instantiatedRight = InstantiateElements(inferred, { callstack: [] }, right);
  const reversed = Reversed(instantiatedRight);
  return Elements(inferred, reversed, ApplyReverse(left, reversed), ApplyReverse(instantiatedRight, reversed));
}
function ExtendsTupleToArray(inferred, left, right) {
  const inferrable = TryInferable(right);
  return IsInferable(inferrable) ? InferUnionResult(inferred, inferrable.name, left, inferrable.type) : (() => {
    const [head, ...tail] = left;
    return IsSchema(head) ? (() => {
      const check = ExtendsLeft(inferred, head, right);
      return IsExtendsTrueLike(check) ? ExtendsTupleToArray(check.inferred, tail, right) : ExtendsFalse();
    })() : ExtendsTrue(inferred);
  })();
}
function ExtendsTuple(inferred, left, right) {
  const instantiatedLeft = InstantiateElements(inferred, { callstack: [] }, left);
  return IsTuple(right) ? ExtendsTupleToTuple(inferred, instantiatedLeft, right.items) : IsArray2(right) ? ExtendsTupleToArray(inferred, instantiatedLeft, right.items) : ExtendsRight(inferred, Tuple(instantiatedLeft), right);
}
function ExtendsUndefined(inferred, left, right) {
  return IsVoid(right) ? ExtendsTrue(inferred) : IsUndefined2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}
function ExtendsUnionSome(inferred, type, unionTypes) {
  const [head, ...tail] = unionTypes;
  return IsSchema(head) ? (() => {
    const check = ExtendsLeft(inferred, type, head);
    return IsExtendsTrueLike(check) ? ExtendsTrue(check.inferred) : ExtendsUnionSome(inferred, type, tail);
  })() : ExtendsFalse();
}
function ExtendsUnionLeft(inferred, left, right) {
  const [head, ...tail] = left;
  return IsSchema(head) ? (() => {
    const check = ExtendsUnionSome(inferred, head, right);
    return IsExtendsTrueLike(check) ? ExtendsUnionLeft(check.inferred, tail, right) : ExtendsFalse();
  })() : ExtendsTrue(inferred);
}
function ExtendsUnion2(inferred, left, right) {
  const inferrable = TryInferable(right);
  return IsInferable(inferrable) ? InferUnionResult(inferred, inferrable.name, left, inferrable.type) : IsUnion(right) ? ExtendsUnionLeft(inferred, left, right.anyOf) : ExtendsUnionLeft(inferred, left, [right]);
}
function ExtendsUnknown(inferred, left, right) {
  return IsInfer(right) ? ExtendsRight(inferred, left, right) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
}
function ExtendsVoid(inferred, left, right) {
  return IsVoid(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}
function ExtendsLeft(inferred, left, right) {
  return IsAny(left) ? ExtendsAny(inferred, left, right) : IsArray2(left) ? ExtendsArray(inferred, left, left.items, right) : IsAsyncIterator2(left) ? ExtendsAsyncIterator(inferred, left.iteratorItems, right) : IsBigInt2(left) ? ExtendsBigInt(inferred, left, right) : IsBoolean3(left) ? ExtendsBoolean(inferred, left, right) : IsConstructor2(left) ? ExtendsConstructor(inferred, left.parameters, left.instanceType, right) : IsEnum(left) ? ExtendsEnum(inferred, left, right) : IsFunction2(left) ? ExtendsFunction(inferred, left.parameters, left.returnType, right) : IsInteger2(left) ? ExtendsInteger(inferred, left, right) : IsIntersect(left) ? ExtendsIntersect(inferred, left.allOf, right) : IsIterator2(left) ? ExtendsIterator(inferred, left.iteratorItems, right) : IsLiteral(left) ? ExtendsLiteral(inferred, left, right) : IsNever(left) ? ExtendsNever(inferred, left, right) : IsNull2(left) ? ExtendsNull(inferred, left, right) : IsNumber3(left) ? ExtendsNumber(inferred, left, right) : IsObject2(left) ? ExtendsObject(inferred, left.properties, right) : IsPromise(left) ? ExtendsPromise(inferred, left.item, right) : IsString3(left) ? ExtendsString(inferred, left, right) : IsSymbol2(left) ? ExtendsSymbol(inferred, left, right) : IsTemplateLiteral(left) ? ExtendsTemplateLiteral(inferred, left.pattern, right) : IsTuple(left) ? ExtendsTuple(inferred, left.items, right) : IsUndefined2(left) ? ExtendsUndefined(inferred, left, right) : IsUnion(left) ? ExtendsUnion2(inferred, left.anyOf, right) : IsUnknown(left) ? ExtendsUnknown(inferred, left, right) : IsVoid(left) ? ExtendsVoid(inferred, left, right) : ExtendsFalse();
}
function InterfaceDeferred(heritage, properties, options = {}) {
  return Deferred("Interface", [heritage, properties], options);
}
function IsInterfaceDeferred(value) {
  return IsSchema(value) && guard_exports.HasPropertyKey(value, "action") && guard_exports.IsEqual(value.action, "Interface");
}
function Interface(heritage, properties, options = {}) {
  return Instantiate({}, InterfaceDeferred(heritage, properties, options));
}
function FromRef2(stack, context, ref) {
  return stack.includes(ref) ? true : FromType4([...stack, ref], context, context[ref]);
}
function FromProperties(stack, context, properties) {
  const types = PropertyValues(properties);
  return FromTypes2(stack, context, types);
}
function FromTypes2(stack, context, types) {
  const [left, ...right] = types;
  return IsSchema(left) ? FromType4(stack, context, left) ? true : FromTypes2(stack, context, right) : false;
}
function FromType4(stack, context, type) {
  return IsRef(type) ? FromRef2(stack, context, type.$ref) : IsArray2(type) ? FromType4(stack, context, type.items) : IsAsyncIterator2(type) ? FromType4(stack, context, type.iteratorItems) : IsConstructor2(type) ? FromTypes2(stack, context, [...type.parameters, type.instanceType]) : IsFunction2(type) ? FromTypes2(stack, context, [...type.parameters, type.returnType]) : IsInterfaceDeferred(type) ? FromProperties(stack, context, type.parameters[1]) : IsIntersect(type) ? FromTypes2(stack, context, type.allOf) : IsIterator2(type) ? FromType4(stack, context, type.iteratorItems) : IsObject2(type) ? FromProperties(stack, context, type.properties) : IsPromise(type) ? FromType4(stack, context, type.item) : IsUnion(type) ? FromTypes2(stack, context, type.anyOf) : IsTuple(type) ? FromTypes2(stack, context, type.items) : IsRecord(type) ? FromType4(stack, context, RecordValue(type)) : false;
}
function CyclicCheck(stack, context, type) {
  const result = FromType4(stack, context, type);
  return result;
}
function ResolveCandidateKeys(context, keys) {
  return keys.reduce((result, left) => {
    return left in context ? CyclicCheck([left], context, context[left]) ? [...result, left] : result : Unreachable();
  }, []);
}
function CyclicCandidates(context) {
  const keys = PropertyKeys(context);
  const result = ResolveCandidateKeys(context, keys);
  return result;
}
function FromRef3(context, ref, result) {
  return result.includes(ref) ? result : ref in context ? FromType5(context, context[ref], [...result, ref]) : Unreachable();
}
function FromProperties2(context, properties, result) {
  const types = PropertyValues(properties);
  return FromTypes3(context, types, result);
}
function FromTypes3(context, types, result) {
  return types.reduce((result2, left) => {
    return FromType5(context, left, result2);
  }, result);
}
function FromType5(context, type, result) {
  return IsRef(type) ? FromRef3(context, type.$ref, result) : IsArray2(type) ? FromType5(context, type.items, result) : IsAsyncIterator2(type) ? FromType5(context, type.iteratorItems, result) : IsConstructor2(type) ? FromTypes3(context, [...type.parameters, type.instanceType], result) : IsFunction2(type) ? FromTypes3(context, [...type.parameters, type.returnType], result) : IsInterfaceDeferred(type) ? FromProperties2(context, type.parameters[1], result) : IsIntersect(type) ? FromTypes3(context, type.allOf, result) : IsIterator2(type) ? FromType5(context, type.iteratorItems, result) : IsObject2(type) ? FromProperties2(context, type.properties, result) : IsPromise(type) ? FromType5(context, type.item, result) : IsUnion(type) ? FromTypes3(context, type.anyOf, result) : IsTuple(type) ? FromTypes3(context, type.items, result) : IsRecord(type) ? FromType5(context, RecordValue(type), result) : result;
}
function CyclicDependencies(context, key, type) {
  const result = FromType5(context, type, [key]);
  return result;
}
function FromRef4(_ref) {
  return Any();
}
function FromProperties3(properties) {
  return guard_exports.Keys(properties).reduce((result, key) => {
    return { ...result, [key]: FromType6(properties[key]) };
  }, {});
}
function FromTypes4(types) {
  return types.reduce((result, left) => {
    return [...result, FromType6(left)];
  }, []);
}
function FromType6(type) {
  return IsRef(type) ? FromRef4(type.$ref) : IsArray2(type) ? Array2(FromType6(type.items), ArrayOptions(type)) : IsAsyncIterator2(type) ? AsyncIterator(FromType6(type.iteratorItems)) : IsConstructor2(type) ? Constructor(FromTypes4(type.parameters), FromType6(type.instanceType)) : IsFunction2(type) ? Function2(FromTypes4(type.parameters), FromType6(type.returnType)) : IsIntersect(type) ? Intersect(FromTypes4(type.allOf)) : IsIterator2(type) ? Iterator(FromType6(type.iteratorItems)) : IsObject2(type) ? Object2(FromProperties3(type.properties)) : IsPromise(type) ? Promise2(FromType6(type.item)) : IsRecord(type) ? Record(RecordKey(type), FromType6(RecordValue(type))) : IsUnion(type) ? Union(FromTypes4(type.anyOf)) : IsTuple(type) ? Tuple(FromTypes4(type.items)) : type;
}
function CyclicAnyFromParameters(defs, ref) {
  return ref in defs ? FromType6(defs[ref]) : Unknown();
}
function CyclicExtends(type) {
  return CyclicAnyFromParameters(type.$defs, type.$ref);
}
function CyclicInterface(context, heritage, properties) {
  const instantiatedHeritage = InstantiateTypes(context, { callstack: [] }, heritage);
  const instantiatedProperties = InstantiateProperties({}, { callstack: [] }, properties);
  const evaluatedInterface = EvaluateIntersect([...instantiatedHeritage, Object2(instantiatedProperties)]);
  return evaluatedInterface;
}
function CyclicDefinitions(context, dependencies) {
  const keys = guard_exports.Keys(context).filter((key) => dependencies.includes(key));
  return keys.reduce((result, key) => {
    const type = context[key];
    const instantiatedType = IsInterfaceDeferred(type) ? CyclicInterface(context, type.parameters[0], type.parameters[1]) : type;
    return { ...result, [key]: instantiatedType };
  }, {});
}
function InstantiateCyclic(context, ref, type) {
  const dependencies = CyclicDependencies(context, ref, type);
  const definitions = CyclicDefinitions(context, dependencies);
  const result = Cyclic(definitions, ref);
  return result;
}
function Resolve(defs, ref) {
  return ref in defs ? IsRef(defs[ref]) ? Resolve(defs, defs[ref].$ref) : defs[ref] : Never();
}
function CyclicTarget(defs, ref) {
  const result = Resolve(defs, ref);
  return result;
}
function Normal(type) {
  return IsCyclic(type) ? CyclicExtends(type) : type;
}
function Extends2(inferred, left, right) {
  const normalLeft = Normal(left);
  const normalRight = Normal(right);
  return ExtendsLeft(inferred, normalLeft, normalRight);
}
function AssertArgumentExtends(name, type, extends_) {
  if (IsInfer(type) || IsCall(type) || result_exports.IsExtendsTrueLike(Extends2({}, type, extends_)))
    return;
  const cause = { parameter: name, extends: extends_, received: type };
  throw new Error("Generic argument does not satify constraint", { cause });
}
function BindArgument(context, state2, name, extends_, type) {
  const instantiatedArgument = InstantiateType(context, state2, type);
  AssertArgumentExtends(name, instantiatedArgument, extends_);
  return memory_exports.Assign(context, { [name]: instantiatedArgument });
}
function BindArguments(context, state2, parameterLeft, parameterRight, arguments_) {
  const instantiatedExtends = InstantiateType(context, state2, parameterLeft.extends);
  const instantiatedEquals = InstantiateType(context, state2, parameterLeft.equals);
  const [left, ...right] = arguments_;
  return IsSchema(left) ? BindParameters(BindArgument(context, state2, parameterLeft["name"], instantiatedExtends, left), state2, parameterRight, right) : BindParameters(BindArgument(context, state2, parameterLeft["name"], instantiatedExtends, instantiatedEquals), state2, parameterRight, []);
}
function BindParameters(context, state2, parameters, arguments_) {
  const [left, ...right] = parameters;
  return IsSchema(left) ? BindArguments(context, state2, left, right, arguments_) : context;
}
function ResolveArgumentsContext(context, state2, parameters, arguments_) {
  return BindParameters(context, state2, parameters, arguments_);
}
function Peek(callstack) {
  return guard_exports.IsGreaterThan(callstack.length, 0) ? callstack[0] : "";
}
function DeferredCall(context, state2, target, arguments_) {
  const instantiatedArguments = InstantiateTypes(context, state2, arguments_);
  const deferredCall = CallConstruct(target, instantiatedArguments);
  return deferredCall;
}
function TailCall(context, state2, name, arguments_) {
  const deferredCall = DeferredCall(context, state2, Ref(name), arguments_);
  return deferredCall;
}
function HeadCall(context, state2, name, parameters, expression, arguments_) {
  const instantiatedArguments = InstantiateTypes(context, state2, arguments_);
  const argumentsContext = ResolveArgumentsContext(context, state2, parameters, instantiatedArguments);
  const returnType = InstantiateType(argumentsContext, { callstack: [...state2.callstack, name] }, expression);
  return InstantiateType(context, state2, returnType);
}
function CallInstantiate(context, state2, target, arguments_) {
  const [name, type] = ResolveTarget(context, target, arguments_);
  return IsGeneric(type) ? guard_exports.IsEqual(Peek(state2.callstack), name) ? TailCall(context, state2, name, arguments_) : HeadCall(context, state2, name, type.parameters, type.expression, arguments_) : DeferredCall(context, state2, target, arguments_);
}
function CallConstruct(target, arguments_) {
  return memory_exports.Create({ ["~kind"]: "Call" }, { target, arguments: arguments_ }, {});
}
function Call(target, arguments_) {
  return CallInstantiate({}, { callstack: [] }, target, arguments_);
}
function IsCall(value) {
  return IsKind(value, "Call");
}
function AwaitedAction(type) {
  return IsPromise(type) ? AwaitedAction(type.item) : type;
}
function AwaitedImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(AwaitedAction(instantiatedType), {}, options);
}
function AwaitedInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? AwaitedImmediate(context, state2, type, options) : AwaitedDeferred(type, options);
}
function ApplyMapping(mapping, value) {
  return mapping(value);
}
function FromLiteral3(mapping, value) {
  return guard_exports.IsString(value) ? Literal(ApplyMapping(mapping, value)) : Literal(value);
}
function FromTemplateLiteral(mapping, pattern) {
  const decoded = TemplateLiteralDecode(pattern);
  const result = FromType7(mapping, decoded);
  return result;
}
function FromUnion2(mapping, types) {
  const result = types.map((type) => FromType7(mapping, type));
  return Union(result);
}
function FromType7(mapping, type) {
  return IsLiteral(type) ? FromLiteral3(mapping, type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral(mapping, type.pattern) : IsUnion(type) ? FromUnion2(mapping, type.anyOf) : type;
}
function CapitalizeDeferred(type, options = {}) {
  return Deferred("Capitalize", [type], options);
}
function Capitalize(type, options = {}) {
  return Instantiate({}, CapitalizeDeferred(type, options));
}
function LowercaseDeferred(type, options = {}) {
  return Deferred("Lowercase", [type], options);
}
function Lowercase(type, options = {}) {
  return Instantiate({}, LowercaseDeferred(type, options));
}
function UncapitalizeDeferred(type, options = {}) {
  return Deferred("Uncapitalize", [type], options);
}
function Uncapitalize(type, options = {}) {
  return Instantiate({}, UncapitalizeDeferred(type, options));
}
function UppercaseDeferred(type, options = {}) {
  return Deferred("Uppercase", [type], options);
}
function Uppercase(type, options = {}) {
  return Instantiate({}, UppercaseDeferred(type, options));
}
var CapitalizeMapping = (input) => input[0].toUpperCase() + input.slice(1);
var LowercaseMapping = (input) => input.toLowerCase();
var UncapitalizeMapping = (input) => input[0].toLowerCase() + input.slice(1);
var UppercaseMapping = (input) => input.toUpperCase();
function CapitalizeImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(FromType7(CapitalizeMapping, instantiatedType), {}, options);
}
function CapitalizeInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? CapitalizeImmediate(context, state2, type, options) : CapitalizeDeferred(type, options);
}
function LowercaseImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(FromType7(LowercaseMapping, instantiatedType), {}, options);
}
function LowercaseInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? LowercaseImmediate(context, state2, type, options) : LowercaseDeferred(type, options);
}
function UncapitalizeImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(FromType7(UncapitalizeMapping, instantiatedType), {}, options);
}
function UncapitalizeInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? UncapitalizeImmediate(context, state2, type, options) : UncapitalizeDeferred(type, options);
}
function UppercaseImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(FromType7(UppercaseMapping, instantiatedType), {}, options);
}
function UppercaseInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? UppercaseImmediate(context, state2, type, options) : UppercaseDeferred(type, options);
}
function ConditionalDeferred(left, right, true_, false_, options = {}) {
  return Deferred("Conditional", [left, right, true_, false_], options);
}
function Conditional(left, right, true_, false_, options = {}) {
  return Instantiate({}, ConditionalDeferred(left, right, true_, false_, options));
}
function ConditionalImmediate(context, state2, left, right, true_, false_, options) {
  const instantiatedLeft = InstantiateType(context, state2, left);
  const instantiatedRight = InstantiateType(context, state2, right);
  const extendsResult = Extends2(context, instantiatedLeft, instantiatedRight);
  return memory_exports.Update(result_exports.IsExtendsUnion(extendsResult) ? Union([InstantiateType(extendsResult.inferred, state2, true_), InstantiateType(context, state2, false_)]) : result_exports.IsExtendsTrue(extendsResult) ? InstantiateType(extendsResult.inferred, state2, true_) : InstantiateType(context, state2, false_), {}, options);
}
function ConditionalInstantiate(context, state2, left, right, true_, false_, options) {
  return CanInstantiate(context, [left, right]) ? ConditionalImmediate(context, state2, left, right, true_, false_, options) : ConditionalDeferred(left, right, true_, false_, options);
}
function ConstructorParametersDeferred(type, options = {}) {
  return Deferred("ConstructorParameters", [type], options);
}
function ConstructorParameters(type, options = {}) {
  return Instantiate({}, ConstructorParametersDeferred(type, options));
}
function ConstructorParametersAction(type) {
  return IsConstructor2(type) ? InstantiateType({}, { callstack: [] }, Tuple(type.parameters)) : Never();
}
function ConstructorParametersImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(ConstructorParametersAction(instantiatedType), {}, options);
}
function ConstructorParametersInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? ConstructorParametersImmediate(context, state2, type, options) : ConstructorParametersDeferred(type, options);
}
function ExcludeDeferred(left, right, options = {}) {
  return Deferred("Exclude", [left, right], options);
}
function Exclude(left, right, options = {}) {
  return Instantiate({}, ExcludeDeferred(left, right, options));
}
function ExcludeUnion(types, right) {
  return types.reduce((result, head) => {
    return [...result, ...ExcludeType(head, right)];
  }, []);
}
function ExcludeType(left, right) {
  const check = Extends2({}, left, right);
  const result = result_exports.IsExtendsTrueLike(check) ? [] : [left];
  return result;
}
function ExcludeAction(left, right) {
  const remaining = IsEnum(left) ? ExcludeUnion(EnumValuesToVariants(left.enum), right) : IsUnion(left) ? ExcludeUnion(Flatten(left.anyOf), right) : ExcludeType(left, right);
  const result = EvaluateUnion(remaining);
  return result;
}
function ExcludeImmediate(context, state2, left, right, options) {
  const instantiatedLeft = InstantiateType(context, state2, left);
  const instantiatedRight = InstantiateType(context, state2, right);
  return memory_exports.Update(ExcludeAction(instantiatedLeft, instantiatedRight), {}, options);
}
function ExcludeInstantiate(context, state2, left, right, options) {
  return CanInstantiate(context, [left, right]) ? ExcludeImmediate(context, state2, left, right, options) : ExcludeDeferred(left, right, options);
}
function ExtractDeferred(left, right, options = {}) {
  return Deferred("Extract", [left, right], options);
}
function Extract(left, right, options = {}) {
  return Instantiate({}, ExtractDeferred(left, right, options));
}
function ExtractUnion(types, right) {
  return types.reduce((result, head) => {
    return [...result, ...ExtractType(head, right)];
  }, []);
}
function ExtractType(left, right) {
  const check = Extends2({}, left, right);
  const result = result_exports.IsExtendsTrueLike(check) ? [left] : [];
  return result;
}
function ExtractAction(left, right) {
  const remaining = IsEnum(left) ? ExtractUnion(EnumValuesToVariants(left.enum), right) : IsUnion(left) ? ExtractUnion(Flatten(left.anyOf), right) : ExtractType(left, right);
  const result = EvaluateUnion(remaining);
  return result;
}
function ExtractImmediate(context, state2, left, right, options) {
  const instantiatedLeft = InstantiateType(context, state2, left);
  const instantiatedRight = InstantiateType(context, state2, right);
  return memory_exports.Update(ExtractAction(instantiatedLeft, instantiatedRight), {}, options);
}
function ExtractInstantiate(context, state2, left, right, options) {
  return CanInstantiate(context, [left, right]) ? ExtractImmediate(context, state2, left, right, options) : ExtractDeferred(left, right, options);
}
var integerKeyPattern = new RegExp("^(?:0|[1-9][0-9]*)$");
function ConvertToIntegerKey(value) {
  const normal = `${value}`;
  return integerKeyPattern.test(normal) ? parseInt(normal) : value;
}
function NormalizeLiteral(value) {
  return Literal(ConvertToIntegerKey(value));
}
function NormalizeIndexerTypes(types) {
  return types.map((type) => NormalizeIndexer(type));
}
function NormalizeIndexer(type) {
  return IsIntersect(type) ? Intersect(NormalizeIndexerTypes(type.allOf)) : IsUnion(type) ? Union(NormalizeIndexerTypes(type.anyOf)) : IsLiteral(type) ? NormalizeLiteral(type.const) : type;
}
function FromArray3(type, indexer) {
  const normalizedIndexer = NormalizeIndexer(indexer);
  const check = Extends2({}, normalizedIndexer, Number2());
  const result = result_exports.IsExtendsTrueLike(check) ? type : Never();
  return result;
}
function FromCyclic(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const result = FromType8(target);
  return result;
}
function FromUnion3(types) {
  return types.reduce((result, left) => {
    return [...result, ...FromType8(left)];
  }, []);
}
function FromEnum(values) {
  const variants = EnumValuesToVariants(values);
  const result = FromUnion3(variants);
  return result;
}
function FromIntersect(types) {
  const evaluated = EvaluateIntersect(types);
  const result = FromType8(evaluated);
  return result;
}
function FromLiteral4(value) {
  const result = [`${value}`];
  return result;
}
function FromTemplateLiteral2(pattern) {
  const decoded = TemplateLiteralDecode(pattern);
  const result = FromType8(decoded);
  return result;
}
function FromType8(type) {
  return IsCyclic(type) ? FromCyclic(type.$defs, type.$ref) : IsEnum(type) ? FromEnum(type.enum) : IsIntersect(type) ? FromIntersect(type.allOf) : IsLiteral(type) ? FromLiteral4(type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral2(type.pattern) : IsUnion(type) ? FromUnion3(type.anyOf) : [];
}
function ToIndexableKeys(type) {
  const result = FromType8(type);
  return result;
}
function SelectProperty(properties, indexer) {
  const result = indexer in properties ? [properties[indexer]] : [];
  return result;
}
function SelectProperties(properties, indexer) {
  return indexer.reduce((result, left) => {
    return [...result, ...SelectProperty(properties, left)];
  }, []);
}
function FromObject3(properties, indexer) {
  const keys = ToIndexableKeys(indexer);
  const variants = SelectProperties(properties, keys);
  const result = EvaluateUnion(variants);
  return result;
}
function ConvertLiteral(value) {
  return Literal(ConvertToIntegerKey(value));
}
function ArrayIndexerTypes(types) {
  return types.map((type) => FormatArrayIndexer(type));
}
function FormatArrayIndexer(type) {
  return IsIntersect(type) ? Intersect(ArrayIndexerTypes(type.allOf)) : IsUnion(type) ? Union(ArrayIndexerTypes(type.anyOf)) : IsLiteral(type) ? ConvertLiteral(type.const) : type;
}
function IndexElementsWithIndexer(types, indexer) {
  return types.reduceRight((result, right, index) => {
    const check = Extends2({}, Literal(index), indexer);
    return result_exports.IsExtendsTrueLike(check) ? [right, ...result] : result;
  }, []);
}
function FromTupleWithIndexer(types, indexer) {
  const formattedArrayIndexer = FormatArrayIndexer(indexer);
  const elements = IndexElementsWithIndexer(types, formattedArrayIndexer);
  return EvaluateUnion(elements);
}
function FromTupleWithoutIndexer(types) {
  return EvaluateUnion(types);
}
function FromTuple(types, indexer) {
  return IsNumber3(indexer) || IsInteger2(indexer) ? FromTupleWithoutIndexer(types) : FromTupleWithIndexer(types, indexer);
}
function KeysToLiterals(keys) {
  return keys.reduce((result, left) => {
    return IsLiteralValue(left) ? [...result, Literal(left)] : result;
  }, []);
}
function KeysToIndexer(keys) {
  const literals = KeysToLiterals(keys);
  const result = Union(literals);
  return result;
}
function IndexDeferred(type, indexer, options = {}) {
  return Deferred("Index", [type, indexer], options);
}
function Index(type, indexer_or_keys, options = {}) {
  const indexer = guard_exports.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
  return Instantiate({}, IndexDeferred(type, indexer, options));
}
function FromCyclic2(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const result = FromType9(target);
  return result;
}
function CollapseIntersectProperties(left, right) {
  const leftKeys = guard_exports.Keys(left).filter((key) => !guard_exports.HasPropertyKey(right, key));
  const rightKeys = guard_exports.Keys(right).filter((key) => !guard_exports.HasPropertyKey(left, key));
  const sharedKeys = guard_exports.Keys(left).filter((key) => guard_exports.HasPropertyKey(right, key));
  const leftProperties = leftKeys.reduce((result, key) => ({ ...result, [key]: left[key] }), {});
  const rightProperties = rightKeys.reduce((result, key) => ({ ...result, [key]: right[key] }), {});
  const sharedProperties = sharedKeys.reduce((result, key) => ({ ...result, [key]: EvaluateIntersect([left[key], right[key]]) }), {});
  const unique = memory_exports.Assign(leftProperties, rightProperties);
  const shared = memory_exports.Assign(unique, sharedProperties);
  return shared;
}
function FromIntersect2(types) {
  return types.reduce((result, left) => {
    return CollapseIntersectProperties(result, FromType9(left));
  }, {});
}
function FromObject4(properties) {
  return properties;
}
function FromTuple2(types) {
  const object = TupleToObject(Tuple(types));
  const result = FromType9(object);
  return result;
}
function CollapseUnionProperties(left, right) {
  const sharedKeys = guard_exports.Keys(left).filter((key) => key in right);
  const result = sharedKeys.reduce((result2, key) => {
    return { ...result2, [key]: EvaluateUnion([left[key], right[key]]) };
  }, {});
  return result;
}
function ReduceVariants(types, result) {
  const [left, ...right] = types;
  return IsSchema(left) ? ReduceVariants(right, CollapseUnionProperties(result, FromType9(left))) : result;
}
function FromUnion4(types) {
  const [left, ...right] = types;
  return IsSchema(left) ? ReduceVariants(right, FromType9(left)) : Unreachable();
}
function FromType9(type) {
  return IsCyclic(type) ? FromCyclic2(type.$defs, type.$ref) : IsIntersect(type) ? FromIntersect2(type.allOf) : IsUnion(type) ? FromUnion4(type.anyOf) : IsTuple(type) ? FromTuple2(type.items) : IsObject2(type) ? FromObject4(type.properties) : {};
}
function CollapseToObject(type) {
  const properties = FromType9(type);
  const result = Object2(properties);
  return result;
}
function NormalizeType(type) {
  const result = IsCyclic(type) || IsIntersect(type) || IsUnion(type) ? CollapseToObject(type) : type;
  return result;
}
function IndexAction(type, indexer) {
  const normal = NormalizeType(type);
  return IsArray2(normal) ? FromArray3(normal.items, indexer) : IsObject2(normal) ? FromObject3(normal.properties, indexer) : IsTuple(normal) ? FromTuple(normal.items, indexer) : Never();
}
function IndexImmediate(context, state2, type, indexer, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  const instantiatedIndexer = InstantiateType(context, state2, indexer);
  return memory_exports.Update(IndexAction(instantiatedType, instantiatedIndexer), {}, options);
}
function IndexInstantiate(context, state2, type, indexer, options) {
  return CanInstantiate(context, [type, indexer]) ? IndexImmediate(context, state2, type, indexer, options) : IndexDeferred(type, indexer, options);
}
function InstanceTypeDeferred(type, options = {}) {
  return Deferred("InstanceType", [type], options);
}
function InstanceType(type, options = {}) {
  return Instantiate({}, InstanceTypeDeferred(type, options));
}
function InstanceTypeAction(type) {
  return IsConstructor2(type) ? type.instanceType : Never();
}
function InstanceTypeImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(InstanceTypeAction(instantiatedType), {}, options);
}
function InstanceTypeInstantiate(context, state2, type, options = {}) {
  return CanInstantiate(context, [type]) ? InstanceTypeImmediate(context, state2, type, options) : InstanceTypeDeferred(type, options);
}
function InterfaceImmediate(context, state2, heritage, properties, options) {
  const instantiatedHeritage = InstantiateTypes(context, { callstack: [] }, heritage);
  const instantiatedProperties = InstantiateProperties(context, { callstack: [] }, properties);
  const evaluatedInterface = EvaluateIntersect([...instantiatedHeritage, Object2(instantiatedProperties)]);
  return memory_exports.Update(evaluatedInterface, {}, options);
}
function InterfaceInstantiate(context, state2, heritage, properties, options) {
  return CanInstantiate(context, heritage) ? InterfaceImmediate(context, state2, heritage, properties, options) : InterfaceDeferred(heritage, properties, options);
}
function KeyOfDeferred(type, options = {}) {
  return Deferred("KeyOf", [type], options);
}
function KeyOf2(type, options = {}) {
  return Instantiate({}, KeyOfDeferred(type, options));
}
function FromAny() {
  return Union([Number2(), String2(), Symbol2()]);
}
function FromArray4(_type) {
  return Number2();
}
function FromPropertyKeys(keys) {
  const result = keys.reduce((result2, left) => {
    return IsLiteralValue(left) ? [...result2, Literal(ConvertToIntegerKey(left))] : Unreachable();
  }, []);
  return result;
}
function FromObject5(properties) {
  const propertyKeys = guard_exports.Keys(properties);
  const variants = FromPropertyKeys(propertyKeys);
  const result = EvaluateUnion(variants);
  return result;
}
function FromRecord(type) {
  return RecordKey(type);
}
function FromTuple3(types) {
  const result = types.map((_, index) => Literal(index));
  return EvaluateUnion(result);
}
function NormalizeType2(type) {
  const result = IsCyclic(type) || IsIntersect(type) || IsUnion(type) ? CollapseToObject(type) : type;
  return result;
}
function KeyOfAction(type) {
  const normal = NormalizeType2(type);
  return IsAny(normal) ? FromAny() : IsArray2(normal) ? FromArray4(normal.items) : IsObject2(normal) ? FromObject5(normal.properties) : IsRecord(normal) ? FromRecord(normal) : IsTuple(normal) ? FromTuple3(normal.items) : Never();
}
function KeyOfImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(KeyOfAction(instantiatedType), {}, options);
}
function KeyOfInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? KeyOfImmediate(context, state2, type, options) : KeyOfDeferred(type, options);
}
function FromTemplateLiteral3(pattern) {
  const decoded = TemplateLiteralDecode(pattern);
  const result = FromType10(decoded);
  return result;
}
function FromUnion5(types) {
  return types.reduce((result, left) => {
    return [...result, ...FromType10(left)];
  }, []);
}
function FromType10(type) {
  const result = IsEnum(type) ? FromUnion5(EnumValuesToVariants(type.enum)) : IsLiteralString(type) || IsLiteralNumber(type) ? [type] : IsTemplateLiteral(type) ? FromTemplateLiteral3(type.pattern) : IsUnion(type) ? FromUnion5(type.anyOf) : [];
  return result;
}
function MappedKeys(type) {
  const result = FromType10(type);
  return result;
}
function MappedDeferred(identifier2, key, as, property, options = {}) {
  return Deferred("Mapped", [identifier2, key, as, property], options);
}
function Mapped2(identifier2, key, as, property, options = {}) {
  return Instantiate({}, MappedDeferred(identifier2, key, as, property, options));
}
function InstantiateKeyAs(context, state2, identifier2, key, as) {
  const contextWithKey = memory_exports.Assign(context, { [identifier2["name"]]: key });
  const instantiatedKeyAs = InstantiateType(contextWithKey, state2, as);
  const result = IsTemplateLiteral(instantiatedKeyAs) ? TemplateLiteralDecode(instantiatedKeyAs.pattern) : instantiatedKeyAs;
  return result;
}
function InstantiateProperty(context, state2, identifier2, key, property) {
  const contextWithKey = memory_exports.Assign(context, { [identifier2["name"]]: key });
  const instantiatedProperty = InstantiateType(contextWithKey, state2, property);
  return instantiatedProperty;
}
function MappedProperty(context, state2, identifier2, key, as, property) {
  const instantiatedProperty = InstantiateProperty(context, state2, identifier2, key, property);
  const instantiatedKeyAs = InstantiateKeyAs(context, state2, identifier2, key, as);
  return IsLiteralString(instantiatedKeyAs) || IsLiteralNumber(instantiatedKeyAs) ? { [instantiatedKeyAs.const]: instantiatedProperty } : {};
}
function MappedProperties(context, state2, identifier2, keys, as, type) {
  return keys.reduce((result, left) => {
    return { ...result, ...MappedProperty(context, state2, identifier2, left, as, type) };
  }, {});
}
function MappedAction(context, state2, identifier2, key, as, type) {
  const keys = MappedKeys(key);
  const mapped = MappedProperties(context, state2, identifier2, keys, as, type);
  const result = Object2(mapped);
  return result;
}
function MappedImmediate(context, state2, identifier2, key, as, property, options) {
  const instantiatedKey = InstantiateType(context, state2, key);
  return memory_exports.Update(MappedAction(context, state2, identifier2, instantiatedKey, as, property), {}, options);
}
function MappedInstantiate(context, state2, identifier2, key, as, property, options) {
  return CanInstantiate(context, [key]) ? MappedImmediate(context, state2, identifier2, key, as, property, options) : MappedDeferred(identifier2, key, as, property, options);
}
function InstantiateCyclics(context, cyclicKeys) {
  const keys = guard_exports.Keys(context).filter((key) => cyclicKeys.includes(key));
  return keys.reduce((result, key) => {
    return { ...result, [key]: InstantiateCyclic(context, key, context[key]) };
  }, {});
}
function InstantiateNonCyclics(context, cyclicKeys) {
  const keys = guard_exports.Keys(context).filter((key) => !cyclicKeys.includes(key));
  return keys.reduce((result, key) => {
    return { ...result, [key]: InstantiateType(context, { callstack: [] }, context[key]) };
  }, {});
}
function InstantiateModule(context, options) {
  const cyclicCandidates = CyclicCandidates(context);
  const instantiatedCyclics = InstantiateCyclics(context, cyclicCandidates);
  const instantiatedNonCyclics = InstantiateNonCyclics(context, cyclicCandidates);
  const instantiatedModule = { ...instantiatedCyclics, ...instantiatedNonCyclics };
  return memory_exports.Update(instantiatedModule, {}, options);
}
function ModuleInstantiate(context, _state2, properties, options) {
  const moduleContext = memory_exports.Assign(context, properties);
  const instantiatedModule = InstantiateModule(moduleContext, options);
  return instantiatedModule;
}
function NonNullableDeferred(type, options = {}) {
  return Deferred("NonNullable", [type], options);
}
function NonNullable(type, options = {}) {
  return Instantiate({}, NonNullableDeferred(type, options));
}
function NonNullableAction(type) {
  const excluded = Union([Null(), Undefined()]);
  return ExcludeInstantiate({}, { callstack: [] }, type, excluded, {});
}
function NonNullableImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(NonNullableAction(instantiatedType), {}, options);
}
function NonNullableInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? NonNullableImmediate(context, state2, type, options) : NonNullableDeferred(type, options);
}
function ToIndexable(type) {
  const collapsed = CollapseToObject(type);
  const result = IsObject2(collapsed) ? collapsed.properties : Unreachable();
  return result;
}
function OmitDeferred(type, indexer, options = {}) {
  return Deferred("Omit", [type, indexer], options);
}
function Omit(type, indexer_or_keys, options = {}) {
  const indexer = guard_exports.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
  return Instantiate({}, OmitDeferred(type, indexer, options));
}
function FromKeys(properties, keys) {
  const result = guard_exports.Keys(properties).reduce((result2, key) => {
    return keys.includes(key) ? result2 : { ...result2, [key]: properties[key] };
  }, {});
  return result;
}
function OmitAction(type, indexer) {
  const indexable = ToIndexable(type);
  const indexableKeys = ToIndexableKeys(indexer);
  const omitted = FromKeys(indexable, indexableKeys);
  const result = Object2(omitted);
  return result;
}
function OmitImmediate(context, state2, type, indexer, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  const instantiatedIndexer = InstantiateType(context, state2, indexer);
  return memory_exports.Update(OmitAction(instantiatedType, instantiatedIndexer), {}, options);
}
function OmitInstantiate(context, state2, type, indexer, options) {
  return CanInstantiate(context, [type, indexer]) ? OmitImmediate(context, state2, type, indexer, options) : OmitDeferred(type, indexer, options);
}
function OptionsDeferred(type, options) {
  return Deferred("Options", [type, options], {});
}
function Options2(type, options) {
  return Instantiate({}, OptionsDeferred(type, options));
}
function OptionsImmediate(context, state2, type, options) {
  const instaniatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(instaniatedType, {}, options);
}
function OptionsInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? OptionsImmediate(context, state2, type, options) : OptionsDeferred(type, options);
}
function ParametersDeferred(type, options = {}) {
  return Deferred("Parameters", [type], options);
}
function Parameters(type, options = {}) {
  return Instantiate({}, ParametersDeferred(type, options));
}
function ParametersAction(type) {
  return IsFunction2(type) ? InstantiateType({}, { callstack: [] }, Tuple(type.parameters)) : Never();
}
function ParametersImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(ParametersAction(instantiatedType), {}, options);
}
function ParametersInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? ParametersImmediate(context, state2, type, options) : ParametersDeferred(type, options);
}
function PartialDeferred(type, options = {}) {
  return Deferred("Partial", [type], options);
}
function Partial(type, options = {}) {
  return Instantiate({}, PartialDeferred(type, options));
}
function FromCyclic3(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const partial = FromType11(target);
  const result = Cyclic(memory_exports.Assign(defs, { [ref]: partial }), ref);
  return result;
}
function FromIntersect3(types) {
  const result = types.map((type) => FromType11(type));
  return EvaluateIntersect(result);
}
function FromUnion6(types) {
  const result = types.map((type) => FromType11(type));
  return Union(result);
}
function FromObject6(properties) {
  const mapped = guard_exports.Keys(properties).reduce((result2, left) => {
    return { ...result2, [left]: Optional(properties[left]) };
  }, {});
  const result = Object2(mapped);
  return result;
}
function FromType11(type) {
  return IsCyclic(type) ? FromCyclic3(type.$defs, type.$ref) : IsIntersect(type) ? FromIntersect3(type.allOf) : IsUnion(type) ? FromUnion6(type.anyOf) : IsObject2(type) ? FromObject6(type.properties) : Object2({});
}
function PartialImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(FromType11(instantiatedType), {}, options);
}
function PartialInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? PartialImmediate(context, state2, type, options) : PartialDeferred(type, options);
}
function PickDeferred(type, indexer, options = {}) {
  return Deferred("Pick", [type, indexer], options);
}
function Pick(type, indexer_or_keys, options = {}) {
  const indexer = guard_exports.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
  return Instantiate({}, PickDeferred(type, indexer, options));
}
function FromKeys2(properties, keys) {
  const result = guard_exports.Keys(properties).reduce((result2, key) => {
    return keys.includes(key) ? memory_exports.Assign(result2, { [key]: properties[key] }) : result2;
  }, {});
  return result;
}
function PickAction(type, indexer) {
  const indexable = ToIndexable(type);
  const keys = ToIndexableKeys(indexer);
  const applied = FromKeys2(indexable, keys);
  const result = Object2(applied);
  return result;
}
function PickImmediate(context, state2, type, indexer, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  const instantiatedIndexer = InstantiateType(context, state2, indexer);
  return memory_exports.Update(PickAction(instantiatedType, instantiatedIndexer), {}, options);
}
function PickInstantiate(context, state2, type, indexer, options) {
  return CanInstantiate(context, [type, indexer]) ? PickImmediate(context, state2, type, indexer, options) : PickDeferred(type, indexer, options);
}
function ReadonlyTypeDeferred(type, options = {}) {
  return Deferred("ReadonlyType", [type], options);
}
function ReadonlyType(type, options = {}) {
  return Instantiate({}, ReadonlyTypeDeferred(type, options));
}
function FromArray5(type) {
  const result = Immutable(Array2(type));
  return result;
}
function FromCyclic4(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const partial = FromType12(target);
  const result = Cyclic(memory_exports.Assign(defs, { [ref]: partial }), ref);
  return result;
}
function FromIntersect4(types) {
  const result = types.map((type) => FromType12(type));
  return EvaluateIntersect(result);
}
function FromObject7(properties) {
  const mapped = guard_exports.Keys(properties).reduce((result2, left) => {
    return { ...result2, [left]: Readonly(properties[left]) };
  }, {});
  const result = Object2(mapped);
  return result;
}
function FromTuple4(types) {
  const result = Immutable(Tuple(types));
  return result;
}
function FromUnion7(types) {
  const result = types.map((type) => FromType12(type));
  return Union(result);
}
function FromType12(type) {
  return IsArray2(type) ? FromArray5(type.items) : IsCyclic(type) ? FromCyclic4(type.$defs, type.$ref) : IsIntersect(type) ? FromIntersect4(type.allOf) : IsObject2(type) ? FromObject7(type.properties) : IsTuple(type) ? FromTuple4(type.items) : IsUnion(type) ? FromUnion7(type.anyOf) : type;
}
function ReadonlyTypeImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(FromType12(instantiatedType), {}, options);
}
function ReadonlyTypeInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? ReadonlyTypeImmediate(context, state2, type, options) : ReadonlyTypeDeferred(type, options);
}
function FromAnyKey(value) {
  return CreateRecord(StringKey, value);
}
function FromBooleanKey(value) {
  return Object2({ true: value, false: value });
}
function FromEnumKey(values, value) {
  const unionKey = EnumValuesToUnion(values);
  const result = FromKey(unionKey, value);
  return result;
}
function FromIntegerKey(key, value) {
  const result = CreateRecord(IntegerKey, value);
  return result;
}
function FromIntersectKey(types, value) {
  const evaluatedKey = EvaluateIntersect(types);
  const result = FromKey(evaluatedKey, value);
  return result;
}
function FromLiteralKey(key, value) {
  return guard_exports.IsString(key) || guard_exports.IsNumber(key) ? Object2({ [key]: value }) : guard_exports.IsEqual(key, false) ? Object2({ false: value }) : guard_exports.IsEqual(key, true) ? Object2({ true: value }) : Object2({});
}
function FromNumberKey(key, value) {
  const result = CreateRecord(NumberKey, value);
  return result;
}
function FromStringKey(key, value) {
  return guard_exports.HasPropertyKey(key, "pattern") && (guard_exports.IsString(key.pattern) || key.pattern instanceof RegExp) ? CreateRecord(key.pattern.toString(), value) : CreateRecord(StringKey, value);
}
function FromTemplateKey(pattern, value) {
  const types = ParsePatternIntoTypes(pattern);
  const finite = TemplateLiteralFinite(types);
  const result = finite ? FromKey(TemplateLiteralDecode(pattern), value) : CreateRecord(pattern, value);
  return result;
}
function StringOrNumberCheck(types) {
  return types.some((type) => IsString3(type) || IsNumber3(type) || IsInteger2(type));
}
function TryBuildRecord(types, value) {
  return guard_exports.IsEqual(StringOrNumberCheck(types), true) ? CreateRecord(StringKey, value) : void 0;
}
function CreateProperties(types, value) {
  return types.reduce((result, left) => {
    return IsLiteral(left) && (guard_exports.IsString(left.const) || guard_exports.IsNumber(left.const)) ? { ...result, [left.const]: value } : result;
  }, {});
}
function CreateObject(types, value) {
  const properties = CreateProperties(types, value);
  const result = Object2(properties);
  return result;
}
function FromUnionKey(types, value) {
  const flattened = Flatten(types);
  const record = TryBuildRecord(flattened, value);
  return IsSchema(record) ? record : CreateObject(flattened, value);
}
function FromKey(key, value) {
  const result = IsAny(key) ? FromAnyKey(value) : IsBoolean3(key) ? FromBooleanKey(value) : IsEnum(key) ? FromEnumKey(key.enum, value) : IsInteger2(key) ? FromIntegerKey(key, value) : IsIntersect(key) ? FromIntersectKey(key.allOf, value) : IsLiteral(key) ? FromLiteralKey(key.const, value) : IsNumber3(key) ? FromNumberKey(key, value) : IsUnion(key) ? FromUnionKey(key.anyOf, value) : IsString3(key) ? FromStringKey(key, value) : IsTemplateLiteral(key) ? FromTemplateKey(key.pattern, value) : Object2({});
  return result;
}
function RecordImmediate(context, state2, key, value, options) {
  const instanstiatedKey = InstantiateType(context, state2, key);
  const instantiatedValue = InstantiateType(context, state2, value);
  return memory_exports.Update(FromKey(instanstiatedKey, instantiatedValue), {}, options);
}
function RecordInstantiate(context, state2, key, value, options) {
  return CanInstantiate(context, [key]) ? RecordImmediate(context, state2, key, value, options) : RecordDeferred(key, value, options);
}
function RefInstantiate(context, state2, ref) {
  return ref in context ? CyclicCheck([ref], context, context[ref]) ? Ref(ref) : InstantiateType(context, state2, context[ref]) : Ref(ref);
}
function FromCyclic5(defs, ref) {
  const target = CyclicTarget(defs, ref);
  const partial = FromType13(target);
  const result = Cyclic(memory_exports.Assign(defs, { [ref]: partial }), ref);
  return result;
}
function FromIntersect5(types) {
  const result = types.map((type) => FromType13(type));
  return EvaluateIntersect(result);
}
function FromUnion8(types) {
  const result = types.map((type) => FromType13(type));
  return Union(result);
}
function FromObject8(properties) {
  const mapped = guard_exports.Keys(properties).reduce((result2, left) => {
    return { ...result2, [left]: OptionalRemove(properties[left]) };
  }, {});
  const result = Object2(mapped);
  return result;
}
function FromType13(type) {
  return IsCyclic(type) ? FromCyclic5(type.$defs, type.$ref) : IsIntersect(type) ? FromIntersect5(type.allOf) : IsUnion(type) ? FromUnion8(type.anyOf) : IsObject2(type) ? FromObject8(type.properties) : Object2({});
}
function RequiredDeferred(type, options = {}) {
  return Deferred("Required", [type], options);
}
function Required(type, options = {}) {
  return Instantiate({}, RequiredDeferred(type, options));
}
function RequiredImmediate(context, state2, type, options) {
  const instaniatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(FromType13(instaniatedType), {}, options);
}
function RequiredInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? RequiredImmediate(context, state2, type, options) : RequiredDeferred(type, options);
}
function ReturnTypeDeferred(type, options = {}) {
  return Deferred("ReturnType", [type], options);
}
function ReturnType(type, options = {}) {
  return Instantiate({}, ReturnTypeDeferred(type, options));
}
function ReturnTypeAction(type) {
  return IsFunction2(type) ? type.returnType : Never();
}
function ReturnTypeImmediate(context, state2, type, options) {
  const instantiatedType = InstantiateType(context, state2, type);
  return memory_exports.Update(ReturnTypeAction(instantiatedType), {}, options);
}
function ReturnTypeInstantiate(context, state2, type, options) {
  return CanInstantiate(context, [type]) ? ReturnTypeImmediate(context, state2, type, options) : ReturnTypeDeferred(type, options);
}
function TemplateLiteralCreate(pattern) {
  return memory_exports.Create({ ["~kind"]: "TemplateLiteral" }, { type: "string", pattern }, {});
}
function JoinString(input) {
  return input.join("|");
}
function UnwrapTemplateLiteralPattern(pattern) {
  return pattern.slice(1, pattern.length - 1);
}
function EncodeLiteral(value, right, pattern) {
  return EncodeTypes(right, `${pattern}${value}`);
}
function EncodeBigInt(right, pattern) {
  return EncodeTypes(right, `${pattern}${BigIntPattern}`);
}
function EncodeInteger(right, pattern) {
  return EncodeTypes(right, `${pattern}${IntegerPattern}`);
}
function EncodeNumber(right, pattern) {
  return EncodeTypes(right, `${pattern}${NumberPattern}`);
}
function EncodeBoolean(right, pattern) {
  return EncodeType(Union([Literal("false"), Literal("true")]), right, pattern);
}
function EncodeString(right, pattern) {
  return EncodeTypes(right, `${pattern}${StringPattern}`);
}
function EncodeTemplateLiteral(templatePattern, right, pattern) {
  return EncodeTypes(right, `${pattern}${UnwrapTemplateLiteralPattern(templatePattern)}`);
}
function EncodeEnum(types, right, pattern, result = []) {
  const variants = EnumValuesToVariants(types);
  return EncodeUnion(variants, right, pattern);
}
function EncodeUnion(types, right, pattern, result = []) {
  const [head, ...tail] = types;
  return IsSchema(head) ? EncodeUnion(tail, right, pattern, [...result, EncodeType(head, [], "")]) : EncodeTypes(right, `${pattern}(${JoinString(result)})`);
}
function EncodeType(type, right, pattern) {
  return IsEnum(type) ? EncodeEnum(type.enum, right, pattern) : IsInteger2(type) ? EncodeInteger(right, pattern) : IsLiteral(type) ? EncodeLiteral(type.const, right, pattern) : IsBigInt2(type) ? EncodeBigInt(right, pattern) : IsBoolean3(type) ? EncodeBoolean(right, pattern) : IsNumber3(type) ? EncodeNumber(right, pattern) : IsString3(type) ? EncodeString(right, pattern) : IsTemplateLiteral(type) ? EncodeTemplateLiteral(type.pattern, right, pattern) : IsUnion(type) ? EncodeUnion(type.anyOf, right, pattern) : NeverPattern;
}
function EncodeTypes(types, pattern) {
  const [left, ...right] = types;
  return IsSchema(left) ? EncodeType(left, right, pattern) : pattern;
}
function EncodePattern(types) {
  const encoded = EncodeTypes(types, "");
  const result = `^${encoded}$`;
  return result;
}
function TemplateLiteralEncode(types) {
  const pattern = EncodePattern(types);
  const result = TemplateLiteralCreate(pattern);
  return result;
}
function TemplateLiteralImmediate(context, state2, types, options) {
  const instaniatedTypes = InstantiateTypes(context, state2, types);
  return memory_exports.Update(TemplateLiteralEncode(instaniatedTypes), {}, options);
}
function TemplateLiteralInstantiate(context, state2, types, options) {
  return CanInstantiate(context, types) ? TemplateLiteralImmediate(context, state2, types, options) : TemplateLiteralDeferred(types, options);
}
function SpreadElement(type) {
  const result = IsRest(type) ? IsTuple(type.items) ? RestSpread(type.items.items) : IsInfer(type.items) ? [type] : IsRef(type.items) ? [type] : [Never()] : [type];
  return result;
}
function RestSpread(types) {
  const result = types.reduce((result2, left) => {
    return [...result2, ...SpreadElement(left)];
  }, []);
  return result;
}
function CanInstantiateRef(context, ref) {
  return ref in context;
}
function CanInstantiateType(context, type) {
  return IsIntersect(type) ? CanInstantiate(context, type.allOf) : IsUnion(type) ? CanInstantiate(context, type.anyOf) : IsRef(type) ? CanInstantiateRef(context, type.$ref) : true;
}
function CanInstantiate(context, types) {
  const [left, ...right] = types;
  return IsSchema(left) ? CanInstantiateType(context, left) ? CanInstantiate(context, right) : false : true;
}
function ModifierActions(type, readonly, optional) {
  return IsReadonlyRemoveAction(type) ? ModifierActions(type.type, "remove", optional) : IsOptionalRemoveAction(type) ? ModifierActions(type.type, readonly, "remove") : IsReadonlyAddAction(type) ? ModifierActions(type.type, "add", optional) : IsOptionalAddAction(type) ? ModifierActions(type.type, readonly, "add") : [type, readonly, optional];
}
function ApplyReadonly2(action, type) {
  return guard_exports.IsEqual(action, "remove") ? ReadonlyRemove(type) : guard_exports.IsEqual(action, "add") ? ReadonlyAdd(type) : type;
}
function ApplyOptional2(action, type) {
  return guard_exports.IsEqual(action, "remove") ? OptionalRemove(type) : guard_exports.IsEqual(action, "add") ? OptionalAdd(type) : type;
}
function InstantiateProperties(context, state2, properties) {
  return guard_exports.Keys(properties).reduce((result, key) => {
    return { ...result, [key]: InstantiateType(context, state2, properties[key]) };
  }, {});
}
function InstantiateElements(context, state2, types) {
  const elements = InstantiateTypes(context, state2, types);
  const result = RestSpread(elements);
  return result;
}
function InstantiateTypes(context, state2, types) {
  return types.map((type) => InstantiateType(context, state2, type));
}
function InstantiateDeferred(context, state2, action, parameters, options) {
  return guard_exports.IsEqual(action, "Awaited") ? AwaitedInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Capitalize") ? CapitalizeInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Conditional") ? ConditionalInstantiate(context, state2, parameters[0], parameters[1], parameters[2], parameters[3], options) : guard_exports.IsEqual(action, "ConstructorParameters") ? ConstructorParametersInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Evaluate") ? EvaluateInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Exclude") ? ExcludeInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Extract") ? ExtractInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Index") ? IndexInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "InstanceType") ? InstanceTypeInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Interface") ? InterfaceInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "KeyOf") ? KeyOfInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Lowercase") ? LowercaseInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Mapped") ? MappedInstantiate(context, state2, parameters[0], parameters[1], parameters[2], parameters[3], options) : guard_exports.IsEqual(action, "Module") ? ModuleInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "NonNullable") ? NonNullableInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Pick") ? PickInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Options") ? OptionsInstantiate(context, state2, parameters[0], parameters[1]) : guard_exports.IsEqual(action, "Parameters") ? ParametersInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Partial") ? PartialInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Omit") ? OmitInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "ReadonlyType") ? ReadonlyTypeInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Record") ? RecordInstantiate(context, state2, parameters[0], parameters[1], options) : guard_exports.IsEqual(action, "Required") ? RequiredInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "ReturnType") ? ReturnTypeInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "TemplateLiteral") ? TemplateLiteralInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Uncapitalize") ? UncapitalizeInstantiate(context, state2, parameters[0], options) : guard_exports.IsEqual(action, "Uppercase") ? UppercaseInstantiate(context, state2, parameters[0], options) : Deferred(action, parameters, options);
}
function InstantiateType(context, state2, input) {
  const immutable = IsImmutable(input);
  const modifiers = ModifierActions(input, IsReadonly(input) ? "add" : "none", IsOptional(input) ? "add" : "none");
  const type = IsBase(modifiers[0]) ? modifiers[0].Clone() : modifiers[0];
  const instantiated = IsRef(type) ? RefInstantiate(context, state2, type.$ref) : IsArray2(type) ? Array2(InstantiateType(context, state2, type.items), ArrayOptions(type)) : IsAsyncIterator2(type) ? AsyncIterator(InstantiateType(context, state2, type.iteratorItems), AsyncIteratorOptions(type)) : IsCall(type) ? CallInstantiate(context, state2, type.target, type.arguments) : IsConstructor2(type) ? Constructor(InstantiateTypes(context, state2, type.parameters), InstantiateType(context, state2, type.instanceType), ConstructorOptions(type)) : IsDeferred(type) ? InstantiateDeferred(context, state2, type.action, type.parameters, type.options) : IsFunction2(type) ? Function2(InstantiateTypes(context, state2, type.parameters), InstantiateType(context, state2, type.returnType), FunctionOptions(type)) : IsIntersect(type) ? Intersect(InstantiateTypes(context, state2, type.allOf), IntersectOptions(type)) : IsIterator2(type) ? Iterator(InstantiateType(context, state2, type.iteratorItems), IteratorOptions(type)) : IsObject2(type) ? Object2(InstantiateProperties(context, state2, type.properties), ObjectOptions(type)) : IsPromise(type) ? Promise2(InstantiateType(context, state2, type.item), PromiseOptions(type)) : IsRecord(type) ? RecordFromPattern(RecordPattern(type), InstantiateType(context, state2, RecordValue(type))) : IsRest(type) ? Rest(InstantiateType(context, state2, type.items)) : IsTuple(type) ? Tuple(InstantiateElements(context, state2, type.items), TupleOptions(type)) : IsUnion(type) ? Union(InstantiateTypes(context, state2, type.anyOf), UnionOptions(type)) : type;
  const withImmutable = immutable ? Immutable(instantiated) : instantiated;
  const withModifiers = ApplyReadonly2(modifiers[1], ApplyOptional2(modifiers[2], withImmutable));
  return withModifiers;
}
function Instantiate(context, type) {
  return InstantiateType(context, { callstack: [] }, type);
}
function AwaitedDeferred(type, options = {}) {
  return Deferred("Awaited", [type], options);
}
function Awaited(type, options = {}) {
  return Instantiate({}, AwaitedDeferred(type, options));
}
function EvaluateDeferred(type, options = {}) {
  return Deferred("Evaluate", [type], options);
}
function Evaluate(type, options = {}) {
  return Instantiate({}, EvaluateDeferred(type, options));
}
function ModuleDeferred(context, options = {}) {
  return Deferred("Module", [context], options);
}
function Module2(context, options = {}) {
  return Instantiate({}, ModuleDeferred(context, options));
}
function Script2(...args) {
  const [context, input, options] = arguments_exports.Match(args, {
    2: (script, options2) => guard_exports.IsString(script) ? [{}, script, options2] : [script, options2, {}],
    3: (context2, script, options2) => [context2, script, options2],
    1: (script) => [{}, script, {}]
  });
  const result = Script(input);
  const parsed = guard_exports.IsArray(result) && guard_exports.IsEqual(result.length, 2) ? InstantiateType(context, { callstack: [] }, result[0]) : Never();
  return memory_exports.Update(parsed, {}, options);
}
var typebox_exports = {};
__export(typebox_exports, {
  Any: () => Any,
  Array: () => Array2,
  AsyncIterator: () => AsyncIterator,
  Awaited: () => Awaited,
  Base: () => Base,
  BigInt: () => BigInt2,
  Boolean: () => Boolean2,
  Call: () => Call,
  Capitalize: () => Capitalize,
  Codec: () => Codec,
  Conditional: () => Conditional,
  Constructor: () => Constructor,
  ConstructorParameters: () => ConstructorParameters,
  Cyclic: () => Cyclic,
  Decode: () => Decode,
  DecodeBuilder: () => DecodeBuilder,
  Encode: () => Encode,
  EncodeBuilder: () => EncodeBuilder,
  Enum: () => Enum,
  Evaluate: () => Evaluate,
  Exclude: () => Exclude,
  Extends: () => Extends2,
  ExtendsResult: () => result_exports,
  Extract: () => Extract,
  Function: () => Function2,
  Generic: () => Generic,
  Identifier: () => Identifier,
  Immutable: () => Immutable,
  Index: () => Index,
  Infer: () => Infer,
  InstanceType: () => InstanceType,
  Instantiate: () => Instantiate,
  Integer: () => Integer,
  Interface: () => Interface,
  Intersect: () => Intersect,
  IsAny: () => IsAny,
  IsArray: () => IsArray2,
  IsAsyncIterator: () => IsAsyncIterator2,
  IsBase: () => IsBase,
  IsBigInt: () => IsBigInt2,
  IsBoolean: () => IsBoolean3,
  IsCall: () => IsCall,
  IsCodec: () => IsCodec,
  IsConstructor: () => IsConstructor2,
  IsCyclic: () => IsCyclic,
  IsEnum: () => IsEnum,
  IsFunction: () => IsFunction2,
  IsGeneric: () => IsGeneric,
  IsIdentifier: () => IsIdentifier,
  IsImmutable: () => IsImmutable,
  IsInfer: () => IsInfer,
  IsInteger: () => IsInteger2,
  IsIntersect: () => IsIntersect,
  IsIterator: () => IsIterator2,
  IsKind: () => IsKind,
  IsLiteral: () => IsLiteral,
  IsNever: () => IsNever,
  IsNull: () => IsNull2,
  IsNumber: () => IsNumber3,
  IsObject: () => IsObject2,
  IsOptional: () => IsOptional,
  IsParameter: () => IsParameter,
  IsPromise: () => IsPromise,
  IsReadonly: () => IsReadonly,
  IsRecord: () => IsRecord,
  IsRef: () => IsRef,
  IsRefine: () => IsRefine,
  IsRest: () => IsRest,
  IsSchema: () => IsSchema,
  IsString: () => IsString3,
  IsSymbol: () => IsSymbol2,
  IsTemplateLiteral: () => IsTemplateLiteral,
  IsThis: () => IsThis,
  IsTuple: () => IsTuple,
  IsUndefined: () => IsUndefined2,
  IsUnion: () => IsUnion,
  IsUnknown: () => IsUnknown,
  IsUnsafe: () => IsUnsafe,
  IsVoid: () => IsVoid,
  Iterator: () => Iterator,
  KeyOf: () => KeyOf2,
  Literal: () => Literal,
  Lowercase: () => Lowercase,
  Mapped: () => Mapped2,
  Module: () => Module2,
  Never: () => Never,
  NonNullable: () => NonNullable,
  Null: () => Null,
  Number: () => Number2,
  Object: () => Object2,
  Omit: () => Omit,
  Optional: () => Optional,
  Options: () => Options2,
  Parameter: () => Parameter,
  Parameters: () => Parameters,
  Partial: () => Partial,
  Pick: () => Pick,
  Promise: () => Promise2,
  Readonly: () => Readonly,
  ReadonlyType: () => ReadonlyType,
  Record: () => Record,
  RecordKey: () => RecordKey,
  RecordKeyAsPattern: () => RecordPattern,
  RecordValue: () => RecordValue,
  Ref: () => Ref,
  Refine: () => Refine,
  Required: () => Required,
  Rest: () => Rest,
  ReturnType: () => ReturnType,
  Script: () => Script2,
  String: () => String2,
  Symbol: () => Symbol2,
  TemplateLiteral: () => TemplateLiteral2,
  This: () => This,
  Tuple: () => Tuple,
  Uncapitalize: () => Uncapitalize,
  Undefined: () => Undefined,
  Union: () => Union,
  Unknown: () => Unknown,
  Unsafe: () => Unsafe,
  Uppercase: () => Uppercase,
  Void: () => Void
});
var INTERNAL_METADATA_KEY = "xInternal";
var UnknownRecord = typebox_exports.Record(typebox_exports.String(), typebox_exports.Unknown(), {
  default: {},
  description: "String-keyed bag for layer-specific knobs that have not yet been formalized in the schema."
});
var ContinentBoundsSchema = typebox_exports.Object(
  {
    /** Westernmost tile column (inclusive) for the continent window. */
    west: typebox_exports.Number({
      description: "Westernmost tile column (inclusive) for the continent window."
    }),
    /** Easternmost tile column (inclusive) for the continent window. */
    east: typebox_exports.Number({
      description: "Easternmost tile column (inclusive) for the continent window."
    }),
    /** Southernmost tile row (inclusive) for the continent window. */
    south: typebox_exports.Number({
      description: "Southernmost tile row (inclusive) for the continent window."
    }),
    /** Northernmost tile row (inclusive) for the continent window. */
    north: typebox_exports.Number({
      description: "Northernmost tile row (inclusive) for the continent window."
    }),
    /** Optional continent index used when mirroring legacy continent tagging. */
    continent: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Optional continent index used when mirroring legacy continent tagging."
      })
    )
  },
  { additionalProperties: true }
);
var StageConfigSchema = typebox_exports.Record(typebox_exports.String(), typebox_exports.Boolean(), {
  default: {},
  description: "[internal] Per-stage enablement overrides keyed by manifest stage id.",
  [INTERNAL_METADATA_KEY]: true
});
var StageDescriptorSchema = typebox_exports.Object(
  {
    enabled: typebox_exports.Optional(
      typebox_exports.Boolean({
        description: "Explicit enable/disable switch applied before dependency resolution."
      })
    ),
    requires: typebox_exports.Optional(
      typebox_exports.Array(typebox_exports.String(), {
        default: [],
        description: "Stage names that must run before this stage executes."
      })
    ),
    provides: typebox_exports.Optional(
      typebox_exports.Array(typebox_exports.String(), {
        default: [],
        description: "Capabilities or data this stage makes available to dependents."
      })
    ),
    legacyToggles: typebox_exports.Optional(
      typebox_exports.Array(typebox_exports.String(), {
        default: [],
        description: "Legacy boolean toggles that map to this stage for backward compatibility."
      })
    ),
    blockedBy: typebox_exports.Optional(
      typebox_exports.String({
        description: "Optional stage name that disables this stage when present."
      })
    )
  },
  { additionalProperties: true, default: {}, [INTERNAL_METADATA_KEY]: true }
);
var StageManifestSchema = typebox_exports.Object(
  {
    order: typebox_exports.Array(typebox_exports.String(), {
      default: [],
      description: "Execution order for stages after dependency expansion."
    }),
    stages: typebox_exports.Record(typebox_exports.String(), StageDescriptorSchema, {
      default: {},
      description: "Descriptors keyed by stage id controlling gating and dependencies."
    })
  },
  {
    default: {},
    description: "[internal] Stage manifest for orchestrated pipeline execution.",
    [INTERNAL_METADATA_KEY]: true
  }
);
var TogglesSchema = typebox_exports.Object(
  {
    /**
     * Whether volcanic/paradise hotspots are allowed to generate story overlays.
     * When enabled, creates Hawaii-style island chains and lush paradise archipelagos.
     * @default true
     */
    STORY_ENABLE_HOTSPOTS: typebox_exports.Optional(
      typebox_exports.Boolean({
        default: true,
        description: "Whether volcanic/paradise hotspots are allowed to generate story overlays."
      })
    ),
    /**
     * Whether continental rift valleys and shoulders should be created.
     * Produces East-African-style rift features with elevated shoulders and lowland troughs.
     * @default true
     */
    STORY_ENABLE_RIFTS: typebox_exports.Optional(
      typebox_exports.Boolean({
        default: true,
        description: "Whether continental rift valleys and shoulders should be created."
      })
    ),
    /**
     * Controls whether orogenic mountain belts are simulated along convergent margins.
     * Creates Andes/Himalayas-style ranges where plates collide.
     * @default true
     */
    STORY_ENABLE_OROGENY: typebox_exports.Optional(
      typebox_exports.Boolean({
        default: true,
        description: "Controls whether orogenic mountain belts are simulated along convergent margins."
      })
    ),
    /**
     * Enables macro swatch overrides that recolor large climate regions.
     * Creates coherent biome patches (e.g., Sahara-sized deserts or Amazon-style rainforests).
     * @default true
     */
    STORY_ENABLE_SWATCHES: typebox_exports.Optional(
      typebox_exports.Boolean({
        default: true,
        description: "Enables macro swatch overrides that recolor large climate regions."
      })
    ),
    /**
     * Enables paleo-hydrology artifacts such as fossil channels and oxbows.
     * Adds dry riverbeds and ancient lake basins for terrain variety.
     * @default true
     */
    STORY_ENABLE_PALEO: typebox_exports.Optional(
      typebox_exports.Boolean({
        default: true,
        description: "Enables paleo-hydrology artifacts such as fossil channels and oxbows."
      })
    ),
    /**
     * Controls whether strategic corridor protection is applied.
     * Preserves navigable sea lanes and land bridges for gameplay connectivity.
     * @default true
     */
    STORY_ENABLE_CORRIDORS: typebox_exports.Optional(
      typebox_exports.Boolean({
        default: true,
        description: "Controls whether strategic corridor protection is applied."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var LandmassTectonicsConfigSchema = typebox_exports.Object(
  {
    /**
     * Blend factor for plate-interior fractal noise.
     * Higher values create thicker/thinner sections inside plates.
     * @example 0.6 produces varied continental thickness; 0.2 yields uniform interiors.
     */
    interiorNoiseWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Blend factor for plate-interior fractal noise; higher values create thicker/thinner sections inside plates."
      })
    ),
    /**
     * Multiplier for convergent boundary uplift arcs.
     * Higher weights favor dramatic coastal arcs like the Andes.
     * @example 0.35 creates subtle arcs; 0.8 creates dominant coastal mountain walls.
     */
    boundaryArcWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Multiplier for convergent boundary uplift arcs; higher weights favor dramatic coastal arcs like the Andes."
      })
    ),
    /**
     * Raggedness injected into boundary arcs.
     * Increases coastline roughness along active margins.
     */
    boundaryArcNoiseWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Raggedness injected into boundary arcs; increases coastline roughness along active margins."
      })
    ),
    /**
     * Grain of tectonic fractal noise.
     * Larger values yield finer variation in land scoring.
     */
    fractalGrain: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Grain of tectonic fractal noise; larger values yield finer variation in land scoring."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var LandmassGeometryPostSchema = typebox_exports.Object(
  {
    /** Uniform horizontal expansion (tiles) applied to every landmass before individual offsets. */
    expandTiles: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Uniform horizontal expansion (tiles) applied to every landmass before individual offsets."
      })
    ),
    /** Extra west-side padding (tiles) added on top of the shared expansion value. */
    expandWestTiles: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra west-side padding (tiles) added on top of the shared expansion value."
      })
    ),
    /** Extra east-side padding (tiles) added on top of the shared expansion value. */
    expandEastTiles: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra east-side padding (tiles) added on top of the shared expansion value."
      })
    ),
    /** Minimum allowed west boundary (tile index) to prevent over-expansion off the map. */
    clampWestMin: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Minimum allowed west boundary (tile index) to prevent over-expansion off the map."
      })
    ),
    /** Maximum allowed east boundary (tile index) to keep landmasses within the map. */
    clampEastMax: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Maximum allowed east boundary (tile index) to keep landmasses within the map."
      })
    ),
    /** Fixed south boundary (tile row) for all landmasses; useful for curated presets. */
    overrideSouth: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Fixed south boundary (tile row) for all landmasses; useful for curated presets."
      })
    ),
    /** Fixed north boundary (tile row) for all landmasses; pairs with overrideSouth for custom bands. */
    overrideNorth: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Fixed north boundary (tile row) for all landmasses; pairs with overrideSouth for custom bands."
      })
    ),
    /** Enforces a minimum horizontal span (tiles) to avoid razor-thin continents after clamping. */
    minWidthTiles: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Enforces a minimum horizontal span (tiles) to avoid razor-thin continents after clamping."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var LandmassGeometrySchema = typebox_exports.Object(
  {
    post: typebox_exports.Optional(LandmassGeometryPostSchema)
  },
  { additionalProperties: true, default: {} }
);
var LandmassConfigSchema = typebox_exports.Object(
  {
    /**
     * Legacy landmask mode selector.
     * `'legacy'` preserves historical behavior; `'area'` uses area-weighted windows.
     * @default "legacy"
     */
    crustMode: typebox_exports.Optional(
      typebox_exports.Union([typebox_exports.Literal("legacy"), typebox_exports.Literal("area")], {
        description: "Legacy landmask mode selector: 'legacy' preserves historical behavior, 'area' uses area-weighted windows.",
        default: "legacy"
      })
    ),
    /**
     * Target global water coverage (0-100).
     * - 55-65 mimics Earth
     * - 70-75 drifts toward archipelago worlds
     * - 50-55 yields Pangaea-style supercontinents
     * @default 60
     */
    baseWaterPercent: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Target global water coverage (0-100). Clamped in landmass scoring; 55-65 mimics Earth, 70-75 drifts toward archipelago worlds, and 50-55 yields Pangaea-style supercontinents.",
        default: 60,
        minimum: 0,
        maximum: 100
      })
    ),
    /**
     * Multiplier applied after baseWaterPercent (typically 0.75-1.25).
     * Clamped to 0.25-1.75 so nudging water for huge/tiny maps cannot wipe out land entirely.
     * @default 1
     * @min 0.25
     * @max 1.75
     */
    waterScalar: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Multiplier applied after baseWaterPercent (typically 0.75-1.25). Values are clamped to a 0.25-1.75 band so nudging water for huge/tiny maps cannot wipe out land entirely.",
        default: 1,
        minimum: 0.25,
        maximum: 1.75
      })
    ),
    /**
     * Closeness bonus favoring tiles near plate boundaries (clamped to ~0.4).
     * Higher values pull continents toward active margins to guarantee coastal mountain arcs
     * while still keeping interior cores.
     */
    boundaryBias: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Closeness bonus favoring tiles near plate boundaries (clamped to ~0.4). Higher values pull continents toward active margins to guarantee coastal mountain arcs while still keeping interior cores.",
        minimum: 0,
        maximum: 1
      })
    ),
    /**
     * Soft backstop on the share of land inside the boundary closeness band (0..1).
     * The solver lowers threshold in 5-point steps until boundary share meets this target.
     * Ensures some land hugs convergent margins for dramatic coasts.
     */
    boundaryShareTarget: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Soft backstop on the share of land that should fall inside the boundary closeness band (0..1). After picking an initial threshold, the solver lowers it in 5-point steps until the boundary share meets this target (default ~0.15) or land exceeds ~150% of the goal. Use this to ensure some land hugs convergent margins for dramatic coasts without drowning interiors.",
        minimum: 0,
        maximum: 1
      })
    ),
    /** Desired share of continental crust when balancing land vs. ocean plates (0..1). */
    continentalFraction: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Desired share of continental crust when balancing land vs. ocean plates (0..1).",
        minimum: 0,
        maximum: 1
      })
    ),
    /** Legacy fallback for continentalFraction kept for backward compatibility. */
    crustContinentalFraction: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Legacy fallback for continentalFraction kept for backward compatibility.",
        minimum: 0,
        maximum: 1
      })
    ),
    /**
     * Bias that clusters continental plates together.
     * Higher values encourage supercontinents rather than scattered shards.
     */
    crustClusteringBias: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bias that clusters continental plates together; higher values encourage supercontinents rather than scattered shards.",
        minimum: 0,
        maximum: 1
      })
    ),
    /**
     * Probability of spawning small continental shards.
     * Increases detached microcontinents for naval play.
     */
    microcontinentChance: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Probability of spawning small continental shards; increases detached microcontinents for naval play.",
        minimum: 0,
        maximum: 1
      })
    ),
    /**
     * Blend factor softening crust transitions at edges.
     * Higher values smooth abrupt height changes at plate seams.
     * @default 0.45
     */
    crustEdgeBlend: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Blend factor softening crust transitions at edges; higher values smooth abrupt height changes at plate seams.",
        default: 0.45,
        minimum: 0,
        maximum: 1
      })
    ),
    /**
     * Amplitude of crust noise injected into the landmask.
     * Avoids uniform thickness across continents.
     * @default 0.1
     */
    crustNoiseAmplitude: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Amplitude of crust noise injected into the landmask to avoid uniform thickness across continents.",
        default: 0.1,
        minimum: 0,
        maximum: 1
      })
    ),
    /**
     * Base elevation assigned to continental crust before mountains/hills are applied.
     * @default 0.32
     */
    continentalHeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Base elevation assigned to continental crust before mountains/hills are applied.",
        default: 0.32,
        minimum: -2,
        maximum: 2
      })
    ),
    /**
     * Base elevation assigned to oceanic crust.
     * Deeper negatives create deeper basins.
     * @default -0.55
     */
    oceanicHeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Base elevation assigned to oceanic crust; deeper negatives create deeper basins.",
        default: -0.55,
        minimum: -2,
        maximum: 0
      })
    ),
    /** Tectonic weighting configuration for land scoring. */
    tectonics: typebox_exports.Optional(LandmassTectonicsConfigSchema),
    /** Geometry post-processing adjustments. */
    geometry: typebox_exports.Optional(LandmassGeometrySchema)
  },
  { additionalProperties: true, default: {} }
);
var FoundationSeedConfigSchema = typebox_exports.Object(
  {
    /**
     * Choose Civ engine RNG or a fixed deterministic seed.
     * Use `'fixed'` for reproducible worlds during testing/debugging.
     * @default "engine"
     */
    mode: typebox_exports.Optional(
      typebox_exports.Union([typebox_exports.Literal("engine"), typebox_exports.Literal("fixed")], {
        description: "Choose Civ engine RNG or a fixed deterministic seed for reproducible worlds.",
        default: "engine"
      })
    ),
    /** Explicit seed value used when mode is set to `'fixed'`. */
    fixedSeed: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Explicit seed value used when mode is set to 'fixed'."
      })
    ),
    /**
     * Global offset added before deriving per-subsystem seeds.
     * Decorrelates runs while preserving relative randomness.
     * @default 0
     */
    offset: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Global offset added before deriving per-subsystem seeds to decorrelate runs.",
        default: 0
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var FoundationPlatesConfigSchema = typebox_exports.Object(
  {
    /**
     * Number of tectonic plates.
     * - Fewer plates (4-6) yield supercontinents
     * - More plates (12-20) fragment the map into many smaller landmasses
     * @default 8
     */
    count: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Number of tectonic plates; fewer plates yield supercontinents, more plates fragment the map.",
        default: 8,
        minimum: 2,
        maximum: 32
      })
    ),
    /**
     * Lloyd relaxation iterations to smooth plate boundaries.
     * Higher values create rounder, more regular plates.
     * @default 5
     */
    relaxationSteps: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Lloyd relaxation iterations to smooth plate boundaries; higher values create rounder plates.",
        default: 5,
        minimum: 0,
        maximum: 50
      })
    ),
    /**
     * Ratio of convergent to divergent boundaries (0..1).
     * Controls how much collision (mountains) vs. rifting (valleys) occurs.
     * @default 0.5
     */
    convergenceMix: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Ratio of convergent to divergent boundaries (0..1) controlling how much collision vs. rifting occurs.",
        default: 0.5,
        minimum: 0,
        maximum: 1
      })
    ),
    /**
     * Multiplier applied to plate rotation weighting along boundaries.
     * Higher values spin plates faster, creating more dramatic shear zones.
     * @default 1
     */
    plateRotationMultiple: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Multiplier applied to plate rotation weighting along boundaries; higher values spin plates faster.",
        default: 1,
        minimum: 0,
        maximum: 5
      })
    ),
    /**
     * Choose Civ engine RNG or a fixed seed specifically for plate layout.
     * @default "engine"
     */
    seedMode: typebox_exports.Optional(
      typebox_exports.Union([typebox_exports.Literal("engine"), typebox_exports.Literal("fixed")], {
        description: "Choose Civ engine RNG or a fixed seed specifically for plate layout.",
        default: "engine"
      })
    ),
    /** Explicit plate seed used when seedMode is `'fixed'` to lock plate positions. */
    fixedSeed: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Explicit plate seed used when seedMode is 'fixed' to lock plate positions."
      })
    ),
    /**
     * Offset applied to the plate seed.
     * Decorrelates from other subsystems while keeping reproducibility.
     * @default 0
     */
    seedOffset: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Offset applied to the plate seed to decorrelate from other subsystems while keeping reproducibility.",
        default: 0
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var FoundationDirectionalityConfigSchema = typebox_exports.Object(
  {
    /**
     * Global alignment strength (0..1).
     * Higher values keep plates, winds, and currents pointing similarly.
     * @default 0
     */
    cohesion: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Global alignment strength (0..1); higher values keep plates, winds, and currents pointing similarly.",
        default: 0,
        minimum: 0,
        maximum: 1
      })
    ),
    /** Primary axis settings for plates, winds, and currents. */
    primaryAxes: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /** Preferred plate motion heading in degrees (0° = east). */
          plateAxisDeg: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Preferred plate motion heading in degrees (0\xB0 = east)."
            })
          ),
          /** Bias for prevailing wind direction relative to zonal flow (degrees). */
          windBiasDeg: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Bias for prevailing wind direction relative to zonal flow (degrees)."
            })
          ),
          /** Bias for major ocean gyre rotation (degrees). */
          currentBiasDeg: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Bias for major ocean gyre rotation (degrees)."
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** Variability settings for directional jitter. */
    variability: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /** Random angular deviation applied to preferred axes (degrees). */
          angleJitterDeg: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Random angular deviation applied to preferred axes (degrees)."
            })
          ),
          /** Variance multiplier controlling how strongly directionality is enforced across the map. */
          magnitudeVariance: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Variance multiplier controlling how strongly directionality is enforced across the map."
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** Hemisphere-specific settings for Coriolis effects. */
    hemispheres: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /** Flip directionality in the southern hemisphere for Coriolis-style mirroring. */
          southernFlip: typebox_exports.Optional(
            typebox_exports.Boolean({
              description: "Flip directionality in the southern hemisphere for Coriolis-style mirroring."
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** Coupling between plates, winds, and currents. */
    interplay: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /** How strongly prevailing winds align with plate motion (0..1). */
          windsFollowPlates: typebox_exports.Optional(
            typebox_exports.Number({
              description: "How strongly prevailing winds align with plate motion (0..1)."
            })
          ),
          /** How strongly ocean currents align with wind direction (0..1). */
          currentsFollowWinds: typebox_exports.Optional(
            typebox_exports.Number({
              description: "How strongly ocean currents align with wind direction (0..1)."
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    )
  },
  { additionalProperties: true, default: {} }
);
var FoundationDynamicsConfigSchema = typebox_exports.Object(
  {
    /** Mantle plume configuration for deep-earth uplift sources. */
    mantle: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /**
           * Number of mantle plume hotspots that feed uplift potential.
           * Creates volcanic island chains and continental hotspots.
           * @default 4
           */
          bumps: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Number of mantle plume hotspots that feed uplift potential (integer).",
              default: 4,
              minimum: 1,
              maximum: 64
            })
          ),
          /**
           * Strength of mantle pressure contributions.
           * Higher values increase uplift everywhere.
           * @default 0.6
           */
          amplitude: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Strength of mantle pressure contributions; higher values increase uplift everywhere.",
              default: 0.6,
              minimum: 0.1,
              maximum: 5
            })
          ),
          /**
           * Spatial scale of mantle effects.
           * Larger scales spread hotspots wider before decay.
           * @default 0.4
           */
          scale: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Spatial scale of mantle effects; larger scales spread hotspots wider before decay.",
              default: 0.4,
              minimum: 0.1,
              maximum: 1
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** Atmospheric wind configuration for rainfall patterns. */
    wind: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /**
           * Number of jet stream bands influencing storm tracks (e.g., 2-5).
           * @default 3
           */
          jetStreaks: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Number of jet stream bands influencing storm tracks (e.g., 2-5).",
              default: 3,
              minimum: 0,
              maximum: 12
            })
          ),
          /**
           * Overall jet stream intensity multiplier affecting rainfall steering.
           * @default 1
           */
          jetStrength: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Overall jet stream intensity multiplier affecting rainfall steering.",
              default: 1,
              minimum: 0,
              maximum: 5
            })
          ),
          /**
           * Directional variance for winds.
           * Higher variance loosens strict banded flow.
           * @default 0.6
           */
          variance: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Directional variance for winds; higher variance loosens strict banded flow.",
              default: 0.6,
              minimum: 0,
              maximum: 2
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** Directionality controls for plates, winds, and currents alignment. */
    directionality: typebox_exports.Optional(FoundationDirectionalityConfigSchema)
  },
  { additionalProperties: true, default: {} }
);
var FoundationOceanSeparationConfigSchema = typebox_exports.Object(
  {},
  {
    additionalProperties: true,
    default: {},
    description: "[internal] Foundation-level ocean separation alias; prefer top-level oceanSeparation.",
    [INTERNAL_METADATA_KEY]: true
  }
);
var FoundationSurfaceConfigSchema = typebox_exports.Object(
  {
    landmass: typebox_exports.Optional(LandmassConfigSchema),
    oceanSeparation: typebox_exports.Optional(FoundationOceanSeparationConfigSchema),
    crustMode: typebox_exports.Optional(
      typebox_exports.Union([typebox_exports.Literal("legacy"), typebox_exports.Literal("area")], {
        description: "Forwarded crust mode so surface consumers can mirror legacy vs. area-weighted behavior."
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "[internal] Surface targets derived from foundation; prefer top-level landmass/oceanSeparation.",
    [INTERNAL_METADATA_KEY]: true
  }
);
var FoundationPolicyConfigSchema = typebox_exports.Object(
  {
    oceanSeparation: typebox_exports.Optional(FoundationOceanSeparationConfigSchema)
  },
  {
    additionalProperties: true,
    default: {},
    description: "[internal] Policy multipliers for downstream stages.",
    [INTERNAL_METADATA_KEY]: true
  }
);
var FoundationDiagnosticsConfigSchema = typebox_exports.Object(
  {},
  {
    additionalProperties: true,
    default: {},
    description: "[internal] Foundation-specific diagnostics toggles.",
    [INTERNAL_METADATA_KEY]: true
  }
);
var OceanSeparationEdgePolicySchema = typebox_exports.Object(
  {
    /** Enable edge-specific override for this map border (west or east). */
    enabled: typebox_exports.Optional(
      typebox_exports.Boolean({
        description: "Enable edge-specific override for this map border (west or east)."
      })
    ),
    /** Baseline separation enforced at the map edge in tiles (before boundary multipliers). */
    baseTiles: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Baseline separation enforced at the map edge in tiles (before boundary multipliers)."
      })
    ),
    /** Multiplier applied near active margins when widening oceans at the edge. */
    boundaryClosenessMultiplier: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Multiplier applied near active margins when widening oceans at the edge."
      })
    ),
    /** Maximum allowed per-latitude separation delta for this edge to avoid extreme zig-zags. */
    maxPerRowDelta: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Maximum allowed per-latitude separation delta for this edge to avoid extreme zig-zags."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var OceanSeparationConfigSchema = typebox_exports.Object(
  {
    /** Master switch for plate-aware ocean widening between continent bands. */
    enabled: typebox_exports.Optional(
      typebox_exports.Boolean({
        description: "Master switch for plate-aware ocean widening between continent bands."
      })
    ),
    /**
     * Pairs of continent indices to separate.
     * @example [[0,1],[1,2]] separates band 0 from 1, and band 1 from 2.
     */
    bandPairs: typebox_exports.Optional(
      typebox_exports.Array(typebox_exports.Tuple([typebox_exports.Number(), typebox_exports.Number()]), {
        default: [],
        description: "Pairs of continent indices to separate (e.g., [[0,1],[1,2]])."
      })
    ),
    /** Baseline widening between continents in tiles before modifiers are applied. */
    baseSeparationTiles: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Baseline widening between continents in tiles before modifiers are applied."
      })
    ),
    /** Extra separation applied when plates are close to active boundaries (multiplier 0..2). */
    boundaryClosenessMultiplier: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra separation applied when plates are close to active boundaries (multiplier 0..2)."
      })
    ),
    /** Maximum per-latitude variation in separation (tiles) to keep oceans smooth north-south. */
    maxPerRowDelta: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Maximum per-latitude variation in separation (tiles) to keep oceans smooth north-south."
      })
    ),
    /** Minimum navigable channel width to preserve while widening seas (tiles). */
    minChannelWidth: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Minimum navigable channel width to preserve while widening seas (tiles)."
      })
    ),
    /** Random jitter applied to channel widths to avoid uniform straight lines. */
    channelJitter: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Random jitter applied to channel widths to avoid uniform straight lines."
      })
    ),
    /** Whether strategic sea corridors should be preserved when enforcing separation. */
    respectSeaLanes: typebox_exports.Optional(
      typebox_exports.Boolean({
        description: "Whether strategic sea corridors should be preserved when enforcing separation."
      })
    ),
    /** West edge-specific override policy. */
    edgeWest: typebox_exports.Optional(OceanSeparationEdgePolicySchema),
    /** East edge-specific override policy. */
    edgeEast: typebox_exports.Optional(OceanSeparationEdgePolicySchema)
  },
  { additionalProperties: true, default: {} }
);
var CoastlinePlateBiasConfigSchema = typebox_exports.Object(
  {
    /** Normalized closeness where coastline edits begin to respond to plate boundaries (0..1). */
    threshold: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Normalized closeness where coastline edits begin to respond to plate boundaries (0..1)."
      })
    ),
    /**
     * Exponent shaping how quickly bias ramps after the threshold.
     * Values >1 concentrate effects near boundaries; <1 spreads them wider.
     */
    power: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Exponent shaping how quickly bias ramps after the threshold; >1 concentrates effects near boundaries."
      })
    ),
    /** Bias multiplier for convergent boundaries; positive values encourage dramatic coasts and fjords. */
    convergent: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bias multiplier for convergent boundaries; positive values encourage dramatic coasts and fjords."
      })
    ),
    /** Bias multiplier for transform boundaries; lower values soften edits along shear zones. */
    transform: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bias multiplier for transform boundaries; lower values soften edits along shear zones."
      })
    ),
    /** Bias multiplier for divergent boundaries; negative values discourage ruggedization along rifts. */
    divergent: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bias multiplier for divergent boundaries; negative values discourage ruggedization along rifts."
      })
    ),
    /** Residual bias for interior coasts away from boundaries; typically near zero. */
    interior: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Residual bias for interior coasts away from boundaries; typically near zero."
      })
    ),
    /** Strength applied to bay denominators; higher values increase bay carving where bias is positive. */
    bayWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Strength applied to bay denominators; higher values increase bay carving where bias is positive."
      })
    ),
    /** Extra noise gate reduction when bias is positive, allowing smaller bays near active margins. */
    bayNoiseBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra noise gate reduction when bias is positive, allowing smaller bays near active margins."
      })
    ),
    /** Strength applied to fjord denominators; higher values create more fjords along favored coasts. */
    fjordWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Strength applied to fjord denominators; higher values create more fjords along favored coasts."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var CoastlineBayConfigSchema = typebox_exports.Object(
  {
    /** Extra noise threshold on larger maps; higher values reduce bay frequency while keeping size larger. */
    noiseGateAdd: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra noise threshold on larger maps; higher values reduce bay frequency while keeping size larger."
      })
    ),
    /** Bay frequency on active margins; lower denominators produce more bays along energetic coasts. */
    rollDenActive: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bay frequency on active margins; lower denominators produce more bays along energetic coasts."
      })
    ),
    /** Bay frequency on passive margins; lower denominators carve more bays in calm regions. */
    rollDenDefault: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bay frequency on passive margins; lower denominators carve more bays in calm regions."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var CoastlineFjordConfigSchema = typebox_exports.Object(
  {
    /** Base fjord frequency; smaller values increase fjord count across the map. */
    baseDenom: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Base fjord frequency; smaller values increase fjord count across the map."
      })
    ),
    /** Bonus applied on active convergent margins; subtracts from baseDenom to amplify fjord density. */
    activeBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bonus applied on active convergent margins; subtracts from baseDenom to amplify fjord density."
      })
    ),
    /** Bonus applied on passive shelves; subtracts from baseDenom for gentler fjords. */
    passiveBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bonus applied on passive shelves; subtracts from baseDenom for gentler fjords."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var CoastlinesConfigSchema = typebox_exports.Object(
  {
    /** Bay (gentle coastal indentation) configuration. */
    bay: typebox_exports.Optional(CoastlineBayConfigSchema),
    /** Fjord (deep, narrow inlet) configuration. */
    fjord: typebox_exports.Optional(CoastlineFjordConfigSchema),
    /** Plate-aware bias for bay/fjord odds based on boundary closeness. */
    plateBias: typebox_exports.Optional(CoastlinePlateBiasConfigSchema),
    /** Minimum channel width preserved for naval passage when carving bays and fjords (tiles). */
    minSeaLaneWidth: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Minimum channel width preserved for naval passage when carving bays and fjords (tiles)."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var IslandsConfigSchema = typebox_exports.Object(
  {
    /** Noise cutoff for island seeds (percent). Higher values mean fewer, larger island groups. */
    fractalThresholdPercent: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Noise cutoff for island seeds (percent). Higher values mean fewer, larger island groups."
      })
    ),
    /** Minimum spacing from continental landmasses (tiles) to prevent coastal clutter. */
    minDistFromLandRadius: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Minimum spacing from continental landmasses (tiles) to prevent coastal clutter."
      })
    ),
    /**
     * Island frequency near active margins.
     * Lower denominators spawn more volcanic arcs like Japan.
     */
    baseIslandDenNearActive: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Island frequency near active margins; lower denominators spawn more volcanic arcs like Japan."
      })
    ),
    /** Island frequency away from active margins; controls passive-shelf archipelagos. */
    baseIslandDenElse: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Island frequency away from active margins; controls passive-shelf archipelagos."
      })
    ),
    /**
     * Island seed frequency along hotspot trails.
     * Smaller values create Hawaii-style chains.
     */
    hotspotSeedDenom: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Island seed frequency along hotspot trails; smaller values create Hawaii-style chains."
      })
    ),
    /** Maximum tiles per island cluster to cap archipelago size (tiles). */
    clusterMax: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Maximum tiles per island cluster to cap archipelago size (tiles)."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var MountainsConfigSchema = typebox_exports.Object(
  {
    /**
     * Global scale for tectonic effects.
     * Primary dial for overall mountain prevalence across the map.
     */
    tectonicIntensity: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Global scale for tectonic effects; primary dial for overall mountain prevalence."
      })
    ),
    /** Score threshold for promoting a tile to a mountain; lower values allow more peaks. */
    mountainThreshold: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Score threshold for promoting a tile to a mountain; lower values allow more peaks."
      })
    ),
    /** Score threshold for assigning hills; lower values increase hill coverage. */
    hillThreshold: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Score threshold for assigning hills; lower values increase hill coverage."
      })
    ),
    /** Weight applied to uplift potential; keeps mountains aligned with convergent zones. */
    upliftWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Weight applied to uplift potential; keeps mountains aligned with convergent zones."
      })
    ),
    /** Weight applied to fractal noise to introduce natural variation in ranges. */
    fractalWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Weight applied to fractal noise to introduce natural variation in ranges."
      })
    ),
    /** Depression severity along divergent boundaries (0..1); higher values carve deeper rifts. */
    riftDepth: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Depression severity along divergent boundaries (0..1); higher values carve deeper rifts."
      })
    ),
    /** Additional weight from plate-boundary closeness that pulls mountains toward margins. */
    boundaryWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Additional weight from plate-boundary closeness that pulls mountains toward margins."
      })
    ),
    /** Exponent controlling how quickly boundary influence decays with distance (>=0.25). */
    boundaryExponent: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Exponent controlling how quickly boundary influence decays with distance (>=0.25)."
      })
    ),
    /** Penalty applied to deep interior tiles to keep high terrain near tectonic action. */
    interiorPenaltyWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Penalty applied to deep interior tiles to keep high terrain near tectonic action."
      })
    ),
    /** Extra additive weight for convergent tiles, creating dominant orogeny ridges. */
    convergenceBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra additive weight for convergent tiles, creating dominant orogeny ridges."
      })
    ),
    /** Penalty multiplier for transform boundaries to soften shearing ridges. */
    transformPenalty: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Penalty multiplier for transform boundaries to soften shearing ridges."
      })
    ),
    /** Penalty multiplier applied along divergent boundaries before riftDepth is carved. */
    riftPenalty: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Penalty multiplier applied along divergent boundaries before riftDepth is carved."
      })
    ),
    /** Hill weight contributed by boundary closeness, forming foothill skirts near margins. */
    hillBoundaryWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Hill weight contributed by boundary closeness, forming foothill skirts near margins."
      })
    ),
    /** Hill bonus added beside rift valleys, creating uplifted shoulders. */
    hillRiftBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Hill bonus added beside rift valleys, creating uplifted shoulders."
      })
    ),
    /** Extra foothill weight on convergent tiles to smooth transitions into mountain ranges. */
    hillConvergentFoothill: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra foothill weight on convergent tiles to smooth transitions into mountain ranges."
      })
    ),
    /** Penalty for hills deep inside plates; higher values keep hills near tectonic features. */
    hillInteriorFalloff: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Penalty for hills deep inside plates; higher values keep hills near tectonic features."
      })
    ),
    /** Residual uplift contribution applied to hills so basins and foothills stay balanced. */
    hillUpliftWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Residual uplift contribution applied to hills so basins and foothills stay balanced."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var VolcanoesConfigSchema = typebox_exports.Object(
  {
    /** Master toggle for volcano placement. */
    enabled: typebox_exports.Optional(
      typebox_exports.Boolean({
        description: "Master toggle for volcano placement."
      })
    ),
    /** Baseline volcanoes per land tile; higher density spawns more vents overall. */
    baseDensity: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Baseline volcanoes per land tile; higher density spawns more vents overall."
      })
    ),
    /** Minimum Euclidean distance between volcanoes in tiles to avoid clusters merging. */
    minSpacing: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Minimum Euclidean distance between volcanoes in tiles to avoid clusters merging."
      })
    ),
    /** Plate-boundary closeness threshold (0..1) for treating a tile as margin-adjacent. */
    boundaryThreshold: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Plate-boundary closeness threshold (0..1) for treating a tile as margin-adjacent."
      })
    ),
    /** Base weight applied to tiles within the boundary band, biasing arcs over interiors. */
    boundaryWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Base weight applied to tiles within the boundary band, biasing arcs over interiors."
      })
    ),
    /** Weight multiplier for convergent boundaries; raises classic arc volcano density. */
    convergentMultiplier: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Weight multiplier for convergent boundaries; raises classic arc volcano density."
      })
    ),
    /** Weight multiplier for transform boundaries; typically lower to avoid shear volcanism. */
    transformMultiplier: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Weight multiplier for transform boundaries; typically lower to avoid shear volcanism."
      })
    ),
    /** Weight multiplier for divergent boundaries; keep small to prevent rift volcanism dominating. */
    divergentMultiplier: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Weight multiplier for divergent boundaries; keep small to prevent rift volcanism dominating."
      })
    ),
    /** Weight contribution for interior hotspots; increases inland/shield volcano presence. */
    hotspotWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Weight contribution for interior hotspots; increases inland/shield volcano presence."
      })
    ),
    /** Penalty applied using shield stability; higher values suppress volcanoes on ancient cratons. */
    shieldPenalty: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Penalty applied using shield stability; higher values suppress volcanoes on ancient cratons."
      })
    ),
    /** Random additive jitter per tile to break up deterministic patterns. */
    randomJitter: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Random additive jitter per tile to break up deterministic patterns."
      })
    ),
    /** Minimum volcano count target to guarantee a few vents even on sparse maps. */
    minVolcanoes: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Minimum volcano count target to guarantee a few vents even on sparse maps."
      })
    ),
    /** Maximum volcano count cap; set <=0 to disable the cap and allow density-driven totals. */
    maxVolcanoes: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Maximum volcano count cap; set <=0 to disable the cap and allow density-driven totals."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var HotspotTunablesSchema = typebox_exports.Object(
  {
    /** Bias applied to paradise hotspots when selecting overlays (unitless multiplier). */
    paradiseBias: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bias applied to paradise hotspots when selecting overlays (unitless multiplier)."
      })
    ),
    /** Bias applied to volcanic hotspots when selecting overlays (unitless multiplier). */
    volcanicBias: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bias applied to volcanic hotspots when selecting overlays (unitless multiplier)."
      })
    ),
    /** Chance that a volcanic hotspot contains a high peak suitable for story placement (0..1). */
    volcanicPeakChance: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Chance that a volcanic hotspot contains a high peak suitable for story placement (0..1)."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var FeaturesConfigSchema = typebox_exports.Object(
  {
    /** Extra coral reef probability near paradise islands (0..1 expressed as a fraction). */
    paradiseReefChance: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra coral reef probability near paradise islands (0..1 expressed as a fraction)."
      })
    ),
    /** Extra temperate forest chance on volcanic slopes in warm climates (0..1 fraction). */
    volcanicForestChance: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra temperate forest chance on volcanic slopes in warm climates (0..1 fraction)."
      })
    ),
    /** Extra coniferous forest chance on volcano-adjacent tiles in cold climates (0..1 fraction). */
    volcanicTaigaChance: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra coniferous forest chance on volcano-adjacent tiles in cold climates (0..1 fraction)."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var StoryConfigSchema = typebox_exports.Object(
  {
    /** Hotspot tuning for volcanic/paradise overlays. */
    hotspot: typebox_exports.Optional(HotspotTunablesSchema),
    /** Localized feature bonuses around story elements. */
    features: typebox_exports.Optional(FeaturesConfigSchema)
  },
  { additionalProperties: true, default: {} }
);
var SeaCorridorPolicySchema = typebox_exports.Object(
  {
    /**
     * Protection mode for sea corridors.
     * - `'hard'` blocks all edits in corridors
     * - `'soft'` allows limited carving with penalties
     */
    protection: typebox_exports.Optional(
      typebox_exports.Union([typebox_exports.Literal("hard"), typebox_exports.Literal("soft")], {
        description: "Hard protection blocks edits in corridors; soft allows limited carving with penalties."
      })
    ),
    /** Probability multiplier applied when protection is soft to keep lanes mostly open. */
    softChanceMultiplier: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Probability multiplier applied when protection is soft to keep lanes mostly open."
      })
    ),
    /** Radius in tiles to avoid placing blocking features inside a sea corridor. */
    avoidRadius: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Radius in tiles to avoid placing blocking features inside a sea corridor."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var CorridorsConfigSchema = typebox_exports.Object(
  {
    /** Sea corridor protection policy for naval passage. */
    sea: typebox_exports.Optional(SeaCorridorPolicySchema)
  },
  { additionalProperties: true, default: {} }
);
var ClimateBaselineBandsSchema = typebox_exports.Object(
  {
    /** Equatorial zone (0-10°) rainfall target (rainforests, monsoons; typically 110-130). */
    deg0to10: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Equatorial zone rainfall target (rainforests, monsoons; typically 110-130)."
      })
    ),
    /** Tropical zone (10-20°) rainfall target (wet but variable; typically 90-110). */
    deg10to20: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Tropical zone rainfall target (wet but variable; typically 90-110)."
      })
    ),
    /** Subtropical zone (20-35°) rainfall target (deserts, Mediterranean; typically 60-80). */
    deg20to35: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Subtropical zone rainfall target (deserts, Mediterranean; typically 60-80)."
      })
    ),
    /** Temperate zone (35-55°) rainfall target (moderate rainfall; typically 70-90). */
    deg35to55: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Temperate zone rainfall target (moderate rainfall; typically 70-90)."
      })
    ),
    /** Subpolar zone (55-70°) rainfall target (cool, moderate moisture; typically 55-70). */
    deg55to70: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Subpolar zone rainfall target (cool, moderate moisture; typically 55-70)."
      })
    ),
    /** Polar zone (70°+) rainfall target (cold deserts, ice; typically 40-50). */
    deg70plus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Polar zone rainfall target (cold deserts, ice; typically 40-50)."
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "Rainfall targets by latitude zone."
  }
);
var ClimateBaselineBlendSchema = typebox_exports.Object(
  {
    /** Weight for engine's base rainfall (0..1; typically 0.5-0.7). */
    baseWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Weight for engine's base rainfall (0..1; typically 0.5-0.7).",
        minimum: 0,
        maximum: 1
      })
    ),
    /** Weight for latitude band targets (0..1; typically 0.3-0.5). */
    bandWeight: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Weight for latitude band targets (0..1; typically 0.3-0.5).",
        minimum: 0,
        maximum: 1
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "Blend weights for rainfall mixing."
  }
);
var ClimateBaselineOrographicSchema = typebox_exports.Object(
  {
    /** Elevation for modest rain increase (hills get some extra moisture). */
    hi1Threshold: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Elevation for modest rain increase (hills get some extra moisture)."
      })
    ),
    /** Rainfall bonus at first threshold (typically 5-15 units). */
    hi1Bonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Rainfall bonus at first threshold (typically 5-15 units)."
      })
    ),
    /** Elevation for strong rain increase (mountains get significant moisture). */
    hi2Threshold: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Elevation for strong rain increase (mountains get significant moisture)."
      })
    ),
    /** Rainfall bonus at second threshold (typically 10-25 units). */
    hi2Bonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Rainfall bonus at second threshold (typically 10-25 units)."
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "Orographic lift rainfall bonuses by elevation."
  }
);
var ClimateBaselineCoastalSchema = typebox_exports.Object(
  {
    /** Bonus rainfall on coastal land tiles (rainfall units). */
    coastalLandBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bonus rainfall on coastal land tiles (rainfall units)."
      })
    ),
    /** [DEPRECATED] Bonus rainfall when adjacent to shallow water. Replaced by spread logic. */
    shallowAdjBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "[DEPRECATED] Bonus rainfall when adjacent to shallow water."
      })
    ),
    /** How far inland the coastal bonus spreads (in tiles). Default: 4. */
    spread: typebox_exports.Optional(
      typebox_exports.Number({
        description: "How far inland the coastal bonus spreads (in tiles).",
        default: 4,
        minimum: 1
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "Coastal proximity rainfall bonuses."
  }
);
var ClimateBaselineNoiseSchema = typebox_exports.Object(
  {
    /** Base +/- jitter span used on smaller maps (rainfall units). */
    baseSpanSmall: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Base +/- jitter span used on smaller maps (rainfall units)."
      })
    ),
    /** Extra jitter span applied on larger maps (scalar via sqrt(area)). */
    spanLargeScaleFactor: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra jitter span applied on larger maps (scalar via sqrt(area))."
      })
    ),
    /** Frequency scale for Perlin noise (lower = larger blobs). Default: 0.15. */
    scale: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Frequency scale for Perlin noise (lower = larger blobs).",
        default: 0.15
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "Rainfall noise parameters for variation."
  }
);
var ClimateBaselineSchema = typebox_exports.Object(
  {
    /** Rainfall targets by latitude zone. */
    bands: typebox_exports.Optional(ClimateBaselineBandsSchema),
    /** Blend weights for mixing engine rainfall with latitude-based targets. */
    blend: typebox_exports.Optional(ClimateBaselineBlendSchema),
    /** Orographic lift bonuses (mountains cause rain). */
    orographic: typebox_exports.Optional(ClimateBaselineOrographicSchema),
    /** Coastal proximity rainfall bonuses. */
    coastal: typebox_exports.Optional(ClimateBaselineCoastalSchema),
    /** Rainfall noise/jitter parameters. */
    noise: typebox_exports.Optional(ClimateBaselineNoiseSchema)
  },
  { additionalProperties: true, default: {} }
);
var ClimateRefineWaterGradientSchema = typebox_exports.Object(
  {
    /** How far inland to measure water proximity (typically 8-15 tiles). */
    radius: typebox_exports.Optional(
      typebox_exports.Number({
        description: "How far inland to measure water proximity (typically 8-15 tiles)."
      })
    ),
    /** Humidity per tile closer to water; creates coastal-to-interior gradient (typically 1-3 units/tile). */
    perRingBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Humidity per tile closer to water; creates coastal-to-interior gradient (typically 1-3 units/tile)."
      })
    ),
    /** Extra humidity in low-elevation areas near water (typically 5-12 units). */
    lowlandBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra humidity in low-elevation areas near water (typically 5-12 units)."
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "Water proximity gradient settings."
  }
);
var ClimateRefineOrographicSchema = typebox_exports.Object(
  {
    /** How far upwind to scan for blocking mountains (typically 4-8 tiles). */
    steps: typebox_exports.Optional(
      typebox_exports.Number({
        description: "How far upwind to scan for blocking mountains (typically 4-8 tiles)."
      })
    ),
    /** Base rainfall loss in rain shadow (typically 8-20 units). */
    reductionBase: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Base rainfall loss in rain shadow (typically 8-20 units)."
      })
    ),
    /** Extra drying per tile closer to mountain barrier (typically 1-3 units/tile). */
    reductionPerStep: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Extra drying per tile closer to mountain barrier (typically 1-3 units/tile)."
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "Rain shadow simulation settings."
  }
);
var ClimateRefineRiverCorridorSchema = typebox_exports.Object(
  {
    /** Humidity bonus next to rivers in lowlands (typically 8-18 units). */
    lowlandAdjacencyBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Humidity bonus next to rivers in lowlands (typically 8-18 units)."
      })
    ),
    /** Humidity bonus next to rivers in highlands; less than lowlands (typically 3-8 units). */
    highlandAdjacencyBonus: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Humidity bonus next to rivers in highlands; less than lowlands (typically 3-8 units)."
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "River corridor humidity settings."
  }
);
var ClimateRefineLowBasinSchema = typebox_exports.Object(
  {
    /** Search radius to detect if a lowland is surrounded by higher ground (typically 3-6 tiles). */
    radius: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Search radius to detect if a lowland is surrounded by higher ground (typically 3-6 tiles)."
      })
    ),
    /** Humidity bonus in enclosed lowland basins like oases (typically 10-25 units). */
    delta: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Humidity bonus in enclosed lowland basins like oases (typically 10-25 units)."
      })
    )
  },
  {
    additionalProperties: true,
    default: {},
    description: "Enclosed basin humidity settings."
  }
);
var ClimateRefineSchema = typebox_exports.Object(
  {
    /** Continental effect (distance from ocean impacts humidity). */
    waterGradient: typebox_exports.Optional(ClimateRefineWaterGradientSchema),
    /** Orographic rain shadow simulation (leeward drying effect). */
    orographic: typebox_exports.Optional(ClimateRefineOrographicSchema),
    /** River valley humidity (water channels transport moisture inland). */
    riverCorridor: typebox_exports.Optional(ClimateRefineRiverCorridorSchema),
    /** Enclosed basin humidity retention (valleys trap moisture). */
    lowBasin: typebox_exports.Optional(ClimateRefineLowBasinSchema),
    /** Pressure system effects (untyped placeholder). */
    pressure: typebox_exports.Optional(UnknownRecord)
  },
  { additionalProperties: true, default: {} }
);
var ClimateConfigSchema = typebox_exports.Object(
  {
    /** Baseline rainfall and local bonuses. */
    baseline: typebox_exports.Optional(ClimateBaselineSchema),
    /** Earthlike refinement parameters (rain shadow, river corridors, etc.). */
    refine: typebox_exports.Optional(ClimateRefineSchema),
    /** Swatch overrides for macro climate regions (untyped placeholder). */
    swatches: typebox_exports.Optional(UnknownRecord)
  },
  { additionalProperties: true, default: {} }
);
var BiomeConfigSchema = typebox_exports.Object(
  {
    /** Tundra biome thresholds. */
    tundra: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /** Minimum latitude for tundra to prevent low-latitude cold deserts (degrees). */
          latMin: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Minimum latitude for tundra to prevent low-latitude cold deserts (degrees)."
            })
          ),
          /** Minimum elevation for tundra; lowlands below this stay as taiga or grassland. */
          elevMin: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Minimum elevation for tundra; lowlands below this stay as taiga or grassland."
            })
          ),
          /** Maximum rainfall tolerated before tundra flips to wetter biomes (rainfall units). */
          rainMax: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Maximum rainfall tolerated before tundra flips to wetter biomes (rainfall units)."
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** Tropical coast biome thresholds. */
    tropicalCoast: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /** Latitude limit for tropical coasts; nearer the equator keeps coasts lush (degrees). */
          latMax: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Latitude limit for tropical coasts; nearer the equator keeps coasts lush (degrees)."
            })
          ),
          /** Minimum rainfall needed to classify a warm coastline as tropical (rainfall units). */
          rainMin: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Minimum rainfall needed to classify a warm coastline as tropical (rainfall units)."
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** River valley grassland biome thresholds. */
    riverValleyGrassland: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /** Latitude limit for temperate river grasslands; beyond this prefer taiga or tundra. */
          latMax: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Latitude limit for temperate river grasslands; beyond this prefer taiga or tundra."
            })
          ),
          /** Minimum humidity needed for river valley grasslands (rainfall units). */
          rainMin: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Minimum humidity needed for river valley grasslands (rainfall units)."
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    ),
    /** Rift shoulder biome thresholds (along divergent boundaries). */
    riftShoulder: typebox_exports.Optional(
      typebox_exports.Object(
        {
          /** Latitude ceiling for grassland on rift shoulders (degrees). */
          grasslandLatMax: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Latitude ceiling for grassland on rift shoulders (degrees)."
            })
          ),
          /** Minimum rainfall for grassland shoulders along rifts (rainfall units). */
          grasslandRainMin: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Minimum rainfall for grassland shoulders along rifts (rainfall units)."
            })
          ),
          /** Latitude ceiling for tropical rift shoulders (degrees). */
          tropicalLatMax: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Latitude ceiling for tropical rift shoulders (degrees)."
            })
          ),
          /** Minimum rainfall for tropical vegetation on rift shoulders (rainfall units). */
          tropicalRainMin: typebox_exports.Optional(
            typebox_exports.Number({
              description: "Minimum rainfall for tropical vegetation on rift shoulders (rainfall units)."
            })
          )
        },
        { additionalProperties: true, default: {} }
      )
    )
  },
  { additionalProperties: true, default: {} }
);
var FeaturesDensityConfigSchema = typebox_exports.Object(
  {
    /**
     * Coral reef density multiplier on passive continental shelves.
     * - Values > 1 increase reef prevalence along shelf edges
     * - Values < 1 reduce reef spawning
     * @default 1.0
     */
    shelfReefMultiplier: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Coral reef density multiplier on passive continental shelves (scalar)."
      })
    ),
    /**
     * Bonus jungle/rainforest probability in wet tropics.
     * Adds to base chance when humidity and latitude criteria are met.
     * Example: 10 adds 10% extra chance for rainforest tiles.
     */
    rainforestExtraChance: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bonus jungle/rainforest probability in wet tropics (0..1 fraction or percent)."
      })
    ),
    /**
     * Bonus temperate forest probability in moderate rainfall zones.
     * Adds to base chance in mid-latitude humid regions.
     * Example: 10 adds 10% extra chance for forest tiles.
     */
    forestExtraChance: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bonus temperate forest probability in moderate rainfall zones (0..1 fraction or percent)."
      })
    ),
    /**
     * Bonus coniferous forest (taiga) probability in cold regions.
     * Adds to base chance near polar latitudes.
     * Example: 5 adds 5% extra chance for taiga tiles.
     */
    taigaExtraChance: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Bonus coniferous forest probability in cold regions (0..1 fraction or percent)."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var FloodplainsConfigSchema = typebox_exports.Object(
  {
    /**
     * Minimum river segment length that can host floodplains.
     * Rivers shorter than this won't generate floodplain terrain.
     * @default 4
     */
    minLength: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Minimum river segment length that can host floodplains (tiles)."
      })
    ),
    /**
     * Maximum contiguous river length converted to floodplains.
     * Prevents endless floodplain strips along long rivers.
     * @default 10
     */
    maxLength: typebox_exports.Optional(
      typebox_exports.Number({
        description: "Maximum contiguous river length converted to floodplains to avoid endless strips (tiles)."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var StartsConfigSchema = typebox_exports.Object(
  {
    /**
     * Player count allocated to the primary (western) landmass band.
     * The vanilla engine splits players between two major regions.
     */
    playersLandmass1: typebox_exports.Number({
      description: "Player count allocated to the primary landmass band."
    }),
    /**
     * Player count allocated to the secondary (eastern) landmass band.
     * Set to 0 for single-continent maps.
     */
    playersLandmass2: typebox_exports.Number({
      description: "Player count allocated to the secondary landmass band (if present)."
    }),
    /** Bounding box for the western continent used by start placement. */
    westContinent: ContinentBoundsSchema,
    /** Bounding box for the eastern continent used by start placement. */
    eastContinent: ContinentBoundsSchema,
    /**
     * Number of sector rows when partitioning the map for starts.
     * Higher values create a finer placement grid.
     */
    startSectorRows: typebox_exports.Number({
      description: "Number of sector rows used when partitioning the map for starts."
    }),
    /**
     * Number of sector columns when partitioning the map for starts.
     * Higher values create a finer placement grid.
     */
    startSectorCols: typebox_exports.Number({
      description: "Number of sector columns used when partitioning the map for starts."
    }),
    /**
     * Explicit start sector descriptors passed to placement logic.
     * Each element describes a candidate region for civilization spawns.
     * @default []
     */
    startSectors: typebox_exports.Array(typebox_exports.Unknown(), {
      default: [],
      description: "Explicit start sector descriptors passed directly to placement logic."
    })
  },
  { additionalProperties: true }
);
var PlacementConfigSchema = typebox_exports.Object(
  {
    /**
     * Whether to add one extra natural wonder beyond map-size defaults.
     * Diversifies layouts with an additional landmark.
     * @default true
     */
    wondersPlusOne: typebox_exports.Optional(
      typebox_exports.Boolean({
        description: "Whether to add one extra natural wonder beyond map-size defaults to diversify layouts."
      })
    ),
    /** Floodplain generation settings along rivers. */
    floodplains: typebox_exports.Optional(FloodplainsConfigSchema),
    /** Player start placement configuration (required fields when provided). */
    starts: typebox_exports.Optional(StartsConfigSchema)
  },
  { additionalProperties: true, default: {} }
);
var FoundationConfigSchema = typebox_exports.Object(
  {
    /** Random seed configuration for reproducible generation. */
    seed: typebox_exports.Optional(FoundationSeedConfigSchema),
    /** Tectonic plate count and behavior settings. */
    plates: typebox_exports.Optional(FoundationPlatesConfigSchema),
    /** Wind, mantle convection, and directional coherence settings. */
    dynamics: typebox_exports.Optional(FoundationDynamicsConfigSchema),
    /** @internal Surface mode configuration (engine plumbing). */
    surface: typebox_exports.Optional(FoundationSurfaceConfigSchema),
    /** @internal Policy flags for foundation stage (engine plumbing). */
    policy: typebox_exports.Optional(FoundationPolicyConfigSchema),
    /** @internal Diagnostics toggles for foundation stage (engine plumbing). */
    diagnostics: typebox_exports.Optional(FoundationDiagnosticsConfigSchema),
    /** Ocean separation policy ensuring water channels between continents. */
    oceanSeparation: typebox_exports.Optional(OceanSeparationConfigSchema),
    /** Coastline shaping, bays, and fjord settings. */
    coastlines: typebox_exports.Optional(CoastlinesConfigSchema),
    /** Island chain and archipelago generation. */
    islands: typebox_exports.Optional(IslandsConfigSchema),
    /** Mountain range generation from tectonic interactions. */
    mountains: typebox_exports.Optional(MountainsConfigSchema),
    /** Volcanic feature placement along boundaries and hotspots. */
    volcanoes: typebox_exports.Optional(VolcanoesConfigSchema),
    /** Story seed overlays: hotspots, rifts, orogeny events. */
    story: typebox_exports.Optional(StoryConfigSchema),
    /** Sea corridor policy for navigable channels. */
    corridors: typebox_exports.Optional(CorridorsConfigSchema),
    /** Biome threshold overrides for terrain assignment. */
    biomes: typebox_exports.Optional(BiomeConfigSchema),
    /** Vegetation and reef density multipliers. */
    featuresDensity: typebox_exports.Optional(FeaturesDensityConfigSchema),
    /** Late-stage placement: wonders, floodplains, starts. */
    placement: typebox_exports.Optional(PlacementConfigSchema)
  },
  { additionalProperties: true, default: {} }
);
var DiagnosticsConfigSchema = typebox_exports.Object(
  {
    /**
     * Emit ASCII map visualizations during generation.
     * Useful for debugging terrain distribution in console logs.
     * @default false
     */
    logAscii: typebox_exports.Optional(
      typebox_exports.Boolean({
        description: "Emit ASCII diagnostics for core stages such as foundation and landmass windows."
      })
    ),
    /**
     * Log histogram summaries for terrain and climate distributions.
     * Helps validate that thresholds produce expected ratios.
     * @default false
     */
    logHistograms: typebox_exports.Optional(
      typebox_exports.Boolean({
        description: "Log histogram summaries for quick visual validation of distributions."
      })
    )
  },
  { additionalProperties: true, default: {} }
);
var MapGenConfigSchema = typebox_exports.Object(
  {
    /**
     * List of preset names to apply in order before processing overrides.
     * Presets are merged left-to-right, then user overrides are applied.
     * @default []
     */
    presets: typebox_exports.Optional(
      typebox_exports.Array(typebox_exports.String(), {
        default: [],
        description: "List of preset names to apply in order before processing stage overrides."
      })
    ),
    /** @internal Stage enable/disable flags (engine plumbing). */
    stageConfig: typebox_exports.Optional(StageConfigSchema),
    /** @internal Custom stage manifest for advanced pipelines (engine plumbing). */
    stageManifest: typebox_exports.Optional(StageManifestSchema),
    /** Feature toggles controlling story events and generation features. */
    toggles: typebox_exports.Optional(TogglesSchema),
    /** Landmass geometry: water percent, tectonic bias, and post-processing. */
    landmass: typebox_exports.Optional(LandmassConfigSchema),
    /** Foundation layer: plates, dynamics, and nested terrain configs. */
    foundation: typebox_exports.Optional(FoundationConfigSchema),
    /** Climate baseline and refinement settings for humidity. */
    climate: typebox_exports.Optional(ClimateConfigSchema),
    /** Mountain generation thresholds and tectonic weights. */
    mountains: typebox_exports.Optional(MountainsConfigSchema),
    /** Volcano placement density and boundary multipliers. */
    volcanoes: typebox_exports.Optional(VolcanoesConfigSchema),
    /** Coastline shaping, bays, and fjords. */
    coastlines: typebox_exports.Optional(CoastlinesConfigSchema),
    /** Island and archipelago generation. */
    islands: typebox_exports.Optional(IslandsConfigSchema),
    /** Biome threshold overrides for terrain assignment. */
    biomes: typebox_exports.Optional(BiomeConfigSchema),
    /** Vegetation and reef density multipliers. */
    featuresDensity: typebox_exports.Optional(FeaturesDensityConfigSchema),
    /** Story seed overlays: hotspots, rifts, orogeny. */
    story: typebox_exports.Optional(StoryConfigSchema),
    /** Sea corridor policy for navigable channels. */
    corridors: typebox_exports.Optional(CorridorsConfigSchema),
    /** Ocean separation ensuring water channels between continents. */
    oceanSeparation: typebox_exports.Optional(OceanSeparationConfigSchema),
    /** Late-stage placement: wonders, floodplains, starts. */
    placement: typebox_exports.Optional(PlacementConfigSchema),
    /** Diagnostics toggles for debugging output. */
    diagnostics: typebox_exports.Optional(DiagnosticsConfigSchema)
  },
  { additionalProperties: true, default: {} }
);
function IsGuardInterface(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "check") && guard_exports.HasPropertyKey(value, "errors") && guard_exports.IsFunction(value.check) && guard_exports.IsFunction(value.errors);
}
function IsGuard2(value) {
  return guard_exports.HasPropertyKey(value, "~guard") && IsGuardInterface(value["~guard"]);
}
function IsRefine2(value) {
  return guard_exports.HasPropertyKey(value, "~refine") && guard_exports.IsArray(value["~refine"]) && guard_exports.Every(value["~refine"], 0, (value2) => guard_exports.IsObject(value2) && guard_exports.HasPropertyKey(value2, "refine") && guard_exports.HasPropertyKey(value2, "message") && guard_exports.IsFunction(value2.refine) && guard_exports.IsString(value2.message));
}
function IsSchemaObject(value) {
  return guard_exports.IsObject(value) && !guard_exports.IsArray(value);
}
function IsBooleanSchema(value) {
  return guard_exports.IsBoolean(value);
}
function IsSchema2(value) {
  return IsSchemaObject(value) || IsBooleanSchema(value);
}
function IsAdditionalItems(schema) {
  return guard_exports.HasPropertyKey(schema, "additionalItems") && IsSchema2(schema.additionalItems);
}
function IsAdditionalProperties(schema) {
  return guard_exports.HasPropertyKey(schema, "additionalProperties") && IsSchema2(schema.additionalProperties);
}
function IsAllOf(schema) {
  return guard_exports.HasPropertyKey(schema, "allOf") && guard_exports.IsArray(schema.allOf) && schema.allOf.every((value) => IsSchema2(value));
}
function IsAnchor(schema) {
  return guard_exports.HasPropertyKey(schema, "$anchor") && guard_exports.IsString(schema.$anchor);
}
function IsAnyOf(schema) {
  return guard_exports.HasPropertyKey(schema, "anyOf") && guard_exports.IsArray(schema.anyOf) && schema.anyOf.every((value) => IsSchema2(value));
}
function IsConst(value) {
  return guard_exports.HasPropertyKey(value, "const");
}
function IsContains(schema) {
  return guard_exports.HasPropertyKey(schema, "contains") && IsSchema2(schema.contains);
}
function IsDefault(schema) {
  return guard_exports.HasPropertyKey(schema, "default");
}
function IsDependencies(schema) {
  return guard_exports.HasPropertyKey(schema, "dependencies") && guard_exports.IsObject(schema.dependencies) && Object.values(schema.dependencies).every((value) => IsSchema2(value) || guard_exports.IsArray(value) && value.every((value2) => guard_exports.IsString(value2)));
}
function IsDependentRequired(schema) {
  return guard_exports.HasPropertyKey(schema, "dependentRequired") && guard_exports.IsObject(schema.dependentRequired) && Object.values(schema.dependentRequired).every((value) => guard_exports.IsArray(value) && value.every((value2) => guard_exports.IsString(value2)));
}
function IsDependentSchemas(schema) {
  return guard_exports.HasPropertyKey(schema, "dependentSchemas") && guard_exports.IsObject(schema.dependentSchemas) && Object.values(schema.dependentSchemas).every((value) => IsSchema2(value));
}
function IsDynamicAnchor(schema) {
  return guard_exports.HasPropertyKey(schema, "$dynamicAnchor") && guard_exports.IsString(schema.$dynamicAnchor);
}
function IsElse(schema) {
  return guard_exports.HasPropertyKey(schema, "else") && IsSchema2(schema.else);
}
function IsEnum2(schema) {
  return guard_exports.HasPropertyKey(schema, "enum") && guard_exports.IsArray(schema.enum);
}
function IsExclusiveMaximum(schema) {
  return guard_exports.HasPropertyKey(schema, "exclusiveMaximum") && (guard_exports.IsNumber(schema.exclusiveMaximum) || guard_exports.IsBigInt(schema.exclusiveMaximum));
}
function IsExclusiveMinimum(schema) {
  return guard_exports.HasPropertyKey(schema, "exclusiveMinimum") && (guard_exports.IsNumber(schema.exclusiveMinimum) || guard_exports.IsBigInt(schema.exclusiveMinimum));
}
function IsFormat(schema) {
  return guard_exports.HasPropertyKey(schema, "format") && guard_exports.IsString(schema.format);
}
function IsId(schema) {
  return guard_exports.HasPropertyKey(schema, "$id") && guard_exports.IsString(schema.$id);
}
function IsIf(schema) {
  return guard_exports.HasPropertyKey(schema, "if") && IsSchema2(schema.if);
}
function IsItems(schema) {
  return guard_exports.HasPropertyKey(schema, "items") && (IsSchema2(schema.items) || guard_exports.IsArray(schema.items) && schema.items.every((value) => {
    return IsSchema2(value);
  }));
}
function IsItemsSized(schema) {
  return IsItems(schema) && guard_exports.IsArray(schema.items);
}
function IsMaximum(schema) {
  return guard_exports.HasPropertyKey(schema, "maximum") && (guard_exports.IsNumber(schema.maximum) || guard_exports.IsBigInt(schema.maximum));
}
function IsMaxContains(schema) {
  return guard_exports.HasPropertyKey(schema, "maxContains") && guard_exports.IsNumber(schema.maxContains);
}
function IsMaxItems(schema) {
  return guard_exports.HasPropertyKey(schema, "maxItems") && guard_exports.IsNumber(schema.maxItems);
}
function IsMaxLength(schema) {
  return guard_exports.HasPropertyKey(schema, "maxLength") && guard_exports.IsNumber(schema.maxLength);
}
function IsMaxProperties(schema) {
  return guard_exports.HasPropertyKey(schema, "maxProperties") && guard_exports.IsNumber(schema.maxProperties);
}
function IsMinimum(schema) {
  return guard_exports.HasPropertyKey(schema, "minimum") && (guard_exports.IsNumber(schema.minimum) || guard_exports.IsBigInt(schema.minimum));
}
function IsMinContains(schema) {
  return guard_exports.HasPropertyKey(schema, "minContains") && guard_exports.IsNumber(schema.minContains);
}
function IsMinItems(schema) {
  return guard_exports.HasPropertyKey(schema, "minItems") && guard_exports.IsNumber(schema.minItems);
}
function IsMinLength(schema) {
  return guard_exports.HasPropertyKey(schema, "minLength") && guard_exports.IsNumber(schema.minLength);
}
function IsMinProperties(schema) {
  return guard_exports.HasPropertyKey(schema, "minProperties") && guard_exports.IsNumber(schema.minProperties);
}
function IsMultipleOf2(schema) {
  return guard_exports.HasPropertyKey(schema, "multipleOf") && (guard_exports.IsNumber(schema.multipleOf) || guard_exports.IsBigInt(schema.multipleOf));
}
function IsNot(schema) {
  return guard_exports.HasPropertyKey(schema, "not") && IsSchema2(schema.not);
}
function IsOneOf(schema) {
  return guard_exports.HasPropertyKey(schema, "oneOf") && guard_exports.IsArray(schema.oneOf) && schema.oneOf.every((value) => IsSchema2(value));
}
function IsPattern(schema) {
  return guard_exports.HasPropertyKey(schema, "pattern") && (guard_exports.IsString(schema.pattern) || schema.pattern instanceof RegExp);
}
function IsPatternProperties(schema) {
  return guard_exports.HasPropertyKey(schema, "patternProperties") && guard_exports.IsObject(schema.patternProperties) && Object.values(schema.patternProperties).every((value) => IsSchema2(value));
}
function IsPrefixItems(schema) {
  return guard_exports.HasPropertyKey(schema, "prefixItems") && guard_exports.IsArray(schema.prefixItems) && schema.prefixItems.every((schema2) => IsSchema2(schema2));
}
function IsProperties(schema) {
  return guard_exports.HasPropertyKey(schema, "properties") && guard_exports.IsObject(schema.properties) && Object.values(schema.properties).every((value) => IsSchema2(value));
}
function IsPropertyNames(schema) {
  return guard_exports.HasPropertyKey(schema, "propertyNames") && (guard_exports.IsObject(schema.propertyNames) || IsSchema2(schema.propertyNames));
}
function IsRecursiveAnchor(schema) {
  return guard_exports.HasPropertyKey(schema, "$recursiveAnchor") && guard_exports.IsBoolean(schema.$recursiveAnchor);
}
function IsRecursiveAnchorTrue(schema) {
  return IsRecursiveAnchor(schema) && guard_exports.IsEqual(schema.$recursiveAnchor, true);
}
function IsRecursiveRef(schema) {
  return guard_exports.HasPropertyKey(schema, "$recursiveRef") && guard_exports.IsString(schema.$recursiveRef);
}
function IsRef2(schema) {
  return guard_exports.HasPropertyKey(schema, "$ref") && guard_exports.IsString(schema.$ref);
}
function IsRequired(schema) {
  return guard_exports.HasPropertyKey(schema, "required") && guard_exports.IsArray(schema.required) && schema.required.every((value) => guard_exports.IsString(value));
}
function IsThen(schema) {
  return guard_exports.HasPropertyKey(schema, "then") && IsSchema2(schema.then);
}
function IsType(schema) {
  return guard_exports.HasPropertyKey(schema, "type") && (guard_exports.IsString(schema.type) || guard_exports.IsArray(schema.type) && schema.type.every((value) => guard_exports.IsString(value)));
}
function IsUniqueItems(schema) {
  return guard_exports.HasPropertyKey(schema, "uniqueItems") && guard_exports.IsBoolean(schema.uniqueItems);
}
function IsUnevaluatedItems(schema) {
  return guard_exports.HasPropertyKey(schema, "unevaluatedItems") && IsSchema2(schema.unevaluatedItems);
}
function IsUnevaluatedProperties(schema) {
  return guard_exports.HasPropertyKey(schema, "unevaluatedProperties") && IsSchema2(schema.unevaluatedProperties);
}
var CheckContext = class {
  constructor() {
    this.indices = /* @__PURE__ */ new Set();
    this.keys = /* @__PURE__ */ new Set();
  }
  AddIndex(index) {
    this.indices.add(index);
    return true;
  }
  AddKey(key) {
    this.keys.add(key);
    return true;
  }
  GetIndices() {
    return this.indices;
  }
  GetKeys() {
    return this.keys;
  }
  Merge(results) {
    for (const context of results) {
      context.indices.forEach((value) => this.indices.add(value));
      context.keys.forEach((value) => this.keys.add(value));
    }
    return true;
  }
};
var ErrorContext = class extends CheckContext {
  constructor(callback) {
    super();
    this.callback = callback;
  }
  AddError(error) {
    this.callback(error);
    return false;
  }
};
var AccumulatedErrorContext = class extends ErrorContext {
  constructor() {
    super((error) => this.errors.push(error));
    this.errors = [];
  }
  AddError(error) {
    this.errors.push(error);
    return false;
  }
  GetErrors() {
    return this.errors;
  }
};
var identifier = "external_";
var resetCount = 0;
var state = {
  identifier: `${identifier}${resetCount}`,
  variables: []
};
function CheckGuard(stack, context, schema, value) {
  return schema["~guard"].check(value);
}
function ErrorGuard(stack, context, schemaPath, instancePath, schema, value) {
  return schema["~guard"].check(value) || context.AddError({
    keyword: "~guard",
    schemaPath,
    instancePath,
    params: { errors: schema["~guard"].errors(value) }
  });
}
function CheckRefine(stack, context, schema, value) {
  return guard_exports.Every(schema["~refine"], 0, (refinement, _) => refinement.refine(value));
}
function ErrorRefine(stack, context, schemaPath, instancePath, schema, value) {
  return guard_exports.EveryAll(schema["~refine"], 0, (refinement, index) => {
    return refinement.refine(value) || context.AddError({
      keyword: "~refine",
      schemaPath,
      instancePath,
      params: { index, message: refinement.message }
    });
  });
}
function IsValid(schema) {
  return IsItems(schema) && guard_exports.IsArray(schema.items);
}
function CheckAdditionalItems(stack, context, schema, value) {
  if (!IsValid(schema))
    return true;
  const isAdditionalItems = value.every((item, index) => {
    return guard_exports.IsLessThan(index, schema.items.length) || CheckSchema(stack, context, schema.additionalItems, item) && context.AddIndex(index);
  });
  return isAdditionalItems;
}
function ErrorAdditionalItems(stack, context, schemaPath, instancePath, schema, value) {
  if (!IsValid(schema))
    return true;
  const isAdditionalItems = value.every((item, index) => {
    const nextSchemaPath = `${schemaPath}/additionalItems`;
    const nextInstancePath = `${instancePath}/${index}`;
    return guard_exports.IsLessThan(index, schema.items.length) || ErrorSchema(stack, context, nextSchemaPath, nextInstancePath, schema.additionalItems, item) && context.AddIndex(index);
  });
  return isAdditionalItems;
}
function GetPropertyKeyAsPattern(key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `^${escaped}$`;
}
function GetPropertiesPattern(schema) {
  const patterns = [];
  if (IsPatternProperties(schema))
    patterns.push(...guard_exports.Keys(schema.patternProperties));
  if (IsProperties(schema))
    patterns.push(...guard_exports.Keys(schema.properties).map(GetPropertyKeyAsPattern));
  return guard_exports.IsEqual(patterns.length, 0) ? "(?!)" : `(${patterns.join("|")})`;
}
function CheckAdditionalProperties(stack, context, schema, value) {
  const regexp = new RegExp(GetPropertiesPattern(schema));
  const isAdditionalProperties = guard_exports.Every(guard_exports.Keys(value), 0, (key, _index) => {
    return regexp.test(key) || CheckSchema(stack, context, schema.additionalProperties, value[key]) && context.AddKey(key);
  });
  return isAdditionalProperties;
}
function ErrorAdditionalProperties(stack, context, schemaPath, instancePath, schema, value) {
  const regexp = new RegExp(GetPropertiesPattern(schema));
  const additionalProperties = [];
  const isAdditionalProperties = guard_exports.EveryAll(guard_exports.Keys(value), 0, (key, _index) => {
    const nextSchemaPath = `${schemaPath}/additionalProperties`;
    const nextInstancePath = `${instancePath}/${key}`;
    const nextContext = new AccumulatedErrorContext();
    const isAdditionalProperty = regexp.test(key) || ErrorSchema(stack, nextContext, nextSchemaPath, nextInstancePath, schema.additionalProperties, value[key]) && context.AddKey(key);
    if (!isAdditionalProperty)
      additionalProperties.push(key);
    return isAdditionalProperty;
  });
  return isAdditionalProperties || context.AddError({
    keyword: "additionalProperties",
    schemaPath,
    instancePath,
    params: { additionalProperties }
  });
}
function CheckAllOf(stack, context, schema, value) {
  const results = schema.allOf.reduce((result, schema2) => {
    const nextContext = new CheckContext();
    return CheckSchema(stack, nextContext, schema2, value) ? [...result, nextContext] : result;
  }, []);
  return guard_exports.IsEqual(results.length, schema.allOf.length) && context.Merge(results);
}
function ErrorAllOf(stack, context, schemaPath, instancePath, schema, value) {
  const failedContexts = [];
  const results = schema.allOf.reduce((result, schema2, index) => {
    const nextSchemaPath = `${schemaPath}/allOf/${index}`;
    const nextContext = new AccumulatedErrorContext();
    const isSchema = ErrorSchema(stack, nextContext, nextSchemaPath, instancePath, schema2, value);
    if (!isSchema)
      failedContexts.push(nextContext);
    return isSchema ? [...result, nextContext] : result;
  }, []);
  const isAllOf = guard_exports.IsEqual(results.length, schema.allOf.length) && context.Merge(results);
  if (!isAllOf)
    failedContexts.forEach((failed) => failed.GetErrors().forEach((error) => context.AddError(error)));
  return isAllOf;
}
function CheckAnyOf(stack, context, schema, value) {
  const results = schema.anyOf.reduce((result, schema2, index) => {
    const nextContext = new CheckContext();
    return CheckSchema(stack, nextContext, schema2, value) ? [...result, nextContext] : result;
  }, []);
  return guard_exports.IsGreaterThan(results.length, 0) && context.Merge(results);
}
function ErrorAnyOf(stack, context, schemaPath, instancePath, schema, value) {
  const failedContexts = [];
  const results = schema.anyOf.reduce((result, schema2, index) => {
    const nextContext = new AccumulatedErrorContext();
    const nextSchemaPath = `${schemaPath}/anyOf/${index}`;
    const isSchema = ErrorSchema(stack, nextContext, nextSchemaPath, instancePath, schema2, value);
    if (!isSchema)
      failedContexts.push(nextContext);
    return isSchema ? [...result, nextContext] : result;
  }, []);
  const isAnyOf = guard_exports.IsGreaterThan(results.length, 0) && context.Merge(results);
  if (!isAnyOf)
    failedContexts.forEach((failed) => failed.GetErrors().forEach((error) => context.AddError(error)));
  return isAnyOf || context.AddError({
    keyword: "anyOf",
    schemaPath,
    instancePath,
    params: {}
  });
}
function CheckBooleanSchema(stack, context, schema, value) {
  return schema;
}
function ErrorBooleanSchema(stack, context, schemaPath, instancePath, schema, value) {
  return CheckBooleanSchema(stack, context, schema, value) || context.AddError({
    keyword: "boolean",
    schemaPath,
    instancePath,
    params: {}
  });
}
function CheckConst(stack, context, schema, value) {
  return guard_exports.IsValueLike(schema.const) ? guard_exports.IsEqual(value, schema.const) : guard_exports.IsDeepEqual(value, schema.const);
}
function ErrorConst(stack, context, schemaPath, instancePath, schema, value) {
  return CheckConst(stack, context, schema, value) || context.AddError({
    keyword: "const",
    schemaPath,
    instancePath,
    params: { allowedValue: schema.const }
  });
}
function IsValid2(schema) {
  return !(IsMinContains(schema) && guard_exports.IsEqual(schema.minContains, 0));
}
function CheckContains(stack, context, schema, value) {
  if (!IsValid2(schema))
    return true;
  return !guard_exports.IsEqual(value.length, 0) && value.some((item) => CheckSchema(stack, context, schema.contains, item));
}
function ErrorContains(stack, context, schemaPath, instancePath, schema, value) {
  return CheckContains(stack, context, schema, value) || context.AddError({
    keyword: "contains",
    schemaPath,
    instancePath,
    params: { minContains: 1 }
  });
}
function CheckDependencies(stack, context, schema, value) {
  const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
  const isEvery = guard_exports.Every(guard_exports.Entries(schema.dependencies), 0, ([key, schema2]) => {
    return !guard_exports.HasPropertyKey(value, key) || (guard_exports.IsArray(schema2) ? schema2.every((key2) => guard_exports.HasPropertyKey(value, key2)) : CheckSchema(stack, context, schema2, value));
  });
  return isLength || isEvery;
}
function ErrorDependencies(stack, context, schemaPath, instancePath, schema, value) {
  const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
  const isEvery = guard_exports.EveryAll(guard_exports.Entries(schema.dependencies), 0, ([key, schema2]) => {
    const nextSchemaPath = `${schemaPath}/dependencies/${key}`;
    return !guard_exports.HasPropertyKey(value, key) || (guard_exports.IsArray(schema2) ? schema2.every((dependency) => guard_exports.HasPropertyKey(value, dependency) || context.AddError({
      keyword: "dependencies",
      schemaPath,
      instancePath,
      params: { property: key, dependencies: schema2 }
    })) : ErrorSchema(stack, context, nextSchemaPath, instancePath, schema2, value));
  });
  return isLength || isEvery;
}
function CheckDependentRequired(stack, context, schema, value) {
  const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
  const isEvery = guard_exports.Every(guard_exports.Entries(schema.dependentRequired), 0, ([key, keys]) => {
    return !guard_exports.HasPropertyKey(value, key) || keys.every((key2) => guard_exports.HasPropertyKey(value, key2));
  });
  return isLength || isEvery;
}
function ErrorDependentRequired(stack, context, schemaPath, instancePath, schema, value) {
  const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
  const isEveryEntry = guard_exports.EveryAll(guard_exports.Entries(schema.dependentRequired), 0, ([key, keys]) => {
    return !guard_exports.HasPropertyKey(value, key) || guard_exports.EveryAll(keys, 0, (dependency) => guard_exports.HasPropertyKey(value, dependency) || context.AddError({
      keyword: "dependentRequired",
      schemaPath,
      instancePath,
      params: { property: key, dependencies: keys }
    }));
  });
  return isLength || isEveryEntry;
}
function CheckDependentSchemas(stack, context, schema, value) {
  const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
  const isEvery = guard_exports.Every(guard_exports.Entries(schema.dependentSchemas), 0, ([key, schema2]) => {
    return !guard_exports.HasPropertyKey(value, key) || CheckSchema(stack, context, schema2, value);
  });
  return isLength || isEvery;
}
function ErrorDependentSchemas(stack, context, schemaPath, instancePath, schema, value) {
  const isLength = guard_exports.IsEqual(guard_exports.Keys(value).length, 0);
  const isEvery = guard_exports.EveryAll(guard_exports.Entries(schema.dependentSchemas), 0, ([key, schema2]) => {
    const nextSchemaPath = `${schemaPath}/dependentSchemas/${key}`;
    return !guard_exports.HasPropertyKey(value, key) || ErrorSchema(stack, context, nextSchemaPath, instancePath, schema2, value);
  });
  return isLength || isEvery;
}
function CheckEnum(stack, context, schema, value) {
  return schema.enum.some((option) => guard_exports.IsValueLike(option) ? guard_exports.IsEqual(value, option) : guard_exports.IsDeepEqual(value, option));
}
function ErrorEnum(stack, context, schemaPath, instancePath, schema, value) {
  return CheckEnum(stack, context, schema, value) || context.AddError({
    keyword: "enum",
    schemaPath,
    instancePath,
    params: { allowedValues: schema.enum }
  });
}
function CheckExclusiveMaximum(stack, context, schema, value) {
  return guard_exports.IsLessThan(value, schema.exclusiveMaximum);
}
function ErrorExclusiveMaximum(stack, context, schemaPath, instancePath, schema, value) {
  return CheckExclusiveMaximum(stack, context, schema, value) || context.AddError({
    keyword: "exclusiveMaximum",
    schemaPath,
    instancePath,
    params: { comparison: "<", limit: schema.exclusiveMaximum }
  });
}
function CheckExclusiveMinimum(stack, context, schema, value) {
  return guard_exports.IsGreaterThan(value, schema.exclusiveMinimum);
}
function ErrorExclusiveMinimum(stack, context, schemaPath, instancePath, schema, value) {
  return CheckExclusiveMinimum(stack, context, schema, value) || context.AddError({
    keyword: "exclusiveMinimum",
    schemaPath,
    instancePath,
    params: { comparison: ">", limit: schema.exclusiveMinimum }
  });
}
var formats = /* @__PURE__ */ new Map();
function Set3(name, fn) {
  formats.set(name, fn);
}
function Get3(name) {
  return formats.get(name);
}
function Has(name) {
  return formats.has(name);
}
function Test(name, value) {
  const fn = formats.get(name);
  return fn ? fn(value) : true;
}
function Clear() {
  formats.clear();
}
function Entries2() {
  return [...formats.entries()];
}
function Reset2() {
  Clear();
}
var Format = { Set: Set3, Get: Get3, Has, Test, Clear, Entries: Entries2, Reset: Reset2 };
function CheckFormat(stack, context, schema, value) {
  return Format.Test(schema.format, value);
}
function ErrorFormat(stack, context, schemaPath, instancePath, schema, value) {
  return CheckFormat(stack, context, schema, value) || context.AddError({
    keyword: "format",
    schemaPath,
    instancePath,
    params: { format: schema.format }
  });
}
function CheckIf(stack, context, schema, value) {
  const thenSchema = IsThen(schema) ? schema.then : true;
  const elseSchema = IsElse(schema) ? schema.else : true;
  return CheckSchema(stack, context, schema.if, value) ? CheckSchema(stack, context, thenSchema, value) : CheckSchema(stack, context, elseSchema, value);
}
function ErrorIf(stack, context, schemaPath, instancePath, schema, value) {
  const thenSchema = IsThen(schema) ? schema.then : true;
  const elseSchema = IsElse(schema) ? schema.else : true;
  const trueContext = new AccumulatedErrorContext();
  const isIf = ErrorSchema(stack, trueContext, `${schemaPath}/if`, instancePath, schema.if, value) ? ErrorSchema(stack, trueContext, `${schemaPath}/then`, instancePath, thenSchema, value) || context.AddError({
    keyword: "if",
    schemaPath,
    instancePath,
    params: { failingKeyword: "then" }
  }) : ErrorSchema(stack, context, `${schemaPath}/else`, instancePath, elseSchema, value) || context.AddError({
    keyword: "if",
    schemaPath,
    instancePath,
    params: { failingKeyword: "else" }
  });
  if (isIf)
    context.Merge([trueContext]);
  return isIf;
}
function CheckItemsSized(stack, context, schema, value) {
  return guard_exports.Every(schema.items, 0, (schema2, index) => {
    return guard_exports.IsLessEqualThan(value.length, index) || CheckSchema(stack, context, schema2, value[index]) && context.AddIndex(index);
  });
}
function ErrorItemsSized(stack, context, schemaPath, instancePath, schema, value) {
  return guard_exports.EveryAll(schema.items, 0, (schema2, index) => {
    const nextSchemaPath = `${schemaPath}/items/${index}`;
    const nextInstancePath = `${instancePath}/${index}`;
    return guard_exports.IsLessEqualThan(value.length, index) || ErrorSchema(stack, context, nextSchemaPath, nextInstancePath, schema2, value[index]) && context.AddIndex(index);
  });
}
function CheckItemsUnsized(stack, context, schema, value) {
  const offset = IsPrefixItems(schema) ? schema.prefixItems.length : 0;
  return guard_exports.Every(value, offset, (element, index) => {
    return CheckSchema(stack, context, schema.items, element) && context.AddIndex(index);
  });
}
function ErrorItemsUnsized(stack, context, schemaPath, instancePath, schema, value) {
  const offset = IsPrefixItems(schema) ? schema.prefixItems.length : 0;
  return guard_exports.EveryAll(value, offset, (element, index) => {
    const nextSchemaPath = `${schemaPath}/items`;
    const nextInstancePath = `${instancePath}/${index}`;
    return ErrorSchema(stack, context, nextSchemaPath, nextInstancePath, schema.items, element) && context.AddIndex(index);
  });
}
function CheckItems(stack, context, schema, value) {
  return IsItemsSized(schema) ? CheckItemsSized(stack, context, schema, value) : CheckItemsUnsized(stack, context, schema, value);
}
function ErrorItems(stack, context, schemaPath, instancePath, schema, value) {
  return IsItemsSized(schema) ? ErrorItemsSized(stack, context, schemaPath, instancePath, schema, value) : ErrorItemsUnsized(stack, context, schemaPath, instancePath, schema, value);
}
function IsValid3(schema) {
  return IsContains(schema);
}
function CheckMaxContains(stack, context, schema, value) {
  if (!IsValid3(schema))
    return true;
  const count = value.reduce((result, item) => CheckSchema(stack, context, schema.contains, item) ? ++result : result, 0);
  return guard_exports.IsLessEqualThan(count, schema.maxContains);
}
function ErrorMaxContains(stack, context, schemaPath, instancePath, schema, value) {
  const minContains = IsMinContains(schema) ? schema.minContains : 1;
  return CheckMaxContains(stack, context, schema, value) || context.AddError({
    keyword: "contains",
    schemaPath,
    instancePath,
    params: { minContains, maxContains: schema.maxContains }
  });
}
function CheckMaximum(stack, context, schema, value) {
  return guard_exports.IsLessEqualThan(value, schema.maximum);
}
function ErrorMaximum(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMaximum(stack, context, schema, value) || context.AddError({
    keyword: "maximum",
    schemaPath,
    instancePath,
    params: { comparison: "<=", limit: schema.maximum }
  });
}
function CheckMaxItems(stack, context, schema, value) {
  return guard_exports.IsLessEqualThan(value.length, schema.maxItems);
}
function ErrorMaxItems(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMaxItems(stack, context, schema, value) || context.AddError({
    keyword: "maxItems",
    schemaPath,
    instancePath,
    params: { limit: schema.maxItems }
  });
}
function CheckMaxLength(stack, context, schema, value) {
  return guard_exports.IsLessEqualThan(guard_exports.StringGraphemeCount(value), schema.maxLength);
}
function ErrorMaxLength(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMaxLength(stack, context, schema, value) || context.AddError({
    keyword: "maxLength",
    schemaPath,
    instancePath,
    params: { limit: schema.maxLength }
  });
}
function CheckMaxProperties(stack, context, schema, value) {
  return guard_exports.IsLessEqualThan(guard_exports.Keys(value).length, schema.maxProperties);
}
function ErrorMaxProperties(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMaxProperties(stack, context, schema, value) || context.AddError({
    keyword: "maxProperties",
    schemaPath,
    instancePath,
    params: { limit: schema.maxProperties }
  });
}
function IsValid4(schema) {
  return IsContains(schema);
}
function CheckMinContains(stack, context, schema, value) {
  if (!IsValid4(schema))
    return true;
  const count = value.reduce((result, item) => CheckSchema(stack, context, schema.contains, item) ? ++result : result, 0);
  return guard_exports.IsGreaterEqualThan(count, schema.minContains);
}
function ErrorMinContains(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMinContains(stack, context, schema, value) || context.AddError({
    keyword: "contains",
    schemaPath,
    instancePath,
    params: { minContains: schema.minContains }
  });
}
function CheckMinimum(stack, context, schema, value) {
  return guard_exports.IsGreaterEqualThan(value, schema.minimum);
}
function ErrorMinimum(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMinimum(stack, context, schema, value) || context.AddError({
    keyword: "minimum",
    schemaPath,
    instancePath,
    params: { comparison: ">=", limit: schema.minimum }
  });
}
function CheckMinItems(stack, context, schema, value) {
  return guard_exports.IsGreaterEqualThan(value.length, schema.minItems);
}
function ErrorMinItems(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMinItems(stack, context, schema, value) || context.AddError({
    keyword: "minItems",
    schemaPath,
    instancePath,
    params: { limit: schema.minItems }
  });
}
function CheckMinLength(stack, context, schema, value) {
  return guard_exports.IsGreaterEqualThan(guard_exports.StringGraphemeCount(value), schema.minLength);
}
function ErrorMinLength(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMinLength(stack, context, schema, value) || context.AddError({
    keyword: "minLength",
    schemaPath,
    instancePath,
    params: { limit: schema.minLength }
  });
}
function CheckMinProperties(stack, context, schema, value) {
  return guard_exports.IsGreaterEqualThan(guard_exports.Keys(value).length, schema.minProperties);
}
function ErrorMinProperties(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMinProperties(stack, context, schema, value) || context.AddError({
    keyword: "minProperties",
    schemaPath,
    instancePath,
    params: { limit: schema.minProperties }
  });
}
function CheckMultipleOf(stack, context, schema, value) {
  return guard_exports.IsMultipleOf(value, schema.multipleOf);
}
function ErrorMultipleOf(stack, context, schemaPath, instancePath, schema, value) {
  return CheckMultipleOf(stack, context, schema, value) || context.AddError({
    keyword: "multipleOf",
    schemaPath,
    instancePath,
    params: { multipleOf: schema.multipleOf }
  });
}
function CheckNot(stack, context, schema, value) {
  const nextContext = new CheckContext();
  const isSchema = !CheckSchema(stack, nextContext, schema.not, value);
  const isNot = isSchema && context.Merge([nextContext]);
  return isNot;
}
function ErrorNot(stack, context, schemaPath, instancePath, schema, value) {
  return CheckNot(stack, context, schema, value) || context.AddError({
    keyword: "not",
    schemaPath,
    instancePath,
    params: {}
  });
}
function CheckOneOf(stack, context, schema, value) {
  const passedContexts = schema.oneOf.reduce((result, schema2) => {
    const nextContext = new CheckContext();
    return CheckSchema(stack, nextContext, schema2, value) ? [...result, nextContext] : result;
  }, []);
  return guard_exports.IsEqual(passedContexts.length, 1) && context.Merge(passedContexts);
}
function ErrorOneOf(stack, context, schemaPath, instancePath, schema, value) {
  const failedContexts = [];
  const passingSchemas = [];
  const passedContexts = schema.oneOf.reduce((result, schema2, index) => {
    const nextContext = new AccumulatedErrorContext();
    const nextSchemaPath = `${schemaPath}/oneOf/${index}`;
    const isSchema = ErrorSchema(stack, nextContext, nextSchemaPath, instancePath, schema2, value);
    if (isSchema)
      passingSchemas.push(index);
    if (!isSchema)
      failedContexts.push(nextContext);
    return isSchema ? [...result, nextContext] : result;
  }, []);
  const isOneOf = guard_exports.IsEqual(passedContexts.length, 1) && context.Merge(passedContexts);
  if (!isOneOf && guard_exports.IsEqual(passingSchemas.length, 0))
    failedContexts.forEach((failed) => failed.GetErrors().forEach((error) => context.AddError(error)));
  return isOneOf || context.AddError({
    keyword: "oneOf",
    schemaPath,
    instancePath,
    params: { passingSchemas }
  });
}
function CheckPattern(stack, context, schema, value) {
  const regexp = guard_exports.IsString(schema.pattern) ? new RegExp(schema.pattern) : schema.pattern;
  return regexp.test(value);
}
function ErrorPattern(stack, context, schemaPath, instancePath, schema, value) {
  return CheckPattern(stack, context, schema, value) || context.AddError({
    keyword: "pattern",
    schemaPath,
    instancePath,
    params: { pattern: schema.pattern }
  });
}
function CheckPatternProperties(stack, context, schema, value) {
  return guard_exports.Every(guard_exports.Entries(schema.patternProperties), 0, ([pattern, schema2]) => {
    const regexp = new RegExp(pattern);
    return guard_exports.Every(guard_exports.Entries(value), 0, ([key, prop]) => {
      return !regexp.test(key) || CheckSchema(stack, context, schema2, prop) && context.AddKey(key);
    });
  });
}
function ErrorPatternProperties(stack, context, schemaPath, instancePath, schema, value) {
  return guard_exports.EveryAll(guard_exports.Entries(schema.patternProperties), 0, ([pattern, schema2]) => {
    const nextSchemaPath = `${schemaPath}/patternProperties/${pattern}`;
    const regexp = new RegExp(pattern);
    return guard_exports.EveryAll(guard_exports.Entries(value), 0, ([key, value2]) => {
      const nextInstancePath = `${instancePath}/${key}`;
      const notKey = !regexp.test(key);
      return notKey || ErrorSchema(stack, context, nextSchemaPath, nextInstancePath, schema2, value2) && context.AddKey(key);
    });
  });
}
function CheckPrefixItems(stack, context, schema, value) {
  return guard_exports.IsEqual(value.length, 0) || guard_exports.Every(schema.prefixItems, 0, (schema2, index) => {
    return guard_exports.IsLessEqualThan(value.length, index) || CheckSchema(stack, context, schema2, value[index]) && context.AddIndex(index);
  });
}
function ErrorPrefixItems(stack, context, schemaPath, instancePath, schema, value) {
  return guard_exports.IsEqual(value.length, 0) || guard_exports.EveryAll(schema.prefixItems, 0, (schema2, index) => {
    const nextSchemaPath = `${schemaPath}/prefixItems/${index}`;
    const nextInstancePath = `${instancePath}/${index}`;
    return guard_exports.IsLessEqualThan(value.length, index) || ErrorSchema(stack, context, nextSchemaPath, nextInstancePath, schema2, value[index]) && context.AddIndex(index);
  });
}
function IsExactOptional(required, key) {
  return required.includes(key) || settings_exports.Get().exactOptionalPropertyTypes;
}
function InexactOptionalCheck(value, key) {
  return guard_exports.IsUndefined(value[key]);
}
function CheckProperties(stack, context, schema, value) {
  const required = IsRequired(schema) ? schema.required : [];
  const isProperties = guard_exports.Every(guard_exports.Entries(schema.properties), 0, ([key, schema2]) => {
    const isProperty = !guard_exports.HasPropertyKey(value, key) || CheckSchema(stack, context, schema2, value[key]) && context.AddKey(key);
    return IsExactOptional(required, key) ? isProperty : InexactOptionalCheck(value, key) || isProperty;
  });
  return isProperties;
}
function ErrorProperties(stack, context, schemaPath, instancePath, schema, value) {
  const required = IsRequired(schema) ? schema.required : [];
  const isProperties = guard_exports.EveryAll(guard_exports.Entries(schema.properties), 0, ([key, schema2]) => {
    const nextSchemaPath = `${schemaPath}/properties/${key}`;
    const nextInstancePath = `${instancePath}/${key}`;
    const isProperty = () => !guard_exports.HasPropertyKey(value, key) || ErrorSchema(stack, context, nextSchemaPath, nextInstancePath, schema2, value[key]) && context.AddKey(key);
    return IsExactOptional(required, key) ? isProperty() : InexactOptionalCheck(value, key) || isProperty();
  });
  return isProperties;
}
function CheckPropertyNames(stack, context, schema, value) {
  return guard_exports.Every(guard_exports.Keys(value), 0, (key, _index) => CheckSchema(stack, context, schema.propertyNames, key));
}
function ErrorPropertyNames(stack, context, schemaPath, instancePath, schema, value) {
  const propertyNames = [];
  const isPropertyNames = guard_exports.EveryAll(guard_exports.Keys(value), 0, (key, _index) => {
    const nextInstancePath = `${instancePath}/${key}`;
    const nextSchemaPath = `${schemaPath}/propertyNames`;
    const nextContext = new AccumulatedErrorContext();
    const isPropertyName = ErrorSchema(stack, nextContext, nextSchemaPath, nextInstancePath, schema.propertyNames, key);
    if (!isPropertyName)
      propertyNames.push(key);
    return isPropertyName;
  });
  return isPropertyNames || context.AddError({
    keyword: "propertyNames",
    schemaPath,
    instancePath,
    params: { propertyNames }
  });
}
function CheckRecursiveRef(stack, context, schema, value) {
  const target = stack.RecursiveRef(schema.$recursiveRef) ?? false;
  return IsSchema2(target) && CheckSchema(stack, context, target, value);
}
function ErrorRecursiveRef(stack, context, schemaPath, instancePath, schema, value) {
  const target = stack.RecursiveRef(schema.$recursiveRef) ?? false;
  return IsSchema2(target) && ErrorSchema(stack, context, "#", instancePath, target, value);
}
function CheckRef(stack, context, schema, value) {
  const target = stack.Ref(schema.$ref) ?? false;
  const nextContext = new CheckContext();
  const result = IsSchema2(target) && CheckSchema(stack, nextContext, target, value);
  if (result)
    context.Merge([nextContext]);
  return result;
}
function ErrorRef(stack, context, schemaPath, instancePath, schema, value) {
  const target = stack.Ref(schema.$ref) ?? false;
  const nextContext = new AccumulatedErrorContext();
  const result = IsSchema2(target) && ErrorSchema(stack, nextContext, "#", instancePath, target, value);
  if (result)
    context.Merge([nextContext]);
  if (!result)
    nextContext.GetErrors().forEach((error) => context.AddError(error));
  return result;
}
function CheckRequired(stack, context, schema, value) {
  return guard_exports.Every(schema.required, 0, (key) => guard_exports.HasPropertyKey(value, key));
}
function ErrorRequired(stack, context, schemaPath, instancePath, schema, value) {
  const requiredProperties = [];
  const isRequired = guard_exports.EveryAll(schema.required, 0, (key) => {
    const hasKey = guard_exports.HasPropertyKey(value, key);
    if (!hasKey)
      requiredProperties.push(key);
    return hasKey;
  });
  return isRequired || context.AddError({
    keyword: "required",
    schemaPath,
    instancePath,
    params: { requiredProperties }
  });
}
function CheckTypeName(stack, context, type, schema, value) {
  return (
    // jsonschema
    guard_exports.IsEqual(type, "object") ? guard_exports.IsObjectNotArray(value) : guard_exports.IsEqual(type, "array") ? guard_exports.IsArray(value) : guard_exports.IsEqual(type, "boolean") ? guard_exports.IsBoolean(value) : guard_exports.IsEqual(type, "integer") ? guard_exports.IsInteger(value) : guard_exports.IsEqual(type, "number") ? guard_exports.IsNumber(value) : guard_exports.IsEqual(type, "null") ? guard_exports.IsNull(value) : guard_exports.IsEqual(type, "string") ? guard_exports.IsString(value) : (
      // xschema
      guard_exports.IsEqual(type, "asyncIterator") ? guard_exports.IsAsyncIterator(value) : guard_exports.IsEqual(type, "bigint") ? guard_exports.IsBigInt(value) : guard_exports.IsEqual(type, "constructor") ? guard_exports.IsConstructor(value) : guard_exports.IsEqual(type, "function") ? guard_exports.IsFunction(value) : guard_exports.IsEqual(type, "iterator") ? guard_exports.IsIterator(value) : guard_exports.IsEqual(type, "symbol") ? guard_exports.IsSymbol(value) : guard_exports.IsEqual(type, "undefined") ? guard_exports.IsUndefined(value) : guard_exports.IsEqual(type, "void") ? guard_exports.IsUndefined(value) : true
    )
  );
}
function CheckTypeNames(stack, context, types, schema, value) {
  return types.some((type) => CheckTypeName(stack, context, type, schema, value));
}
function CheckType(stack, context, schema, value) {
  return guard_exports.IsArray(schema.type) ? CheckTypeNames(stack, context, schema.type, schema, value) : CheckTypeName(stack, context, schema.type, schema, value);
}
function ErrorType(stack, context, schemaPath, instancePath, schema, value) {
  const isType = guard_exports.IsArray(schema.type) ? CheckTypeNames(stack, context, schema.type, schema, value) : CheckTypeName(stack, context, schema.type, schema, value);
  return isType || context.AddError({
    keyword: "type",
    schemaPath,
    instancePath,
    params: { type: schema.type }
  });
}
function CheckUnevaluatedItems(stack, context, schema, value) {
  const indices = context.GetIndices();
  return guard_exports.Every(value, 0, (item, index) => {
    return (indices.has(index) || CheckSchema(stack, context, schema.unevaluatedItems, item)) && context.AddIndex(index);
  });
}
function ErrorUnevaluatedItems(stack, context, schemaPath, instancePath, schema, value) {
  const indices = context.GetIndices();
  const unevaluatedItems = [];
  const isUnevaluatedItems = guard_exports.EveryAll(value, 0, (item, index) => {
    const nextContext = new AccumulatedErrorContext();
    const isEvaluatedItem = (indices.has(index) || ErrorSchema(stack, nextContext, schemaPath, instancePath, schema.unevaluatedItems, item)) && context.AddIndex(index);
    if (!isEvaluatedItem)
      unevaluatedItems.push(index);
    return isEvaluatedItem;
  });
  return isUnevaluatedItems || context.AddError({
    keyword: "unevaluatedItems",
    schemaPath,
    instancePath,
    params: { unevaluatedItems }
  });
}
function CheckUnevaluatedProperties(stack, context, schema, value) {
  const keys = context.GetKeys();
  return guard_exports.Every(guard_exports.Entries(value), 0, ([key, prop]) => {
    return keys.has(key) || CheckSchema(stack, context, schema.unevaluatedProperties, prop) && context.AddKey(key);
  });
}
function ErrorUnevaluatedProperties(stack, context, schemaPath, instancePath, schema, value) {
  const keys = context.GetKeys();
  const unevaluatedProperties = [];
  const isUnevaluatedProperties = guard_exports.EveryAll(guard_exports.Entries(value), 0, ([key, prop]) => {
    const nextContext = new AccumulatedErrorContext();
    const isEvaluatedProperty = keys.has(key) || ErrorSchema(stack, nextContext, schemaPath, instancePath, schema.unevaluatedProperties, prop) && context.AddKey(key);
    if (!isEvaluatedProperty)
      unevaluatedProperties.push(key);
    return isEvaluatedProperty;
  });
  return isUnevaluatedProperties || context.AddError({
    keyword: "unevaluatedProperties",
    schemaPath,
    instancePath,
    params: { unevaluatedProperties }
  });
}
function IsValid5(schema) {
  return !guard_exports.IsEqual(schema.uniqueItems, false);
}
function CheckUniqueItems(stack, context, schema, value) {
  if (!IsValid5(schema))
    return true;
  const set = new Set(value.map(hash_exports.Hash)).size;
  const isLength = value.length;
  return guard_exports.IsEqual(set, isLength);
}
function ErrorUniqueItems(stack, context, schemaPath, instancePath, schema, value) {
  if (!IsValid5(schema))
    return true;
  const set = /* @__PURE__ */ new Set();
  const duplicateItems = value.reduce((result, value2, index) => {
    const hash = hash_exports.Hash(value2);
    if (set.has(hash))
      return [...result, index];
    set.add(hash);
    return result;
  }, []);
  const isUniqueItems = guard_exports.IsEqual(duplicateItems.length, 0);
  return isUniqueItems || context.AddError({
    keyword: "uniqueItems",
    schemaPath,
    instancePath,
    params: { duplicateItems }
  });
}
function CheckSchema(stack, context, schema, value) {
  stack.Push(schema);
  const result = IsBooleanSchema(schema) ? CheckBooleanSchema(stack, context, schema, value) : (!IsType(schema) || CheckType(stack, context, schema, value)) && (!(guard_exports.IsObject(value) && !guard_exports.IsArray(value)) || (!IsRequired(schema) || CheckRequired(stack, context, schema, value)) && (!IsAdditionalProperties(schema) || CheckAdditionalProperties(stack, context, schema, value)) && (!IsDependencies(schema) || CheckDependencies(stack, context, schema, value)) && (!IsDependentRequired(schema) || CheckDependentRequired(stack, context, schema, value)) && (!IsDependentSchemas(schema) || CheckDependentSchemas(stack, context, schema, value)) && (!IsPatternProperties(schema) || CheckPatternProperties(stack, context, schema, value)) && (!IsProperties(schema) || CheckProperties(stack, context, schema, value)) && (!IsPropertyNames(schema) || CheckPropertyNames(stack, context, schema, value)) && (!IsMinProperties(schema) || CheckMinProperties(stack, context, schema, value)) && (!IsMaxProperties(schema) || CheckMaxProperties(stack, context, schema, value))) && (!guard_exports.IsArray(value) || (!IsAdditionalItems(schema) || CheckAdditionalItems(stack, context, schema, value)) && (!IsContains(schema) || CheckContains(stack, context, schema, value)) && (!IsItems(schema) || CheckItems(stack, context, schema, value)) && (!IsMaxContains(schema) || CheckMaxContains(stack, context, schema, value)) && (!IsMaxItems(schema) || CheckMaxItems(stack, context, schema, value)) && (!IsMinContains(schema) || CheckMinContains(stack, context, schema, value)) && (!IsMinItems(schema) || CheckMinItems(stack, context, schema, value)) && (!IsPrefixItems(schema) || CheckPrefixItems(stack, context, schema, value)) && (!IsUniqueItems(schema) || CheckUniqueItems(stack, context, schema, value))) && (!guard_exports.IsString(value) || (!IsFormat(schema) || CheckFormat(stack, context, schema, value)) && (!IsMaxLength(schema) || CheckMaxLength(stack, context, schema, value)) && (!IsMinLength(schema) || CheckMinLength(stack, context, schema, value)) && (!IsPattern(schema) || CheckPattern(stack, context, schema, value))) && (!(guard_exports.IsNumber(value) || guard_exports.IsBigInt(value)) || (!IsExclusiveMaximum(schema) || CheckExclusiveMaximum(stack, context, schema, value)) && (!IsExclusiveMinimum(schema) || CheckExclusiveMinimum(stack, context, schema, value)) && (!IsMaximum(schema) || CheckMaximum(stack, context, schema, value)) && (!IsMinimum(schema) || CheckMinimum(stack, context, schema, value)) && (!IsMultipleOf2(schema) || CheckMultipleOf(stack, context, schema, value))) && (!IsRecursiveRef(schema) || CheckRecursiveRef(stack, context, schema, value)) && (!IsRef2(schema) || CheckRef(stack, context, schema, value)) && (!IsGuard2(schema) || CheckGuard(stack, context, schema, value)) && (!IsConst(schema) || CheckConst(stack, context, schema, value)) && (!IsEnum2(schema) || CheckEnum(stack, context, schema, value)) && (!IsIf(schema) || CheckIf(stack, context, schema, value)) && (!IsNot(schema) || CheckNot(stack, context, schema, value)) && (!IsAllOf(schema) || CheckAllOf(stack, context, schema, value)) && (!IsAnyOf(schema) || CheckAnyOf(stack, context, schema, value)) && (!IsOneOf(schema) || CheckOneOf(stack, context, schema, value)) && (!IsUnevaluatedItems(schema) || (!guard_exports.IsArray(value) || CheckUnevaluatedItems(stack, context, schema, value))) && (!IsUnevaluatedProperties(schema) || (!guard_exports.IsObject(value) || CheckUnevaluatedProperties(stack, context, schema, value))) && (!IsRefine2(schema) || CheckRefine(stack, context, schema, value));
  stack.Pop(schema);
  return result;
}
function ErrorSchema(stack, context, schemaPath, instancePath, schema, value) {
  stack.Push(schema);
  const result = IsBooleanSchema(schema) ? ErrorBooleanSchema(stack, context, schemaPath, instancePath, schema, value) : !!(+(!IsType(schema) || ErrorType(stack, context, schemaPath, instancePath, schema, value)) & +(!(guard_exports.IsObject(value) && !guard_exports.IsArray(value)) || !!(+(!IsRequired(schema) || ErrorRequired(stack, context, schemaPath, instancePath, schema, value)) & +(!IsAdditionalProperties(schema) || ErrorAdditionalProperties(stack, context, schemaPath, instancePath, schema, value)) & +(!IsDependencies(schema) || ErrorDependencies(stack, context, schemaPath, instancePath, schema, value)) & +(!IsDependentRequired(schema) || ErrorDependentRequired(stack, context, schemaPath, instancePath, schema, value)) & +(!IsDependentSchemas(schema) || ErrorDependentSchemas(stack, context, schemaPath, instancePath, schema, value)) & +(!IsPatternProperties(schema) || ErrorPatternProperties(stack, context, schemaPath, instancePath, schema, value)) & +(!IsProperties(schema) || ErrorProperties(stack, context, schemaPath, instancePath, schema, value)) & +(!IsPropertyNames(schema) || ErrorPropertyNames(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinProperties(schema) || ErrorMinProperties(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMaxProperties(schema) || ErrorMaxProperties(stack, context, schemaPath, instancePath, schema, value)))) & +(!guard_exports.IsArray(value) || !!(+(!IsAdditionalItems(schema) || ErrorAdditionalItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsContains(schema) || ErrorContains(stack, context, schemaPath, instancePath, schema, value)) & +(!IsItems(schema) || ErrorItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMaxContains(schema) || ErrorMaxContains(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMaxItems(schema) || ErrorMaxItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinContains(schema) || ErrorMinContains(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinItems(schema) || ErrorMinItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsPrefixItems(schema) || ErrorPrefixItems(stack, context, schemaPath, instancePath, schema, value)) & +(!IsUniqueItems(schema) || ErrorUniqueItems(stack, context, schemaPath, instancePath, schema, value)))) & +(!guard_exports.IsString(value) || !!(+(!IsFormat(schema) || ErrorFormat(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMaxLength(schema) || ErrorMaxLength(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinLength(schema) || ErrorMinLength(stack, context, schemaPath, instancePath, schema, value)) & +(!IsPattern(schema) || ErrorPattern(stack, context, schemaPath, instancePath, schema, value)))) & +(!(guard_exports.IsNumber(value) || guard_exports.IsBigInt(value)) || !!(+(!IsExclusiveMaximum(schema) || ErrorExclusiveMaximum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsExclusiveMinimum(schema) || ErrorExclusiveMinimum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMaximum(schema) || ErrorMaximum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMinimum(schema) || ErrorMinimum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsMultipleOf2(schema) || ErrorMultipleOf(stack, context, schemaPath, instancePath, schema, value)))) & +(!IsRecursiveRef(schema) || ErrorRecursiveRef(stack, context, schemaPath, instancePath, schema, value)) & +(!IsRef2(schema) || ErrorRef(stack, context, schemaPath, instancePath, schema, value)) & +(!IsGuard2(schema) || ErrorGuard(stack, context, schemaPath, instancePath, schema, value)) & +(!IsConst(schema) || ErrorConst(stack, context, schemaPath, instancePath, schema, value)) & +(!IsEnum2(schema) || ErrorEnum(stack, context, schemaPath, instancePath, schema, value)) & +(!IsIf(schema) || ErrorIf(stack, context, schemaPath, instancePath, schema, value)) & +(!IsNot(schema) || ErrorNot(stack, context, schemaPath, instancePath, schema, value)) & +(!IsAllOf(schema) || ErrorAllOf(stack, context, schemaPath, instancePath, schema, value)) & +(!IsAnyOf(schema) || ErrorAnyOf(stack, context, schemaPath, instancePath, schema, value)) & +(!IsOneOf(schema) || ErrorOneOf(stack, context, schemaPath, instancePath, schema, value)) & +(!IsUnevaluatedItems(schema) || (!guard_exports.IsArray(value) || ErrorUnevaluatedItems(stack, context, schemaPath, instancePath, schema, value))) & +(!IsUnevaluatedProperties(schema) || (!guard_exports.IsObject(value) || ErrorUnevaluatedProperties(stack, context, schemaPath, instancePath, schema, value)))) && (!IsRefine2(schema) || ErrorRefine(stack, context, schemaPath, instancePath, schema, value));
  stack.Pop(schema);
  return result;
}
var resolve_exports = {};
__export(resolve_exports, {
  Ref: () => Ref2
});
var pointer_exports = {};
__export(pointer_exports, {
  Delete: () => Delete,
  Get: () => Get4,
  Has: () => Has2,
  Indices: () => Indices,
  Set: () => Set4
});
function AssertNotRoot(indices) {
  if (indices.length === 0)
    throw Error("Cannot set root");
}
function AssertCanSet(value) {
  if (!guard_exports.IsObject(value))
    throw Error("Cannot set value");
}
function IsNumericIndex(index) {
  return /^(0|[1-9]\d*)$/.test(index);
}
function TakeIndexRight(indices) {
  return [
    indices.slice(0, indices.length - 1),
    indices.slice(indices.length - 1)[0]
  ];
}
function HasIndex(index, value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, index);
}
function GetIndex(index, value) {
  return guard_exports.IsObject(value) ? value[index] : void 0;
}
function GetIndices(indices, value) {
  return indices.reduce((value2, index) => GetIndex(index, value2), value);
}
function Indices(pointer) {
  if (guard_exports.IsEqual(pointer.length, 0))
    return [];
  const indices = pointer.split("/").map((index) => index.replace(/~1/g, "/").replace(/~0/g, "~"));
  return indices.length > 0 && indices[0] === "" ? indices.slice(1) : indices;
}
function Has2(value, pointer) {
  let current = value;
  return Indices(pointer).every((index) => {
    if (!HasIndex(index, current))
      return false;
    current = current[index];
    return true;
  });
}
function Get4(value, pointer) {
  const indices = Indices(pointer);
  return GetIndices(indices, value);
}
function Set4(value, pointer, next) {
  const indices = Indices(pointer);
  AssertNotRoot(indices);
  const [head, index] = TakeIndexRight(indices);
  const parent = GetIndices(head, value);
  AssertCanSet(parent);
  parent[index] = next;
  return value;
}
function Delete(value, pointer) {
  const indices = Indices(pointer);
  AssertNotRoot(indices);
  const [head, index] = TakeIndexRight(indices);
  const parent = GetIndices(head, value);
  AssertCanSet(parent);
  if (guard_exports.IsArray(parent) && IsNumericIndex(index)) {
    parent.splice(+index, 1);
  } else {
    delete parent[index];
  }
  return value;
}
function MatchId(schema, base, ref) {
  if (schema.$id === ref.hash)
    return schema;
  const absoluteId = new URL(schema.$id, base.href);
  const absoluteRef = new URL(ref.href, base.href);
  if (guard_exports.IsEqual(absoluteId.pathname, absoluteRef.pathname)) {
    return ref.hash.startsWith("#") ? MatchHash(schema, base, ref) : schema;
  }
  return void 0;
}
function MatchAnchor(schema, base, ref) {
  const absoluteAnchor = new URL(`#${schema.$anchor}`, base.href);
  const absoluteRef = new URL(ref.href, base.href);
  if (guard_exports.IsEqual(absoluteAnchor.href, absoluteRef.href))
    return schema;
  return void 0;
}
function MatchHash(schema, base, ref) {
  if (ref.href.endsWith("#"))
    return schema;
  return ref.hash.startsWith("#") ? pointer_exports.Get(schema, decodeURIComponent(ref.hash.slice(1))) : void 0;
}
function Match2(schema, base, ref) {
  if (IsId(schema)) {
    const result = MatchId(schema, base, ref);
    if (!guard_exports.IsUndefined(result))
      return result;
  }
  if (IsAnchor(schema)) {
    const result = MatchAnchor(schema, base, ref);
    if (!guard_exports.IsUndefined(result))
      return result;
  }
  return MatchHash(schema, base, ref);
}
function FromArray6(schema, base, ref) {
  return schema.reduce((result, item) => {
    const match = FromValue3(item, base, ref);
    return !guard_exports.IsUndefined(match) ? match : result;
  }, void 0);
}
function FromObject9(schema, base, ref) {
  return guard_exports.Keys(schema).reduce((result, key) => {
    const match = FromValue3(schema[key], base, ref);
    return !guard_exports.IsUndefined(match) ? match : result;
  }, void 0);
}
function FromValue3(schema, base, ref) {
  base = IsSchemaObject(schema) && IsId(schema) ? new URL(schema.$id, base.href) : base;
  if (IsSchemaObject(schema)) {
    const result = Match2(schema, base, ref);
    if (!guard_exports.IsUndefined(result))
      return result;
  }
  if (guard_exports.IsArray(schema))
    return FromArray6(schema, base, ref);
  if (guard_exports.IsObject(schema))
    return FromObject9(schema, base, ref);
  return void 0;
}
function Ref2(schema, ref) {
  const defaultBase = new URL("http://unknown");
  const initialBase = IsId(schema) ? new URL(schema.$id, defaultBase.href) : defaultBase;
  const initialRef = new URL(ref, initialBase.href);
  return FromValue3(schema, initialBase, initialRef);
}
var Stack = class {
  constructor(context, schema) {
    this.context = context;
    this.schema = schema;
    this.ids = [];
    this.anchors = [];
    this.recursiveAnchors = [];
    this.dynamicAnchors = [];
  }
  // ----------------------------------------------------------------
  // Base
  // ----------------------------------------------------------------
  BaseURL() {
    return this.ids.reduce((result, schema) => new URL(schema.$id, result), new URL("http://unknown"));
  }
  Base() {
    return this.ids[this.ids.length - 1] ?? this.schema;
  }
  // ----------------------------------------------------------------
  // Stack
  // ----------------------------------------------------------------
  Push(schema) {
    if (!IsSchemaObject(schema))
      return;
    if (IsId(schema))
      this.ids.push(schema);
    if (IsAnchor(schema))
      this.anchors.push(schema);
    if (IsRecursiveAnchorTrue(schema))
      this.recursiveAnchors.push(schema);
    if (IsDynamicAnchor(schema))
      this.dynamicAnchors.push(schema);
  }
  Pop(schema) {
    if (!IsSchemaObject(schema))
      return;
    if (IsId(schema))
      this.ids.pop();
    if (IsAnchor(schema))
      this.anchors.pop();
    if (IsRecursiveAnchorTrue(schema))
      this.recursiveAnchors.pop();
    if (IsDynamicAnchor(schema))
      this.dynamicAnchors.pop();
  }
  // ----------------------------------------------------------------
  // Ref
  // ----------------------------------------------------------------
  FromContext(ref) {
    return guard_exports.HasPropertyKey(this.context, ref) ? this.context[ref] : void 0;
  }
  FromRef(ref) {
    return !ref.startsWith("#") ? resolve_exports.Ref(this.schema, ref) : resolve_exports.Ref(this.Base(), ref);
  }
  Ref(ref) {
    return this.FromContext(ref) ?? this.FromRef(ref);
  }
  // ----------------------------------------------------------------
  // RecursiveRef
  // ----------------------------------------------------------------
  RecursiveRef(recursiveRef) {
    if (IsRecursiveAnchorTrue(this.Base())) {
      return resolve_exports.Ref(this.recursiveAnchors[0], recursiveRef);
    }
    return resolve_exports.Ref(this.Base(), recursiveRef);
  }
};
function Check(...args) {
  const [context, schema, value] = arguments_exports.Match(args, {
    3: (context2, schema2, value2) => [context2, schema2, value2],
    2: (schema2, value2) => [{}, schema2, value2]
  });
  const stack = new Stack(context, schema);
  const checkContext = new CheckContext();
  return CheckSchema(stack, checkContext, schema, value);
}
function Errors(...args) {
  const [context, schema, value] = arguments_exports.Match(args, {
    3: (context2, schema2, value2) => [context2, schema2, value2],
    2: (schema2, value2) => [{}, schema2, value2]
  });
  const settings2 = settings_exports.Get();
  const locale2 = Get2();
  const errors = [];
  const stack = new Stack(context, schema);
  const errorContext = new ErrorContext((error) => {
    if (guard_exports.IsGreaterEqualThan(errors.length, settings2.maxErrors))
      return;
    return errors.push({ ...error, message: locale2(error) });
  });
  const result = ErrorSchema(stack, errorContext, "#", "", schema, value);
  return [result, errors];
}
function Check2(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  return Check(context, type, value);
}
function Errors2(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  const [_, errors] = Errors(context, type, value);
  return errors;
}
var AssertError = class extends Error {
  constructor(source, value, errors) {
    super(source);
    Object.defineProperty(this, "cause", {
      value: { source, errors, value },
      writable: false,
      configurable: false,
      enumerable: false
    });
  }
};
function Assert(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  const check = Check2(context, type, value);
  if (!check)
    throw new AssertError("Assert", value, Errors2(context, type, value));
}
function FromArray7(context, type, value) {
  if (!guard_exports.IsArray(value))
    return value;
  return value.map((value2) => FromType14(context, type.items, value2));
}
function FromBase(context, type, value) {
  return type.Clean(value);
}
function FromCyclic6(context, type, value) {
  return FromType14({ ...context, ...type.$defs }, Ref(type.$ref), value);
}
function EvaluateIntersection(type) {
  const additionalProperties = guard_exports.HasPropertyKey(type, "unevaluatedProperties") ? { additionalProperties: type.unevaluatedProperties } : {};
  const evaluated = Evaluate(type);
  return IsObject2(evaluated) ? Options2(evaluated, additionalProperties) : evaluated;
}
function FromIntersect6(context, type, value) {
  const evaluated = EvaluateIntersection(type);
  return FromType14(context, evaluated, value);
}
function GetAdditionalProperties(type) {
  const additionalProperties = guard_exports.HasPropertyKey(type, "additionalProperties") ? type.additionalProperties : void 0;
  return additionalProperties;
}
function FromObject10(context, type, value) {
  if (!guard_exports.IsObject(value) || guard_exports.IsArray(value))
    return value;
  const additionalProperties = GetAdditionalProperties(type);
  for (const key of guard_exports.Keys(value)) {
    if (guard_exports.HasPropertyKey(type.properties, key)) {
      value[key] = FromType14(context, type.properties[key], value[key]);
      continue;
    }
    const unknownCheck = (
      // 1. additionalProperties: true
      guard_exports.IsBoolean(additionalProperties) && guard_exports.IsEqual(additionalProperties, true) || IsSchema(additionalProperties) && Check2(context, additionalProperties, value[key])
    );
    if (unknownCheck) {
      value[key] = FromType14(context, additionalProperties, value[key]);
      continue;
    }
    delete value[key];
  }
  return value;
}
function FromRecord2(context, type, value) {
  if (!guard_exports.IsObject(value))
    return value;
  const additionalProperties = GetAdditionalProperties(type);
  const [recordPattern, recordValue] = [new RegExp(RecordPattern(type)), RecordValue(type)];
  for (const key of guard_exports.Keys(value)) {
    if (recordPattern.test(key)) {
      value[key] = FromType14(context, recordValue, value[key]);
      continue;
    }
    const unknownCheck = (
      // 1. additionalProperties: true
      guard_exports.IsBoolean(additionalProperties) && guard_exports.IsEqual(additionalProperties, true) || IsSchema(additionalProperties) && Check2(context, additionalProperties, value[key])
    );
    if (unknownCheck) {
      value[key] = FromType14(context, additionalProperties, value[key]);
      continue;
    }
    delete value[key];
  }
  return value;
}
function FromRef5(context, type, value) {
  return guard_exports.HasPropertyKey(context, type.$ref) ? FromType14(context, context[type.$ref], value) : value;
}
function FromTuple5(context, schema, value) {
  if (!guard_exports.IsArray(value))
    return value;
  const length = Math.min(value.length, schema.items.length);
  for (let index = 0; index < length; index++) {
    value[index] = FromType14(context, schema.items[index], value[index]);
  }
  return guard_exports.IsGreaterThan(value.length, length) ? value.slice(0, length) : value;
}
function FromClassInstance(value) {
  return value;
}
function FromObjectInstance(value) {
  const result = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    result[key] = Clone2(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    result[key] = Clone2(value[key]);
  }
  return result;
}
function FromObject11(value) {
  return guard_exports.IsClassInstance(value) ? FromClassInstance(value) : FromObjectInstance(value);
}
function FromArray8(value) {
  return value.map((element) => Clone2(element));
}
function FromTypedArray(value) {
  return value.slice();
}
function FromMap(value) {
  return new Map(Clone2([...value.entries()]));
}
function FromSet(value) {
  return new Set(Clone2([...value.values()]));
}
function FromValue4(value) {
  return value;
}
function Clone2(value) {
  return globals_exports.IsTypeArray(value) ? FromTypedArray(value) : globals_exports.IsMap(value) ? FromMap(value) : globals_exports.IsSet(value) ? FromSet(value) : guard_exports.IsArray(value) ? FromArray8(value) : guard_exports.IsObject(value) ? FromObject11(value) : FromValue4(value);
}
function FromUnion9(context, type, value) {
  for (const schema of type.anyOf) {
    const clean = FromType14(context, schema, Clone2(value));
    if (Check2(context, schema, clean))
      return clean;
  }
  return value;
}
function FromType14(context, type, value) {
  return IsArray2(type) ? FromArray7(context, type, value) : IsBase(type) ? FromBase(context, type, value) : IsCyclic(type) ? FromCyclic6(context, type, value) : IsIntersect(type) ? FromIntersect6(context, type, value) : IsObject2(type) ? FromObject10(context, type, value) : IsRecord(type) ? FromRecord2(context, type, value) : IsRef(type) ? FromRef5(context, type, value) : IsTuple(type) ? FromTuple5(context, type, value) : IsUnion(type) ? FromUnion9(context, type, value) : value;
}
function Clean(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  return FromType14(context, type, value);
}
function FromArray9(context, type, value) {
  return guard_exports.IsArray(value) ? value.map((value2) => FromType15(context, type.items, value2)) : value;
}
function FromBase2(context, type, value) {
  return type.Convert(value);
}
var try_exports = {};
__export(try_exports, {
  Fail: () => Fail,
  IsOk: () => IsOk,
  Ok: () => Ok,
  TryBigInt: () => TryBigInt,
  TryBoolean: () => TryBoolean,
  TryNull: () => TryNull,
  TryNumber: () => TryNumber,
  TryString: () => TryString,
  TryUndefined: () => TryUndefined
});
function IsOk(value) {
  return guard_exports.IsObject(value) && guard_exports.HasPropertyKey(value, "value");
}
function Ok(value) {
  return { value };
}
function Fail() {
  return void 0;
}
function FromBigInt2(value) {
  return Ok(value);
}
function FromBoolean2(value) {
  return guard_exports.IsEqual(value, true) ? Ok(BigInt(1)) : Ok(BigInt(0));
}
function FromNumber2(value) {
  return Ok(BigInt(Math.trunc(value)));
}
function FromNull2(value) {
  return Ok(BigInt(0));
}
var bigintPattern = /^-?(0|[1-9]\d*)n$/;
var decimalPattern = /^-?(0|[1-9]\d*)\.\d+$/;
var integerPattern = /^-?(0|[1-9]\d*)$/;
function IsStringBigIntLike(value) {
  return bigintPattern.test(value);
}
function IsStringDecimalLike(value) {
  return decimalPattern.test(value);
}
function IsStringIntegerLike(value) {
  return integerPattern.test(value);
}
function FromString2(value) {
  const lowercase = value.toLowerCase();
  return IsStringBigIntLike(value) ? Ok(BigInt(value.slice(0, value.length - 1))) : IsStringDecimalLike(value) ? Ok(BigInt(value.split(".")[0])) : IsStringIntegerLike(value) ? Ok(BigInt(value)) : guard_exports.IsEqual(lowercase, "false") ? Ok(BigInt(0)) : guard_exports.IsEqual(lowercase, "true") ? Ok(BigInt(1)) : Fail();
}
function FromUndefined2(value) {
  return Ok(BigInt(0));
}
function TryBigInt(value) {
  return guard_exports.IsBigInt(value) ? FromBigInt2(value) : guard_exports.IsBoolean(value) ? FromBoolean2(value) : guard_exports.IsNumber(value) ? FromNumber2(value) : guard_exports.IsNull(value) ? FromNull2(value) : guard_exports.IsString(value) ? FromString2(value) : guard_exports.IsUndefined(value) ? FromUndefined2(value) : Fail();
}
function FromBigInt3(value) {
  return guard_exports.IsEqual(value, BigInt(0)) ? Ok(false) : guard_exports.IsEqual(value, BigInt(1)) ? Ok(true) : Fail();
}
function FromBoolean3(value) {
  return Ok(value);
}
function FromNumber3(value) {
  return guard_exports.IsEqual(value, 0) ? Ok(false) : guard_exports.IsEqual(value, 1) ? Ok(true) : Fail();
}
function FromNull3(value) {
  return Ok(false);
}
function FromString3(value) {
  return guard_exports.IsEqual(value.toLowerCase(), "false") ? Ok(false) : guard_exports.IsEqual(value.toLowerCase(), "true") ? Ok(true) : guard_exports.IsEqual(value, "0") ? Ok(false) : guard_exports.IsEqual(value, "1") ? Ok(true) : Fail();
}
function FromUndefined3(value) {
  return Ok(false);
}
function TryBoolean(value) {
  return guard_exports.IsBigInt(value) ? FromBigInt3(value) : guard_exports.IsBoolean(value) ? FromBoolean3(value) : guard_exports.IsNumber(value) ? FromNumber3(value) : guard_exports.IsNull(value) ? FromNull3(value) : guard_exports.IsString(value) ? FromString3(value) : guard_exports.IsUndefined(value) ? FromUndefined3(value) : Fail();
}
function FromBigInt4(value) {
  return guard_exports.IsEqual(value, BigInt(0)) ? Ok(null) : Fail();
}
function FromBoolean4(value) {
  return guard_exports.IsEqual(value, false) ? Ok(null) : Fail();
}
function FromNumber4(value) {
  return guard_exports.IsEqual(value, 0) ? Ok(null) : Fail();
}
function FromNull4(value) {
  return Ok(null);
}
function FromString4(value) {
  const lowercase = value.toLowerCase();
  const predicate = guard_exports.IsEqual(lowercase, "undefined") || guard_exports.IsEqual(lowercase, "null") || guard_exports.IsEqual(value, "") || guard_exports.IsEqual(value, "0");
  return predicate ? Ok(null) : Fail();
}
function FromUndefined4(value) {
  return Ok(null);
}
function TryNull(value) {
  return guard_exports.IsBigInt(value) ? FromBigInt4(value) : guard_exports.IsBoolean(value) ? FromBoolean4(value) : guard_exports.IsNumber(value) ? FromNumber4(value) : guard_exports.IsNull(value) ? FromNull4(value) : guard_exports.IsString(value) ? FromString4(value) : guard_exports.IsUndefined(value) ? FromUndefined4(value) : Fail();
}
var maxBigInt = BigInt(Number.MAX_SAFE_INTEGER);
var minBigInt = BigInt(Number.MIN_SAFE_INTEGER);
function CanBigIntDowncast(value) {
  return value <= maxBigInt && value >= minBigInt;
}
function FromBigInt5(value) {
  return CanBigIntDowncast(value) ? Ok(Number(value)) : Fail();
}
function FromBoolean5(value) {
  return value ? Ok(1) : Ok(0);
}
function FromNumber5(value) {
  return Ok(value);
}
function FromNull5(value) {
  return Ok(0);
}
function FromString5(value) {
  const coerced = +value;
  if (guard_exports.IsNumber(coerced))
    return Ok(coerced);
  const lowercase = value.toLowerCase();
  if (guard_exports.IsEqual(lowercase, "false"))
    return Ok(0);
  if (guard_exports.IsEqual(lowercase, "true"))
    return Ok(1);
  const result = TryBigInt(value);
  if (IsOk(result))
    return FromBigInt5(result.value);
  return Fail();
}
function FromUndefined5(value) {
  return Ok(0);
}
function TryNumber(value) {
  return guard_exports.IsBigInt(value) ? FromBigInt5(value) : guard_exports.IsBoolean(value) ? FromBoolean5(value) : guard_exports.IsNumber(value) ? FromNumber5(value) : guard_exports.IsNull(value) ? FromNull5(value) : guard_exports.IsString(value) ? FromString5(value) : guard_exports.IsUndefined(value) ? FromUndefined5(value) : Fail();
}
function FromBigInt6(value) {
  return Ok(value.toString());
}
function FromBoolean6(value) {
  return Ok(value.toString());
}
function FromNumber6(value) {
  return Ok(value.toString());
}
function FromNull6(value) {
  return Ok("null");
}
function FromString6(value) {
  return Ok(value);
}
function FromUndefined6(value) {
  return Ok("");
}
function TryString(value) {
  return guard_exports.IsBigInt(value) ? FromBigInt6(value) : guard_exports.IsBoolean(value) ? FromBoolean6(value) : guard_exports.IsNumber(value) ? FromNumber6(value) : guard_exports.IsNull(value) ? FromNull6(value) : guard_exports.IsString(value) ? FromString6(value) : guard_exports.IsUndefined(value) ? FromUndefined6(value) : Fail();
}
function FromBigInt7(value) {
  return guard_exports.IsEqual(value, BigInt(0)) ? Ok(void 0) : Fail();
}
function FromBoolean7(value) {
  return guard_exports.IsEqual(value, false) ? Ok(void 0) : Fail();
}
function FromNumber7(value) {
  return guard_exports.IsEqual(value, 0) ? Ok(void 0) : Fail();
}
function FromNull7(value) {
  return Ok(void 0);
}
function FromString7(value) {
  const lowercase = value.toLowerCase();
  const predicate = guard_exports.IsEqual(lowercase, "undefined") || guard_exports.IsEqual(lowercase, "null") || guard_exports.IsEqual(value, "") || guard_exports.IsEqual(value, "0");
  return predicate ? Ok(void 0) : Fail();
}
function FromUndefined7(value) {
  return Ok(void 0);
}
function TryUndefined(value) {
  return guard_exports.IsBigInt(value) ? FromBigInt7(value) : guard_exports.IsBoolean(value) ? FromBoolean7(value) : guard_exports.IsNumber(value) ? FromNumber7(value) : guard_exports.IsNull(value) ? FromNull7(value) : guard_exports.IsString(value) ? FromString7(value) : guard_exports.IsUndefined(value) ? FromUndefined7(value) : Fail();
}
function FromBigInt8(context, type, value) {
  if (guard_exports.IsBigInt(value))
    return value;
  const result = try_exports.TryBigInt(value);
  return try_exports.IsOk(result) ? result.value : value;
}
function FromBoolean8(context, type, value) {
  if (guard_exports.IsBoolean(value))
    return value;
  const result = try_exports.TryBoolean(value);
  return try_exports.IsOk(result) ? result.value : value;
}
function FromCyclic7(context, type, value) {
  return FromType15({ ...context, ...type.$defs }, Ref(type.$ref), value);
}
function FromUnion10(context, type, value) {
  const matched = type.anyOf.some((type2) => Check2(context, type2, value));
  if (matched)
    return value;
  const candidates = type.anyOf.map((type2) => FromType15(context, type2, Clone2(value)));
  const selected = candidates.find((value2) => Check2(context, type, value2));
  return guard_exports.IsUndefined(selected) ? value : selected;
}
function FromEnum2(context, type, value) {
  const union = EnumToUnion(type);
  return FromUnion10(context, union, value);
}
function FromInteger(context, type, value) {
  if (guard_exports.IsInteger(value))
    return value;
  const result = try_exports.TryNumber(value);
  return try_exports.IsOk(result) ? Math.trunc(result.value) : value;
}
function FromIntersect7(context, type, value) {
  const evaluatedType = Evaluate(type);
  return FromType15(context, evaluatedType, value);
}
function FromLiteralBigInt(context, type, value) {
  const result = try_exports.TryBigInt(value);
  return try_exports.IsOk(result) && guard_exports.IsEqual(type.const, result.value) ? result.value : value;
}
function FromLiteralBoolean(context, type, value) {
  const result = try_exports.TryBoolean(value);
  return try_exports.IsOk(result) && guard_exports.IsEqual(type.const, result.value) ? result.value : value;
}
function FromLiteralNumber(context, type, value) {
  const result = try_exports.TryNumber(value);
  return try_exports.IsOk(result) && guard_exports.IsEqual(type.const, result.value) ? result.value : value;
}
function FromLiteralString(context, type, value) {
  const result = try_exports.TryString(value);
  return try_exports.IsOk(result) && guard_exports.IsEqual(type.const, result.value) ? result.value : value;
}
function FromLiteral5(context, type, value) {
  if (guard_exports.IsEqual(type.const, value))
    return value;
  return IsLiteralBigInt(type) ? FromLiteralBigInt(context, type, value) : IsLiteralBoolean(type) ? FromLiteralBoolean(context, type, value) : IsLiteralNumber(type) ? FromLiteralNumber(context, type, value) : IsLiteralString(type) ? FromLiteralString(context, type, value) : Unreachable();
}
function FromNull8(context, type, value) {
  if (guard_exports.IsNull(value))
    return value;
  const result = try_exports.TryNull(value);
  return try_exports.IsOk(result) ? result.value : value;
}
function FromNumber8(context, type, value) {
  if (guard_exports.IsNumber(value))
    return value;
  const result = try_exports.TryNumber(value);
  return try_exports.IsOk(result) ? result.value : value;
}
function FromAdditionalProperties(context, entries, additionalProperties, value) {
  const keys = guard_exports.Keys(value);
  for (const [regexp, _] of entries) {
    for (const key of keys) {
      if (!regexp.test(key)) {
        value[key] = FromType15(context, additionalProperties, value[key]);
      }
    }
  }
  return value;
}
function IsOptionalUndefined(property, key, value) {
  return IsOptional(property) && guard_exports.IsUndefined(value[key]);
}
function FromProperties4(context, type, value) {
  const entries = guard_exports.EntriesRegExp(type.properties);
  const keys = guard_exports.Keys(value);
  for (const [regexp, property] of entries) {
    for (const key of keys) {
      if (!regexp.test(key) || IsOptionalUndefined(property, key, value))
        continue;
      value[key] = FromType15(context, property, value[key]);
    }
  }
  return guard_exports.HasPropertyKey(type, "additionalProperties") && guard_exports.IsObject(type.additionalProperties) ? FromAdditionalProperties(context, entries, type.additionalProperties, value) : value;
}
function FromObject12(context, type, value) {
  return guard_exports.IsObjectNotArray(value) ? FromProperties4(context, type, value) : value;
}
function FromPatternProperties(context, type, value) {
  const entries = guard_exports.EntriesRegExp(type.patternProperties);
  const keys = guard_exports.Keys(value);
  for (const [regexp, schema] of entries) {
    for (const key of keys) {
      if (regexp.test(key)) {
        value[key] = FromType15(context, schema, value[key]);
      }
    }
  }
  return guard_exports.HasPropertyKey(type, "additionalProperties") && guard_exports.IsObject(type.additionalProperties) ? FromAdditionalProperties(context, entries, type.additionalProperties, value) : value;
}
function FromRecord3(context, type, value) {
  return guard_exports.IsObjectNotArray(value) ? FromPatternProperties(context, type, value) : value;
}
function FromRef6(context, type, value) {
  return guard_exports.HasPropertyKey(context, type.$ref) ? FromType15(context, context[type.$ref], value) : value;
}
function FromString8(context, type, value) {
  if (guard_exports.IsString(value))
    return value;
  const result = try_exports.TryString(value);
  return try_exports.IsOk(result) ? result.value : value;
}
function FromTemplateLiteral4(context, type, value) {
  const decoded = TemplateLiteralDecode(type.pattern);
  return FromType15(context, decoded, value);
}
function FromTuple6(context, type, value) {
  if (!guard_exports.IsArray(value))
    return value;
  for (let index = 0; index < Math.min(type.items.length, value.length); index++) {
    value[index] = FromType15(context, type.items[index], value[index]);
  }
  return value;
}
function FromUndefined8(context, type, value) {
  if (guard_exports.IsUndefined(value))
    return value;
  const result = try_exports.TryUndefined(value);
  return try_exports.IsOk(result) ? result.value : value;
}
function FromVoid(context, type, value) {
  if (guard_exports.IsUndefined(value))
    return value;
  const result = try_exports.TryUndefined(value);
  return try_exports.IsOk(result) ? void 0 : value;
}
function FromType15(context, type, value) {
  return IsArray2(type) ? FromArray9(context, type, value) : IsBase(type) ? FromBase2(context, type, value) : IsBigInt2(type) ? FromBigInt8(context, type, value) : IsBoolean3(type) ? FromBoolean8(context, type, value) : IsCyclic(type) ? FromCyclic7(context, type, value) : IsEnum(type) ? FromEnum2(context, type, value) : IsInteger2(type) ? FromInteger(context, type, value) : IsIntersect(type) ? FromIntersect7(context, type, value) : IsLiteral(type) ? FromLiteral5(context, type, value) : IsNull2(type) ? FromNull8(context, type, value) : IsNumber3(type) ? FromNumber8(context, type, value) : IsObject2(type) ? FromObject12(context, type, value) : IsRecord(type) ? FromRecord3(context, type, value) : IsRef(type) ? FromRef6(context, type, value) : IsString3(type) ? FromString8(context, type, value) : IsTemplateLiteral(type) ? FromTemplateLiteral4(context, type, value) : IsTuple(type) ? FromTuple6(context, type, value) : IsUndefined2(type) ? FromUndefined8(context, type, value) : IsUnion(type) ? FromUnion10(context, type, value) : IsVoid(type) ? FromVoid(context, type, value) : value;
}
function Convert(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  return FromType15(context, type, value);
}
function FromArray10(context, type, value) {
  if (!guard_exports.IsArray(value))
    return value;
  for (let i = 0; i < value.length; i++) {
    value[i] = FromType16(context, type.items, value[i]);
  }
  return value;
}
function FromBase3(context, type, value) {
  return type.Default(value);
}
function FromCyclic8(context, type, value) {
  return FromType16({ ...context, ...type.$defs }, Ref(type.$ref), value);
}
function FromDefault(type, value) {
  if (!guard_exports.IsUndefined(value))
    return value;
  return guard_exports.IsFunction(type.default) ? type.default() : Clone2(type.default);
}
function FromIntersect8(context, type, value) {
  const evaluted = Evaluate(type);
  return FromType16(context, evaluted, value);
}
function FromObject13(context, type, value) {
  if (!guard_exports.IsObject(value))
    return value;
  const knownPropertyKeys = guard_exports.Keys(type.properties);
  for (const key of knownPropertyKeys) {
    const propertyValue = FromType16(context, type.properties[key], value[key]);
    const isUnassignableUndefined = guard_exports.IsUndefined(propertyValue) && (IsOptional(type.properties[key]) || !guard_exports.HasPropertyKey(type.properties[key], "default"));
    if (isUnassignableUndefined)
      continue;
    value[key] = FromType16(context, type.properties[key], value[key]);
  }
  if (!IsAdditionalProperties(type))
    return value;
  for (const key of guard_exports.Keys(value)) {
    if (knownPropertyKeys.includes(key))
      continue;
    value[key] = FromType16(context, type.additionalProperties, value[key]);
  }
  return value;
}
function FromRecord4(context, type, value) {
  if (!guard_exports.IsObject(value))
    return value;
  const [recordKey, recordValue] = [new RegExp(RecordPattern(type)), RecordValue(type)];
  for (const key of guard_exports.Keys(value)) {
    if (!(recordKey.test(key) && IsDefault(recordValue)))
      continue;
    value[key] = FromType16(context, recordValue, value[key]);
  }
  if (!IsAdditionalProperties(type))
    return value;
  for (const key of guard_exports.Keys(value)) {
    if (recordKey.test(key))
      continue;
    value[key] = FromType16(context, type.additionalProperties, value[key]);
  }
  return value;
}
function FromRef7(context, type, value) {
  return guard_exports.HasPropertyKey(context, type.$ref) ? FromType16(context, context[type.$ref], value) : value;
}
function FromTuple7(context, schema, value) {
  if (!guard_exports.IsArray(value))
    return value;
  const [items, max] = [schema.items, Math.max(schema.items.length, value.length)];
  for (let i = 0; i < max; i++) {
    if (i < items.length)
      value[i] = FromType16(context, items[i], value[i]);
  }
  return value;
}
function FromUnion11(context, schema, value) {
  for (const inner of schema.anyOf) {
    const result = FromType16(context, inner, Clone2(value));
    if (Check2(context, inner, result)) {
      return result;
    }
  }
  return value;
}
function FromType16(context, type, value) {
  const defaulted = IsDefault(type) ? FromDefault(type, value) : value;
  return IsArray2(type) ? FromArray10(context, type, defaulted) : IsBase(type) ? FromBase3(context, type, defaulted) : IsCyclic(type) ? FromCyclic8(context, type, defaulted) : IsIntersect(type) ? FromIntersect8(context, type, defaulted) : IsObject2(type) ? FromObject13(context, type, defaulted) : IsRecord(type) ? FromRecord4(context, type, defaulted) : IsRef(type) ? FromRef7(context, type, defaulted) : IsTuple(type) ? FromTuple7(context, type, defaulted) : IsUnion(type) ? FromUnion11(context, type, defaulted) : defaulted;
}
function Default(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  return FromType16(context, type, value);
}
function Pipeline(pipeline) {
  return (...args) => {
    const [context, type, value] = arguments_exports.Match(args, {
      3: (context2, type2, value2) => [context2, type2, value2],
      2: (type2, value2) => [{}, type2, value2]
    });
    return pipeline.reduce((result, func) => func(context, type, result), value);
  };
}
function Decode2(context, type, value) {
  return type["~codec"].decode(value);
}
function Encode2(context, type, value) {
  return type["~codec"].encode(value);
}
function Callback(direction, context, type, value) {
  if (!IsCodec(type))
    return value;
  return guard_exports.IsEqual(direction, "Decode") ? Decode2(context, type, value) : Encode2(context, type, value);
}
function Decode3(direction, context, type, value) {
  if (!guard_exports.IsArray(value))
    return Unreachable();
  for (let i = 0; i < value.length; i++) {
    value[i] = FromType17(direction, context, type.items, value[i]);
  }
  return Callback(direction, context, type, value);
}
function Encode3(direction, context, type, value) {
  const exterior = Callback(direction, context, type, value);
  if (!guard_exports.IsArray(exterior))
    return exterior;
  for (let i = 0; i < exterior.length; i++) {
    exterior[i] = FromType17(direction, context, type.items, exterior[i]);
  }
  return exterior;
}
function FromArray11(direction, context, type, value) {
  return guard_exports.IsEqual(direction, "Decode") ? Decode3(direction, context, type, value) : Encode3(direction, context, type, value);
}
function FromCyclic9(direction, context, type, value) {
  value = FromType17(direction, { ...context, ...type.$defs }, Ref(type.$ref), value);
  return Callback(direction, context, type, value);
}
function Decode4(direction, context, type, value) {
  for (const schema of type.allOf) {
    value = FromType17(direction, context, schema, value);
  }
  return Callback(direction, context, type, value);
}
function Encode4(direction, context, type, value) {
  let exterior = Callback(direction, context, type, value);
  for (const schema of type.allOf) {
    exterior = FromType17(direction, context, schema, exterior);
  }
  return exterior;
}
function FromIntersect9(direction, context, type, value) {
  return guard_exports.IsEqual(direction, "Decode") ? Decode4(direction, context, type, value) : Encode4(direction, context, type, value);
}
function Decode5(direction, context, type, value) {
  if (!guard_exports.IsObjectNotArray(value))
    return Unreachable();
  for (const key of guard_exports.Keys(type.properties)) {
    if (!guard_exports.HasPropertyKey(value, key) || IsOptionalUndefined(type.properties[key], key, value))
      continue;
    value[key] = FromType17(direction, context, type.properties[key], value[key]);
  }
  return Callback(direction, context, type, value);
}
function Encode5(direction, context, type, value) {
  const exterior = Callback(direction, context, type, value);
  if (!guard_exports.IsObjectNotArray(exterior))
    return exterior;
  for (const key of guard_exports.Keys(type.properties)) {
    if (!guard_exports.HasPropertyKey(exterior, key) || IsOptionalUndefined(type.properties[key], key, exterior))
      continue;
    exterior[key] = FromType17(direction, context, type.properties[key], exterior[key]);
  }
  return exterior;
}
function FromObject14(direction, context, type, value) {
  return guard_exports.IsEqual(direction, "Decode") ? Decode5(direction, context, type, value) : Encode5(direction, context, type, value);
}
function Decode6(direction, context, type, value) {
  if (!guard_exports.IsObjectNotArray(value))
    return Unreachable();
  const regexp = new RegExp(RecordPattern(type));
  for (const key of guard_exports.Keys(value)) {
    if (!regexp.test(key))
      Unreachable();
    value[key] = FromType17(direction, context, RecordValue(type), value[key]);
  }
  return Callback(direction, context, type, value);
}
function Encode6(direction, context, type, value) {
  const exterior = Callback(direction, context, type, value);
  if (!guard_exports.IsObjectNotArray(exterior))
    return exterior;
  const regexp = new RegExp(RecordPattern(type));
  for (const key of guard_exports.Keys(exterior)) {
    if (!regexp.test(key))
      continue;
    exterior[key] = FromType17(direction, context, RecordValue(type), exterior[key]);
  }
  return exterior;
}
function FromRecord5(direction, context, type, value) {
  return guard_exports.IsEqual(direction, "Decode") ? Decode6(direction, context, type, value) : Encode6(direction, context, type, value);
}
function FromRef8(direction, context, type, value) {
  value = guard_exports.HasPropertyKey(context, type.$ref) ? FromType17(direction, context, context[type.$ref], value) : value;
  return Callback(direction, context, type, value);
}
function Decode7(direction, context, type, value) {
  if (!guard_exports.IsArray(value))
    return Unreachable();
  for (let i = 0; i < Math.min(type.items.length, value.length); i++) {
    value[i] = FromType17(direction, context, type.items[i], value[i]);
  }
  return Callback(direction, context, type, value);
}
function Encode7(direction, context, type, value) {
  const exterior = Callback(direction, context, type, value);
  if (!guard_exports.IsArray(exterior))
    return value;
  for (let i = 0; i < Math.min(type.items.length, exterior.length); i++) {
    exterior[i] = FromType17(direction, context, type.items[i], exterior[i]);
  }
  return exterior;
}
function FromTuple8(direction, context, type, value) {
  return guard_exports.IsEqual(direction, "Decode") ? Decode7(direction, context, type, value) : Encode7(direction, context, type, value);
}
function Decode8(direction, context, type, value) {
  for (const schema of type.anyOf) {
    if (!Check2(context, schema, value))
      continue;
    const variant = FromType17(direction, context, schema, value);
    return Callback(direction, context, type, variant);
  }
  return Unreachable();
}
function Encode8(direction, context, type, value) {
  let exterior = Callback(direction, context, type, value);
  for (const schema of type.anyOf) {
    const variant = FromType17(direction, context, schema, Clone2(exterior));
    if (!Check2(context, schema, variant))
      continue;
    return variant;
  }
  return exterior;
}
function FromUnion12(direction, context, type, value) {
  return guard_exports.IsEqual(direction, "Decode") ? Decode8(direction, context, type, value) : Encode8(direction, context, type, value);
}
function FromType17(direction, context, type, value) {
  return IsArray2(type) ? FromArray11(direction, context, type, value) : IsCyclic(type) ? FromCyclic9(direction, context, type, value) : IsIntersect(type) ? FromIntersect9(direction, context, type, value) : IsObject2(type) ? FromObject14(direction, context, type, value) : IsRecord(type) ? FromRecord5(direction, context, type, value) : IsRef(type) ? FromRef8(direction, context, type, value) : IsTuple(type) ? FromTuple8(direction, context, type, value) : IsUnion(type) ? FromUnion12(direction, context, type, value) : Callback(direction, context, type, value);
}
var DecodeError = class extends AssertError {
  constructor(value, errors) {
    super("Decode", value, errors);
  }
};
function Assert2(context, type, value) {
  if (!Check2(context, type, value))
    throw new DecodeError(value, Errors2(context, type, value));
  return value;
}
function DecodeUnsafe(context, type, value) {
  return FromType17("Decode", context, type, value);
}
var Decoder = Pipeline([
  (_context, _type, value) => Clone2(value),
  (context, type, value) => Default(context, type, value),
  (context, type, value) => Convert(context, type, value),
  (context, type, value) => Clean(context, type, value),
  (context, type, value) => Assert2(context, type, value),
  (context, type, value) => DecodeUnsafe(context, type, value)
]);
function Decode9(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  return Decoder(context, type, value);
}
var EncodeError = class extends AssertError {
  constructor(value, errors) {
    super("Encode", value, errors);
  }
};
function Assert3(context, type, value) {
  if (!Check2(context, type, value))
    throw new EncodeError(value, Errors2(context, type, value));
  return value;
}
function EncodeUnsafe(context, type, value) {
  return FromType17("Encode", context, type, value);
}
var Encoder = Pipeline([
  (_context, _type, value) => Clone2(value),
  (context, type, value) => EncodeUnsafe(context, type, value),
  (context, type, value) => Default(context, type, value),
  (context, type, value) => Convert(context, type, value),
  (context, type, value) => Clean(context, type, value),
  (context, type, value) => Assert3(context, type, value)
]);
function Encode9(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  return Encoder(context, type, value);
}
function FromArray12(context, type) {
  return IsCodec(type) || FromType18(context, type.items);
}
function FromCyclic10(context, type) {
  return IsCodec(type) || FromRef9({ ...context, ...type.$defs }, Ref(type.$ref));
}
function FromIntersect10(context, type) {
  return IsCodec(type) || type.allOf.some((type2) => FromType18(context, type2));
}
function FromObject15(context, type) {
  return IsCodec(type) || guard_exports.Keys(type.properties).some((key) => {
    return FromType18(context, type.properties[key]);
  });
}
function FromRecord6(context, type) {
  return IsCodec(type) || FromType18(context, RecordValue(type));
}
function FromRef9(context, type) {
  if (visited.has(type.$ref))
    return false;
  visited.add(type.$ref);
  return IsCodec(type) || guard_exports.HasPropertyKey(context, type.$ref) && FromType18(context, context[type.$ref]);
}
function FromTuple9(context, type) {
  return IsCodec(type) || type.items.some((type2) => FromType18(context, type2));
}
function FromUnion13(context, type) {
  return IsCodec(type) || type.anyOf.some((type2) => FromType18(context, type2));
}
function FromType18(context, type) {
  return IsArray2(type) ? FromArray12(context, type) : IsCyclic(type) ? FromCyclic10(context, type) : IsIntersect(type) ? FromIntersect10(context, type) : IsObject2(type) ? FromObject15(context, type) : IsRecord(type) ? FromRecord6(context, type) : IsRef(type) ? FromRef9(context, type) : IsTuple(type) ? FromTuple9(context, type) : IsUnion(type) ? FromUnion13(context, type) : IsCodec(type);
}
var visited = /* @__PURE__ */ new Set();
function HasCodec(...args) {
  const [context, type] = arguments_exports.Match(args, {
    2: (context2, type2) => [context2, type2],
    1: (type2) => [{}, type2]
  });
  visited.clear();
  return FromType18(context, type);
}
var CreateError = class extends Error {
  constructor(type, message) {
    super(message);
    this.type = type;
  }
};
function FromDefault2(context, schema) {
  return guard_exports.IsFunction(schema.default) ? schema.default(schema) : guard_exports.IsObject(schema.default) ? Clone2(schema.default) : schema.default;
}
function FromArray13(context, type) {
  if (IsUniqueItems(type) && !IsDefault(type))
    throw new CreateError(type, "Arrays with uniqueItems constraints must specify a default annotation");
  const length = IsMinItems(type) ? type.minItems : 0;
  return Array.from({ length }, () => FromType19(context, type.items));
}
async function* CreateAsyncIterator() {
}
function FromAsyncIterator(context, type) {
  return CreateAsyncIterator();
}
function FromBase4(context, type) {
  return type.Create();
}
function FromBigInt9(context, type) {
  return IsExclusiveMinimum(type) ? BigInt(type.exclusiveMinimum) + BigInt(1) : IsMinimum(type) ? BigInt(type.minimum) : BigInt(0);
}
function FromBoolean9(context, type) {
  return false;
}
function FromConstructor2(context, type) {
  const instanceType = FromType19(context, type.instanceType);
  return class {
    constructor() {
      Object.assign(this, instanceType);
    }
  };
}
function FromCyclic11(context, type) {
  return FromType19({ ...context, ...type.$defs }, Ref(type.$ref));
}
function FromEnum3(context, type) {
  return FromType19(context, EnumToUnion(type));
}
function FromFunction2(context, type) {
  const returnType = FromType19(context, type.returnType);
  return () => returnType;
}
function FromInteger2(context, type) {
  return IsExclusiveMinimum(type) && guard_exports.IsNumber(type.exclusiveMinimum) ? type.exclusiveMinimum + 1 : IsMinimum(type) ? type.minimum : 0;
}
function FromIntersect11(context, type) {
  return FromType19(context, Evaluate(type));
}
function* CreateIterator() {
}
function FromIterator(context, type) {
  return CreateIterator();
}
function FromLiteral6(context, type) {
  return type.const;
}
function FromNever(context, type) {
  throw new CreateError(type, "Cannot create TNever types");
}
function FromNull9(context, type) {
  return null;
}
function FromNumber9(context, type) {
  return IsExclusiveMinimum(type) && guard_exports.IsNumber(type.exclusiveMinimum) ? type.exclusiveMinimum + 1 : IsMinimum(type) ? type.minimum : 0;
}
function FromObject16(context, type) {
  const required = guard_exports.IsUndefined(type.required) ? [] : type.required;
  return required.reduce((result, key) => {
    return { ...result, [key]: FromType19(context, type.properties[key]) };
  }, {});
}
function FromPromise(context, type) {
  return Promise.resolve(FromType19(context, type.item));
}
function FromRecord7(context, type) {
  if (IsMinProperties(type) && !IsDefault(type))
    throw new CreateError(type, "Record with the minProperties constraint must have a default annotation");
  return {};
}
function FromRef10(context, type) {
  return guard_exports.HasPropertyKey(context, type.$ref) ? FromType19(context, context[type.$ref]) : (() => {
    throw new CreateError(type, "Unable to deref Ref");
  })();
}
function FromString9(context, type) {
  const needsDefault = (IsPattern(type) || IsFormat(type)) && !IsDefault(type);
  if (needsDefault)
    throw Error("Strings with format or pattern constraints must specify default");
  const minLength = IsMinLength(type) ? type.minLength : 0;
  return "".padEnd(minLength);
}
function FromSymbol2(context, type) {
  return /* @__PURE__ */ Symbol();
}
function FromTemplateLiteral5(context, type) {
  const decoded = TemplateLiteralDecode(type.pattern);
  if (IsString3(decoded))
    throw new CreateError(type, "Unable to create TemplateLiteral due to infinite type expansion");
  return FromType19(context, decoded);
}
function FromTuple10(context, type) {
  return Array.from({ length: type.minItems }, (_, i) => FromType19(context, type.items[i]));
}
function FromUndefined9(context, type) {
  return void 0;
}
function FromUnion14(context, type) {
  if (guard_exports.IsEqual(type.anyOf.length, 0)) {
    throw Error("Unable to create Union with no variants");
  }
  return FromType19(context, type.anyOf[0]);
}
function FromVoid2(context, type) {
  return void 0;
}
function FromType19(context, type) {
  return (
    // -----------------------------------------------------
    // Default
    // -----------------------------------------------------
    IsDefault(type) ? FromDefault2(context, type) : (
      // -----------------------------------------------------
      // Types
      // -----------------------------------------------------
      IsArray2(type) ? FromArray13(context, type) : IsAsyncIterator2(type) ? FromAsyncIterator(context, type) : IsBase(type) ? FromBase4(context, type) : IsBigInt2(type) ? FromBigInt9(context, type) : IsBoolean3(type) ? FromBoolean9(context, type) : IsConstructor2(type) ? FromConstructor2(context, type) : IsCyclic(type) ? FromCyclic11(context, type) : IsEnum(type) ? FromEnum3(context, type) : IsFunction2(type) ? FromFunction2(context, type) : IsInteger2(type) ? FromInteger2(context, type) : IsIntersect(type) ? FromIntersect11(context, type) : IsIterator2(type) ? FromIterator(context, type) : IsLiteral(type) ? FromLiteral6(context, type) : IsNever(type) ? FromNever(context, type) : IsNull2(type) ? FromNull9(context, type) : IsNumber3(type) ? FromNumber9(context, type) : IsObject2(type) ? FromObject16(context, type) : IsPromise(type) ? FromPromise(context, type) : IsRecord(type) ? FromRecord7(context, type) : IsRef(type) ? FromRef10(context, type) : IsString3(type) ? FromString9(context, type) : IsSymbol2(type) ? FromSymbol2(context, type) : IsTemplateLiteral(type) ? FromTemplateLiteral5(context, type) : IsTuple(type) ? FromTuple10(context, type) : IsUndefined2(type) ? FromUndefined9(context, type) : IsUnion(type) ? FromUnion14(context, type) : IsVoid(type) ? FromVoid2(context, type) : void 0
    )
  );
}
function Create2(...args) {
  const [context, type] = arguments_exports.Match(args, {
    2: (context2, type2) => [context2, type2],
    1: (type2) => [{}, type2]
  });
  return FromType19(context, type);
}
function Equal(left, right) {
  return guard_exports.IsDeepEqual(left, right);
}
function Hash2(value) {
  return hash_exports.Hash(value);
}
var MutateError = class extends Error {
  constructor(message) {
    super(message);
  }
};
function FromArray14(root, path, current, next) {
  if (!guard_exports.IsArray(current)) {
    pointer_exports.Set(root, path, Clone2(next));
  } else {
    for (let index = 0; index < next.length; index++) {
      FromValue5(root, `${path}/${index}`, current[index], next[index]);
    }
    current.splice(next.length);
  }
}
function FromObject17(root, path, current, next) {
  if (!guard_exports.IsObjectNotArray(current)) {
    pointer_exports.Set(root, path, Clone2(next));
  } else {
    const currentKeys = guard_exports.Keys(current);
    const nextKeys = guard_exports.Keys(next);
    for (const currentKey of currentKeys) {
      if (!nextKeys.includes(currentKey)) {
        delete current[currentKey];
      }
    }
    for (const nextKey of nextKeys) {
      if (!currentKeys.includes(nextKey)) {
        current[nextKey] = next[nextKey];
      }
    }
    for (const nextKey of nextKeys) {
      FromValue5(root, `${path}/${nextKey}`, current[nextKey], next[nextKey]);
    }
  }
}
function FromUnknown2(root, path, current, next) {
  if (current === next)
    return;
  pointer_exports.Set(root, path, next);
}
function FromValue5(root, path, current, next) {
  if (guard_exports.IsArray(next))
    return FromArray14(root, path, current, next);
  if (guard_exports.IsObject(next))
    return FromObject17(root, path, current, next);
  return FromUnknown2(root, path, current, next);
}
function IsNonMutableValue(value) {
  return globals_exports.IsTypeArray(value) || globals_exports.IsDate(value) || globals_exports.IsMap(value) || globals_exports.IsSet(value) || guard_exports.IsNumber(value) || guard_exports.IsString(value) || guard_exports.IsBoolean(value) || guard_exports.IsSymbol(value);
}
function IsMismatchedValue(left, right) {
  return guard_exports.IsObjectNotArray(left) && guard_exports.IsArray(right) || guard_exports.IsArray(left) && guard_exports.IsObjectNotArray(right);
}
function Mutate(current, next) {
  if (IsNonMutableValue(current) || IsNonMutableValue(next))
    throw new MutateError("Only object and array types can be mutated at the root level");
  if (IsMismatchedValue(current, next))
    throw new MutateError("Cannot assign due type mismatch of assignable values");
  FromValue5(current, "", current, next);
}
var ParseError = class extends AssertError {
  constructor(value, errors) {
    super("Parse", value, errors);
  }
};
function Assert4(context, type, value) {
  if (!Check2(context, type, value))
    throw new ParseError(value, Errors2(context, type, value));
  return value;
}
var Parser = Pipeline([
  (_context, _type, value) => Clone2(value),
  (context, type, value) => Default(context, type, value),
  (context, type, value) => Convert(context, type, value),
  (context, type, value) => Clean(context, type, value),
  (context, type, value) => Assert4(context, type, value)
]);
function Parse(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  const result = Check2(context, type, value) ? value : Parser(context, type, value);
  return result;
}
function CreateUpdate(path, value) {
  return { type: "update", path, value };
}
function CreateInsert(path, value) {
  return { type: "insert", path, value };
}
function CreateDelete(path) {
  return { type: "delete", path };
}
function AssertCanDiffObject(value) {
  if (guard_exports.IsObject(value) && guard_exports.IsEqual(guard_exports.Symbols(value).length, 0))
    return;
  throw new Error("Cannot create diffs for objects with symbols keys");
}
function* FromObject18(path, left, right) {
  if (!guard_exports.IsObject(right) || guard_exports.IsArray(right))
    return yield CreateUpdate(path, right);
  AssertCanDiffObject(left);
  AssertCanDiffObject(right);
  const leftKeys = guard_exports.Keys(left);
  const rightKeys = guard_exports.Keys(right);
  for (const key of rightKeys) {
    if (guard_exports.HasPropertyKey(left, key))
      continue;
    yield CreateInsert(`${path}/${key}`, right[key]);
  }
  for (const key of leftKeys) {
    if (!guard_exports.HasPropertyKey(right, key))
      continue;
    if (Equal(left, right))
      continue;
    yield* FromValue6(`${path}/${key}`, left[key], right[key]);
  }
  for (const key of leftKeys) {
    if (guard_exports.HasPropertyKey(right, key))
      continue;
    yield CreateDelete(`${path}/${key}`);
  }
}
function* FromArray15(path, left, right) {
  if (!guard_exports.IsArray(right))
    return yield CreateUpdate(path, right);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    yield* FromValue6(`${path}/${i}`, left[i], right[i]);
  }
  for (let i = 0; i < right.length; i++) {
    if (i < left.length)
      continue;
    yield CreateInsert(`${path}/${i}`, right[i]);
  }
  for (let i = left.length - 1; i >= 0; i--) {
    if (i < right.length)
      continue;
    yield CreateDelete(`${path}/${i}`);
  }
}
function* FromTypedArray2(path, left, right) {
  const typeLeft = globalThis.Object.getPrototypeOf(left).constructor.name;
  const typeRight = globalThis.Object.getPrototypeOf(right).constructor.name;
  const predicate = globals_exports.IsTypeArray(right) && guard_exports.IsEqual(left.length, right.length) && guard_exports.IsEqual(typeLeft, typeRight);
  if (predicate) {
    for (let index = 0; index < Math.min(left.length, right.length); index++) {
      yield* FromValue6(`${path}/${index}`, left[index], right[index]);
    }
  } else {
    return yield CreateUpdate(path, right);
  }
}
function* FromUnknown3(path, left, right) {
  if (left === right)
    return;
  yield CreateUpdate(path, right);
}
function* FromValue6(path, left, right) {
  return globals_exports.IsTypeArray(left) ? yield* FromTypedArray2(path, left, right) : guard_exports.IsArray(left) ? yield* FromArray15(path, left, right) : guard_exports.IsObject(left) ? yield* FromObject18(path, left, right) : yield* FromUnknown3(path, left, right);
}
function Diff(current, next) {
  return [...FromValue6("", current, next)];
}
var Insert = Object2({
  type: Literal("insert"),
  path: String2(),
  value: Unknown()
});
var Update2 = Object({
  type: Literal("update"),
  path: String2(),
  value: Unknown()
});
var Delete2 = Object2({
  type: Literal("delete"),
  path: String2()
});
var Edit = Union([Insert, Update2, Delete2]);
function IsRoot(edits) {
  return edits.length > 0 && edits[0].path === "" && edits[0].type === "update";
}
function IsEmpty(edits) {
  return edits.length === 0;
}
function Patch(current, edits) {
  if (IsRoot(edits))
    return Clone2(edits[0].value);
  if (IsEmpty(edits))
    return Clone2(current);
  const clone2 = Clone2(current);
  for (const edit of edits) {
    switch (edit.type) {
      case "insert": {
        pointer_exports.Set(clone2, edit.path, edit.value);
        break;
      }
      case "update": {
        pointer_exports.Set(clone2, edit.path, edit.value);
        break;
      }
      case "delete": {
        pointer_exports.Delete(clone2, edit.path);
        break;
      }
    }
  }
  return clone2;
}
var RepairError = class extends Error {
  constructor(context, type, value, message) {
    super(message);
    this.context = context;
    this.type = type;
    this.value = value;
  }
};
function MakeUnique(values) {
  const [hashes, result] = [/* @__PURE__ */ new Set(), []];
  for (const value of values) {
    const hash = Hash2(value);
    if (hashes.has(hash))
      continue;
    hashes.add(hash);
    result.push(value);
  }
  return result;
}
function FromArray16(context, type, value) {
  if (Check2(context, type, value))
    return value;
  const created = guard_exports.IsArray(value) ? value : Create2(context, type);
  const minimum = IsMinItems(type) && created.length < type.minItems ? [...created, ...Array.from({ length: type.minItems - created.length }, () => Create2(context, type))] : created;
  const maximum = IsMaxItems(type) && minimum.length > type.maxItems ? minimum.slice(0, type.maxItems) : minimum;
  const repaired = maximum.map((value2) => FromType20(context, type.items, value2));
  if (!IsUniqueItems(type) || IsUniqueItems(type) && !guard_exports.IsEqual(type.uniqueItems, true))
    return repaired;
  const unique = MakeUnique(repaired);
  if (!Check2(context, type, unique))
    throw new RepairError(context, type, value, "Failed to repair Array due to uniqueItems constraint");
  return unique;
}
function FromUnknown4(context, type, value) {
  if (Check2(context, type, value))
    return value;
  const converted = Convert(context, type, value);
  if (Check2(context, type, converted))
    return converted;
  return Create2(context, type);
}
function FromBase5(context, type, value) {
  return FromUnknown4(context, type, value);
}
function FromEnum4(context, type, value) {
  const union = EnumToUnion(type);
  return FromType20(context, union, value);
}
function FromIntersect12(context, type, value) {
  const evaluated = Evaluate(type);
  return FromType20(context, evaluated, value);
}
function FromObject19(context, type, value) {
  if (Check2(context, type, value))
    return value;
  if (!guard_exports.IsObjectNotArray(value))
    return Create2(context, type);
  const required = new Set(guard_exports.IsUndefined(type.required) ? [] : type.required);
  const result = {};
  for (const [key, schema] of guard_exports.Entries(type.properties)) {
    if (!required.has(key) && guard_exports.IsUndefined(value[key]))
      continue;
    result[key] = key in value ? FromType20(context, schema, value[key]) : Create2(context, schema);
  }
  const evaluatedKeys = guard_exports.Keys(type.properties);
  if (IsAdditionalProperties(type) && guard_exports.IsObject(type.additionalProperties)) {
    for (const key of guard_exports.Keys(value)) {
      if (evaluatedKeys.includes(key))
        continue;
      result[key] = FromType20(context, type.additionalProperties, value[key]);
    }
  }
  return result;
}
function FromRecord8(context, type, value) {
  if (Check2(context, type, value))
    return value;
  if (guard_exports.IsNull(value) || !guard_exports.IsObject(value) || guard_exports.IsArray(value))
    return Create2(context, type);
  const recordKey = new RegExp(RecordPattern(type));
  const recordValue = RecordValue(type);
  const evaluatedKeys = /* @__PURE__ */ new Set();
  const result = {};
  for (const [key, value_] of guard_exports.Entries(value)) {
    if (!recordKey.test(key))
      continue;
    result[key] = FromType20(context, recordValue, value_);
    evaluatedKeys.add(key);
  }
  if (IsAdditionalProperties(type)) {
    for (const key of guard_exports.Keys(value)) {
      if (evaluatedKeys.has(key))
        continue;
      result[key] = FromType20(context, type.additionalProperties, value[key]);
    }
  }
  return result;
}
function FromRef11(context, type, value) {
  return guard_exports.HasPropertyKey(context, type.$ref) ? FromType20(context, context[type.$ref], value) : (() => {
    throw new RepairError(context, type, value, "Unable to de-reference target type");
  })();
}
function FromTemplateLiteral6(context, type, value) {
  const decoded = TemplateLiteralDecode(type.pattern);
  return FromType20(context, decoded, value);
}
function FromTuple11(context, schema, value) {
  if (Check2(context, schema, value))
    return value;
  if (!guard_exports.IsArray(value))
    return Create2(context, schema);
  return schema.items.map((schema2, index) => FromType20(context, schema2, value[index]));
}
function Deref(context, type, value) {
  return IsRef(type) ? guard_exports.HasPropertyKey(context, type.$ref) ? Deref(context, context[type.$ref], value) : (() => {
    throw new RepairError(context, type, value, "Unable to Deref target on Union repair");
  })() : type;
}
function ScoreVariant(context, type, value) {
  if (!(IsObject2(type) && guard_exports.IsObject(value)))
    return 0;
  const keys = guard_exports.Keys(value);
  const entries = guard_exports.Entries(type.properties);
  return entries.reduce((result, [key, schema]) => {
    const literal = IsLiteral(schema) && guard_exports.IsEqual(schema.const, value[key]) ? 100 : 0;
    const checks = Check2(context, schema, value[key]) ? 10 : 0;
    const exists = keys.includes(key) ? 1 : 0;
    return result + (literal + checks + exists);
  }, 0);
}
function SelectVariant(context, type, value) {
  const schemas = type.anyOf.map((schema) => Deref(context, schema, value));
  let [select, best] = [schemas[0], 0];
  for (const schema of schemas) {
    const score = ScoreVariant(context, schema, value);
    if (score > best) {
      select = schema;
      best = score;
    }
  }
  return select;
}
function RepairUnion(context, type, value) {
  const union = Union(Flatten(type.anyOf));
  const schema = SelectVariant(context, union, value);
  return FromType20(context, schema, value);
}
function FromUnion15(context, type, value) {
  if (Check2(context, type, value))
    return Clone2(value);
  if (IsDefault(type))
    return Create2(context, type);
  return RepairUnion(context, type, value);
}
function AssertRepairableValue(context, type, value) {
  const unsupported = globals_exports.IsDate(value) || globals_exports.IsMap(value) || globals_exports.IsSet(value) || globals_exports.IsTypeArray(value) || guard_exports.IsConstructor(value) || guard_exports.IsFunction(value);
  if (unsupported) {
    throw new RepairError(context, type, value, "Value is not repairable");
  }
}
function AssertRepairableType(context, type, value) {
  const unsupported = IsAsyncIterator2(type) || IsIterator2(type) || IsConstructor2(type) || IsFunction2(type) || IsNever(type) || IsPromise(type);
  if (unsupported) {
    throw new RepairError(context, type, value, "Type is not repairable");
  }
}
function FinalizeRepair(context, type, repaired) {
  return IsRefine(type) ? Check2(context, type, repaired) ? repaired : Create2(context, type) : repaired;
}
function FromType20(context, type, value) {
  if (IsBase(type)) {
    const repaired2 = FromBase5(context, type, value);
    return FinalizeRepair(context, type, repaired2);
  }
  AssertRepairableValue(context, type, value);
  AssertRepairableType(context, type, value);
  const repaired = IsArray2(type) ? FromArray16(context, type, value) : IsEnum(type) ? FromEnum4(context, type, value) : IsIntersect(type) ? FromIntersect12(context, type, value) : IsObject2(type) ? FromObject19(context, type, value) : IsRecord(type) ? FromRecord8(context, type, value) : IsRef(type) ? FromRef11(context, type, value) : IsTemplateLiteral(type) ? FromTemplateLiteral6(context, type, value) : IsTuple(type) ? FromTuple11(context, type, value) : IsUnion(type) ? FromUnion15(context, type, value) : FromUnknown4(context, type, value);
  return FinalizeRepair(context, type, repaired);
}
function Repair(...args) {
  const [context, type, value] = arguments_exports.Match(args, {
    3: (context2, type2, value2) => [context2, type2, value2],
    2: (type2, value2) => [{}, type2, value2]
  });
  const repaired = FromType20(context, type, value);
  Assert(context, type, repaired);
  return repaired;
}
var value_exports = {};
__export(value_exports, {
  Assert: () => Assert,
  Check: () => Check2,
  Clean: () => Clean,
  Clone: () => Clone2,
  Convert: () => Convert,
  Create: () => Create2,
  Decode: () => Decode9,
  Default: () => Default,
  Diff: () => Diff,
  Encode: () => Encode9,
  Equal: () => Equal,
  Errors: () => Errors2,
  HasCodec: () => HasCodec,
  Hash: () => Hash2,
  Mutate: () => Mutate,
  Parse: () => Parse,
  Patch: () => Patch,
  Pointer: () => pointer_exports,
  Repair: () => Repair
});
function buildConfig(input) {
  const cloned = value_exports.Clone(input ?? {});
  const defaulted = value_exports.Default(MapGenConfigSchema, cloned);
  const converted = value_exports.Convert(MapGenConfigSchema, defaulted);
  const cleaned = value_exports.Clean(MapGenConfigSchema, converted);
  return cleaned;
}
function formatErrors(cleaned) {
  const formattedErrors = [];
  for (const err of value_exports.Errors(MapGenConfigSchema, cleaned)) {
    const path = err.path ?? err.instancePath;
    formattedErrors.push({
      path: path && path.length > 0 ? path : "/",
      message: err.message
    });
  }
  return formattedErrors;
}
function parseConfig(input) {
  const cleaned = buildConfig(input);
  const errors = formatErrors(cleaned);
  if (errors.length > 0) {
    const messages = errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    const error = new Error(`Invalid MapGenConfig: ${messages}`);
    error.errors = errors;
    throw error;
  }
  return cleaned;
}

// ../../packages/mapgen-core/dist/chunk-4LMYLP3T.js
var _cache = null;
var _boundConfig = null;
var EMPTY_OBJECT = Object.freeze({});
function safeFreeze(obj) {
  if (!obj || typeof obj !== "object") {
    return EMPTY_OBJECT;
  }
  if (Object.isFrozen(obj)) {
    return obj;
  }
  return Object.freeze({ ...obj });
}
function deepMerge(base, override) {
  if (!override || typeof override !== "object") {
    return safeFreeze(base);
  }
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (baseVal && typeof baseVal === "object" && !Array.isArray(baseVal) && overrideVal && typeof overrideVal === "object" && !Array.isArray(overrideVal)) {
      result[key] = deepMerge(baseVal, overrideVal);
    } else if (overrideVal !== void 0) {
      result[key] = overrideVal;
    }
  }
  return Object.freeze(result);
}
function buildTunablesFromConfig(config) {
  const togglesConfig = config.toggles ?? {};
  const rawFoundation = config.foundation ?? {};
  const foundationConfig = { ...rawFoundation };
  const mergeTopLevelLayer = (key) => {
    const topLevel = config[key];
    if (topLevel && typeof topLevel === "object") {
      foundationConfig[key] = deepMerge(
        foundationConfig[key] ?? {},
        topLevel
      );
    }
  };
  mergeTopLevelLayer("mountains");
  mergeTopLevelLayer("volcanoes");
  mergeTopLevelLayer("coastlines");
  mergeTopLevelLayer("islands");
  mergeTopLevelLayer("biomes");
  mergeTopLevelLayer("featuresDensity");
  mergeTopLevelLayer("story");
  mergeTopLevelLayer("corridors");
  mergeTopLevelLayer("oceanSeparation");
  const platesConfig = safeFreeze(foundationConfig.plates ?? {});
  const dynamicsConfig = safeFreeze(foundationConfig.dynamics ?? {});
  const directionalityConfig = safeFreeze(
    dynamicsConfig.directionality ?? foundationConfig.dynamics?.directionality ?? {}
  );
  const manifestConfig = config.stageManifest ?? {};
  const stageManifest = Object.freeze({
    order: manifestConfig.order ?? [],
    stages: manifestConfig.stages ?? {}
  });
  return {
    STAGE_MANIFEST: stageManifest,
    // Toggles: schema defaults apply via parseConfig; tunables reads directly.
    // Non-null assertions (!) document the contract that parseConfig has applied defaults.
    STORY_ENABLE_HOTSPOTS: togglesConfig.STORY_ENABLE_HOTSPOTS,
    STORY_ENABLE_RIFTS: togglesConfig.STORY_ENABLE_RIFTS,
    STORY_ENABLE_OROGENY: togglesConfig.STORY_ENABLE_OROGENY,
    STORY_ENABLE_SWATCHES: togglesConfig.STORY_ENABLE_SWATCHES,
    STORY_ENABLE_PALEO: togglesConfig.STORY_ENABLE_PALEO,
    STORY_ENABLE_CORRIDORS: togglesConfig.STORY_ENABLE_CORRIDORS,
    // Layer configs: read directly; defaults are in schema
    LANDMASS_CFG: safeFreeze(config.landmass ?? {}),
    FOUNDATION_CFG: safeFreeze(foundationConfig),
    FOUNDATION_PLATES: platesConfig,
    FOUNDATION_DYNAMICS: dynamicsConfig,
    FOUNDATION_DIRECTIONALITY: directionalityConfig,
    CLIMATE_CFG: safeFreeze(config.climate ?? {})
  };
}
function bindTunables(config) {
  _boundConfig = config;
  _cache = null;
}
function getTunables() {
  if (_cache) return _cache;
  if (!_boundConfig) {
    throw new Error(
      "Tunables not initialized. Call bootstrap() or bindTunables(config) before accessing tunables."
    );
  }
  _cache = buildTunablesFromConfig(_boundConfig);
  return _cache;
}
function resetTunables() {
  _cache = null;
}
function stageEnabled(stage) {
  const tunables = getTunables();
  const stages = tunables.STAGE_MANIFEST.stages || {};
  const entry = stages[stage];
  return !!(entry && entry.enabled !== false);
}

// ../../packages/mapgen-core/dist/chunk-5BJRFPA7.js
var STAGE_ORDER = Object.freeze([
  "foundation",
  "landmassPlates",
  "coastlines",
  "storySeed",
  "storyHotspots",
  "storyRifts",
  "storyOrogeny",
  "storyCorridorsPre",
  "islands",
  "mountains",
  "volcanoes",
  "lakes",
  "climateBaseline",
  "storySwatches",
  "rivers",
  "storyCorridorsPost",
  "climateRefine",
  "biomes",
  "features",
  "placement"
]);
function resolveStageManifest(stageConfig) {
  const config = stageConfig || {};
  const stages = {};
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const stageName = STAGE_ORDER[i];
    stages[stageName] = {
      enabled: config[stageName] === true
    };
  }
  return {
    order: [...STAGE_ORDER],
    stages
  };
}
function validateOverrides(overrides, manifest) {
  if (!overrides || typeof overrides !== "object") {
    return;
  }
  for (const key of Object.keys(overrides)) {
    if (!STAGE_ORDER.includes(key)) {
      continue;
    }
    const stage = manifest.stages[key];
    if (!stage) {
      console.warn(`[StageManifest] Override targets unknown stage: "${key}"`);
    } else if (!stage.enabled) {
      console.warn(`[StageManifest] Override targets disabled stage: "${key}"`);
    }
  }
}
var _driftChecked = false;
function validateStageDrift(orchestratorStages) {
  if (_driftChecked) return;
  _driftChecked = true;
  const resolverSet = new Set(STAGE_ORDER);
  const orchestratorSet = new Set(orchestratorStages);
  for (const stage of orchestratorStages) {
    if (!resolverSet.has(stage)) {
      console.warn(
        `[StageManifest] Orchestrator has stage "${stage}" not in STAGE_ORDER. Add it to bootstrap/resolved.ts to enable configuration.`
      );
    }
  }
  for (const stage of STAGE_ORDER) {
    if (!orchestratorSet.has(stage)) {
      console.warn(
        `[StageManifest] STAGE_ORDER has stage "${stage}" not in orchestrator. It will never execute. Remove from bootstrap/resolved.ts or add to orchestrator.`
      );
    }
  }
}
function isObject(v) {
  return v != null && typeof v === "object" && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}
function clone(v) {
  if (Array.isArray(v)) return v.slice();
  if (isObject(v)) {
    const o = {};
    for (const k of Object.keys(v)) o[k] = v[k];
    return o;
  }
  return v;
}
function deepMerge2(base, src) {
  if (!src || !isObject(src)) return clone(base);
  if (!isObject(base)) return clone(src);
  const out = {};
  for (const k of Object.keys(base)) out[k] = clone(base[k]);
  for (const k of Object.keys(src)) {
    const b = out[k];
    const s = src[k];
    if (isObject(b) && isObject(s)) {
      out[k] = deepMerge2(b, s);
    } else {
      out[k] = clone(s);
    }
  }
  return out;
}
function bootstrap(options = {}) {
  const presets = Array.isArray(options.presets) && options.presets.length > 0 ? options.presets.filter((n) => typeof n === "string") : void 0;
  const overrides = options && typeof options === "object" && options.overrides ? clone(options.overrides) : void 0;
  const stageConfig = options && typeof options === "object" && options.stageConfig ? clone(options.stageConfig) : void 0;
  const rawConfig = {};
  if (presets) rawConfig.presets = presets;
  if (stageConfig) rawConfig.stageConfig = stageConfig;
  const manifest = resolveStageManifest(stageConfig);
  rawConfig.stageManifest = manifest;
  if (overrides) {
    validateOverrides(overrides, manifest);
  }
  if (overrides) {
    Object.assign(rawConfig, deepMerge2(rawConfig, overrides));
  }
  const validatedConfig = parseConfig(rawConfig);
  bindTunables(validatedConfig);
  return validatedConfig;
}

// ../../packages/mapgen-core/dist/chunk-SS2V5CK7.js
var BOUNDARY_TYPE = {
  none: 0,
  convergent: 1,
  divergent: 2,
  transform: 3
};
function assertValidDimensions(plateIds, width, height) {
  const expected = width * height;
  if (plateIds.length < expected) {
    throw new Error(
      `[plates/topology] plateIds length (${plateIds.length}) below expected size (${expected})`
    );
  }
}
function getHexNeighborIndices(x, y, width, height) {
  const isOddCol = (x & 1) === 1;
  const offsets = isOddCol ? [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, 1],
    [1, 1]
  ] : [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1]
  ];
  const indices = [];
  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    const wrappedX = (nx % width + width) % width;
    indices.push(ny * width + wrappedX);
  }
  return indices;
}
function buildPlateTopology(plateIds, width, height, plateCount) {
  assertValidDimensions(plateIds, width, height);
  const nodes = Array.from({ length: plateCount }, (_, id) => ({
    id,
    area: 0,
    centroid: { x: 0, y: 0 },
    neighbors: []
  }));
  const neighborSets = Array.from({ length: plateCount }, () => /* @__PURE__ */ new Set());
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const currentId = plateIds[i];
      if (typeof currentId !== "number" || !Number.isFinite(currentId)) continue;
      if (currentId < 0 || currentId >= plateCount) continue;
      const node = nodes[currentId];
      node.area++;
      node.centroid.x += x;
      node.centroid.y += y;
      const neighbors = getHexNeighborIndices(x, y, width, height);
      for (const ni of neighbors) {
        const neighborId = plateIds[ni];
        if (typeof neighborId !== "number" || !Number.isFinite(neighborId)) continue;
        if (neighborId === currentId) continue;
        if (neighborId < 0 || neighborId >= plateCount) continue;
        neighborSets[currentId].add(neighborId);
      }
    }
  }
  for (let id = 0; id < plateCount; id++) {
    const node = nodes[id];
    if (node.area > 0) {
      node.centroid.x /= node.area;
      node.centroid.y /= node.area;
    }
    node.neighbors = Array.from(neighborSets[id]).sort((a, b) => a - b);
  }
  return nodes;
}
var MIN_SEED_AREA = 20;
function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
function rollUnit(rng, label) {
  const scale = 1e6;
  const roll = rng(scale, label);
  return roll % scale / scale;
}
function pickRandom(items, rng, label) {
  if (!items.length) return null;
  const index = rng(items.length, label) % items.length;
  return items[index] ?? null;
}
function assignCrustTypes(graph, rng, config) {
  const plateCount = graph.length;
  const types = new Uint8Array(plateCount).fill(
    0
    /* OCEANIC */
  );
  if (plateCount === 0) return types;
  const continentalFraction = clamp01(config.continentalFraction);
  const clusteringBias = clamp01(config.clusteringBias);
  const microcontinentChance = clamp01(config.microcontinentChance);
  const targetContinental = Math.min(
    plateCount,
    Math.max(0, Math.round(plateCount * continentalFraction))
  );
  const seedCandidates = graph.filter((plate) => plate.area >= MIN_SEED_AREA).map((plate) => plate.id);
  const fallbackCandidates = seedCandidates.length ? seedCandidates : graph.map((plate) => plate.id);
  const frontier = /* @__PURE__ */ new Set();
  let assignedCount = 0;
  const addNeighborsToFrontier = (plateId) => {
    for (const neighborId of graph[plateId]?.neighbors ?? []) {
      if (types[neighborId] === 0) {
        frontier.add(neighborId);
      }
    }
  };
  if (targetContinental > 0 && fallbackCandidates.length) {
    const initialSeed = pickRandom(fallbackCandidates, rng, "crust-seed");
    if (initialSeed !== null) {
      types[initialSeed] = 1;
      assignedCount = 1;
      addNeighborsToFrontier(initialSeed);
    }
  }
  while (assignedCount < targetContinental) {
    const shouldCluster = frontier.size > 0 && rollUnit(rng, "crust-cluster") < clusteringBias;
    let nextId = null;
    if (shouldCluster) {
      const candidates = Array.from(frontier);
      nextId = pickRandom(candidates, rng, "crust-frontier");
      if (nextId !== null) {
        frontier.delete(nextId);
      }
    } else {
      const available = graph.filter((plate) => types[plate.id] === 0 && plate.area > 0).map((plate) => plate.id);
      nextId = pickRandom(available, rng, "crust-random");
    }
    if (nextId === null) break;
    types[nextId] = 1;
    assignedCount++;
    addNeighborsToFrontier(nextId);
  }
  if (microcontinentChance > 0) {
    for (const plate of graph) {
      if (types[plate.id] === 0) {
        const roll = rollUnit(rng, "crust-micro");
        if (roll < microcontinentChance) {
          types[plate.id] = 1;
        }
      }
    }
  }
  return types;
}
function clamp012(v, fallback) {
  if (!Number.isFinite(v)) return fallback;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
var HEX_OFFSETS_ODD = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, 1],
  [1, 1]
];
var HEX_OFFSETS_EVEN = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1]
];
var DEFAULT_CONTINENTAL_HEIGHT = 0.32;
var DEFAULT_OCEANIC_HEIGHT = -0.55;
var DEFAULT_EDGE_BLEND = 0.45;
var DEFAULT_NOISE_AMPLITUDE = 0.1;
function generateBaseHeightfield(plateIds, crustTypes, width, height, config = {}) {
  const size = width * height;
  const baseHeights = new Float32Array(size);
  const continentalHeight = Number.isFinite(config.continentalHeight) ? config.continentalHeight : DEFAULT_CONTINENTAL_HEIGHT;
  const oceanicHeight = Number.isFinite(config.oceanicHeight) ? config.oceanicHeight : DEFAULT_OCEANIC_HEIGHT;
  const edgeBlend = clamp012(config.edgeBlend ?? DEFAULT_EDGE_BLEND, DEFAULT_EDGE_BLEND);
  const noiseAmplitude = config.noiseAmplitude ?? DEFAULT_NOISE_AMPLITUDE;
  const noiseFn = config.noiseFn;
  const getNeighborIndices = (x, y) => {
    const offsets = (x & 1) === 1 ? HEX_OFFSETS_ODD : HEX_OFFSETS_EVEN;
    const indices = [];
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      const wrappedX = (nx % width + width) % width;
      indices.push(ny * width + wrappedX);
    }
    return indices;
  };
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const i = rowOffset + x;
      const plateId = plateIds[i];
      const crust = plateId >= 0 && plateId < crustTypes.length ? crustTypes[plateId] : 0;
      const base = crust === 1 ? continentalHeight : oceanicHeight;
      const neighbors = getNeighborIndices(x, y);
      let neighborSum = 0;
      let neighborCount = 0;
      for (const ni of neighbors) {
        const nPlate = plateIds[ni];
        if (nPlate < 0 || nPlate >= crustTypes.length) continue;
        neighborSum += crustTypes[nPlate] === 1 ? continentalHeight : oceanicHeight;
        neighborCount++;
      }
      const neighborAvg = neighborCount > 0 ? neighborSum / neighborCount : base;
      let heightVal = edgeBlend > 0 ? lerp(base, neighborAvg, edgeBlend) : base;
      if (noiseFn && noiseAmplitude !== 0) {
        const n = noiseFn(x, y);
        const centered = Number.isFinite(n) ? n - 0.5 : 0;
        heightVal += centered * 2 * noiseAmplitude;
      }
      baseHeights[i] = heightVal;
    }
  }
  return baseHeights;
}
function computeSeaLevel(heights, targetLandTiles) {
  const size = heights.length;
  if (size === 0) return 0;
  const clampedTarget = Math.max(0, Math.min(size, Math.floor(targetLandTiles)));
  if (clampedTarget === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (clampedTarget >= size) {
    return Number.NEGATIVE_INFINITY;
  }
  const sorted = Array.from(heights).sort((a, b) => a - b);
  const cutoffIndex = size - clampedTarget;
  const seaLevel = sorted[Math.max(0, Math.min(size - 1, cutoffIndex))];
  return Number.isFinite(seaLevel) ? seaLevel : 0;
}

// ../../packages/mapgen-core/dist/chunk-JOMRJ4XN.js
var EMPTY_FROZEN_OBJECT = Object.freeze({});
function createExtendedMapContext(dimensions, adapter, config) {
  const { width, height } = dimensions;
  const size = width * height;
  const heightfield = {
    elevation: new Int16Array(size),
    terrain: new Uint8Array(size),
    landMask: new Uint8Array(size)
  };
  const rainfall = new Uint8Array(size);
  const climate = {
    rainfall,
    humidity: new Uint8Array(size)
  };
  return {
    dimensions,
    fields: {
      rainfall,
      elevation: new Int16Array(size),
      temperature: new Uint8Array(size),
      biomeId: new Uint8Array(size),
      featureType: new Int16Array(size),
      terrainType: new Uint8Array(size)
    },
    worldModel: null,
    rng: {
      callCounts: /* @__PURE__ */ new Map(),
      seed: null
    },
    config,
    metrics: {
      timings: /* @__PURE__ */ new Map(),
      histograms: /* @__PURE__ */ new Map(),
      warnings: []
    },
    adapter,
    foundation: null,
    buffers: {
      heightfield,
      climate,
      scratchMasks: /* @__PURE__ */ new Map()
    },
    overlays: /* @__PURE__ */ new Map()
  };
}
function ctxRandom(ctx, label, max) {
  const count = ctx.rng.callCounts.get(label) || 0;
  ctx.rng.callCounts.set(label, count + 1);
  return ctx.adapter.getRandomNumber(max, `${label}_${count}`);
}
function writeHeightfield(ctx, x, y, options) {
  if (!ctx || !options) return;
  const { width } = ctx.dimensions;
  const idxValue = y * width + x;
  const hf = ctx.buffers?.heightfield;
  if (hf) {
    if (typeof options.terrain === "number") {
      hf.terrain[idxValue] = options.terrain & 255;
    }
    if (typeof options.elevation === "number") {
      hf.elevation[idxValue] = options.elevation | 0;
    }
    if (typeof options.isLand === "boolean") {
      hf.landMask[idxValue] = options.isLand ? 1 : 0;
    }
  }
  if (typeof options.terrain === "number") {
    ctx.adapter.setTerrainType(x, y, options.terrain);
  }
}
function writeClimateField(ctx, x, y, options) {
  if (!ctx || !options) return;
  const { width } = ctx.dimensions;
  const idxValue = y * width + x;
  const climate = ctx.buffers?.climate;
  if (climate) {
    if (typeof options.rainfall === "number") {
      const rf = Math.max(0, Math.min(200, options.rainfall)) | 0;
      climate.rainfall[idxValue] = rf & 255;
      if (ctx.fields?.rainfall) {
        ctx.fields.rainfall[idxValue] = rf & 255;
      }
    }
    if (typeof options.humidity === "number") {
      const hum = Math.max(0, Math.min(255, options.humidity)) | 0;
      climate.humidity[idxValue] = hum & 255;
    }
  }
  if (typeof options.rainfall === "number") {
    ctx.adapter.setRainfall(
      x,
      y,
      Math.max(0, Math.min(200, options.rainfall)) | 0
    );
  }
}
function freezeConfigSnapshot(value) {
  if (!value || typeof value !== "object") return EMPTY_FROZEN_OBJECT;
  try {
    return Object.freeze(value);
  } catch {
    return value;
  }
}
function ensureTensor(name, tensor, size) {
  if (!tensor || typeof tensor.length !== "number") {
    throw new Error(`[FoundationContext] Missing ${name} tensor.`);
  }
  if (tensor.length !== size) {
    throw new Error(
      `[FoundationContext] ${name} tensor length mismatch (expected ${size}, received ${tensor.length}).`
    );
  }
  return tensor;
}
function createFoundationContext(worldModel, options) {
  if (!worldModel?.initialized) {
    throw new Error(
      "[FoundationContext] WorldModel is not initialized or disabled."
    );
  }
  if (!options?.dimensions) {
    throw new Error(
      "[FoundationContext] Map dimensions are required to build the context."
    );
  }
  const width = options.dimensions.width | 0;
  const height = options.dimensions.height | 0;
  const size = Math.max(0, width * height) | 0;
  if (size <= 0) {
    throw new Error("[FoundationContext] Invalid map dimensions.");
  }
  const plateId = ensureTensor("plateId", worldModel.plateId, size);
  const boundaryCloseness = ensureTensor(
    "boundaryCloseness",
    worldModel.boundaryCloseness,
    size
  );
  const boundaryType = ensureTensor(
    "boundaryType",
    worldModel.boundaryType,
    size
  );
  const tectonicStress = ensureTensor(
    "tectonicStress",
    worldModel.tectonicStress,
    size
  );
  const upliftPotential = ensureTensor(
    "upliftPotential",
    worldModel.upliftPotential,
    size
  );
  const riftPotential = ensureTensor(
    "riftPotential",
    worldModel.riftPotential,
    size
  );
  const shieldStability = ensureTensor(
    "shieldStability",
    worldModel.shieldStability,
    size
  );
  const plateMovementU = ensureTensor(
    "plateMovementU",
    worldModel.plateMovementU,
    size
  );
  const plateMovementV = ensureTensor(
    "plateMovementV",
    worldModel.plateMovementV,
    size
  );
  const plateRotation = ensureTensor(
    "plateRotation",
    worldModel.plateRotation,
    size
  );
  const windU = ensureTensor("windU", worldModel.windU, size);
  const windV = ensureTensor("windV", worldModel.windV, size);
  const currentU = ensureTensor("currentU", worldModel.currentU, size);
  const currentV = ensureTensor("currentV", worldModel.currentV, size);
  const pressure = ensureTensor("pressure", worldModel.pressure, size);
  const configInput = options.config || {};
  const configSnapshot = {
    seed: freezeConfigSnapshot(configInput.seed),
    plates: freezeConfigSnapshot(configInput.plates),
    dynamics: freezeConfigSnapshot(configInput.dynamics),
    surface: freezeConfigSnapshot(configInput.surface),
    policy: freezeConfigSnapshot(configInput.policy),
    diagnostics: freezeConfigSnapshot(configInput.diagnostics)
  };
  return Object.freeze({
    dimensions: Object.freeze({ width, height, size }),
    plateSeed: worldModel.plateSeed || null,
    plates: Object.freeze({
      id: plateId,
      boundaryCloseness,
      boundaryType,
      tectonicStress,
      upliftPotential,
      riftPotential,
      shieldStability,
      movementU: plateMovementU,
      movementV: plateMovementV,
      rotation: plateRotation
    }),
    dynamics: Object.freeze({ windU, windV, currentU, currentV, pressure }),
    diagnostics: Object.freeze({
      boundaryTree: worldModel.boundaryTree || null
    }),
    config: Object.freeze(configSnapshot)
  });
}
function syncHeightfield(ctx) {
  if (!ctx?.adapter) return;
  const hf = ctx.buffers?.heightfield;
  if (!hf) return;
  const { width, height } = ctx.dimensions;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxValue = y * width + x;
      const terrain = ctx.adapter.getTerrainType(x, y);
      if (terrain != null) {
        hf.terrain[idxValue] = terrain & 255;
      }
      const elevation = ctx.adapter.getElevation(x, y);
      if (Number.isFinite(elevation)) {
        hf.elevation[idxValue] = elevation | 0;
      }
      hf.landMask[idxValue] = ctx.adapter.isWater(x, y) ? 0 : 1;
    }
  }
}
function syncClimateField(ctx) {
  if (!ctx?.adapter) return;
  const climate = ctx.buffers?.climate;
  if (!climate) return;
  const { width, height } = ctx.dimensions;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxValue = y * width + x;
      const rf = ctx.adapter.getRainfall(x, y);
      if (Number.isFinite(rf)) {
        const rfClamped = Math.max(0, Math.min(200, rf)) | 0;
        climate.rainfall[idxValue] = rfClamped & 255;
        if (ctx.fields?.rainfall) {
          ctx.fields.rainfall[idxValue] = rfClamped & 255;
        }
      }
    }
  }
}
function lookupTerrain(terrainType) {
  try {
    const entry = GameInfo.Terrains.find((t) => t.TerrainType === terrainType);
    return entry?.$index;
  } catch {
    return void 0;
  }
}
var MOUNTAIN_TERRAIN = lookupTerrain("TERRAIN_MOUNTAIN") ?? 0;
var HILL_TERRAIN = lookupTerrain("TERRAIN_HILL") ?? 1;
var FLAT_TERRAIN = lookupTerrain("TERRAIN_FLAT") ?? 2;
var COAST_TERRAIN = lookupTerrain("TERRAIN_COAST") ?? 3;
var OCEAN_TERRAIN = lookupTerrain("TERRAIN_OCEAN") ?? 4;
var NAVIGABLE_RIVER_TERRAIN = lookupTerrain("TERRAIN_NAVIGABLE_RIVER") ?? 5;
function lookupBiome(biomeType) {
  try {
    const entry = GameInfo.Biomes.find((t) => t.BiomeType === biomeType);
    return entry?.$index;
  } catch {
    return void 0;
  }
}
var TUNDRA_BIOME = lookupBiome("BIOME_TUNDRA") ?? 0;
var GRASSLAND_BIOME = lookupBiome("BIOME_GRASSLAND") ?? 1;
var PLAINS_BIOME = lookupBiome("BIOME_PLAINS") ?? 2;
var TROPICAL_BIOME = lookupBiome("BIOME_TROPICAL") ?? 3;
var DESERT_BIOME = lookupBiome("BIOME_DESERT") ?? 4;
var MARINE_BIOME = lookupBiome("BIOME_MARINE") ?? 5;
function lookupFeature(featureType) {
  try {
    const entry = GameInfo.Features.find((t) => t.FeatureType === featureType);
    return entry?.$index;
  } catch {
    return void 0;
  }
}
var VOLCANO_FEATURE = lookupFeature("FEATURE_VOLCANO") ?? -1;
function getTerrainSymbol(terrain) {
  switch (terrain) {
    case MOUNTAIN_TERRAIN:
      return "M";
    case HILL_TERRAIN:
      return "^";
    case FLAT_TERRAIN:
      return ".";
    case COAST_TERRAIN:
      return "~";
    case OCEAN_TERRAIN:
      return "O";
    case NAVIGABLE_RIVER_TERRAIN:
      return "R";
    default:
      return "?";
  }
}
var DEFAULT_OCEAN_SEPARATION = {
  enabled: true,
  bandPairs: [
    [0, 1],
    [1, 2]
  ],
  baseSeparationTiles: 0,
  boundaryClosenessMultiplier: 1,
  maxPerRowDelta: 3
};
function clampInt(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
function normalizeCrustMode(mode) {
  return mode === "area" ? "area" : "legacy";
}
function normalizeWindow(win, index, width, height) {
  if (!win) {
    return {
      west: 0,
      east: Math.max(0, width - 1),
      south: 0,
      north: Math.max(0, height - 1),
      continent: index
    };
  }
  const west = clampInt(win.west ?? 0, 0, width - 1);
  const east = clampInt(win.east ?? width - 1, 0, width - 1);
  const south = clampInt(win.south ?? 0, 0, height - 1);
  const north = clampInt(win.north ?? height - 1, 0, height - 1);
  return {
    west: Math.min(west, east),
    east: Math.max(west, east),
    south: Math.min(south, north),
    north: Math.max(south, north),
    continent: win.continent ?? index
  };
}
function createRowState(win, index, width, height) {
  const normalized = normalizeWindow(win, index, width, height);
  const west = new Int16Array(height);
  const east = new Int16Array(height);
  for (let y = 0; y < height; y++) {
    west[y] = normalized.west;
    east[y] = normalized.east;
  }
  return {
    index,
    west,
    east,
    south: normalized.south,
    north: normalized.north,
    continent: normalized.continent
  };
}
function aggregateRowState(state2, width, height) {
  let minWest = width - 1;
  let maxEast = 0;
  const south = clampInt(state2.south, 0, height - 1);
  const north = clampInt(state2.north, 0, height - 1);
  for (let y = south; y <= north; y++) {
    if (state2.west[y] > state2.east[y]) continue;
    if (state2.west[y] < minWest) minWest = state2.west[y];
    if (state2.east[y] > maxEast) maxEast = state2.east[y];
  }
  if (maxEast < minWest) {
    return {
      west: 0,
      east: 0,
      south,
      north,
      continent: state2.continent
    };
  }
  return {
    west: clampInt(minWest, 0, width - 1),
    east: clampInt(maxEast, 0, width - 1),
    south,
    north,
    continent: state2.continent
  };
}
function applyLandmassPostAdjustments(windows, geometry, width, height) {
  if (!Array.isArray(windows) || windows.length === 0) return windows;
  const post = geometry?.post;
  if (!post || typeof post !== "object") return windows;
  const expandAll = Number.isFinite(post.expandTiles) ? Math.trunc(post.expandTiles) : 0;
  const expandWest = Number.isFinite(post.expandWestTiles) ? Math.trunc(post.expandWestTiles) : 0;
  const expandEast = Number.isFinite(post.expandEastTiles) ? Math.trunc(post.expandEastTiles) : 0;
  const clampWest = Number.isFinite(post.clampWestMin) ? Math.max(0, Math.trunc(post.clampWestMin)) : null;
  const clampEast = Number.isFinite(post.clampEastMax) ? Math.min(width - 1, Math.trunc(post.clampEastMax)) : null;
  const overrideSouth = Number.isFinite(post.overrideSouth) ? clampInt(Math.trunc(post.overrideSouth), 0, height - 1) : null;
  const overrideNorth = Number.isFinite(post.overrideNorth) ? clampInt(Math.trunc(post.overrideNorth), 0, height - 1) : null;
  const minWidth = Number.isFinite(post.minWidthTiles) ? Math.max(0, Math.trunc(post.minWidthTiles)) : null;
  let changed = false;
  const adjusted = windows.map((win) => {
    if (!win) return win;
    let west = clampInt(win.west | 0, 0, width - 1);
    let east = clampInt(win.east | 0, 0, width - 1);
    let south = clampInt(win.south | 0, 0, height - 1);
    let north = clampInt(win.north | 0, 0, height - 1);
    const expansionWest = expandAll + expandWest;
    const expansionEast = expandAll + expandEast;
    if (expansionWest > 0) west = clampInt(west - expansionWest, 0, width - 1);
    if (expansionEast > 0) east = clampInt(east + expansionEast, 0, width - 1);
    if (clampWest != null) west = Math.max(west, clampWest);
    if (clampEast != null) east = Math.min(east, clampEast);
    if (minWidth != null && minWidth > 0) {
      const span = east - west + 1;
      if (span < minWidth) {
        const deficit = minWidth - span;
        const extraWest = Math.floor(deficit / 2);
        const extraEast = deficit - extraWest;
        west = clampInt(west - extraWest, 0, width - 1);
        east = clampInt(east + extraEast, 0, width - 1);
      }
    }
    if (overrideSouth != null) south = overrideSouth;
    if (overrideNorth != null) north = overrideNorth;
    const mutated = west !== win.west || east !== win.east || south !== win.south || north !== win.north;
    if (mutated) changed = true;
    if (!mutated) return win;
    return {
      west,
      east,
      south,
      north,
      continent: win.continent
    };
  });
  return changed ? adjusted : windows;
}
function applyPlateAwareOceanSeparation(params) {
  const width = params?.width | 0;
  const height = params?.height | 0;
  const windows = Array.isArray(params?.windows) ? params.windows : [];
  if (!width || !height || windows.length === 0) {
    return {
      windows: windows.map((win, idx4) => normalizeWindow(win, idx4, width, height))
    };
  }
  const ctx = params?.context ?? null;
  const adapter = params?.adapter && typeof params.adapter.setTerrainType === "function" ? params.adapter : null;
  const tunables = getTunables();
  const foundationCfg = tunables.FOUNDATION_CFG;
  const foundationPolicy = foundationCfg?.oceanSeparation ?? foundationCfg?.policy?.oceanSeparation;
  const policy = params?.policy || foundationPolicy || DEFAULT_OCEAN_SEPARATION;
  const normalizedWindows = windows.map((win, idx4) => normalizeWindow(win, idx4, width, height));
  const foundation = ctx?.foundation;
  if (!policy || !policy.enabled || !foundation) {
    return {
      windows: normalizedWindows,
      landMask: params?.landMask ?? void 0
    };
  }
  const landMask = params?.landMask instanceof Uint8Array && params.landMask.length === width * height ? params.landMask : null;
  const heightfield = ctx?.buffers?.heightfield;
  const setTerrain = (x, y, terrain, isLand) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx4 = y * width + x;
    if (landMask) {
      landMask[idx4] = isLand ? 1 : 0;
    }
    if (ctx) {
      writeHeightfield(ctx, x, y, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }
    if (heightfield && !landMask) {
      heightfield.landMask[idx4] = isLand ? 1 : 0;
    }
  };
  const crustMode = normalizeCrustMode(
    params?.crustMode ?? foundationCfg?.crustMode ?? foundationCfg?.policy?.crustMode ?? foundationCfg?.surface?.crustMode ?? foundationCfg?.surface?.landmass?.crustMode
  );
  if (crustMode === "area") {
    const minChannelWidth = Math.max(1, (policy.minChannelWidth ?? 3) | 0);
    const channelJitter = Math.max(0, (policy.channelJitter ?? 0) | 0);
    const rowStates2 = normalizedWindows.map((win, idx4) => createRowState(win, idx4, width, height));
    for (let i = 0; i < rowStates2.length - 1; i++) {
      const left = rowStates2[i];
      const right = rowStates2[i + 1];
      if (!left || !right) continue;
      const rowStart = Math.max(0, Math.max(left.south, right.south));
      const rowEnd = Math.min(height - 1, Math.min(left.north, right.north));
      if (rowStart > rowEnd) continue;
      for (let y = rowStart; y <= rowEnd; y++) {
        const baseCenter = clampInt(Math.floor((left.east[y] + right.west[y]) / 2), 0, width - 1);
        const span = channelJitter * 2 + 1;
        const jitter = channelJitter > 0 ? (y + i) % span - channelJitter : 0;
        const center = clampInt(baseCenter + jitter, 0, width - 1);
        const halfWidth = Math.max(0, Math.floor((minChannelWidth - 1) / 2));
        let start = clampInt(center - halfWidth, 0, width - 1);
        let end = clampInt(start + minChannelWidth - 1, 0, width - 1);
        if (end >= width) {
          end = width - 1;
          start = Math.max(0, end - minChannelWidth + 1);
        }
        for (let x = start; x <= end; x++) {
          setTerrain(x, y, OCEAN_TERRAIN, false);
        }
        if (start <= left.west[y]) {
          left.east[y] = left.west[y] - 1;
        } else {
          left.east[y] = clampInt(Math.min(left.east[y], start - 1), 0, width - 1);
        }
        if (end >= right.east[y]) {
          right.west[y] = right.east[y] + 1;
        } else {
          right.west[y] = clampInt(Math.max(right.west[y], end + 1), 0, width - 1);
        }
      }
    }
    const normalized2 = rowStates2.map((state2) => aggregateRowState(state2, width, height));
    if (ctx && landMask && heightfield?.landMask) {
      heightfield.landMask.set(landMask);
    }
    return {
      windows: normalized2,
      landMask: landMask ?? void 0
    };
  }
  const closeness = foundation.plates.boundaryCloseness;
  if (!closeness || closeness.length !== width * height) {
    return {
      windows: normalizedWindows,
      landMask: landMask ?? void 0
    };
  }
  const bandPairs = Array.isArray(policy.bandPairs) && policy.bandPairs.length ? policy.bandPairs : [
    [0, 1],
    [1, 2]
  ];
  const baseSeparation = Math.max(0, (policy.baseSeparationTiles ?? 0) | 0);
  const closenessMultiplier = Number.isFinite(policy.boundaryClosenessMultiplier) ? policy.boundaryClosenessMultiplier : 1;
  const maxPerRow = Math.max(0, (policy.maxPerRowDelta ?? 3) | 0);
  const rowStates = normalizedWindows.map((win, idx4) => createRowState(win, idx4, width, height));
  const carveOceanFromEast = (state2, y, tiles) => {
    if (!tiles) return 0;
    let removed = 0;
    let x = state2.east[y];
    const limit = state2.west[y];
    const rowOffset = y * width;
    while (removed < tiles && x >= limit) {
      const idx4 = rowOffset + x;
      if (!landMask || landMask[idx4]) {
        setTerrain(x, y, OCEAN_TERRAIN, false);
        removed++;
      }
      x--;
    }
    state2.east[y] = clampInt(state2.east[y] - removed, limit, width - 1);
    return removed;
  };
  const carveOceanFromWest = (state2, y, tiles) => {
    if (!tiles) return 0;
    let removed = 0;
    let x = state2.west[y];
    const limit = state2.east[y];
    const rowOffset = y * width;
    while (removed < tiles && x <= limit) {
      const idx4 = rowOffset + x;
      if (!landMask || landMask[idx4]) {
        setTerrain(x, y, OCEAN_TERRAIN, false);
        removed++;
      }
      x++;
    }
    state2.west[y] = clampInt(state2.west[y] + removed, 0, limit);
    return removed;
  };
  const fillLandFromWest = (state2, y, tiles) => {
    if (!tiles) return 0;
    let added = 0;
    let x = state2.west[y] - 1;
    while (added < tiles && x >= 0) {
      setTerrain(x, y, FLAT_TERRAIN, true);
      added++;
      x--;
    }
    state2.west[y] = clampInt(state2.west[y] - added, 0, width - 1);
    return added;
  };
  const fillLandFromEast = (state2, y, tiles) => {
    if (!tiles) return 0;
    let added = 0;
    let x = state2.east[y] + 1;
    while (added < tiles && x < width) {
      setTerrain(x, y, FLAT_TERRAIN, true);
      added++;
      x++;
    }
    state2.east[y] = clampInt(state2.east[y] + added, 0, width - 1);
    return added;
  };
  for (const pair of bandPairs) {
    const li = Array.isArray(pair) ? pair[0] | 0 : -1;
    const ri = Array.isArray(pair) ? pair[1] | 0 : -1;
    const left = rowStates[li];
    const right = rowStates[ri];
    if (!left || !right) continue;
    const rowStart = Math.max(0, Math.max(left.south, right.south));
    const rowEnd = Math.min(height - 1, Math.min(left.north, right.north));
    for (let y = rowStart; y <= rowEnd; y++) {
      const mid = clampInt(Math.floor((left.east[y] + right.west[y]) / 2), 0, width - 1);
      const clos = closeness[y * width + mid] | 0;
      let sep = baseSeparation;
      if (sep > 0) {
        const weight = clos / 255;
        sep += Math.round(weight * closenessMultiplier * baseSeparation);
      }
      if (sep > maxPerRow) sep = maxPerRow;
      if (sep <= 0) continue;
      carveOceanFromEast(left, y, sep);
      carveOceanFromWest(right, y, sep);
    }
  }
  const edgeWest = policy.edgeWest || {};
  if (rowStates.length && edgeWest.enabled) {
    const state2 = rowStates[0];
    const base = (edgeWest.baseTiles ?? 0) | 0;
    const mult = Number.isFinite(edgeWest.boundaryClosenessMultiplier) ? edgeWest.boundaryClosenessMultiplier : 1;
    const cap = Math.max(0, (edgeWest.maxPerRowDelta ?? 2) | 0);
    for (let y = state2.south; y <= state2.north; y++) {
      const clos = closeness[y * width + 0] | 0;
      let mag = Math.abs(base) + Math.round(clos / 255 * Math.abs(base) * mult);
      if (mag > cap) mag = cap;
      if (mag <= 0) continue;
      if (base >= 0) {
        carveOceanFromWest(state2, y, mag);
      } else {
        fillLandFromWest(state2, y, mag);
      }
    }
  }
  const edgeEast = policy.edgeEast || {};
  if (rowStates.length && edgeEast.enabled) {
    const state2 = rowStates[rowStates.length - 1];
    const base = (edgeEast.baseTiles ?? 0) | 0;
    const mult = Number.isFinite(edgeEast.boundaryClosenessMultiplier) ? edgeEast.boundaryClosenessMultiplier : 1;
    const cap = Math.max(0, (edgeEast.maxPerRowDelta ?? 2) | 0);
    for (let y = state2.south; y <= state2.north; y++) {
      const clos = closeness[y * width + (width - 1)] | 0;
      let mag = Math.abs(base) + Math.round(clos / 255 * Math.abs(base) * mult);
      if (mag > cap) mag = cap;
      if (mag <= 0) continue;
      if (base >= 0) {
        carveOceanFromEast(state2, y, mag);
      } else {
        fillLandFromEast(state2, y, mag);
      }
    }
  }
  const normalized = rowStates.map((state2) => aggregateRowState(state2, width, height));
  if (ctx && landMask && ctx.buffers?.heightfield?.landMask) {
    ctx.buffers.heightfield.landMask.set(landMask);
  }
  return {
    windows: normalized,
    landMask: landMask ?? void 0
  };
}
var DEFAULT_CLOSENESS_LIMIT = 255;
var CLOSENESS_STEP_PER_TILE = 8;
var MIN_CLOSENESS_LIMIT = 150;
var MAX_CLOSENESS_LIMIT = 255;
function normalizeCrustMode2(mode) {
  return mode === "area" ? "area" : "legacy";
}
function clampInt2(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
function clampPct(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}
function clamp013(value, fallback = 0) {
  if (value === void 0 || !Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
function computeClosenessLimit(postCfg) {
  const expand = postCfg?.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
  const limit = DEFAULT_CLOSENESS_LIMIT + expand * CLOSENESS_STEP_PER_TILE;
  return clampInt2(limit, MIN_CLOSENESS_LIMIT, MAX_CLOSENESS_LIMIT);
}
function summarizeCrustTypes(crustTypes, graph) {
  const continentalPlateIds = [];
  const oceanicPlateIds = [];
  let continentalArea = 0;
  let oceanicArea = 0;
  for (const plate of graph) {
    const type = crustTypes[plate.id] === 1 ? 1 : 0;
    if (type === 1) {
      continentalPlateIds.push(plate.id);
      continentalArea += plate.area;
    } else {
      oceanicPlateIds.push(plate.id);
      oceanicArea += plate.area;
    }
  }
  return {
    continentalPlateIds,
    oceanicPlateIds,
    continentalArea,
    oceanicArea
  };
}
function assignCrustTypesByArea(graph, targetLandTiles) {
  const types = new Uint8Array(graph.length).fill(
    0
    /* OCEANIC */
  );
  const sorted = graph.filter((plate) => plate.area > 0).slice().sort((a, b) => b.area - a.area);
  let assignedArea = 0;
  const continentalPlateIds = [];
  const desiredContinents = Math.min(sorted.length, Math.max(2, Math.min(5, sorted.length)));
  for (const plate of sorted) {
    const needMoreLand = assignedArea < targetLandTiles;
    const needMoreContinents = continentalPlateIds.length < desiredContinents;
    if (!needMoreLand && !needMoreContinents && continentalPlateIds.length > 0) break;
    types[plate.id] = 1;
    assignedArea += plate.area;
    continentalPlateIds.push(plate.id);
  }
  const summary = summarizeCrustTypes(types, graph);
  return {
    crustTypes: types,
    ...summary
  };
}
function tryCrustFirstLandmask(width, height, plateIds, closeness, closenessLimit, targetLandTiles, landmassCfg, crustMode, ctx) {
  const size = width * height;
  if (plateIds.length !== size) return null;
  if (closeness && closeness.length !== size) return null;
  let maxPlateId = -1;
  for (let i = 0; i < size; i++) {
    const id = plateIds[i];
    if (id > maxPlateId) maxPlateId = id;
  }
  const plateCount = maxPlateId + 1;
  if (plateCount <= 0) return null;
  const continentalFraction = clamp013(
    landmassCfg.continentalFraction ?? landmassCfg.crustContinentalFraction ?? targetLandTiles / size,
    targetLandTiles / size
  );
  const clusteringBias = clamp013(landmassCfg.crustClusteringBias ?? 0.7, 0.7);
  const microcontinentChance = clamp013(landmassCfg.microcontinentChance ?? 0.04, 0.04);
  const edgeBlend = clamp013(landmassCfg.crustEdgeBlend ?? 0.45, 0.45);
  const noiseAmplitude = clamp013(landmassCfg.crustNoiseAmplitude ?? 0.08, 0.08);
  const continentalHeight = Number.isFinite(landmassCfg.continentalHeight) ? landmassCfg.continentalHeight : 0.32;
  const oceanicHeight = Number.isFinite(landmassCfg.oceanicHeight) ? landmassCfg.oceanicHeight : -0.55;
  const mode = normalizeCrustMode2(crustMode);
  const graph = buildPlateTopology(plateIds, width, height, plateCount);
  const areaResult = mode === "area" ? assignCrustTypesByArea(graph, targetLandTiles) : null;
  const crustTypes = areaResult?.crustTypes || assignCrustTypes(
    graph,
    ctx ? () => ctxRandom(ctx, "CrustType", 1e6) / 1e6 : Math.random,
    {
      continentalFraction,
      microcontinentChance,
      clusteringBias
    }
  );
  const noiseFn = noiseAmplitude === 0 ? void 0 : (x, y) => ctx ? ctxRandom(ctx, "CrustNoise", 1e6) / 1e6 : Math.random();
  const baseHeight = generateBaseHeightfield(plateIds, crustTypes, width, height, {
    continentalHeight,
    oceanicHeight,
    edgeBlend,
    noiseAmplitude,
    noiseFn
  });
  const seaLevel = mode === "area" ? 0 : computeSeaLevel(baseHeight, targetLandTiles);
  const landMask = new Uint8Array(size);
  let landTiles = 0;
  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < size; i++) {
    const h = baseHeight[i];
    if (h < minHeight) minHeight = h;
    if (h > maxHeight) maxHeight = h;
    const passesCloseness = !closeness || closeness[i] <= closenessLimit;
    const isLand = passesCloseness && h > seaLevel;
    if (isLand) {
      landMask[i] = 1;
      landTiles++;
    }
  }
  const summary = areaResult || summarizeCrustTypes(crustTypes, graph);
  const continentalPlates = summary.continentalPlateIds.length;
  const appliedContinentalFraction = mode === "area" ? summary.continentalArea / Math.max(1, summary.continentalArea + summary.oceanicArea) : continentalFraction;
  return {
    mode,
    landMask,
    landTiles,
    seaLevel,
    plateCount,
    continentalPlates,
    continentalPlateIds: summary.continentalPlateIds,
    oceanicPlateIds: summary.oceanicPlateIds,
    continentalArea: summary.continentalArea,
    oceanicArea: summary.oceanicArea,
    targetLandTiles,
    baseHeightRange: { min: minHeight, max: maxHeight },
    crustConfigApplied: {
      mode,
      continentalFraction: appliedContinentalFraction,
      clusteringBias: mode === "area" ? 0 : clusteringBias,
      microcontinentChance: mode === "area" ? 0 : microcontinentChance,
      edgeBlend,
      noiseAmplitude,
      continentalHeight,
      oceanicHeight
    }
  };
}
function createPlateDrivenLandmasses(width, height, ctx, options = {}) {
  const foundation = ctx?.foundation;
  if (!foundation) {
    return null;
  }
  const { plates } = foundation;
  const closeness = plates.boundaryCloseness || null;
  const plateIds = plates.id;
  if (!plateIds) {
    return null;
  }
  const size = width * height;
  if (plateIds.length !== size) {
    return null;
  }
  if (closeness && closeness.length !== size) {
    return null;
  }
  const tunables = getTunables();
  const landmassCfg = options.landmassCfg || tunables.LANDMASS_CFG || {};
  const geomCfg = options.geometry || {};
  const postCfg = geomCfg.post || {};
  const baseWaterPct = clampPct(landmassCfg.baseWaterPercent ?? 64, 0, 100, 64);
  const waterScalar = clampPct(
    Number.isFinite(landmassCfg.waterScalar) ? landmassCfg.waterScalar * 100 : 100,
    25,
    175,
    100
  ) / 100;
  const waterPct = clampPct(baseWaterPct * waterScalar, 0, 100, baseWaterPct);
  const totalTiles = size || 1;
  const targetLandTiles = Math.max(
    1,
    Math.min(totalTiles - 1, Math.round(totalTiles * (1 - waterPct / 100)))
  );
  const foundationCfg = tunables.FOUNDATION_CFG;
  const crustMode = normalizeCrustMode2(
    landmassCfg.crustMode ?? foundationCfg?.crustMode ?? foundationCfg?.surface?.crustMode ?? foundationCfg?.surface?.landmass?.crustMode
  );
  const closenessLimit = computeClosenessLimit(postCfg);
  const adapter = ctx?.adapter;
  const logPrefix = "[landmass-plate]";
  const crustResult = tryCrustFirstLandmask(
    width,
    height,
    plateIds,
    closeness,
    closenessLimit,
    targetLandTiles,
    landmassCfg,
    crustMode,
    ctx
  );
  if (!crustResult) {
    console.log(`${logPrefix} ERROR: Crust-first landmask generation failed (invalid plate data).`);
    return null;
  }
  const landMask = crustResult.landMask;
  const finalLandTiles = crustResult.landTiles;
  const seaLevel = crustResult.seaLevel;
  const crustPlateCount = crustResult.plateCount;
  const crustContinentalPlates = crustResult.continentalPlates;
  const crustContinentalPlateIds = crustResult.continentalPlateIds;
  const crustOceanicPlateIds = crustResult.oceanicPlateIds;
  const crustContinentalArea = crustResult.continentalArea;
  const crustOceanicArea = crustResult.oceanicArea;
  const crustModeApplied = crustResult.mode;
  const crustConfigApplied = crustResult.crustConfigApplied;
  const baseHeightRange = crustResult.baseHeightRange;
  const setTerrain = (x, y, terrain, isLand) => {
    if (ctx) {
      writeHeightfield(ctx, x, y, {
        terrain,
        elevation: isLand ? 10 : -1,
        isLand
      });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }
  };
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx4 = rowOffset + x;
      const isLand = landMask[idx4] === 1;
      setTerrain(x, y, isLand ? FLAT_TERRAIN : OCEAN_TERRAIN, isLand);
    }
  }
  const plateStats = /* @__PURE__ */ new Map();
  for (let idx4 = 0; idx4 < size; idx4++) {
    if (!landMask[idx4]) continue;
    const plateId = plateIds[idx4];
    if (plateId == null || plateId < 0) continue;
    const y = Math.floor(idx4 / width);
    const x = idx4 - y * width;
    let stat = plateStats.get(plateId);
    if (!stat) {
      stat = {
        plateId,
        count: 0,
        minX: width,
        maxX: -1,
        minY: height,
        maxY: -1
      };
      plateStats.set(plateId, stat);
    }
    stat.count++;
    if (x < stat.minX) stat.minX = x;
    if (x > stat.maxX) stat.maxX = x;
    if (y < stat.minY) stat.minY = y;
    if (y > stat.maxY) stat.maxY = y;
  }
  const minWidth = postCfg.minWidthTiles ? Math.max(1, Math.trunc(postCfg.minWidthTiles)) : 0;
  const polarRows = 0;
  const windows = Array.from(plateStats.values()).filter((s) => s.count > 0 && s.maxX >= s.minX && s.maxY >= s.minY).map((s) => {
    const expand = postCfg.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
    const expandWest = postCfg.expandWestTiles ? Math.trunc(postCfg.expandWestTiles) : 0;
    const expandEast = postCfg.expandEastTiles ? Math.trunc(postCfg.expandEastTiles) : 0;
    let west = Math.max(0, s.minX - Math.max(0, expand + expandWest));
    let east = Math.min(width - 1, s.maxX + Math.max(0, expand + expandEast));
    if (minWidth > 0) {
      const span = east - west + 1;
      if (span < minWidth) {
        const deficit = minWidth - span;
        const extraWest = Math.floor(deficit / 2);
        const extraEast = deficit - extraWest;
        west = Math.max(0, west - extraWest);
        east = Math.min(width - 1, east + extraEast);
      }
    }
    if (postCfg.clampWestMin != null) {
      west = Math.max(west, Math.max(0, Math.trunc(postCfg.clampWestMin)));
    }
    if (postCfg.clampEastMax != null) {
      east = Math.min(east, Math.min(width - 1, Math.trunc(postCfg.clampEastMax)));
    }
    const verticalPad = Math.max(0, expand);
    const baseSouth = Math.max(polarRows, s.minY - verticalPad);
    const baseNorth = Math.min(height - polarRows, s.maxY + verticalPad);
    const south = postCfg.overrideSouth != null ? clampInt2(Math.trunc(postCfg.overrideSouth), 0, height - 1) : clampInt2(baseSouth, 0, height - 1);
    const north = postCfg.overrideNorth != null ? clampInt2(Math.trunc(postCfg.overrideNorth), 0, height - 1) : clampInt2(baseNorth, 0, height - 1);
    return {
      plateId: s.plateId,
      west,
      east,
      south,
      north,
      centerX: (west + east) * 0.5,
      count: s.count,
      continent: 0
      // Will be assigned below
    };
  }).sort((a, b) => a.centerX - b.centerX);
  const windowsOut = windows.map((win, index) => ({
    west: win.west,
    east: win.east,
    south: win.south,
    north: win.north,
    continent: index
  }));
  const applied = crustConfigApplied;
  console.log(
    `${logPrefix} Crust mode=${crustModeApplied} seaLevel=${seaLevel != null && Number.isFinite(seaLevel) ? seaLevel.toFixed(3) : "n/a"}, landTiles=${finalLandTiles}/${size} (${(finalLandTiles / size * 100).toFixed(1)}%), targetLandTiles=${targetLandTiles}, continentalArea=${crustContinentalArea}, oceanicArea=${crustOceanicArea}, waterPct=${waterPct.toFixed(1)}%`
  );
  console.log(
    `${logPrefix} Crust config: plates=${crustContinentalPlates}/${crustPlateCount} continental, mode=${applied ? applied.mode : crustModeApplied}, edgeBlend=${applied ? applied.edgeBlend.toFixed(2) : "n/a"}, noise=${applied ? applied.noiseAmplitude.toFixed(2) : "n/a"}, heights=[${applied ? applied.oceanicHeight.toFixed(2) : "n/a"},${applied ? applied.continentalHeight.toFixed(2) : "n/a"}], closenessLimit=${closenessLimit}`
  );
  console.log(
    `${logPrefix} Continental plates (${crustContinentalPlateIds.length}): [${crustContinentalPlateIds.join(",")}]`
  );
  console.log(
    `${logPrefix} Oceanic plates (${crustOceanicPlateIds.length}): [${crustOceanicPlateIds.join(",")}]`
  );
  if (crustModeApplied === "area" && crustOceanicPlateIds.length === 0) {
    console.log(`${logPrefix} WARNING: Area crust typing produced no oceanic plates`);
  }
  if (baseHeightRange) {
    console.log(
      `${logPrefix} Height range: [${baseHeightRange.min.toFixed(3)},${baseHeightRange.max.toFixed(3)}]`
    );
  }
  console.log(
    `${logPrefix} Plates with land: ${plateStats.size}, windows generated: ${windowsOut.length}`
  );
  if (windowsOut.length === 0) {
    console.log(`${logPrefix} WARNING: No landmass windows generated!`);
    console.log(`${logPrefix}   - finalLandTiles: ${finalLandTiles}`);
    console.log(`${logPrefix}   - plateStats entries: ${plateStats.size}`);
    console.log(`${logPrefix}   - seaLevel: ${seaLevel}`);
    console.log(`${logPrefix}   - closenessLimit: ${closenessLimit}`);
    const closenessAboveLimit = closeness ? closeness.filter((v) => v > closenessLimit).length : 0;
    if (closeness) {
      console.log(
        `${logPrefix}   - tiles with closeness > ${closenessLimit}: ${closenessAboveLimit}/${size}`
      );
    }
    const validPlateIds = /* @__PURE__ */ new Set();
    for (let i = 0; i < size; i++) {
      if (plateIds[i] >= 0) validPlateIds.add(plateIds[i]);
    }
    console.log(`${logPrefix}   - unique valid plate IDs: ${validPlateIds.size}`);
  }
  let startRegions = void 0;
  if (windowsOut.length >= 2) {
    startRegions = {
      westContinent: { ...windowsOut[0] },
      eastContinent: { ...windowsOut[windowsOut.length - 1] }
    };
  }
  if (ctx?.buffers?.heightfield?.landMask) {
    ctx.buffers.heightfield.landMask.set(landMask);
  }
  return {
    windows: windowsOut,
    startRegions,
    landMask,
    landTiles: finalLandTiles
  };
}
var _cache2 = null;
function createStoryTags() {
  return {
    // Hotspot tags
    hotspot: /* @__PURE__ */ new Set(),
    hotspotParadise: /* @__PURE__ */ new Set(),
    hotspotVolcanic: /* @__PURE__ */ new Set(),
    // Rift tags
    riftLine: /* @__PURE__ */ new Set(),
    riftShoulder: /* @__PURE__ */ new Set(),
    // Margin tags
    activeMargin: /* @__PURE__ */ new Set(),
    passiveShelf: /* @__PURE__ */ new Set(),
    // Corridor tags
    corridorSeaLane: /* @__PURE__ */ new Set(),
    corridorIslandHop: /* @__PURE__ */ new Set(),
    corridorLandOpen: /* @__PURE__ */ new Set(),
    corridorRiverChain: /* @__PURE__ */ new Set(),
    // Corridor metadata
    corridorKind: /* @__PURE__ */ new Map(),
    corridorStyle: /* @__PURE__ */ new Map(),
    corridorAttributes: /* @__PURE__ */ new Map()
  };
}
function getStoryTags() {
  if (_cache2) return _cache2;
  _cache2 = createStoryTags();
  return _cache2;
}
function resetStoryTags() {
  _cache2 = null;
}
var HILL_FRACTAL2 = 1;
function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
function computePlateBias(closenessNorm, boundaryType, cfg) {
  let cn = closenessNorm;
  if (cn == null || Number.isNaN(cn)) cn = 0;
  const threshold = cfg.threshold;
  const power = cfg.power;
  let weight = 0;
  if (cn >= threshold) {
    const span = Math.max(1e-3, 1 - threshold);
    const normalized = clamp((cn - threshold) / span, 0, 1);
    const ramp = Math.pow(normalized, power);
    let typeMul = 0;
    if (boundaryType === BOUNDARY_TYPE.convergent) typeMul = cfg.convergent;
    else if (boundaryType === BOUNDARY_TYPE.transform) typeMul = cfg.transform;
    else if (boundaryType === BOUNDARY_TYPE.divergent) typeMul = cfg.divergent;
    weight = ramp * typeMul;
  } else if (cfg.interior !== 0 && threshold > 0) {
    const normalized = clamp(1 - cn / threshold, 0, 1);
    weight = Math.pow(normalized, power) * cfg.interior;
  }
  return weight;
}
function addRuggedCoasts(iWidth, iHeight, ctx) {
  const adapter = ctx?.adapter;
  const area = Math.max(1, iWidth * iHeight);
  const sqrtScale = Math.min(2, Math.max(0.6, Math.sqrt(area / 1e4)));
  if (adapter?.createFractal) {
    adapter.createFractal(HILL_FRACTAL2, iWidth, iHeight, 4, 0);
  }
  const foundation = ctx?.foundation;
  const boundaryCloseness = foundation?.plates.boundaryCloseness ?? null;
  const boundaryType = foundation?.plates.boundaryType ?? null;
  const tunables = getTunables();
  const cfg = tunables.FOUNDATION_CFG?.coastlines || {};
  const cfgBay = cfg.bay || {};
  const cfgFjord = cfg.fjord || {};
  const bayNoiseExtra = (sqrtScale > 1 ? 1 : 0) + (Number.isFinite(cfgBay.noiseGateAdd) ? cfgBay.noiseGateAdd : 0);
  const fjordBaseDenom = Math.max(
    6,
    (Number.isFinite(cfgFjord.baseDenom) ? cfgFjord.baseDenom : 12) - (sqrtScale > 1.3 ? 1 : 0)
  );
  const fjordActiveBonus = Number.isFinite(cfgFjord.activeBonus) ? cfgFjord.activeBonus : 1;
  const fjordPassiveBonus = Number.isFinite(cfgFjord.passiveBonus) ? cfgFjord.passiveBonus : 2;
  const bayRollDenActive = Number.isFinite(cfgBay.rollDenActive) ? cfgBay.rollDenActive : 4;
  const bayRollDenDefault = Number.isFinite(cfgBay.rollDenDefault) ? cfgBay.rollDenDefault : 5;
  const plateBiasRaw = cfg.plateBias || {};
  const plateBiasCfg = {
    threshold: clamp(Number.isFinite(plateBiasRaw.threshold) ? plateBiasRaw.threshold : 0.45, 0, 1),
    power: Math.max(0.1, Number.isFinite(plateBiasRaw.power) ? plateBiasRaw.power : 1.25),
    convergent: Number.isFinite(plateBiasRaw.convergent) ? plateBiasRaw.convergent : 1,
    transform: Number.isFinite(plateBiasRaw.transform) ? plateBiasRaw.transform : 0.4,
    divergent: Number.isFinite(plateBiasRaw.divergent) ? plateBiasRaw.divergent : -0.6,
    interior: Number.isFinite(plateBiasRaw.interior) ? plateBiasRaw.interior : 0,
    bayWeight: Math.max(0, Number.isFinite(plateBiasRaw.bayWeight) ? plateBiasRaw.bayWeight : 0.35),
    bayNoiseBonus: Math.max(
      0,
      Number.isFinite(plateBiasRaw.bayNoiseBonus) ? plateBiasRaw.bayNoiseBonus : 1
    ),
    fjordWeight: Math.max(
      0,
      Number.isFinite(plateBiasRaw.fjordWeight) ? plateBiasRaw.fjordWeight : 0.8
    )
  };
  const corridorPolicy = tunables.FOUNDATION_CFG?.corridors || {};
  const seaPolicy = corridorPolicy.sea || {};
  const SEA_PROTECTION = seaPolicy.protection || "hard";
  const SOFT_MULT = Math.max(0, Math.min(1, seaPolicy.softChanceMultiplier ?? 0.5));
  const StoryTags = getStoryTags();
  const applyTerrain = (x, y, terrain, isLand) => {
    if (ctx) {
      writeHeightfield(ctx, x, y, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }
  };
  const isCoastalLand2 = (x, y) => {
    if (!adapter) return false;
    if (adapter.isWater(x, y)) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < iWidth && ny >= 0 && ny < iHeight) {
          if (adapter.isWater(nx, ny)) return true;
        }
      }
    }
    return false;
  };
  const isAdjacentToLand = (x, y, radius) => {
    if (!adapter) return false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < iWidth && ny >= 0 && ny < iHeight) {
          if (!adapter.isWater(nx, ny)) return true;
        }
      }
    }
    return false;
  };
  const getRandom = (label, max) => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    if (adapter) {
      return adapter.getRandomNumber(max, label);
    }
    return Math.floor(Math.random() * max);
  };
  const getFractalHeight = (x, y) => {
    if (adapter?.getFractalHeight) {
      return adapter.getFractalHeight(HILL_FRACTAL2, x, y);
    }
    return 0;
  };
  for (let y = 1; y < iHeight - 1; y++) {
    for (let x = 1; x < iWidth - 1; x++) {
      const tileKey = `${x},${y}`;
      const onSeaLane = StoryTags.corridorSeaLane?.has(tileKey) ?? false;
      const softMult = onSeaLane && SEA_PROTECTION === "soft" ? SOFT_MULT : 1;
      if (onSeaLane && SEA_PROTECTION === "hard") {
        continue;
      }
      if (isCoastalLand2(x, y)) {
        const h = getFractalHeight(x, y);
        const i = y * iWidth + x;
        const closenessByte = boundaryCloseness ? boundaryCloseness[i] | 0 : 0;
        const closenessNorm = closenessByte / 255;
        const bType = boundaryType ? boundaryType[i] | 0 : BOUNDARY_TYPE.none;
        const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
        const plateBiasValue = boundaryCloseness ? computePlateBias(closenessNorm, bType, plateBiasCfg) : 0;
        const isActive = StoryTags.activeMargin?.has(tileKey) || nearBoundary;
        const noiseGateBonus = plateBiasValue > 0 ? Math.round(plateBiasValue * plateBiasCfg.bayNoiseBonus) : 0;
        const noiseGate = 2 + bayNoiseExtra + (isActive ? 1 : 0) + noiseGateBonus;
        const bayRollDen = isActive ? bayRollDenActive : bayRollDenDefault;
        let bayRollDenUsed = softMult !== 1 ? Math.max(1, Math.round(bayRollDen / softMult)) : bayRollDen;
        if (plateBiasCfg.bayWeight > 0 && plateBiasValue !== 0) {
          const scale = clamp(1 + plateBiasValue * plateBiasCfg.bayWeight, 0.25, 4);
          bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / scale));
        }
        let laneAttr = null;
        for (let ddy = -1; ddy <= 1 && !laneAttr; ddy++) {
          for (let ddx = -1; ddx <= 1; ddx++) {
            if (ddx === 0 && ddy === 0) continue;
            const k = `${x + ddx},${y + ddy}`;
            if (StoryTags.corridorSeaLane?.has(k)) {
              laneAttr = StoryTags.corridorAttributes?.get(k) || null;
              if (laneAttr) break;
            }
          }
        }
        if (laneAttr?.edge) {
          const edgeCfg = laneAttr.edge;
          const bayMult = Number.isFinite(edgeCfg.bayCarveMultiplier) ? edgeCfg.bayCarveMultiplier : 1;
          if (bayMult && bayMult !== 1) {
            bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / bayMult));
          }
        }
        if (h % 97 < noiseGate && getRandom("Carve Bay", bayRollDenUsed) === 0) {
          applyTerrain(x, y, COAST_TERRAIN, false);
          continue;
        }
      }
      if (adapter?.isWater(x, y)) {
        if (isAdjacentToLand(x, y, 1)) {
          const i = y * iWidth + x;
          const closenessByte = boundaryCloseness ? boundaryCloseness[i] | 0 : 0;
          const closenessNorm = closenessByte / 255;
          const bType = boundaryType ? boundaryType[i] | 0 : BOUNDARY_TYPE.none;
          const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
          const plateBiasValue = boundaryCloseness ? computePlateBias(closenessNorm, bType, plateBiasCfg) : 0;
          let nearActive = nearBoundary;
          let nearPassive = false;
          for (let ddy = -1; ddy <= 1 && (!nearActive || !nearPassive); ddy++) {
            for (let ddx = -1; ddx <= 1; ddx++) {
              if (ddx === 0 && ddy === 0) continue;
              const nx = x + ddx;
              const ny = y + ddy;
              if (nx <= 0 || nx >= iWidth - 1 || ny <= 0 || ny >= iHeight - 1) continue;
              const k = `${nx},${ny}`;
              if (!nearActive && StoryTags.activeMargin?.has(k)) nearActive = true;
              if (!nearPassive && StoryTags.passiveShelf?.has(k)) nearPassive = true;
            }
          }
          const denom = Math.max(
            4,
            fjordBaseDenom - (nearPassive ? fjordPassiveBonus : 0) - (nearActive ? fjordActiveBonus : 0)
          );
          let denomUsed = softMult !== 1 ? Math.max(1, Math.round(denom / softMult)) : denom;
          if (plateBiasCfg.fjordWeight > 0 && plateBiasValue !== 0) {
            const fjScale = clamp(1 + plateBiasValue * plateBiasCfg.fjordWeight, 0.2, 5);
            denomUsed = Math.max(1, Math.round(denomUsed / fjScale));
          }
          let edgeCfg = null;
          for (let my = -1; my <= 1 && !edgeCfg; my++) {
            for (let mx = -1; mx <= 1; mx++) {
              if (mx === 0 && my === 0) continue;
              const kk = `${x + mx},${y + my}`;
              if (StoryTags.corridorSeaLane?.has(kk)) {
                const attr = StoryTags.corridorAttributes?.get(kk);
                edgeCfg = attr?.edge ? attr.edge : null;
                if (edgeCfg) break;
              }
            }
          }
          if (edgeCfg) {
            const fj = Number.isFinite(edgeCfg.fjordChance) ? edgeCfg.fjordChance : 0;
            const cliffs = Number.isFinite(edgeCfg.cliffsChance) ? edgeCfg.cliffsChance : 0;
            const effect = Math.max(0, Math.min(0.5, fj + cliffs * 0.5));
            if (effect > 0) {
              denomUsed = Math.max(1, Math.round(denomUsed * (1 - effect)));
            }
          }
          if (getRandom("Fjord Coast", denomUsed) === 0) {
            applyTerrain(x, y, COAST_TERRAIN, false);
          }
        }
      }
    }
  }
}
var HILL_FRACTAL3 = 1;
function storyKey(x, y) {
  return `${x},${y}`;
}
function addIslandChains(iWidth, iHeight, ctx) {
  const adapter = ctx?.adapter;
  if (adapter?.createFractal) {
    adapter.createFractal(HILL_FRACTAL3, iWidth, iHeight, 5, 0);
  }
  const tunables = getTunables();
  const islandsCfg = tunables.FOUNDATION_CFG?.islands || {};
  const storyTunables = tunables.FOUNDATION_CFG?.story || {};
  const corridorsCfg = tunables.FOUNDATION_CFG?.corridors || {};
  const fracPct = (islandsCfg.fractalThresholdPercent ?? 90) | 0;
  const threshold = getFractalThreshold(adapter, fracPct);
  const paradiseWeight = (storyTunables.hotspot?.paradiseBias ?? 2) | 0;
  const volcanicWeight = (storyTunables.hotspot?.volcanicBias ?? 1) | 0;
  const peakPercent = Math.max(
    0,
    Math.min(100, Math.round((storyTunables.hotspot?.volcanicPeakChance ?? 0.33) * 100) + 10)
  );
  const StoryTags = getStoryTags();
  const applyTerrain = (tileX, tileY, terrain, isLand) => {
    if (ctx) {
      writeHeightfield(ctx, tileX, tileY, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(tileX, tileY, terrain);
    }
  };
  const getRandom = (label, max) => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    if (adapter) {
      return adapter.getRandomNumber(max, label);
    }
    return Math.floor(Math.random() * max);
  };
  const getFractalHeight = (x, y) => {
    if (adapter?.getFractalHeight) {
      return adapter.getFractalHeight(HILL_FRACTAL3, x, y);
    }
    return 0;
  };
  const isWater = (x, y) => {
    if (adapter) {
      return adapter.isWater(x, y);
    }
    return true;
  };
  const isAdjacentToLand = (x, y, radius) => {
    if (!adapter) return false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < iWidth && ny >= 0 && ny < iHeight) {
          if (!adapter.isWater(nx, ny)) return true;
        }
      }
    }
    return false;
  };
  for (let y = 2; y < iHeight - 2; y++) {
    for (let x = 2; x < iWidth - 2; x++) {
      if (!isWater(x, y)) continue;
      const minDist = (islandsCfg.minDistFromLandRadius ?? 2) | 0;
      if (isAdjacentToLand(x, y, Math.max(0, minDist))) continue;
      const laneRadius = (corridorsCfg.sea?.avoidRadius ?? 2) | 0;
      if (laneRadius > 0 && StoryTags.corridorSeaLane && StoryTags.corridorSeaLane.size > 0) {
        let nearSeaLane = false;
        for (let my = -laneRadius; my <= laneRadius && !nearSeaLane; my++) {
          for (let mx = -laneRadius; mx <= laneRadius; mx++) {
            const kk = storyKey(x + mx, y + my);
            if (StoryTags.corridorSeaLane.has(kk)) {
              nearSeaLane = true;
              break;
            }
          }
        }
        if (nearSeaLane) continue;
      }
      const v = getFractalHeight(x, y);
      const isHotspot = StoryTags.hotspot.has(storyKey(x, y));
      let nearActive = false;
      let nearPassive = false;
      for (let my = -1; my <= 1 && (!nearActive || !nearPassive); my++) {
        for (let mx = -1; mx <= 1; mx++) {
          if (mx === 0 && my === 0) continue;
          const k = storyKey(x + mx, y + my);
          if (!nearActive && StoryTags.activeMargin?.has(k)) nearActive = true;
          if (!nearPassive && StoryTags.passiveShelf?.has(k)) nearPassive = true;
        }
      }
      const denActive = (islandsCfg.baseIslandDenNearActive ?? 5) | 0;
      const denElse = (islandsCfg.baseIslandDenElse ?? 7) | 0;
      const baseIslandDen = nearActive ? denActive : denElse;
      const baseAllowed = v > threshold && getRandom("Island Seed", baseIslandDen) === 0;
      const hotspotAllowed = isHotspot && getRandom("Hotspot Island Seed", Math.max(1, (islandsCfg.hotspotSeedDenom ?? 2) | 0)) === 0;
      if (!(baseAllowed || hotspotAllowed)) continue;
      let centerTerrain = COAST_TERRAIN;
      let classifyParadise = false;
      if (isHotspot) {
        const pWeight = paradiseWeight + (nearPassive ? 1 : 0);
        const vWeight = volcanicWeight;
        const bucket = pWeight + vWeight;
        const roll = getRandom("HotspotKind", bucket || 1);
        classifyParadise = roll < pWeight;
        if (!classifyParadise) {
          if (getRandom("HotspotPeak", 100) < peakPercent) {
            centerTerrain = FLAT_TERRAIN;
          }
        }
      }
      const centerIsLand = centerTerrain !== COAST_TERRAIN && centerTerrain !== OCEAN_TERRAIN;
      applyTerrain(x, y, centerTerrain, centerIsLand);
      if (isHotspot) {
        if (classifyParadise) {
          StoryTags.hotspotParadise.add(storyKey(x, y));
        } else {
          StoryTags.hotspotVolcanic.add(storyKey(x, y));
        }
      }
      const maxCluster = Math.max(1, (islandsCfg.clusterMax ?? 3) | 0);
      const count = 1 + getRandom("Island Size", maxCluster);
      for (let n = 0; n < count; n++) {
        const dx = getRandom("dx", 3) - 1;
        const dy = getRandom("dy", 3) - 1;
        const nx = x + dx;
        const ny = y + dy;
        if (nx <= 0 || nx >= iWidth - 1 || ny <= 0 || ny >= iHeight - 1) continue;
        if (!isWater(nx, ny)) continue;
        applyTerrain(nx, ny, COAST_TERRAIN, false);
      }
    }
  }
}
function getFractalThreshold(adapter, percent) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  return Math.floor(clampedPercent / 100 * 65535);
}
var MOUNTAIN_FRACTAL2 = 0;
var HILL_FRACTAL4 = 1;
function idx(x, y, width) {
  return y * width + x;
}
function normalizeFractal(raw) {
  let val = raw | 0;
  if (val < 0) val = 0;
  if (val > 65535) {
    return (val >>> 24) / 255;
  }
  if (val > 255) {
    return (val >>> 8) / 255;
  }
  return val / 255;
}
function layerAddMountainsPhysics(ctx, options = {}) {
  const {
    tectonicIntensity = 1,
    // Crust-first defaults: mountains only where collisions are strong
    mountainThreshold = 0.58,
    hillThreshold = 0.32,
    upliftWeight = 0.35,
    fractalWeight = 0.15,
    riftDepth = 0.2,
    boundaryWeight = 1,
    boundaryExponent = 1.6,
    interiorPenaltyWeight = 0,
    // disabled in the new formulation
    convergenceBonus = 1,
    transformPenalty = 0.6,
    riftPenalty = 1,
    hillBoundaryWeight = 0.35,
    hillRiftBonus = 0.25,
    hillConvergentFoothill = 0.35,
    hillInteriorFalloff = 0.1,
    hillUpliftWeight = 0.2
  } = options;
  console.log("[Mountains] Physics Config (Input):", JSON.stringify(options));
  console.log(
    "[Mountains] Physics Config (Effective):",
    JSON.stringify({
      tectonicIntensity,
      mountainThreshold,
      hillThreshold,
      upliftWeight,
      fractalWeight,
      riftDepth,
      boundaryWeight,
      boundaryExponent,
      interiorPenaltyWeight,
      convergenceBonus,
      transformPenalty,
      riftPenalty,
      hillBoundaryWeight,
      hillRiftBonus,
      hillConvergentFoothill,
      hillInteriorFalloff,
      hillUpliftWeight
    })
  );
  const scaledConvergenceBonus = convergenceBonus * tectonicIntensity;
  const scaledBoundaryWeight = boundaryWeight * tectonicIntensity;
  const scaledUpliftWeight = upliftWeight * tectonicIntensity;
  const scaledHillBoundaryWeight = hillBoundaryWeight * tectonicIntensity;
  const scaledHillConvergentFoothill = hillConvergentFoothill * tectonicIntensity;
  const dimensions = ctx?.dimensions;
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;
  const adapter = ctx?.adapter;
  if (!width || !height || !adapter) {
    return;
  }
  const isWater = createIsWaterTile(ctx, adapter, width, height);
  const terrainWriter = (x, y, terrain) => {
    const isLand = terrain !== COAST_TERRAIN && terrain !== OCEAN_TERRAIN;
    writeHeightfield(ctx, x, y, { terrain, isLand });
  };
  const foundation = ctx?.foundation;
  const foundationEnabled = !!foundation;
  const grainAmount = 5;
  const iFlags = 0;
  adapter.createFractal(MOUNTAIN_FRACTAL2, width, height, grainAmount, iFlags);
  adapter.createFractal(HILL_FRACTAL4, width, height, grainAmount, iFlags);
  let landTiles = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isWater(x, y)) {
        landTiles++;
      }
    }
  }
  const size = width * height;
  const scores = new Float32Array(size);
  const hillScores = new Float32Array(size);
  if (foundationEnabled && foundation) {
    computePlateBasedScores(
      ctx,
      scores,
      hillScores,
      {
        upliftWeight: scaledUpliftWeight,
        fractalWeight,
        boundaryWeight: scaledBoundaryWeight,
        boundaryExponent,
        interiorPenaltyWeight,
        convergenceBonus: scaledConvergenceBonus,
        transformPenalty,
        riftPenalty,
        hillBoundaryWeight: scaledHillBoundaryWeight,
        hillRiftBonus,
        hillConvergentFoothill: scaledHillConvergentFoothill,
        hillInteriorFalloff,
        hillUpliftWeight
      },
      isWater,
      adapter,
      foundation
    );
  } else {
    computeFractalOnlyScores(ctx, scores, hillScores, adapter);
  }
  if (foundationEnabled && foundation && riftDepth > 0) {
    applyRiftDepressions(ctx, scores, hillScores, riftDepth, foundation);
  }
  const selectionAdapter = { isWater };
  const mountainTiles = selectTilesAboveThreshold(
    scores,
    width,
    height,
    mountainThreshold,
    selectionAdapter
  );
  const hillTiles = selectTilesAboveThreshold(
    hillScores,
    width,
    height,
    hillThreshold,
    selectionAdapter,
    mountainTiles
  );
  for (const i of mountainTiles) {
    const x = i % width;
    const y = Math.floor(i / width);
    terrainWriter(x, y, MOUNTAIN_TERRAIN);
  }
  for (const i of hillTiles) {
    const x = i % width;
    const y = Math.floor(i / width);
    terrainWriter(x, y, HILL_TERRAIN);
  }
  const mtnCount = mountainTiles.size;
  const hillCount = hillTiles.size;
  const flatCount = Math.max(0, landTiles - mtnCount - hillCount);
  const total = Math.max(1, landTiles);
  console.log(`[Mountains] Terrain Distribution (Land Tiles: ${landTiles}):`);
  console.log(`  Mountains: ${mtnCount} (${(mtnCount / total * 100).toFixed(1)}%)`);
  console.log(`  Hills:     ${hillCount} (${(hillCount / total * 100).toFixed(1)}%)`);
  console.log(`  Flat:      ${flatCount} (${(flatCount / total * 100).toFixed(1)}%)`);
}
function computePlateBasedScores(ctx, scores, hillScores, options, isWaterCheck, adapter, foundation) {
  const dims = ctx?.dimensions;
  const width = dims?.width ?? 0;
  const height = dims?.height ?? 0;
  const { plates } = foundation;
  const upliftPotential = plates.upliftPotential;
  const boundaryType = plates.boundaryType;
  const boundaryCloseness = plates.boundaryCloseness;
  const riftPotential = plates.riftPotential;
  const tectonicStress = plates.tectonicStress;
  if (!upliftPotential || !boundaryType) {
    computeFractalOnlyScores(ctx, scores, hillScores, adapter);
    return;
  }
  const boundaryGate = 0.35;
  const falloffExponent = options.boundaryExponent || 2.5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const uplift = upliftPotential ? upliftPotential[i] / 255 : 0;
      const bType = boundaryType[i];
      const closenessRaw = boundaryCloseness ? boundaryCloseness[i] / 255 : 0;
      const rift = riftPotential ? riftPotential[i] / 255 : 0;
      const stress = tectonicStress ? tectonicStress[i] / 255 : uplift;
      const rawMtn = adapter.getFractalHeight(MOUNTAIN_FRACTAL2, x, y);
      const rawHill = adapter.getFractalHeight(HILL_FRACTAL4, x, y);
      const fractalMtn = normalizeFractal(rawMtn);
      const fractalHill = normalizeFractal(rawHill);
      if (closenessRaw < boundaryGate) {
        scores[i] = 0;
        hillScores[i] = Math.max(0, fractalHill * options.fractalWeight * 0.5);
        continue;
      }
      const normalized = (closenessRaw - boundaryGate) / (1 - boundaryGate);
      const boundaryStrength = Math.pow(normalized, falloffExponent);
      const collision = bType === BOUNDARY_TYPE.convergent ? boundaryStrength : 0;
      const transform = bType === BOUNDARY_TYPE.transform ? boundaryStrength : 0;
      const divergence = bType === BOUNDARY_TYPE.divergent ? boundaryStrength : 0;
      let mountainScore = collision * options.boundaryWeight * (0.7 * stress + 0.3 * uplift) + uplift * options.upliftWeight * 0.4 + fractalMtn * options.fractalWeight * 0.2;
      if (collision > 0) {
        mountainScore += collision * options.convergenceBonus * (0.6 + fractalMtn * 0.2);
      }
      if (divergence > 0) {
        mountainScore *= Math.max(0, 1 - divergence * options.riftPenalty);
      }
      if (transform > 0) {
        mountainScore *= Math.max(0, 1 - transform * options.transformPenalty);
      }
      scores[i] = Math.max(0, mountainScore);
      const hillIntensity = Math.sqrt(boundaryStrength);
      const foothillExtent = 0.5 + fractalHill * 0.5;
      let hillScore = fractalHill * options.fractalWeight * 0.8 + uplift * options.hillUpliftWeight * 0.3;
      if (collision > 0 && options.hillBoundaryWeight > 0) {
        hillScore += hillIntensity * options.hillBoundaryWeight * foothillExtent;
        hillScore += hillIntensity * options.hillConvergentFoothill * foothillExtent;
      }
      if (divergence > 0) {
        hillScore += hillIntensity * rift * options.hillRiftBonus * foothillExtent * 0.5;
      }
      hillScores[i] = Math.max(0, hillScore);
    }
  }
}
function computeFractalOnlyScores(ctx, scores, hillScores, adapter) {
  const dims = ctx?.dimensions;
  const width = dims?.width ?? 0;
  const height = dims?.height ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const rawMtn = adapter.getFractalHeight(MOUNTAIN_FRACTAL2, x, y);
      const rawHill = adapter.getFractalHeight(HILL_FRACTAL4, x, y);
      scores[i] = normalizeFractal(rawMtn);
      hillScores[i] = normalizeFractal(rawHill);
    }
  }
}
function applyRiftDepressions(ctx, scores, hillScores, riftDepth, foundation) {
  const dims = ctx?.dimensions;
  const width = dims?.width ?? 0;
  const height = dims?.height ?? 0;
  const { plates } = foundation;
  const riftPotential = plates.riftPotential;
  const boundaryType = plates.boundaryType;
  if (!riftPotential || !boundaryType) return;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const rift = riftPotential[i] / 255;
      const bType = boundaryType[i];
      if (bType === BOUNDARY_TYPE.divergent) {
        const depression = rift * riftDepth;
        scores[i] = Math.max(0, scores[i] - depression);
        hillScores[i] = Math.max(0, hillScores[i] - depression * 0.5);
      }
    }
  }
}
function createIsWaterTile(ctx, adapter, width, height) {
  const landMask = ctx?.buffers?.heightfield?.landMask || null;
  return (x, y) => {
    if (landMask) {
      const i = y * width + x;
      if (i >= 0 && i < landMask.length) {
        return landMask[i] === 0;
      }
    }
    return adapter.isWater(x, y);
  };
}
function selectTilesAboveThreshold(scores, width, height, threshold, adapter, excludeSet = null) {
  const selected = /* @__PURE__ */ new Set();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (adapter.isWater(x, y)) continue;
      if (excludeSet && excludeSet.has(i)) continue;
      if (scores[i] > threshold) {
        selected.add(i);
      }
    }
  }
  return selected;
}
function idx2(x, y, width) {
  return y * width + x;
}
function clamp2(value, min, max) {
  if (typeof max === "number" && max >= min) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }
  return Math.max(value, min);
}
function isTooCloseToExisting(x, y, placed, minSpacing) {
  for (const p of placed) {
    const dx = Math.abs(x - p.x);
    const dy = Math.abs(y - p.y);
    const dist = Math.max(dx, dy);
    if (dist < minSpacing) {
      return true;
    }
  }
  return false;
}
function layerAddVolcanoesPlateAware(ctx, options = {}) {
  const {
    enabled = true,
    baseDensity = 1 / 170,
    minSpacing = 3,
    boundaryThreshold = 0.35,
    boundaryWeight = 1.2,
    convergentMultiplier = 2.4,
    transformMultiplier = 1.1,
    divergentMultiplier = 0.35,
    hotspotWeight = 0.12,
    shieldPenalty = 0.6,
    randomJitter = 0.08,
    minVolcanoes = 5,
    maxVolcanoes = 40
  } = options;
  const dimensions = ctx?.dimensions;
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;
  const adapter = ctx?.adapter;
  if (!width || !height || !adapter) {
    return;
  }
  if (!enabled) {
    return;
  }
  const foundation = ctx?.foundation;
  if (!foundation) {
    return;
  }
  const { plates } = foundation;
  const boundaryCloseness = plates.boundaryCloseness;
  const boundaryType = plates.boundaryType;
  const shieldStability = plates.shieldStability;
  if (!boundaryCloseness || !boundaryType) {
    return;
  }
  let landTiles = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!adapter.isWater(x, y)) landTiles++;
    }
  }
  const rawDesired = Math.round(landTiles * Math.max(0, baseDensity));
  const targetVolcanoes = clamp2(
    Math.max(minVolcanoes | 0, rawDesired),
    minVolcanoes | 0,
    maxVolcanoes > 0 ? maxVolcanoes | 0 : rawDesired
  );
  if (targetVolcanoes <= 0) {
    return;
  }
  const candidates = [];
  const hotspotBase = Math.max(0, hotspotWeight);
  const threshold = Math.max(0, Math.min(1, boundaryThreshold));
  const shieldWeight = Math.max(0, Math.min(1, shieldPenalty));
  const jitter = Math.max(0, randomJitter);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      if (adapter.getFeatureType(x, y) === VOLCANO_FEATURE) continue;
      const i = idx2(x, y, width);
      const closeness = boundaryCloseness[i] / 255;
      const shield = shieldStability ? shieldStability[i] / 255 : 0;
      const bType = boundaryType[i] | 0;
      let weight = 0;
      let boundaryBand = 0;
      if (closeness >= threshold) {
        boundaryBand = (closeness - threshold) / Math.max(1e-3, 1 - threshold);
        const base = boundaryBand * Math.max(0, boundaryWeight);
        let multiplier = 1;
        if (bType === BOUNDARY_TYPE.convergent) multiplier = Math.max(0, convergentMultiplier);
        else if (bType === BOUNDARY_TYPE.transform) multiplier = Math.max(0, transformMultiplier);
        else if (bType === BOUNDARY_TYPE.divergent) multiplier = Math.max(0, divergentMultiplier);
        weight += base * multiplier;
      } else {
        const interiorBand = 1 - closeness;
        weight += hotspotBase * interiorBand;
      }
      if (weight <= 0) continue;
      if (shieldWeight > 0) {
        const penalty = shield * shieldWeight;
        weight *= Math.max(0, 1 - penalty);
      }
      if (jitter > 0) {
        const randomScale = adapter.getRandomNumber(1e3, "VolcanoJitter") / 1e3;
        weight += randomScale * jitter;
      }
      if (weight > 0) {
        candidates.push({ x, y, weight, closeness, boundaryType: bType });
      }
    }
  }
  if (candidates.length === 0) {
    return;
  }
  candidates.sort((a, b) => b.weight - a.weight);
  const placed = [];
  const minSpacingClamped = Math.max(1, minSpacing | 0);
  for (const candidate of candidates) {
    if (placed.length >= targetVolcanoes) break;
    if (adapter.getFeatureType(candidate.x, candidate.y) === VOLCANO_FEATURE) continue;
    if (isTooCloseToExisting(candidate.x, candidate.y, placed, minSpacingClamped)) continue;
    writeHeightfield(ctx, candidate.x, candidate.y, {
      terrain: MOUNTAIN_TERRAIN,
      isLand: true
    });
    const featureData = {
      Feature: VOLCANO_FEATURE,
      Direction: -1,
      Elevation: 0
    };
    adapter.setFeatureType(candidate.x, candidate.y, featureData);
    placed.push({ x: candidate.x, y: candidate.y });
  }
}
var PerlinNoise = class {
  p = new Array(512);
  permutation = [
    151,
    160,
    137,
    91,
    90,
    15,
    131,
    13,
    201,
    95,
    96,
    53,
    194,
    233,
    7,
    225,
    140,
    36,
    103,
    30,
    69,
    142,
    8,
    99,
    37,
    240,
    21,
    10,
    23,
    190,
    6,
    148,
    247,
    120,
    234,
    75,
    0,
    26,
    197,
    62,
    94,
    252,
    219,
    203,
    117,
    35,
    11,
    32,
    57,
    177,
    33,
    88,
    237,
    149,
    56,
    87,
    174,
    20,
    125,
    136,
    171,
    168,
    68,
    175,
    74,
    165,
    71,
    134,
    139,
    48,
    27,
    166,
    77,
    146,
    158,
    231,
    83,
    111,
    229,
    122,
    60,
    211,
    133,
    230,
    220,
    105,
    92,
    41,
    55,
    46,
    245,
    40,
    244,
    102,
    143,
    54,
    65,
    25,
    63,
    161,
    1,
    216,
    80,
    73,
    209,
    76,
    132,
    187,
    208,
    89,
    18,
    169,
    200,
    196,
    135,
    130,
    116,
    188,
    159,
    86,
    164,
    100,
    109,
    198,
    173,
    186,
    3,
    64,
    52,
    217,
    226,
    250,
    124,
    123,
    5,
    202,
    38,
    147,
    118,
    126,
    255,
    82,
    85,
    212,
    207,
    206,
    59,
    227,
    47,
    16,
    58,
    17,
    182,
    189,
    28,
    42,
    223,
    183,
    170,
    213,
    119,
    248,
    152,
    2,
    44,
    154,
    163,
    70,
    221,
    153,
    101,
    155,
    167,
    43,
    172,
    9,
    129,
    22,
    39,
    253,
    19,
    98,
    108,
    110,
    79,
    113,
    224,
    232,
    178,
    185,
    112,
    104,
    218,
    246,
    97,
    228,
    251,
    34,
    242,
    193,
    238,
    210,
    144,
    12,
    191,
    179,
    162,
    241,
    81,
    51,
    145,
    235,
    249,
    14,
    239,
    107,
    49,
    192,
    214,
    31,
    181,
    199,
    106,
    157,
    184,
    84,
    204,
    176,
    115,
    121,
    50,
    45,
    127,
    4,
    150,
    254,
    138,
    236,
    205,
    93,
    222,
    114,
    67,
    29,
    24,
    72,
    243,
    141,
    128,
    195,
    78,
    66,
    215,
    61,
    156,
    180
  ];
  constructor(seed = 0) {
    this.setSeed(seed);
  }
  setSeed(seed) {
    const source = [...this.permutation];
    for (let i = 0; i < 256; i++) {
      const r = (seed + i * 31337) % 256;
      [source[i], source[r]] = [source[r], source[i]];
    }
    for (let i = 0; i < 256; i++) {
      this.p[256 + i] = this.p[i] = source[i];
    }
  }
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  lerp(t, a, b) {
    return a + t * (b - a);
  }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  noise3D(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;
    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(
          u,
          this.grad(this.p[AA], x, y, z),
          this.grad(this.p[BA], x - 1, y, z)
        ),
        this.lerp(
          u,
          this.grad(this.p[AB], x, y - 1, z),
          this.grad(this.p[BB], x - 1, y - 1, z)
        )
      ),
      this.lerp(
        v,
        this.lerp(
          u,
          this.grad(this.p[AA + 1], x, y, z - 1),
          this.grad(this.p[BA + 1], x - 1, y, z - 1)
        ),
        this.lerp(
          u,
          this.grad(this.p[AB + 1], x, y - 1, z - 1),
          this.grad(this.p[BB + 1], x - 1, y - 1, z - 1)
        )
      )
    );
  }
  noise2D(x, y) {
    return this.noise3D(x, y, 0);
  }
};
function getPlotTagValue(name, fallback) {
  if (typeof PlotTags !== "undefined") {
    const engineValue = PlotTags[`PLOT_TAG_${name}`];
    if (typeof engineValue === "number") {
      return engineValue;
    }
  }
  return fallback;
}
var _plotTagsLogged = false;
function logPlotTagsOnce() {
  if (_plotTagsLogged) return;
  _plotTagsLogged = true;
  const hasPlotTags = typeof PlotTags !== "undefined";
  console.log(`[PlotTags] Engine PlotTags available: ${hasPlotTags}`);
  if (hasPlotTags) {
    console.log(`[PlotTags] Keys: ${Object.keys(PlotTags).join(", ")}`);
    console.log(`[PlotTags] PLOT_TAG_NONE=${PlotTags.PLOT_TAG_NONE}, PLOT_TAG_LANDMASS=${PlotTags.PLOT_TAG_LANDMASS}, PLOT_TAG_WATER=${PlotTags.PLOT_TAG_WATER}`);
    console.log(`[PlotTags] PLOT_TAG_EAST_LANDMASS=${PlotTags.PLOT_TAG_EAST_LANDMASS}, PLOT_TAG_WEST_LANDMASS=${PlotTags.PLOT_TAG_WEST_LANDMASS}`);
  }
}
var PLOT_TAG = {
  get NONE() {
    logPlotTagsOnce();
    return getPlotTagValue("NONE", 0);
  },
  get LANDMASS() {
    return getPlotTagValue("LANDMASS", 1);
  },
  get WATER() {
    return getPlotTagValue("WATER", 2);
  },
  get EAST_LANDMASS() {
    return getPlotTagValue("EAST_LANDMASS", 3);
  },
  get WEST_LANDMASS() {
    return getPlotTagValue("WEST_LANDMASS", 4);
  },
  get EAST_WATER() {
    return getPlotTagValue("EAST_WATER", 5);
  },
  get WEST_WATER() {
    return getPlotTagValue("WEST_WATER", 6);
  },
  get ISLAND() {
    return getPlotTagValue("ISLAND", 7);
  }
};
function addPlotTagsSimple(height, width, eastContinentLeftCol, adapter, terrainBuilder) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      terrainBuilder.setPlotTag(x, y, PLOT_TAG.NONE);
      const isLand = !adapter.isWater(x, y);
      if (isLand) {
        terrainBuilder.addPlotTag(x, y, PLOT_TAG.LANDMASS);
        if (x >= eastContinentLeftCol) {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.EAST_LANDMASS);
        } else {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.WEST_LANDMASS);
        }
      } else {
        terrainBuilder.addPlotTag(x, y, PLOT_TAG.WATER);
        if (x >= eastContinentLeftCol - 1) {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.EAST_WATER);
        } else {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.WEST_WATER);
        }
      }
    }
  }
}
function getLandmassRegionValue(name, fallback) {
  if (typeof LandmassRegion !== "undefined") {
    const engineValue = LandmassRegion[`LANDMASS_REGION_${name}`];
    if (typeof engineValue === "number") {
      return engineValue;
    }
  }
  return fallback;
}
var LANDMASS_REGION = {
  get NONE() {
    return getLandmassRegionValue("NONE", 0);
  },
  get WEST() {
    return getLandmassRegionValue("WEST", 2);
  },
  get EAST() {
    return getLandmassRegionValue("EAST", 1);
  },
  get DEFAULT() {
    return getLandmassRegionValue("DEFAULT", 0);
  },
  get ANY() {
    return getLandmassRegionValue("ANY", -1);
  }
};
function markLandmassRegionId(continent, regionId, adapter) {
  let markedCount = 0;
  for (let y = continent.south; y <= continent.north; y++) {
    for (let x = continent.west; x <= continent.east; x++) {
      if (adapter.getTerrainType(x, y) !== OCEAN_TERRAIN) {
        adapter.setLandmassRegionId(x, y, regionId);
        markedCount++;
      }
    }
  }
  return markedCount;
}
function inBounds(x, y, width, height) {
  return x >= 0 && x < width && y >= 0 && y < height;
}
function clamp3(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function resolveAdapter(ctx) {
  if (ctx && ctx.adapter) {
    const engineAdapter = ctx.adapter;
    return {
      isWater: (x, y) => engineAdapter.isWater(x, y),
      isMountain: (x, y) => engineAdapter.isMountain(x, y),
      // NOTE: isCoastalLand and isAdjacentToShallowWater intentionally omitted.
      // These are not on the base EngineAdapter interface. By leaving them
      // undefined, the climate code's local fallbacks will execute instead of
      // receiving stubbed `() => false` values that block the fallback path.
      isAdjacentToRivers: (x, y, radius) => engineAdapter.isAdjacentToRivers(x, y, radius),
      getRainfall: (x, y) => engineAdapter.getRainfall(x, y),
      setRainfall: (x, y, rf) => engineAdapter.setRainfall(x, y, rf),
      getElevation: (x, y) => engineAdapter.getElevation(x, y),
      getLatitude: (x, y) => engineAdapter.getLatitude(x, y),
      getRandomNumber: (max, label) => engineAdapter.getRandomNumber(max, label)
    };
  }
  return {
    isWater: () => {
      throw new Error("ClimateEngine: No adapter available");
    },
    isMountain: () => {
      throw new Error("ClimateEngine: No adapter available");
    },
    isAdjacentToRivers: () => false,
    getRainfall: () => 0,
    setRainfall: () => {
    },
    getElevation: () => 0,
    getLatitude: () => 0,
    getRandomNumber: (max) => Math.floor(Math.random() * max)
  };
}
function createClimateRuntime(width, height, ctx) {
  const adapter = resolveAdapter(ctx);
  const rainfallBuf = ctx?.buffers?.climate?.rainfall || null;
  const idx4 = (x, y) => y * width + x;
  const readRainfall = (x, y) => {
    if (ctx && rainfallBuf) {
      return rainfallBuf[idx4(x, y)] | 0;
    }
    return adapter.getRainfall(x, y);
  };
  const writeRainfall = (x, y, rainfall) => {
    const clamped = clamp3(rainfall, 0, 200);
    if (ctx) {
      writeClimateField(ctx, x, y, { rainfall: clamped });
    } else {
      adapter.setRainfall(x, y, clamped);
    }
  };
  const rand = (max, label) => {
    if (ctx) {
      return ctxRandom(ctx, label || "ClimateRand", max);
    }
    return adapter.getRandomNumber(max, label || "ClimateRand");
  };
  return {
    adapter,
    readRainfall,
    writeRainfall,
    rand,
    idx: idx4
  };
}
function distanceToNearestWater(a, b, c, adapter, width, height) {
  if (typeof c === "function") {
    const widthVal = a;
    const heightVal = b;
    const isWaterFn = c;
    const total = Math.max(0, widthVal * heightVal);
    const dist = new Int16Array(total);
    dist.fill(-1);
    const queueX = [];
    const queueY = [];
    for (let y2 = 0; y2 < heightVal; y2++) {
      for (let x2 = 0; x2 < widthVal; x2++) {
        if (isWaterFn(x2, y2)) {
          const idx4 = y2 * widthVal + x2;
          dist[idx4] = 0;
          queueX.push(x2);
          queueY.push(y2);
        }
      }
    }
    let head = 0;
    const offsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1]
    ];
    while (head < queueX.length) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;
      const baseIdx = cy * widthVal + cx;
      const baseDist = dist[baseIdx];
      for (let i = 0; i < offsets.length; i++) {
        const dx = offsets[i][0];
        const dy = offsets[i][1];
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= widthVal || ny < 0 || ny >= heightVal) continue;
        const idx4 = ny * widthVal + nx;
        if (dist[idx4] !== -1) continue;
        dist[idx4] = baseDist + 1;
        queueX.push(nx);
        queueY.push(ny);
      }
    }
    return dist;
  }
  const x = a;
  const y = b;
  const maxR = c;
  if (!adapter || width === void 0 || height === void 0) {
    return -1;
  }
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (adapter.isWater(nx, ny)) return r;
        }
      }
    }
  }
  return -1;
}
function hasUpwindBarrier(x, y, dx, dy, steps, adapter, width, height) {
  for (let s = 1; s <= steps; s++) {
    const nx = x + dx * s;
    const ny = y + dy * s;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
    if (!adapter.isWater(nx, ny)) {
      if (adapter.isMountain && adapter.isMountain(nx, ny)) return s;
      const elev = adapter.getElevation(nx, ny);
      if (elev >= 500) return s;
    }
  }
  return 0;
}
function hasUpwindBarrierWM(x, y, steps, adapter, width, height, dynamics) {
  const U = dynamics.windU;
  const V = dynamics.windV;
  if (!U || !V) return 0;
  let cx = x;
  let cy = y;
  for (let s = 1; s <= steps; s++) {
    const i = cy * width + cx;
    let ux = 0;
    let vy = 0;
    if (i >= 0 && i < U.length) {
      const u = U[i] | 0;
      const v = V[i] | 0;
      if (Math.abs(u) >= Math.abs(v)) {
        ux = u === 0 ? 0 : u > 0 ? 1 : -1;
        vy = 0;
      } else {
        ux = 0;
        vy = v === 0 ? 0 : v > 0 ? 1 : -1;
      }
      if (ux === 0 && vy === 0) {
        const lat = Math.abs(adapter.getLatitude(cx, cy));
        ux = lat < 30 || lat >= 60 ? -1 : 1;
        vy = 0;
      }
    } else {
      const lat = Math.abs(adapter.getLatitude(cx, cy));
      ux = lat < 30 || lat >= 60 ? -1 : 1;
      vy = 0;
    }
    const nx = cx + ux;
    const ny = cy + vy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
    if (!adapter.isWater(nx, ny)) {
      if (adapter.isMountain && adapter.isMountain(nx, ny)) return s;
      const elev = adapter.getElevation(nx, ny);
      if (elev >= 500) return s;
    }
    cx = nx;
    cy = ny;
  }
  return 0;
}
function applyClimateBaseline(width, height, ctx = null) {
  console.log("Building enhanced rainfall patterns...");
  if (ctx) {
    syncClimateField(ctx);
  }
  const runtime = createClimateRuntime(width, height, ctx);
  const { adapter, readRainfall, writeRainfall, rand } = runtime;
  const tunables = getTunables();
  const climateCfg = tunables.CLIMATE_CFG || {};
  const baselineCfg = climateCfg.baseline || {};
  const bands = baselineCfg.bands || {};
  const blend = baselineCfg.blend || {};
  const orographic = baselineCfg.orographic || {};
  const coastalCfg = baselineCfg.coastal || {};
  const noiseCfg = baselineCfg.noise || {};
  const BASE_AREA = 1e4;
  const sqrt = Math.min(2, Math.max(0.6, Math.sqrt(Math.max(1, width * height) / BASE_AREA)));
  const equatorPlus = Math.round(12 * (sqrt - 1));
  const noiseBase = Number.isFinite(noiseCfg?.baseSpanSmall) ? noiseCfg.baseSpanSmall : 3;
  const noiseSpan = sqrt > 1 ? noiseBase + Math.round(
    Number.isFinite(noiseCfg?.spanLargeScaleFactor) ? noiseCfg.spanLargeScaleFactor : 1
  ) : noiseBase;
  const maxSpread = Number.isFinite(coastalCfg.spread) ? coastalCfg.spread : 4;
  const noiseScale = Number.isFinite(noiseCfg.scale) ? noiseCfg.scale : 0.15;
  const seed = rand(1e4, "PerlinSeed");
  const perlin = new PerlinNoise(seed);
  const distMap = distanceToNearestWater(
    width,
    height,
    (x, y) => adapter.isWater(x, y)
  );
  const rollNoise = (x, y) => {
    const n = perlin.noise2D(x * noiseScale, y * noiseScale);
    return n * noiseSpan;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      const base = readRainfall(x, y);
      const elevation = adapter.getElevation(x, y);
      const lat = Math.abs(adapter.getLatitude(x, y));
      const b0 = Number.isFinite(bands.deg0to10) ? bands.deg0to10 : 120;
      const b1 = Number.isFinite(bands.deg10to20) ? bands.deg10to20 : 104;
      const b2 = Number.isFinite(bands.deg20to35) ? bands.deg20to35 : 75;
      const b3 = Number.isFinite(bands.deg35to55) ? bands.deg35to55 : 70;
      const b4 = Number.isFinite(bands.deg55to70) ? bands.deg55to70 : 60;
      const b5 = Number.isFinite(bands.deg70plus) ? bands.deg70plus : 45;
      let bandRain = 0;
      if (lat < 10) bandRain = b0 + equatorPlus;
      else if (lat < 20) bandRain = b1 + Math.floor(equatorPlus * 0.6);
      else if (lat < 35) bandRain = b2;
      else if (lat < 55) bandRain = b3;
      else if (lat < 70) bandRain = b4;
      else bandRain = b5;
      const baseW = Number.isFinite(blend?.baseWeight) ? blend.baseWeight : 0.6;
      const bandW = Number.isFinite(blend?.bandWeight) ? blend.bandWeight : 0.4;
      let currentRainfall = Math.round(base * baseW + bandRain * bandW);
      const hi1T = Number.isFinite(orographic?.hi1Threshold) ? orographic.hi1Threshold : 350;
      const hi1B = Number.isFinite(orographic?.hi1Bonus) ? orographic.hi1Bonus : 8;
      const hi2T = Number.isFinite(orographic?.hi2Threshold) ? orographic.hi2Threshold : 600;
      const hi2B = Number.isFinite(orographic?.hi2Bonus) ? orographic.hi2Bonus : 7;
      if (elevation > hi1T) currentRainfall += hi1B;
      if (elevation > hi2T) currentRainfall += hi2B;
      const coastalBonus = Number.isFinite(coastalCfg.coastalLandBonus) ? coastalCfg.coastalLandBonus : 24;
      const dist = distMap[y * width + x];
      if (dist > 0 && dist <= maxSpread) {
        const factor = 1 - (dist - 1) / maxSpread;
        currentRainfall += coastalBonus * factor;
      }
      currentRainfall += rollNoise(x, y);
      writeRainfall(x, y, currentRainfall);
    }
  }
}
function refineClimateEarthlike(width, height, ctx = null, options = {}) {
  const runtime = createClimateRuntime(width, height, ctx);
  const { adapter, readRainfall, writeRainfall } = runtime;
  const dynamics = ctx?.foundation?.dynamics;
  const tunables = getTunables();
  const climateCfg = tunables.CLIMATE_CFG || {};
  const refineCfg = climateCfg.refine || {};
  const storyMoisture = climateCfg.story;
  const storyRain = storyMoisture?.rainfall || {};
  const orogenyCache = options?.orogenyCache || null;
  const StoryTags = getStoryTags();
  const inBounds2 = (x, y) => inBounds(x, y, width, height);
  console.log(`[Climate Refinement] Using ${ctx ? "MapContext adapter" : "direct engine calls"}`);
  {
    const waterGradient = refineCfg.waterGradient || {};
    const maxR = (waterGradient?.radius ?? 5) | 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        let rf = readRainfall(x, y);
        const dist = distanceToNearestWater(x, y, maxR, adapter, width, height);
        if (dist >= 0) {
          const elev = adapter.getElevation(x, y);
          let bonus = Math.max(0, maxR - dist) * (waterGradient?.perRingBonus ?? 5);
          if (elev < 150) bonus += waterGradient?.lowlandBonus ?? 3;
          rf += bonus;
          writeRainfall(x, y, rf);
        }
      }
    }
  }
  {
    const orographic = refineCfg.orographic || {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        const baseSteps = (orographic?.steps ?? 4) | 0;
        let steps = baseSteps;
        try {
          const DIR = tunables.FOUNDATION_DIRECTIONALITY || {};
          const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
          const interplay = DIR.interplay;
          const windC = Math.max(0, Math.min(1, interplay?.windsFollowPlates ?? 0));
          const extra = Math.round(coh * windC);
          steps = Math.max(1, baseSteps + extra);
        } catch {
          steps = baseSteps;
        }
        let barrier = 0;
        const dynamicsEnabled = dynamics && dynamics.windU && dynamics.windV;
        if (dynamicsEnabled) {
          barrier = hasUpwindBarrierWM(x, y, steps, adapter, width, height, dynamics);
        } else {
          const lat = Math.abs(adapter.getLatitude(x, y));
          const dx = lat < 30 || lat >= 60 ? -1 : 1;
          const dy = 0;
          barrier = hasUpwindBarrier(x, y, dx, dy, steps, adapter, width, height);
        }
        if (barrier) {
          const rf = readRainfall(x, y);
          const reduction = (orographic?.reductionBase ?? 8) + barrier * (orographic?.reductionPerStep ?? 6);
          writeRainfall(x, y, rf - reduction);
        }
      }
    }
  }
  {
    const riverCorridor = refineCfg.riverCorridor || {};
    const lowBasinCfg = refineCfg.lowBasin || {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        let rf = readRainfall(x, y);
        const elev = adapter.getElevation(x, y);
        if (adapter.isAdjacentToRivers(x, y, 1)) {
          rf += elev < 250 ? riverCorridor?.lowlandAdjacencyBonus ?? 14 : riverCorridor?.highlandAdjacencyBonus ?? 10;
        }
        let lowBasinClosed = true;
        const basinRadius = lowBasinCfg?.radius ?? 2;
        for (let dy = -basinRadius; dy <= basinRadius && lowBasinClosed; dy++) {
          for (let dx = -basinRadius; dx <= basinRadius; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (inBounds2(nx, ny)) {
              if (adapter.getElevation(nx, ny) < elev + 20) {
                lowBasinClosed = false;
                break;
              }
            }
          }
        }
        if (lowBasinClosed && elev < 200) rf += lowBasinCfg?.delta ?? 6;
        writeRainfall(x, y, rf);
      }
    }
  }
  {
    const riftR = storyRain?.riftRadius ?? 2;
    const riftBoost = storyRain?.riftBoost ?? 8;
    if (StoryTags.riftLine.size > 0 && riftR > 0 && riftBoost !== 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (adapter.isWater(x, y)) continue;
          let nearRift = false;
          for (let dy = -riftR; dy <= riftR && !nearRift; dy++) {
            for (let dx = -riftR; dx <= riftR; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (!inBounds2(nx, ny)) continue;
              if (StoryTags.riftLine.has(`${nx},${ny}`)) {
                nearRift = true;
                break;
              }
            }
          }
          if (nearRift) {
            const rf = readRainfall(x, y);
            const elev = adapter.getElevation(x, y);
            const penalty = Math.max(0, Math.floor((elev - 200) / 150));
            const delta = Math.max(0, riftBoost - penalty);
            writeRainfall(x, y, rf + delta);
          }
        }
      }
    }
  }
  {
    const storyTunables = tunables.FOUNDATION_CFG?.story || {};
    const orogenyTunables = storyTunables.orogeny || {};
    if (tunables.STORY_ENABLE_OROGENY && orogenyCache !== null) {
      const windwardSet = orogenyCache.windward;
      const leeSet = orogenyCache.lee;
      const hasWindward = (windwardSet?.size ?? 0) > 0;
      const hasLee = (leeSet?.size ?? 0) > 0;
      if (hasWindward || hasLee) {
        const windwardBoost = orogenyTunables?.windwardBoost ?? 5;
        const leeAmp = orogenyTunables?.leeDrynessAmplifier ?? 1.2;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (adapter.isWater(x, y)) continue;
            let rf = readRainfall(x, y);
            const key = `${x},${y}`;
            if (hasWindward && windwardSet && windwardSet.has(key)) {
              rf = clamp3(rf + windwardBoost, 0, 200);
            }
            if (hasLee && leeSet && leeSet.has(key)) {
              const baseSubtract = 8;
              const extra = Math.max(0, Math.round(baseSubtract * (leeAmp - 1)));
              rf = clamp3(rf - (baseSubtract + extra), 0, 200);
            }
            writeRainfall(x, y, rf);
          }
        }
      }
    }
  }
  {
    const paradiseDelta = storyRain?.paradiseDelta ?? 6;
    const volcanicDelta = storyRain?.volcanicDelta ?? 8;
    const radius = 2;
    const hasParadise = StoryTags.hotspotParadise.size > 0;
    const hasVolcanic = StoryTags.hotspotVolcanic.size > 0;
    if (hasParadise || hasVolcanic) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (adapter.isWater(x, y)) continue;
          let nearParadise = false;
          let nearVolcanic = false;
          for (let dy = -radius; dy <= radius && (!nearParadise || !nearVolcanic); dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (!inBounds2(nx, ny)) continue;
              const key = `${nx},${ny}`;
              if (!nearParadise && hasParadise && StoryTags.hotspotParadise.has(key))
                nearParadise = true;
              if (!nearVolcanic && hasVolcanic && StoryTags.hotspotVolcanic.has(key))
                nearVolcanic = true;
              if (nearParadise && nearVolcanic) break;
            }
          }
          if (nearParadise || nearVolcanic) {
            const rf = readRainfall(x, y);
            let delta = 0;
            if (nearParadise) delta += paradiseDelta;
            if (nearVolcanic) delta += volcanicDelta;
            writeRainfall(x, y, rf + delta);
          }
        }
      }
    }
  }
}
function resolveBiomeGlobals(adapter) {
  return {
    tundra: adapter.getBiomeGlobal("tundra"),
    tropical: adapter.getBiomeGlobal("tropical"),
    grassland: adapter.getBiomeGlobal("grassland"),
    plains: adapter.getBiomeGlobal("plains"),
    desert: adapter.getBiomeGlobal("desert"),
    snow: adapter.getBiomeGlobal("snow")
  };
}
function isCoastalLand(adapter, x, y, width, height) {
  if (adapter.isWater(x, y)) return false;
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
    [x - 1, y - 1],
    [x + 1, y + 1]
  ];
  for (const [nx, ny] of neighbors) {
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      if (adapter.isWater(nx, ny)) return true;
    }
  }
  return false;
}
function designateEnhancedBiomes(iWidth, iHeight, ctx) {
  console.log("Creating enhanced biome diversity (climate-aware)...");
  if (!ctx?.adapter) {
    console.warn("designateEnhancedBiomes: No adapter available, skipping");
    return;
  }
  const adapter = ctx.adapter;
  const globals = resolveBiomeGlobals(adapter);
  adapter.designateBiomes(iWidth, iHeight);
  const tunables = getTunables();
  const foundationCfg = tunables.FOUNDATION_CFG || {};
  const biomesCfg = foundationCfg.biomes || {};
  const corridorPolicy = foundationCfg.corridors || {};
  const StoryTags = getStoryTags();
  const _tundra = biomesCfg.tundra || {};
  const TUNDRA_LAT_MIN = Number.isFinite(_tundra.latMin) ? _tundra.latMin : 70;
  const TUNDRA_ELEV_MIN = Number.isFinite(_tundra.elevMin) ? _tundra.elevMin : 850;
  const TUNDRA_RAIN_MAX = Number.isFinite(_tundra.rainMax) ? _tundra.rainMax : 90;
  const _tcoast = biomesCfg.tropicalCoast || {};
  const TCOAST_LAT_MAX = Number.isFinite(_tcoast.latMax) ? _tcoast.latMax : 18;
  const TCOAST_RAIN_MIN = Number.isFinite(_tcoast.rainMin) ? _tcoast.rainMin : 105;
  const _rv = biomesCfg.riverValleyGrassland || {};
  const RV_LAT_MAX = Number.isFinite(_rv.latMax) ? _rv.latMax : 50;
  const RV_RAIN_MIN = Number.isFinite(_rv.rainMin) ? _rv.rainMin : 75;
  const _rs = biomesCfg.riftShoulder || {};
  const RS_GRASS_LAT_MAX = Number.isFinite(_rs.grasslandLatMax) ? _rs.grasslandLatMax : 50;
  const RS_GRASS_RAIN_MIN = Number.isFinite(_rs.grasslandRainMin) ? _rs.grasslandRainMin : 75;
  const RS_TROP_LAT_MAX = Number.isFinite(_rs.tropicalLatMax) ? _rs.tropicalLatMax : 18;
  const RS_TROP_RAIN_MIN = Number.isFinite(_rs.tropicalRainMin) ? _rs.tropicalRainMin : 100;
  const LAND_BIAS_STRENGTH = Math.max(
    0,
    Math.min(1, corridorPolicy?.land?.biomesBiasStrength ?? 0.6)
  );
  const RIVER_BIAS_STRENGTH = Math.max(
    0,
    Math.min(1, corridorPolicy?.river?.biomesBiasStrength ?? 0.5)
  );
  const getRandom = (label, max) => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    return adapter.getRandomNumber(max, label);
  };
  for (let y = 0; y < iHeight; y++) {
    for (let x = 0; x < iWidth; x++) {
      if (adapter.isWater(x, y)) continue;
      const lat = Math.abs(adapter.getLatitude(x, y));
      const elevation = adapter.getElevation(x, y);
      const rainfall = adapter.getRainfall(x, y);
      if ((lat > TUNDRA_LAT_MIN || elevation > TUNDRA_ELEV_MIN) && rainfall < TUNDRA_RAIN_MAX) {
        adapter.setBiomeType(x, y, globals.tundra);
        continue;
      }
      if (lat < TCOAST_LAT_MAX && isCoastalLand(adapter, x, y, iWidth, iHeight) && rainfall > TCOAST_RAIN_MIN) {
        adapter.setBiomeType(x, y, globals.tropical);
      }
      if (adapter.isAdjacentToRivers(x, y, 1) && rainfall > RV_RAIN_MIN && lat < RV_LAT_MAX) {
        adapter.setBiomeType(x, y, globals.grassland);
      }
      if (StoryTags.corridorLandOpen && StoryTags.corridorLandOpen.has(`${x},${y}`)) {
        if (rainfall > 80 && lat < 55 && getRandom("Corridor Land-Open Biome", 100) < Math.round(LAND_BIAS_STRENGTH * 100)) {
          adapter.setBiomeType(x, y, globals.grassland);
        }
      }
      if (StoryTags.corridorRiverChain && StoryTags.corridorRiverChain.has(`${x},${y}`)) {
        if (rainfall > 75 && lat < 55 && getRandom("Corridor River-Chain Biome", 100) < Math.round(RIVER_BIAS_STRENGTH * 100)) {
          adapter.setBiomeType(x, y, globals.grassland);
        }
      }
      {
        if (!(StoryTags.corridorLandOpen?.has?.(`${x},${y}`) || StoryTags.corridorRiverChain?.has?.(`${x},${y}`))) {
          let edgeAttr = null;
          for (let ddy = -1; ddy <= 1 && !edgeAttr; ddy++) {
            for (let ddx = -1; ddx <= 1; ddx++) {
              if (ddx === 0 && ddy === 0) continue;
              const nx = x + ddx;
              const ny = y + ddy;
              const nk = `${nx},${ny}`;
              if (!StoryTags) continue;
              if (StoryTags.corridorLandOpen?.has?.(nk) || StoryTags.corridorRiverChain?.has?.(nk)) {
                const attr = StoryTags.corridorAttributes?.get?.(nk);
                if (attr && attr.edge) edgeAttr = attr;
              }
            }
          }
          if (edgeAttr && edgeAttr.edge) {
            const edgeCfg = edgeAttr.edge;
            const forestRimChance = Math.max(
              0,
              Math.min(1, edgeCfg.forestRimChance ?? 0)
            );
            if (forestRimChance > 0 && rainfall > 90 && getRandom("Corr Forest Rim", 100) < Math.round(forestRimChance * 100)) {
              const target = lat < 22 && rainfall > 110 ? globals.tropical : globals.grassland;
              adapter.setBiomeType(x, y, target);
            }
            const hillRimChance = Math.max(
              0,
              Math.min(1, edgeCfg.hillRimChance ?? 0)
            );
            const mountainRimChance = Math.max(
              0,
              Math.min(1, edgeCfg.mountainRimChance ?? 0)
            );
            const escarpmentChance = Math.max(
              0,
              Math.min(1, edgeCfg.escarpmentChance ?? 0)
            );
            const reliefChance = Math.max(
              0,
              Math.min(1, hillRimChance + mountainRimChance + escarpmentChance)
            );
            if (reliefChance > 0 && getRandom("Corr Relief Rim", 100) < Math.round(reliefChance * 100)) {
              const elev = adapter.getElevation(x, y);
              const target = (lat > 62 || elev > 800) && rainfall < 95 ? globals.tundra : globals.plains;
              adapter.setBiomeType(x, y, target);
            }
          }
        }
      }
      {
        const cKey = `${x},${y}`;
        const attr = StoryTags.corridorAttributes?.get?.(cKey);
        const cKind = attr?.kind || StoryTags.corridorKind && StoryTags.corridorKind.get(cKey);
        const biomesCfgCorridor = attr?.biomes;
        if ((cKind === "land" || cKind === "river") && biomesCfgCorridor) {
          const strength = cKind === "land" ? LAND_BIAS_STRENGTH : RIVER_BIAS_STRENGTH;
          if (strength > 0 && getRandom("Corridor Kind Bias", 100) < Math.round(strength * 100)) {
            const entries = Object.keys(biomesCfgCorridor);
            let totalW = 0;
            for (const k of entries) totalW += Math.max(0, biomesCfgCorridor[k] || 0);
            if (totalW > 0) {
              let roll = getRandom("Corridor Kind Pick", totalW);
              let chosen = entries[0];
              for (const k of entries) {
                const w = Math.max(0, biomesCfgCorridor[k] || 0);
                if (roll < w) {
                  chosen = k;
                  break;
                }
                roll -= w;
              }
              let target = null;
              if (chosen === "desert") target = globals.desert;
              else if (chosen === "plains") target = globals.plains;
              else if (chosen === "grassland") target = globals.grassland;
              else if (chosen === "tropical") target = globals.tropical;
              else if (chosen === "tundra") target = globals.tundra;
              else if (chosen === "snow") target = globals.snow;
              if (target != null) {
                let ok = true;
                if (target === globals.desert && rainfall > 110) ok = false;
                if (target === globals.tropical && !(lat < 25 && rainfall > 95))
                  ok = false;
                if (target === globals.tundra && !(lat > 60 || elevation > 800))
                  ok = false;
                if (target === globals.snow && !(lat > 70 || elevation > 900))
                  ok = false;
                if (ok) {
                  adapter.setBiomeType(x, y, target);
                }
              }
            }
          }
        }
      }
      if (tunables.STORY_ENABLE_RIFTS && StoryTags.riftShoulder.size > 0) {
        const key = `${x},${y}`;
        if (StoryTags.riftShoulder.has(key)) {
          if (lat < RS_GRASS_LAT_MAX && rainfall > RS_GRASS_RAIN_MIN) {
            adapter.setBiomeType(x, y, globals.grassland);
          } else if (lat < RS_TROP_LAT_MAX && rainfall > RS_TROP_RAIN_MIN) {
            adapter.setBiomeType(x, y, globals.tropical);
          }
        }
      }
    }
  }
}
function addDiverseFeatures(iWidth, iHeight, ctx) {
  console.log("Adding diverse terrain features...");
  if (!ctx?.adapter) {
    console.warn("addDiverseFeatures: No adapter available, skipping");
    return;
  }
  const adapter = ctx.adapter;
  const inBounds2 = (x, y) => inBounds(x, y, iWidth, iHeight);
  adapter.addFeatures(iWidth, iHeight);
  const tunables = getTunables();
  const foundationCfg = tunables.FOUNDATION_CFG || {};
  const storyTunables = foundationCfg.story || {};
  const featuresCfg = storyTunables.features || {};
  const densityCfg = foundationCfg.featuresDensity || {};
  const StoryTags = getStoryTags();
  const reefIndex = adapter.getFeatureTypeIndex("FEATURE_REEF");
  const rainforestIdx = adapter.getFeatureTypeIndex("FEATURE_RAINFOREST");
  const forestIdx = adapter.getFeatureTypeIndex("FEATURE_FOREST");
  const taigaIdx = adapter.getFeatureTypeIndex("FEATURE_TAIGA");
  const g_GrasslandBiome = adapter.getBiomeGlobal("grassland");
  const g_TropicalBiome = adapter.getBiomeGlobal("tropical");
  const g_TundraBiome = adapter.getBiomeGlobal("tundra");
  const NO_FEATURE = adapter.NO_FEATURE;
  const getRandom = (label, max) => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    return adapter.getRandomNumber(max, label);
  };
  const paradiseReefChance = featuresCfg?.paradiseReefChance ?? 18;
  if (tunables.STORY_ENABLE_HOTSPOTS && reefIndex !== -1 && StoryTags.hotspotParadise.size > 0 && paradiseReefChance > 0) {
    for (const key of StoryTags.hotspotParadise) {
      const [cx, cy] = key.split(",").map(Number);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!inBounds2(nx, ny)) continue;
          if (!adapter.isWater(nx, ny)) continue;
          if (adapter.getFeatureType(nx, ny) !== NO_FEATURE) continue;
          if (getRandom("Paradise Reef", 100) < paradiseReefChance) {
            const canPlace = adapter.canHaveFeature(nx, ny, reefIndex);
            if (canPlace) {
              adapter.setFeatureType(nx, ny, {
                Feature: reefIndex,
                Direction: -1,
                Elevation: 0
              });
            }
          }
        }
      }
    }
  }
  if (reefIndex !== -1 && StoryTags.passiveShelf && StoryTags.passiveShelf.size > 0) {
    const shelfMult = densityCfg?.shelfReefMultiplier ?? 0.6;
    const shelfReefChance = Math.max(
      1,
      Math.min(100, Math.floor((paradiseReefChance || 18) * shelfMult))
    );
    for (const key of StoryTags.passiveShelf) {
      const [sx, sy] = key.split(",").map(Number);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = sx + dx;
          const ny = sy + dy;
          if (!inBounds2(nx, ny)) continue;
          if (!adapter.isWater(nx, ny)) continue;
          if (adapter.getFeatureType(nx, ny) !== NO_FEATURE) continue;
          if (getRandom("Shelf Reef", 100) < shelfReefChance) {
            const canPlace = adapter.canHaveFeature(nx, ny, reefIndex);
            if (canPlace) {
              adapter.setFeatureType(nx, ny, {
                Feature: reefIndex,
                Direction: -1,
                Elevation: 0
              });
            }
          }
        }
      }
    }
  }
  const baseVolcanicForestChance = featuresCfg?.volcanicForestChance ?? 22;
  const baseVolcanicTaigaChance = featuresCfg?.volcanicTaigaChance ?? 25;
  const volcanicForestChance = Math.min(100, baseVolcanicForestChance + 6);
  const volcanicTaigaChance = Math.min(100, baseVolcanicTaigaChance + 5);
  const rainforestExtraChance = densityCfg?.rainforestExtraChance ?? 55;
  const forestExtraChance = densityCfg?.forestExtraChance ?? 30;
  const taigaExtraChance = densityCfg?.taigaExtraChance ?? 35;
  for (let y = 0; y < iHeight; y++) {
    for (let x = 0; x < iWidth; x++) {
      if (adapter.isWater(x, y)) continue;
      if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;
      const biome = adapter.getBiomeType(x, y);
      const elevation = adapter.getElevation(x, y);
      const rainfall = adapter.getRainfall(x, y);
      const plat = Math.abs(adapter.getLatitude(x, y));
      if (tunables.STORY_ENABLE_HOTSPOTS && StoryTags.hotspotVolcanic.size > 0) {
        let nearVolcanic = false;
        for (let vdy = -1; vdy <= 1 && !nearVolcanic; vdy++) {
          for (let vdx = -1; vdx <= 1; vdx++) {
            if (vdx === 0 && vdy === 0) continue;
            const vx = x + vdx;
            const vy = y + vdy;
            if (!inBounds2(vx, vy)) continue;
            if (StoryTags.hotspotVolcanic.has(`${vx},${vy}`)) {
              nearVolcanic = true;
              break;
            }
          }
        }
        if (nearVolcanic) {
          if (forestIdx !== -1 && rainfall > 95 && (biome === g_GrasslandBiome || biome === g_TropicalBiome)) {
            if (getRandom("Volcanic Forest", 100) < volcanicForestChance) {
              const canPlace = adapter.canHaveFeature(x, y, forestIdx);
              if (canPlace) {
                adapter.setFeatureType(x, y, {
                  Feature: forestIdx,
                  Direction: -1,
                  Elevation: 0
                });
                continue;
              }
            }
          }
          if (taigaIdx !== -1 && plat >= 55 && biome === g_TundraBiome && elevation < 400 && rainfall > 60) {
            if (getRandom("Volcanic Taiga", 100) < volcanicTaigaChance) {
              const canPlace = adapter.canHaveFeature(x, y, taigaIdx);
              if (canPlace) {
                adapter.setFeatureType(x, y, {
                  Feature: taigaIdx,
                  Direction: -1,
                  Elevation: 0
                });
                continue;
              }
            }
          }
        }
      }
      if (rainforestIdx !== -1 && biome === g_TropicalBiome && rainfall > 130) {
        if (getRandom("Extra Jungle", 100) < rainforestExtraChance) {
          const canPlace = adapter.canHaveFeature(x, y, rainforestIdx);
          if (canPlace) {
            adapter.setFeatureType(x, y, {
              Feature: rainforestIdx,
              Direction: -1,
              Elevation: 0
            });
            continue;
          }
        }
      }
      if (forestIdx !== -1 && biome === g_GrasslandBiome && rainfall > 100) {
        if (getRandom("Extra Forest", 100) < forestExtraChance) {
          const canPlace = adapter.canHaveFeature(x, y, forestIdx);
          if (canPlace) {
            adapter.setFeatureType(x, y, {
              Feature: forestIdx,
              Direction: -1,
              Elevation: 0
            });
            continue;
          }
        }
      }
      if (taigaIdx !== -1 && biome === g_TundraBiome && elevation < 300) {
        if (getRandom("Extra Taiga", 100) < taigaExtraChance) {
          const canPlace = adapter.canHaveFeature(x, y, taigaIdx);
          if (canPlace) {
            adapter.setFeatureType(x, y, {
              Feature: taigaIdx,
              Direction: -1,
              Elevation: 0
            });
            continue;
          }
        }
      }
    }
  }
}
function resolveNaturalWonderCount(mapInfo, wondersPlusOne) {
  if (!mapInfo || typeof mapInfo.NumNaturalWonders !== "number") {
    return 1;
  }
  if (wondersPlusOne) {
    return Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
  }
  return mapInfo.NumNaturalWonders;
}
function getPlacementConfig() {
  try {
    const tunables = getTunables();
    const foundationCfg = tunables.FOUNDATION_CFG;
    if (foundationCfg && typeof foundationCfg === "object" && "placement" in foundationCfg) {
      return foundationCfg.placement || {};
    }
  } catch {
  }
  return {};
}
function logTerrainStats(adapter, width, height, stage) {
  let flat = 0;
  let hill = 0;
  let mtn = 0;
  let water = 0;
  const total = width * height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) {
        water++;
        continue;
      }
      const t = adapter.getTerrainType(x, y);
      if (t === MOUNTAIN_TERRAIN) mtn++;
      else if (t === HILL_TERRAIN) hill++;
      else flat++;
    }
  }
  const land = Math.max(1, flat + hill + mtn);
  console.log(`[Placement] Stats (${stage}):`);
  console.log(`  Water: ${(water / total * 100).toFixed(1)}%`);
  console.log(`  Land:  ${(land / total * 100).toFixed(1)}% (${land} tiles)`);
  console.log(`    Mtn:  ${(mtn / land * 100).toFixed(1)}%`);
  console.log(`    Hill: ${(hill / land * 100).toFixed(1)}%`);
  console.log(`    Flat: ${(flat / land * 100).toFixed(1)}%`);
}
function logAsciiMap(adapter, width, height) {
  console.log("[Placement] Final Map ASCII:");
  for (let y = height - 1; y >= 0; y--) {
    let row = "";
    if (y % 2 !== 0) row += " ";
    for (let x = 0; x < width; x++) {
      const t = adapter.getTerrainType(x, y);
      row += getTerrainSymbol(t) + " ";
    }
    console.log(row);
  }
}
function runPlacement(adapter, iWidth, iHeight, options = {}) {
  console.log("[SWOOPER_MOD] === runPlacement() CALLED ===");
  console.log(`[SWOOPER_MOD] Map size: ${iWidth}x${iHeight}`);
  logTerrainStats(adapter, iWidth, iHeight, "Initial");
  const { mapInfo, wondersPlusOne, floodplains, starts } = options;
  const placementCfg = getPlacementConfig();
  const startPositions = [];
  try {
    const useWondersPlusOne = typeof wondersPlusOne === "boolean" ? wondersPlusOne : typeof placementCfg.wondersPlusOne === "boolean" ? placementCfg.wondersPlusOne : true;
    const wonders = resolveNaturalWonderCount(mapInfo, useWondersPlusOne);
    adapter.addNaturalWonders(iWidth, iHeight, wonders);
  } catch (err) {
    console.log("[Placement] addNaturalWonders failed:", err);
  }
  try {
    const floodplainsCfg = floodplains || placementCfg.floodplains || {};
    const minLen = typeof floodplainsCfg.minLength === "number" ? floodplainsCfg.minLength : 4;
    const maxLen = typeof floodplainsCfg.maxLength === "number" ? floodplainsCfg.maxLength : 10;
    adapter.addFloodplains(minLen, maxLen);
  } catch (err) {
    console.log("[Placement] addFloodplains failed:", err);
  }
  try {
    adapter.validateAndFixTerrain();
    console.log("[Placement] Terrain validated successfully");
    logTerrainStats(adapter, iWidth, iHeight, "After validateAndFixTerrain");
  } catch (err) {
    console.log("[Placement] validateAndFixTerrain failed:", err);
  }
  try {
    adapter.recalculateAreas();
    console.log("[Placement] Areas recalculated successfully");
  } catch (err) {
    console.log("[Placement] AreaBuilder.recalculateAreas failed:", err);
  }
  try {
    adapter.storeWaterData();
    console.log("[Placement] Water data stored successfully");
  } catch (err) {
    console.log("[Placement] storeWaterData failed:", err);
  }
  try {
    adapter.generateSnow(iWidth, iHeight);
  } catch (err) {
    console.log("[Placement] generateSnow failed:", err);
  }
  try {
    adapter.generateResources(iWidth, iHeight);
  } catch (err) {
    console.log("[Placement] generateResources failed:", err);
  }
  try {
    if (!starts) {
      console.log("[Placement] Start placement skipped (no starts config provided).");
    } else {
      const {
        playersLandmass1,
        playersLandmass2,
        westContinent,
        eastContinent,
        startSectorRows,
        startSectorCols,
        startSectors
      } = starts;
      const totalPlayers = playersLandmass1 + playersLandmass2;
      console.log(`[START_DEBUG] === Beginning Start Placement ===`);
      console.log(
        `[START_DEBUG] Players: ${totalPlayers} total (${playersLandmass1} landmass1, ${playersLandmass2} landmass2)`
      );
      console.log(
        `[START_DEBUG] Continents: west=${JSON.stringify(westContinent)}, east=${JSON.stringify(eastContinent)}`
      );
      console.log(
        `[START_DEBUG] Sectors: ${startSectorRows}x${startSectorCols} grid, ${startSectors.length} sectors chosen`
      );
      const pos = adapter.assignStartPositions(
        playersLandmass1,
        playersLandmass2,
        westContinent,
        eastContinent,
        startSectorRows,
        startSectorCols,
        startSectors
      );
      const successCount = pos ? pos.filter((p) => p !== void 0 && p >= 0).length : 0;
      console.log(
        `[START_DEBUG] Result: ${successCount}/${totalPlayers} civilizations placed successfully`
      );
      if (successCount < totalPlayers) {
        console.log(
          `[START_DEBUG] WARNING: ${totalPlayers - successCount} civilizations failed to find valid start locations!`
        );
      }
      console.log(`[START_DEBUG] === End Start Placement ===`);
      if (Array.isArray(pos)) {
        startPositions.push(...pos);
      }
      if (successCount === totalPlayers) {
        console.log("[Placement] Start positions assigned successfully");
      } else {
        console.log(
          `[Placement] Start positions assignment incomplete: ${totalPlayers - successCount} failures`
        );
      }
    }
  } catch (err) {
    console.log("[Placement] assignStartPositions failed:", err);
  }
  try {
    adapter.generateDiscoveries(iWidth, iHeight, startPositions);
    console.log("[Placement] Discoveries generated successfully");
  } catch (err) {
    console.log("[Placement] generateDiscoveries failed:", err);
  }
  try {
    adapter.recalculateFertility();
    console.log("[Placement] Fertility recalculated successfully");
  } catch (err) {
    console.log("[Placement] FertilityBuilder.recalculate failed:", err);
  }
  try {
    adapter.assignAdvancedStartRegions();
  } catch (err) {
    console.log("[Placement] assignAdvancedStartRegions failed:", err);
  }
  logTerrainStats(adapter, iWidth, iHeight, "Final");
  logAsciiMap(adapter, iWidth, iHeight);
  return startPositions;
}

// ../../packages/mapgen-core/dist/chunk-XKWIAPFK.js
function safeTimestamp() {
  try {
    return typeof Date?.now === "function" ? Date.now() : null;
  } catch {
    return null;
  }
}
function freezeRngState(state2) {
  if (!state2 || typeof state2 !== "object") return null;
  const clone2 = {};
  for (const key of Object.keys(state2)) {
    clone2[key] = state2[key];
  }
  return Object.freeze(clone2);
}
function normalizeSeedConfig(config) {
  const cfg = config || {};
  const wantsFixed = cfg.seedMode === "fixed";
  const hasFixed = wantsFixed && Number.isFinite(cfg.fixedSeed);
  const seedMode = hasFixed ? "fixed" : "engine";
  const fixedSeed = hasFixed ? Math.trunc(cfg.fixedSeed) : null;
  const seedOffset = Number.isFinite(cfg.seedOffset) ? Math.trunc(cfg.seedOffset) : 0;
  return { seedMode, fixedSeed, seedOffset };
}
function getRandomImpl() {
  try {
    const global = globalThis;
    if (global.RandomImpl && typeof global.RandomImpl === "object") {
      return global.RandomImpl;
    }
  } catch {
  }
  return null;
}
function applySeedControl(seedMode, fixedSeed, seedOffset) {
  const RandomImpl = getRandomImpl();
  if (!RandomImpl || typeof RandomImpl.getState !== "function" || typeof RandomImpl.setState !== "function") {
    return { restore: null, seed: null, rngState: null };
  }
  let originalState = null;
  try {
    originalState = RandomImpl.getState();
  } catch {
    originalState = null;
  }
  if (!originalState || typeof originalState !== "object") {
    return { restore: null, seed: null, rngState: null };
  }
  const hasFixed = seedMode === "fixed" && Number.isFinite(fixedSeed);
  const offsetValue = Number.isFinite(seedOffset) ? Math.trunc(seedOffset) : 0;
  let seedValue = null;
  if (hasFixed) {
    seedValue = Math.trunc(fixedSeed);
  } else {
    const base = originalState.state;
    if (typeof base === "bigint") {
      seedValue = Number(base & 0xffffffffn);
    } else if (typeof base === "number") {
      seedValue = base >>> 0;
    }
  }
  if (seedValue == null) {
    const restore2 = () => {
      try {
        RandomImpl.setState(originalState);
      } catch {
      }
    };
    return { restore: restore2, seed: null, rngState: freezeRngState(originalState) };
  }
  seedValue = offsetValue ? seedValue + offsetValue >>> 0 : seedValue >>> 0;
  let appliedState = null;
  try {
    if (typeof RandomImpl.seed === "function") {
      RandomImpl.seed(seedValue >>> 0);
      appliedState = RandomImpl.getState?.() ?? null;
    } else {
      const nextState = { ...originalState };
      if (typeof nextState.state === "bigint") {
        nextState.state = BigInt(seedValue >>> 0);
      } else {
        nextState.state = seedValue >>> 0;
      }
      RandomImpl.setState(nextState);
      appliedState = nextState;
    }
  } catch {
    appliedState = null;
  }
  const restore = () => {
    try {
      RandomImpl.setState(originalState);
    } catch {
    }
  };
  return { restore, seed: seedValue >>> 0, rngState: freezeRngState(appliedState) };
}
function normalizeSites(sites) {
  if (!Array.isArray(sites) || sites.length === 0) return null;
  const frozen = sites.map((site, index) => {
    if (site && typeof site === "object") {
      const id = site.id ?? index;
      const x = site.x ?? 0;
      const y = site.y ?? 0;
      return Object.freeze({ id, x, y });
    }
    return Object.freeze({ id: index, x: 0, y: 0 });
  });
  return Object.freeze(frozen);
}
var PlateSeedManager = {
  capture(width, height, config) {
    const seedCfg = normalizeSeedConfig(config);
    const timestamp = safeTimestamp();
    const control = applySeedControl(seedCfg.seedMode, seedCfg.fixedSeed, seedCfg.seedOffset);
    const snapshot = {
      width,
      height,
      seedMode: seedCfg.seedMode,
      seedOffset: seedCfg.seedOffset
    };
    if (seedCfg.fixedSeed != null) snapshot.fixedSeed = seedCfg.fixedSeed;
    if (timestamp != null) snapshot.timestamp = timestamp;
    if (control.seed != null) snapshot.seed = control.seed;
    if (control.rngState) snapshot.rngState = control.rngState;
    return {
      snapshot: Object.freeze(snapshot),
      restore: typeof control.restore === "function" ? control.restore : null
    };
  },
  finalize(baseSnapshot, extras = {}) {
    if (!baseSnapshot || typeof baseSnapshot !== "object") return null;
    const { config = null, meta = null } = extras;
    const result = {
      width: baseSnapshot.width,
      height: baseSnapshot.height,
      seedMode: baseSnapshot.seedMode
    };
    if (baseSnapshot.timestamp != null) result.timestamp = baseSnapshot.timestamp;
    if (baseSnapshot.seedOffset != null) result.seedOffset = baseSnapshot.seedOffset;
    if (baseSnapshot.seed != null) result.seed = baseSnapshot.seed;
    if (baseSnapshot.fixedSeed != null) result.fixedSeed = baseSnapshot.fixedSeed;
    if (baseSnapshot.rngState) result.rngState = baseSnapshot.rngState;
    if (config && typeof config === "object") {
      result.config = Object.freeze({ ...config });
    }
    const seeds = Array.isArray(meta?.seedLocations) ? meta.seedLocations : Array.isArray(meta?.sites) ? meta.sites : null;
    const normalizedSites = normalizeSites(seeds);
    if (normalizedSites) {
      result.seedLocations = normalizedSites;
      result.sites = normalizedSites;
    }
    return Object.freeze(result);
  }
};
var DefaultVoronoiUtils = {
  createRandomSites(count, width, height) {
    const sites = [];
    for (let id = 0; id < count; id++) {
      const seed1 = id * 1664525 + 1013904223 >>> 0;
      const seed2 = seed1 * 1664525 + 1013904223 >>> 0;
      const x = seed1 % 1e4 / 1e4 * width;
      const y = seed2 % 1e4 / 1e4 * height;
      sites.push({
        x,
        y,
        voronoiId: id
      });
    }
    return sites;
  },
  computeVoronoi(sites, bbox, relaxationSteps = 0) {
    let currentSites = [...sites];
    for (let step = 0; step < relaxationSteps; step++) {
      currentSites = currentSites.map((site, i) => ({
        ...site,
        voronoiId: i
      }));
    }
    const cells = currentSites.map((site) => ({
      site,
      halfedges: []
      // Simplified - not computing actual edges
    }));
    return {
      cells,
      edges: [],
      vertices: []
    };
  },
  calculateCellArea(cell) {
    return 100;
  },
  normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < 1e-10) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  }
};
var injectedVoronoiUtils = null;
var injectedVoronoiLabel = null;
var loggedInjectedVoronoi = false;
function adaptGlobalVoronoiUtils() {
  const globalUtils = globalThis.VoronoiUtils;
  if (globalUtils && typeof globalUtils.computeVoronoi === "function") {
    return {
      utils: {
        createRandomSites: (count, width, height) => globalUtils.createRandomSites(
          count,
          width,
          height
        ),
        computeVoronoi: (sites, bbox, relaxationSteps = 0) => globalUtils.computeVoronoi(
          sites,
          bbox,
          relaxationSteps
        ),
        calculateCellArea: (cell) => globalUtils.calculateCellArea(cell),
        normalize: (v) => globalUtils.normalize(v)
      },
      label: "global"
    };
  }
  return { utils: null, label: "fallback" };
}
function resolveVoronoiUtils(options) {
  if (options.voronoiUtils) {
    return { utils: options.voronoiUtils, label: "custom" };
  }
  const globalUtils = adaptGlobalVoronoiUtils();
  if (globalUtils.utils) {
    return { utils: globalUtils.utils, label: globalUtils.label };
  }
  if (injectedVoronoiUtils) {
    return { utils: injectedVoronoiUtils, label: injectedVoronoiLabel ?? "injected" };
  }
  return { utils: DefaultVoronoiUtils, label: "fallback" };
}
function createPlateRegion(name, id, type, maxArea, color, rng) {
  const angle = rng(360, "PlateAngle") * Math.PI / 180;
  const speed = 0.5 + rng(100, "PlateSpeed") / 200;
  return {
    name,
    id,
    type,
    maxArea,
    color,
    seedLocation: { x: 0, y: 0 },
    m_movement: {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    },
    m_rotation: (rng(60, "PlateRotation") - 30) * 0.1
    // -3 to +3 degrees
  };
}
function toByte(f) {
  return Math.max(0, Math.min(255, Math.round(f * 255))) | 0;
}
function clampInt8(v) {
  return Math.max(-127, Math.min(127, v)) | 0;
}
function dot2(a, b) {
  return a.x * b.x + a.y * b.y;
}
function dot2_90(a, b) {
  return -a.y * b.x + a.x * b.y;
}
function rotate2(v, angleRad) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos
  };
}
var HEX_WIDTH = Math.sqrt(3);
var HEX_HEIGHT = 1.5;
var HALF_HEX_HEIGHT = HEX_HEIGHT / 2;
function projectToHexSpace(x, y) {
  const px = x * HEX_WIDTH;
  const py = y * HEX_HEIGHT + (Math.floor(x) & 1 ? HALF_HEX_HEIGHT : 0);
  return { px, py };
}
function wrappedHexDistanceSq(a, b, wrapWidth) {
  const rawDx = Math.abs(a.px - b.px);
  const dx = Math.min(rawDx, wrapWidth - rawDx);
  const dy = a.py - b.py;
  return dx * dx + dy * dy;
}
function getHexNeighbors(x, y, width, height) {
  const neighbors = [];
  const isOddCol = (x & 1) === 1;
  const offsets = isOddCol ? [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, 1],
    [1, 1]
  ] : [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1]
  ];
  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    const wrappedX = (nx % width + width) % width;
    if (ny >= 0 && ny < height) {
      neighbors.push({ x: wrappedX, y: ny, i: ny * width + wrappedX });
    }
  }
  return neighbors;
}
function detectBoundaryTiles(plateId, width, height) {
  const size = width * height;
  const isBoundary = new Uint8Array(size);
  const neighborPlates = new Int16Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const myPlate = plateId[i];
      neighborPlates[i] = -1;
      const neighbors = getHexNeighbors(x, y, width, height);
      for (const n of neighbors) {
        const otherPlate = plateId[n.i];
        if (otherPlate !== myPlate) {
          isBoundary[i] = 1;
          neighborPlates[i] = otherPlate;
          break;
        }
      }
    }
  }
  return { isBoundary, neighborPlates };
}
function computeDistanceField(isBoundary, width, height, maxDistance = 20) {
  const size = width * height;
  const distance = new Uint8Array(size);
  distance.fill(255);
  const queue = [];
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) {
      distance[i] = 0;
      queue.push(i);
    }
  }
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const d = distance[i];
    if (d >= maxDistance) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    const neighbors = getHexNeighbors(x, y, width, height);
    for (const n of neighbors) {
      if (distance[n.i] > d + 1) {
        distance[n.i] = d + 1;
        queue.push(n.i);
      }
    }
  }
  return distance;
}
function calculatePlateMovement(plate, pos, rotationMultiple) {
  if (!plate || !plate.seedLocation) {
    return { x: 0, y: 0 };
  }
  const relPos = {
    x: pos.x - plate.seedLocation.x,
    y: pos.y - plate.seedLocation.y
  };
  const angularMovement = plate.m_rotation * Math.PI / 180 * rotationMultiple;
  const rotatedPos = rotate2(relPos, angularMovement);
  const rotationMovement = {
    x: relPos.x - rotatedPos.x,
    y: relPos.y - rotatedPos.y
  };
  return {
    x: rotationMovement.x + plate.m_movement.x,
    y: rotationMovement.y + plate.m_movement.y
  };
}
function computeBoundaryPhysicsForTiles(isBoundary, neighborPlates, plateId, plateRegions, width, height, plateRotationMultiple, normalize) {
  const size = width * height;
  const subduction = new Float32Array(size);
  const sliding = new Float32Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!isBoundary[i]) continue;
      const plate1Id = plateId[i];
      const plate2Id = neighborPlates[i];
      if (plate2Id < 0 || plate2Id >= plateRegions.length) continue;
      const plate1 = plateRegions[plate1Id];
      const plate2 = plateRegions[plate2Id];
      if (!plate1 || !plate2) continue;
      const pos = { x, y };
      const movement1 = calculatePlateMovement(plate1, pos, plateRotationMultiple);
      const movement2 = calculatePlateMovement(plate2, pos, plateRotationMultiple);
      const normal = normalize({
        x: plate2.seedLocation.x - plate1.seedLocation.x,
        y: plate2.seedLocation.y - plate1.seedLocation.y
      });
      subduction[i] = dot2(normal, movement1) - dot2(normal, movement2);
      sliding[i] = Math.abs(dot2_90(normal, movement1) - dot2_90(normal, movement2));
    }
  }
  return { subduction, sliding };
}
function assignBoundaryTypesWithInheritance(distanceField, isBoundary, _neighborPlates, physics, boundaryType, boundaryCloseness, upliftPotential, riftPotential, shieldStability, tectonicStress, width, height, maxInfluenceDistance = 5, decay = 0.55) {
  const size = width * height;
  const convThreshold = 0.25;
  const divThreshold = -0.15;
  const transformThreshold = 0.4;
  for (let i = 0; i < size; i++) {
    if (!isBoundary[i]) continue;
    const sub = physics.subduction[i];
    const slid = physics.sliding[i];
    if (sub > convThreshold) {
      boundaryType[i] = BOUNDARY_TYPE.convergent;
    } else if (sub < divThreshold) {
      boundaryType[i] = BOUNDARY_TYPE.divergent;
    } else if (slid > transformThreshold) {
      boundaryType[i] = BOUNDARY_TYPE.transform;
    } else {
      boundaryType[i] = BOUNDARY_TYPE.none;
    }
  }
  const inheritedFrom = new Int32Array(size);
  inheritedFrom.fill(-1);
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) {
      inheritedFrom[i] = i;
    }
  }
  const queue = [];
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) queue.push(i);
  }
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const d = distanceField[i];
    if (d >= maxInfluenceDistance) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    const neighbors = getHexNeighbors(x, y, width, height);
    for (const n of neighbors) {
      if (inheritedFrom[n.i] < 0 && distanceField[n.i] === d + 1) {
        inheritedFrom[n.i] = inheritedFrom[i];
        queue.push(n.i);
      }
    }
  }
  for (let i = 0; i < size; i++) {
    const dist = distanceField[i];
    if (dist >= maxInfluenceDistance) {
      boundaryCloseness[i] = 0;
      boundaryType[i] = BOUNDARY_TYPE.none;
      upliftPotential[i] = 0;
      riftPotential[i] = 0;
      shieldStability[i] = 255;
      tectonicStress[i] = 0;
      continue;
    }
    const closeness = Math.exp(-dist * decay);
    const closeness255 = toByte(closeness);
    boundaryCloseness[i] = closeness255;
    const sourceIdx = inheritedFrom[i];
    if (sourceIdx >= 0 && !isBoundary[i]) {
      boundaryType[i] = boundaryType[sourceIdx];
    }
    const bType = boundaryType[i];
    tectonicStress[i] = closeness255;
    shieldStability[i] = 255 - closeness255;
    if (bType === BOUNDARY_TYPE.convergent) {
      upliftPotential[i] = closeness255;
      riftPotential[i] = closeness255 >> 2;
    } else if (bType === BOUNDARY_TYPE.divergent) {
      upliftPotential[i] = closeness255 >> 2;
      riftPotential[i] = closeness255;
    } else {
      upliftPotential[i] = closeness255 >> 2;
      riftPotential[i] = closeness255 >> 2;
    }
  }
}
function summarizeBoundaryCoverage(isBoundary, boundaryCloseness) {
  const size = isBoundary.length || 1;
  let boundaryTiles = 0;
  let influencedTiles = 0;
  let closenessSum = 0;
  let closenessInfluencedSum = 0;
  let maxCloseness = 0;
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) boundaryTiles++;
    const c = boundaryCloseness[i] | 0;
    if (c > 0) influencedTiles++;
    closenessSum += c;
    if (c > 0) closenessInfluencedSum += c;
    if (c > maxCloseness) maxCloseness = c;
  }
  return {
    boundaryTileShare: boundaryTiles / size,
    boundaryInfluenceShare: influencedTiles / size,
    avgCloseness: closenessSum / size,
    avgInfluenceCloseness: influencedTiles > 0 ? closenessInfluencedSum / influencedTiles : 0,
    maxCloseness,
    boundaryTiles,
    influencedTiles,
    totalTiles: size
  };
}
function computePlatesVoronoi(width, height, config, options = {}) {
  const voronoiChoice = resolveVoronoiUtils(options);
  if (voronoiChoice.label !== "fallback" && !loggedInjectedVoronoi) {
    console.log(
      `[WorldModel] Using ${voronoiChoice.label} Voronoi utilities (${width}x${height})`
    );
    loggedInjectedVoronoi = true;
  }
  const {
    count = 8,
    relaxationSteps = 5,
    convergenceMix = 0.5,
    plateRotationMultiple = 1,
    directionality = null
  } = config;
  const voronoiUtils = voronoiChoice.utils;
  const allowPlateDownsample = voronoiChoice.label === "fallback";
  const rng = options.rng || ((max, _label) => {
    const global = globalThis;
    if (global.TerrainBuilder && typeof global.TerrainBuilder.getRandomNumber === "function") {
      return global.TerrainBuilder.getRandomNumber(
        max,
        _label
      );
    }
    return Math.floor(Math.random() * max);
  });
  const size = width * height;
  const meta = {
    width,
    height,
    config: {
      count,
      relaxationSteps,
      convergenceMix,
      plateRotationMultiple
    },
    seedLocations: []
  };
  const runGeneration = (attempt = {}) => {
    const {
      cellDensity = 3e-3,
      boundaryInfluenceDistance = 3,
      boundaryDecay = 0.8,
      plateCountOverride = null
    } = attempt;
    const plateCount = Math.max(2, plateCountOverride ?? count);
    const wrapWidthPx = width * HEX_WIDTH;
    const bbox = { xl: 0, xr: width, yt: 0, yb: height };
    const sites = voronoiUtils.createRandomSites(plateCount, bbox.xr, bbox.yb);
    const diagram = voronoiUtils.computeVoronoi(sites, bbox, relaxationSteps);
    const plateRegions = diagram.cells.map((cell, index) => {
      const region = createPlateRegion(
        `Plate${index}`,
        index,
        0,
        bbox.xr * bbox.yb,
        { x: Math.random(), y: Math.random(), z: Math.random() },
        rng
      );
      region.seedLocation = { x: cell.site.x, y: cell.site.y };
      if (directionality) {
        applyDirectionalityBias(region, directionality, rng);
      }
      return region;
    });
    const plateCenters = plateRegions.map(
      (region) => projectToHexSpace(region.seedLocation.x, region.seedLocation.y)
    );
    if (!plateRegions.length) {
      throw new Error("[WorldModel] Plate generation returned zero plates");
    }
    meta.seedLocations = plateRegions.map((region, id) => ({
      id,
      x: region.seedLocation?.x ?? 0,
      y: region.seedLocation?.y ?? 0
    }));
    const cellCount = Math.max(
      plateCount * 2,
      Math.floor(width * height * cellDensity),
      plateCount
    );
    const cellSites = voronoiUtils.createRandomSites(cellCount, bbox.xr, bbox.yb);
    const cellDiagram = voronoiUtils.computeVoronoi(cellSites, bbox, 2);
    const regionCells = cellDiagram.cells.map((cell, index) => ({
      cell,
      id: index,
      area: voronoiUtils.calculateCellArea(cell),
      plateId: -1
    }));
    for (const regionCell of regionCells) {
      const pos = { x: regionCell.cell.site.x, y: regionCell.cell.site.y };
      const posHex = projectToHexSpace(pos.x, pos.y);
      let bestDist = Infinity;
      let bestPlateId = -1;
      for (let i = 0; i < plateRegions.length; i++) {
        const dist = wrappedHexDistanceSq(posHex, plateCenters[i], wrapWidthPx);
        if (dist < bestDist) {
          bestDist = dist;
          bestPlateId = i;
        }
      }
      regionCell.plateId = bestPlateId;
    }
    const plateId = new Int16Array(size);
    const boundaryCloseness = new Uint8Array(size);
    const boundaryType = new Uint8Array(size);
    const tectonicStress = new Uint8Array(size);
    const upliftPotential = new Uint8Array(size);
    const riftPotential = new Uint8Array(size);
    const shieldStability = new Uint8Array(size);
    const plateMovementU = new Int8Array(size);
    const plateMovementV = new Int8Array(size);
    const plateRotation = new Int8Array(size);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let bestDist = Infinity;
        let pId = 0;
        const tileHex = projectToHexSpace(x, y);
        for (let p = 0; p < plateRegions.length; p++) {
          const dist = wrappedHexDistanceSq(tileHex, plateCenters[p], wrapWidthPx);
          if (dist < bestDist) {
            bestDist = dist;
            pId = p;
          }
        }
        plateId[i] = pId;
        const plate = plateRegions[pId];
        const movement = calculatePlateMovement(plate, { x, y }, plateRotationMultiple);
        plateMovementU[i] = clampInt8(Math.round(movement.x * 100));
        plateMovementV[i] = clampInt8(Math.round(movement.y * 100));
        plateRotation[i] = clampInt8(Math.round(plate.m_rotation * 100));
      }
    }
    const { isBoundary, neighborPlates } = detectBoundaryTiles(plateId, width, height);
    const distanceField = computeDistanceField(
      isBoundary,
      width,
      height,
      boundaryInfluenceDistance + 1
    );
    const physics = computeBoundaryPhysicsForTiles(
      isBoundary,
      neighborPlates,
      plateId,
      plateRegions,
      width,
      height,
      plateRotationMultiple,
      voronoiUtils.normalize
    );
    assignBoundaryTypesWithInheritance(
      distanceField,
      isBoundary,
      neighborPlates,
      physics,
      boundaryType,
      boundaryCloseness,
      upliftPotential,
      riftPotential,
      shieldStability,
      tectonicStress,
      width,
      height,
      boundaryInfluenceDistance,
      boundaryDecay
    );
    const boundaryStats = summarizeBoundaryCoverage(isBoundary, boundaryCloseness);
    meta.boundaryStats = boundaryStats;
    return {
      plateId,
      boundaryCloseness,
      boundaryType,
      tectonicStress,
      upliftPotential,
      riftPotential,
      shieldStability,
      plateMovementU,
      plateMovementV,
      plateRotation,
      boundaryTree: null,
      plateRegions,
      meta
    };
  };
  const attempts = [
    { cellDensity: 3e-3, boundaryInfluenceDistance: 3, boundaryDecay: 0.8 },
    { cellDensity: 2e-3, boundaryInfluenceDistance: 2, boundaryDecay: 0.9 },
    allowPlateDownsample ? {
      cellDensity: 2e-3,
      boundaryInfluenceDistance: 2,
      boundaryDecay: 0.9,
      plateCountOverride: Math.max(6, Math.round(count * 0.6))
    } : {
      cellDensity: 2e-3,
      boundaryInfluenceDistance: 2,
      boundaryDecay: 0.95,
      plateCountOverride: count
    },
    allowPlateDownsample ? {
      cellDensity: 15e-4,
      boundaryInfluenceDistance: 2,
      boundaryDecay: 1,
      plateCountOverride: Math.max(4, Math.round(count * 0.4))
    } : {
      cellDensity: 15e-4,
      boundaryInfluenceDistance: 2,
      boundaryDecay: 1,
      plateCountOverride: count
    }
  ];
  const saturationLimit = 0.45;
  const closenessLimit = 80;
  let lastResult = null;
  for (const attempt of attempts) {
    const result = runGeneration(attempt);
    lastResult = result;
    const stats = result.meta?.boundaryStats;
    const boundaryShare = stats?.boundaryInfluenceShare ?? 1;
    const boundaryTileShare = stats?.boundaryTileShare ?? 1;
    const avgInfluenceCloseness = stats?.avgInfluenceCloseness ?? 255;
    if (boundaryShare <= saturationLimit && boundaryTileShare <= saturationLimit && avgInfluenceCloseness <= closenessLimit) {
      return result;
    }
  }
  return lastResult;
}
function applyDirectionalityBias(plate, directionality, rng) {
  const cohesion = Math.max(0, Math.min(1, directionality.cohesion ?? 0));
  const plateAxisDeg = (directionality.primaryAxes?.plateAxisDeg ?? 0) | 0;
  const angleJitterDeg = (directionality.variability?.angleJitterDeg ?? 0) | 0;
  const magnitudeVariance = directionality.variability?.magnitudeVariance ?? 0.35;
  const currentAngle = Math.atan2(plate.m_movement.y, plate.m_movement.x) * 180 / Math.PI;
  const currentMag = Math.sqrt(plate.m_movement.x ** 2 + plate.m_movement.y ** 2);
  const jitter = rng(angleJitterDeg * 2 + 1, "PlateDirJit") - angleJitterDeg;
  const targetAngle = currentAngle * (1 - cohesion) + plateAxisDeg * cohesion + jitter * magnitudeVariance;
  const rad = targetAngle * Math.PI / 180;
  plate.m_movement.x = Math.cos(rad) * currentMag;
  plate.m_movement.y = Math.sin(rad) * currentMag;
}
var _state = {
  initialized: false,
  width: 0,
  height: 0,
  plateId: null,
  boundaryCloseness: null,
  boundaryType: null,
  tectonicStress: null,
  upliftPotential: null,
  riftPotential: null,
  shieldStability: null,
  plateMovementU: null,
  plateMovementV: null,
  plateRotation: null,
  windU: null,
  windV: null,
  currentU: null,
  currentV: null,
  pressure: null,
  boundaryTree: null,
  plateSeed: null
};
var _configProvider = null;
function setConfigProvider(provider) {
  _configProvider = provider;
}
function getConfig() {
  if (_configProvider) {
    return _configProvider();
  }
  throw new Error(
    "WorldModel configuration provider not set. MapOrchestrator must bind a provider before WorldModel.init()."
  );
}
function idx3(x, y, width) {
  return y * width + x;
}
function clampInt3(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v | 0;
}
function toByte01(f) {
  const v = Math.max(0, Math.min(1, f));
  return Math.round(v * 255) | 0;
}
function toByte2(v) {
  if (v <= 1 && v >= 0) return toByte01(v);
  return clampInt3(Math.round(v), 0, 255);
}
function computePlates(width, height, options) {
  const config = getConfig();
  const platesCfg = config.plates || {};
  const count = platesCfg.count | 0;
  const convergenceMix = platesCfg.convergenceMix;
  const relaxationSteps = platesCfg.relaxationSteps | 0;
  const plateRotationMultiple = platesCfg.plateRotationMultiple;
  const seedMode = platesCfg.seedMode;
  const seedOffset = Math.trunc(platesCfg.seedOffset);
  const fixedSeed = Number.isFinite(platesCfg.fixedSeed) ? Math.trunc(platesCfg.fixedSeed) : void 0;
  const configSnapshot = {
    count,
    relaxationSteps,
    convergenceMix,
    plateRotationMultiple,
    seedMode,
    fixedSeed,
    seedOffset,
    directionality: config.directionality ?? null
  };
  console.log(
    `[WorldModel] Config plates.count=${count}, relaxationSteps=${relaxationSteps}, convergenceMix=${convergenceMix}, rotationMultiple=${plateRotationMultiple}, seedMode=${seedMode}, directionality.cohesion=${configSnapshot.directionality?.cohesion ?? "n/a"}`
  );
  const { snapshot: seedBase, restore: restoreSeed } = PlateSeedManager.capture(
    width,
    height,
    configSnapshot
  );
  let plateData = null;
  try {
    plateData = computePlatesVoronoi(width, height, configSnapshot, options);
  } finally {
    if (typeof restoreSeed === "function") {
      try {
        restoreSeed();
      } catch {
      }
    }
  }
  if (!plateData) {
    const fallbackConfig = Object.freeze({ ...configSnapshot });
    const fallbackSeed = seedBase ? Object.freeze({
      ...seedBase,
      config: fallbackConfig
    }) : Object.freeze({
      width,
      height,
      seedMode: "engine",
      config: fallbackConfig
    });
    _state.plateSeed = PlateSeedManager.finalize(seedBase, { config: configSnapshot }) || fallbackSeed;
    return;
  }
  _state.plateId.set(plateData.plateId);
  _state.boundaryCloseness.set(plateData.boundaryCloseness);
  _state.boundaryType.set(plateData.boundaryType);
  _state.tectonicStress.set(plateData.tectonicStress);
  _state.upliftPotential.set(plateData.upliftPotential);
  _state.riftPotential.set(plateData.riftPotential);
  _state.shieldStability.set(plateData.shieldStability);
  _state.plateMovementU.set(plateData.plateMovementU);
  _state.plateMovementV.set(plateData.plateMovementV);
  _state.plateRotation.set(plateData.plateRotation);
  _state.boundaryTree = plateData.boundaryTree;
  const meta = plateData.meta;
  _state.plateSeed = PlateSeedManager.finalize(seedBase, {
    config: configSnapshot,
    meta: meta ? { seedLocations: meta.seedLocations } : void 0
  }) || Object.freeze({
    width,
    height,
    seedMode: "engine",
    config: Object.freeze({ ...configSnapshot })
  });
}
function computePressure(width, height, rng) {
  const size = width * height;
  const pressure = _state.pressure;
  if (!pressure) return;
  const config = getConfig();
  const mantleCfg = config.dynamics?.mantle || {};
  const bumps = mantleCfg.bumps | 0;
  const amp = mantleCfg.amplitude;
  const scl = mantleCfg.scale;
  const sigma = Math.max(4, Math.floor(Math.min(width, height) * scl));
  const getRandom = rng || getDefaultRng();
  const centers = [];
  for (let i = 0; i < bumps; i++) {
    const cx = getRandom(width, "PressCX");
    const cy = getRandom(height, "PressCY");
    const a = amp * (0.75 + getRandom(50, "PressA") / 100);
    centers.push({ x: Math.floor(cx), y: Math.floor(cy), a });
  }
  const acc = new Float32Array(size);
  const inv2s2 = 1 / (2 * sigma * sigma);
  let maxVal = 1e-6;
  for (let k = 0; k < centers.length; k++) {
    const { x: cx, y: cy, a } = centers[k];
    const yMin = Math.max(0, cy - sigma * 2);
    const yMax = Math.min(height - 1, cy + sigma * 2);
    const xMin = Math.max(0, cx - sigma * 2);
    const xMax = Math.min(width - 1, cx + sigma * 2);
    for (let y = yMin; y <= yMax; y++) {
      const dy = y - cy;
      for (let x = xMin; x <= xMax; x++) {
        const dx = x - cx;
        const e = Math.exp(-(dx * dx + dy * dy) * inv2s2);
        const v = a * e;
        const i = idx3(x, y, width);
        acc[i] += v;
        if (acc[i] > maxVal) maxVal = acc[i];
      }
    }
  }
  for (let i = 0; i < size; i++) {
    pressure[i] = toByte2(acc[i] / maxVal);
  }
}
function computeWinds(width, height, getLatitude, rng) {
  const U = _state.windU;
  const V = _state.windV;
  if (!U || !V) return;
  const config = getConfig();
  const windCfg = config.dynamics?.wind || {};
  const streaks = windCfg.jetStreaks | 0;
  const jetStrength = windCfg.jetStrength;
  const variance = windCfg.variance;
  const getRandom = rng || getDefaultRng();
  const getLat = getLatitude || ((x, y) => {
    const global = globalThis;
    if (global.GameplayMap && typeof global.GameplayMap.getPlotLatitude === "function") {
      return global.GameplayMap.getPlotLatitude(x, y);
    }
    return (y / height * 180 - 90) * -1;
  });
  const streakLats = [];
  for (let s = 0; s < streaks; s++) {
    const base = 30 + s * (30 / Math.max(1, streaks - 1));
    const jitter = getRandom(12, "JetJit") - 6;
    streakLats.push(Math.max(15, Math.min(75, base + jitter)));
  }
  for (let y = 0; y < height; y++) {
    const latDeg = Math.abs(getLat(0, y));
    let u = latDeg < 30 || latDeg >= 60 ? -80 : 80;
    const v = 0;
    for (let k = 0; k < streakLats.length; k++) {
      const d = Math.abs(latDeg - streakLats[k]);
      const f = Math.max(0, 1 - d / 12);
      if (f > 0) {
        const boost = Math.round(32 * jetStrength * f);
        u += latDeg < streakLats[k] ? boost : -boost;
      }
    }
    const varU = Math.round((getRandom(21, "WindUVar") - 10) * variance) | 0;
    const varV = Math.round((getRandom(11, "WindVVar") - 5) * variance) | 0;
    for (let x = 0; x < width; x++) {
      const i = idx3(x, y, width);
      U[i] = clampInt3(u + varU, -127, 127);
      V[i] = clampInt3(v + varV, -127, 127);
    }
  }
}
function computeCurrents(width, height, isWater, getLatitude) {
  const U = _state.currentU;
  const V = _state.currentV;
  if (!U || !V) return;
  const checkWater = isWater || ((x, y) => {
    const global = globalThis;
    if (global.GameplayMap && typeof global.GameplayMap.isWater === "function") {
      return global.GameplayMap.isWater(
        x,
        y
      );
    }
    return false;
  });
  const getLat = getLatitude || ((x, y) => {
    const global = globalThis;
    if (global.GameplayMap && typeof global.GameplayMap.getPlotLatitude === "function") {
      return global.GameplayMap.getPlotLatitude(x, y);
    }
    return (y / height * 180 - 90) * -1;
  });
  for (let y = 0; y < height; y++) {
    const latDeg = Math.abs(getLat(0, y));
    let baseU = 0;
    const baseV = 0;
    if (latDeg < 12) {
      baseU = -50;
    } else if (latDeg >= 45 && latDeg < 60) {
      baseU = 20;
    } else if (latDeg >= 60) {
      baseU = -15;
    }
    for (let x = 0; x < width; x++) {
      const i = idx3(x, y, width);
      if (checkWater(x, y)) {
        U[i] = clampInt3(baseU, -127, 127);
        V[i] = clampInt3(baseV, -127, 127);
      } else {
        U[i] = 0;
        V[i] = 0;
      }
    }
  }
}
function getDefaultRng() {
  const global = globalThis;
  if (global.TerrainBuilder) {
    const tb = global.TerrainBuilder;
    if (typeof tb.getRandomNumber === "function") {
      console.log("[WorldModel] Using TerrainBuilder.getRandomNumber as RNG");
      return tb.getRandomNumber.bind(tb);
    }
  }
  console.log("[WorldModel] Using Math.random as RNG");
  return (max) => Math.floor(Math.random() * max);
}
var WorldModel = {
  get initialized() {
    return _state.initialized;
  },
  get width() {
    return _state.width;
  },
  get height() {
    return _state.height;
  },
  isEnabled() {
    return !!_state.initialized;
  },
  init(options = {}) {
    if (_state.initialized) return true;
    let width = options.width;
    let height = options.height;
    if (width === void 0 || height === void 0) {
      const global = globalThis;
      if (global.GameplayMap) {
        const gm = global.GameplayMap;
        if (typeof gm.getGridWidth === "function" && typeof gm.getGridHeight === "function") {
          width = width ?? gm.getGridWidth();
          height = height ?? gm.getGridHeight();
        }
      }
    }
    if (width === void 0 || height === void 0) {
      console.warn("[WorldModel] Cannot initialize: dimensions not available");
      return false;
    }
    _state.width = width | 0;
    _state.height = height | 0;
    const size = Math.max(0, width * height) | 0;
    console.log(
      `[WorldModel] init starting with dimensions ${_state.width}x${_state.height} (size=${size})`
    );
    _state.plateId = new Int16Array(size);
    _state.boundaryCloseness = new Uint8Array(size);
    _state.boundaryType = new Uint8Array(size);
    _state.tectonicStress = new Uint8Array(size);
    _state.upliftPotential = new Uint8Array(size);
    _state.riftPotential = new Uint8Array(size);
    _state.shieldStability = new Uint8Array(size);
    _state.plateMovementU = new Int8Array(size);
    _state.plateMovementV = new Int8Array(size);
    _state.plateRotation = new Int8Array(size);
    _state.windU = new Int8Array(size);
    _state.windV = new Int8Array(size);
    _state.currentU = new Int8Array(size);
    _state.currentV = new Int8Array(size);
    _state.pressure = new Uint8Array(size);
    console.log("[WorldModel] computePlates starting");
    computePlates(width, height, options.plateOptions);
    console.log("[WorldModel] computePlates succeeded");
    console.log("[WorldModel] computePressure starting");
    computePressure(width, height, options.rng);
    console.log("[WorldModel] computePressure succeeded");
    console.log("[WorldModel] computeWinds starting");
    computeWinds(width, height, options.getLatitude, options.rng);
    console.log("[WorldModel] computeWinds succeeded");
    console.log("[WorldModel] computeCurrents starting");
    computeCurrents(width, height, options.isWater, options.getLatitude);
    console.log("[WorldModel] computeCurrents succeeded");
    _state.initialized = true;
    console.log("[WorldModel] init completed successfully");
    return true;
  },
  reset() {
    _state.initialized = false;
    _state.width = 0;
    _state.height = 0;
    _state.plateId = null;
    _state.boundaryCloseness = null;
    _state.boundaryType = null;
    _state.tectonicStress = null;
    _state.upliftPotential = null;
    _state.riftPotential = null;
    _state.shieldStability = null;
    _state.plateMovementU = null;
    _state.plateMovementV = null;
    _state.plateRotation = null;
    _state.windU = null;
    _state.windV = null;
    _state.currentU = null;
    _state.currentV = null;
    _state.pressure = null;
    _state.boundaryTree = null;
    _state.plateSeed = null;
  },
  get plateId() {
    return _state.plateId;
  },
  get boundaryCloseness() {
    return _state.boundaryCloseness;
  },
  get boundaryType() {
    return _state.boundaryType;
  },
  get tectonicStress() {
    return _state.tectonicStress;
  },
  get upliftPotential() {
    return _state.upliftPotential;
  },
  get riftPotential() {
    return _state.riftPotential;
  },
  get shieldStability() {
    return _state.shieldStability;
  },
  get windU() {
    return _state.windU;
  },
  get windV() {
    return _state.windV;
  },
  get currentU() {
    return _state.currentU;
  },
  get currentV() {
    return _state.currentV;
  },
  get pressure() {
    return _state.pressure;
  },
  get plateMovementU() {
    return _state.plateMovementU;
  },
  get plateMovementV() {
    return _state.plateMovementV;
  },
  get plateRotation() {
    return _state.plateRotation;
  },
  get boundaryTree() {
    return _state.boundaryTree;
  },
  get plateSeed() {
    return _state.plateSeed;
  }
};

// ../../packages/mapgen-core/dist/index.js
import "/base-standard/maps/map-globals.js";
import { VoronoiUtils as CivVoronoiUtils } from "/base-standard/scripts/kd-tree.js";
import { designateBiomes as civ7DesignateBiomes, addFeatures as civ7AddFeatures } from "/base-standard/maps/feature-biome-generator.js";
import { addNaturalWonders as civ7AddNaturalWonders } from "/base-standard/maps/natural-wonder-generator.js";
import { generateSnow as civ7GenerateSnow } from "/base-standard/maps/snow-generator.js";
import { generateResources as civ7GenerateResources } from "/base-standard/maps/resource-generator.js";
import { assignStartPositions as civ7AssignStartPositions, chooseStartSectors as civ7ChooseStartSectors } from "/base-standard/maps/assign-starting-plots.js";
import { needHumanNearEquator as civ7NeedHumanNearEquator } from "/base-standard/maps/map-utilities.js";
import { generateDiscoveries as civ7GenerateDiscoveries } from "/base-standard/maps/discovery-generator.js";
import { assignAdvancedStartRegions as civ7AssignAdvancedStartRegions } from "/base-standard/maps/assign-advanced-start-region.js";
var DEV = {
  ENABLED: false,
  LOG_TIMING: false,
  LOG_FOUNDATION_SEED: false,
  LOG_FOUNDATION_PLATES: false,
  LOG_FOUNDATION_DYNAMICS: false,
  LOG_FOUNDATION_SURFACE: false,
  LOG_FOUNDATION_SUMMARY: false,
  LOG_FOUNDATION_ASCII: false,
  LOG_LANDMASS_ASCII: false,
  LOG_LANDMASS_WINDOWS: false,
  LOG_RELIEF_ASCII: false,
  LOG_RAINFALL_ASCII: false,
  LOG_RAINFALL_SUMMARY: false,
  LOG_BIOME_ASCII: false,
  LOG_BIOME_SUMMARY: false,
  LOG_STORY_TAGS: false,
  LOG_CORRIDOR_ASCII: false,
  LOG_BOUNDARY_METRICS: false,
  LOG_MOUNTAINS: false,
  LOG_VOLCANOES: false,
  FOUNDATION_HISTOGRAMS: false,
  LAYER_COUNTS: false
};
function initDevFlags(config) {
  if (!config || typeof config !== "object") return;
  const mapping = {
    enabled: "ENABLED",
    logTiming: "LOG_TIMING",
    logFoundationSeed: "LOG_FOUNDATION_SEED",
    logFoundationPlates: "LOG_FOUNDATION_PLATES",
    logFoundationDynamics: "LOG_FOUNDATION_DYNAMICS",
    logFoundationSurface: "LOG_FOUNDATION_SURFACE",
    logFoundationSummary: "LOG_FOUNDATION_SUMMARY",
    logFoundationAscii: "LOG_FOUNDATION_ASCII",
    logLandmassAscii: "LOG_LANDMASS_ASCII",
    logLandmassWindows: "LOG_LANDMASS_WINDOWS",
    logReliefAscii: "LOG_RELIEF_ASCII",
    logRainfallAscii: "LOG_RAINFALL_ASCII",
    logRainfallSummary: "LOG_RAINFALL_SUMMARY",
    logBiomeAscii: "LOG_BIOME_ASCII",
    logBiomeSummary: "LOG_BIOME_SUMMARY",
    logStoryTags: "LOG_STORY_TAGS",
    logCorridorAscii: "LOG_CORRIDOR_ASCII",
    logBoundaryMetrics: "LOG_BOUNDARY_METRICS",
    logMountains: "LOG_MOUNTAINS",
    logVolcanoes: "LOG_VOLCANOES",
    foundationHistograms: "FOUNDATION_HISTOGRAMS",
    layerCounts: "LAYER_COUNTS"
  };
  for (const [configKey, flagKey] of Object.entries(mapping)) {
    const value = config[configKey];
    if (value !== void 0) {
      DEV[flagKey] = !!value;
    }
  }
}
function isDevEnabled(flag) {
  return !!(DEV.ENABLED && DEV[flag]);
}
var LOG_PREFIX = "[DEV]";
function devLog(...args) {
  if (!DEV.ENABLED) return;
  try {
    console.log(LOG_PREFIX, ...args);
  } catch {
  }
}
function devLogPrefixed(prefix, ...args) {
  if (!DEV.ENABLED) return;
  try {
    console.log(`${LOG_PREFIX}[${prefix}]`, ...args);
  } catch {
  }
}
function devLogJson(label, data) {
  if (!DEV.ENABLED) return;
  try {
    console.log(`${LOG_PREFIX}[${label}]`, JSON.stringify(data));
  } catch {
  }
}
function devLogLines(lines, prefix) {
  if (!DEV.ENABLED) return;
  const pfx = prefix ? `${LOG_PREFIX}[${prefix}]` : LOG_PREFIX;
  try {
    for (const line of lines) {
      console.log(pfx, line);
    }
  } catch {
  }
}
function collectApiKeys(obj) {
  const names = [];
  const seen = /* @__PURE__ */ new Set();
  let current = obj;
  while (current && typeof current === "object") {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
    current = Object.getPrototypeOf(current);
  }
  names.sort();
  return names;
}
function logEngineObjectApi(label, obj) {
  if (!DEV.ENABLED) return;
  if (!obj || typeof obj !== "object" && typeof obj !== "function") {
    devLogPrefixed(
      "ENGINE_API",
      `${label} is not an object/function (typeof=${typeof obj})`
    );
    return;
  }
  const apiKeys = collectApiKeys(obj);
  devLogPrefixed("ENGINE_API", `${label} API (${apiKeys.length} keys)`);
  for (const name of apiKeys) {
    let kind = "unknown";
    try {
      const value = obj[name];
      kind = typeof value === "function" ? `fn(${value.length})` : typeof value;
    } catch {
      kind = "unknown";
    }
    devLogPrefixed("ENGINE_API", `  ${label}.${name}: ${kind}`);
  }
}
var engineApiLogged = false;
function logEngineSurfaceApisOnce() {
  if (!DEV.ENABLED) return;
  if (engineApiLogged) return;
  engineApiLogged = true;
  try {
    const globalAny = globalThis;
    const gameplayMap = globalAny.GameplayMap;
    const terrainBuilder = globalAny.TerrainBuilder;
    const fractalBuilder = globalAny.FractalBuilder;
    const areaBuilder = globalAny.AreaBuilder;
    if (!gameplayMap && !terrainBuilder && !fractalBuilder && !areaBuilder) {
      devLogPrefixed(
        "ENGINE_API",
        "GameplayMap, TerrainBuilder, FractalBuilder, and AreaBuilder are not defined in global scope"
      );
      return;
    }
    if (gameplayMap) {
      logEngineObjectApi("GameplayMap", gameplayMap);
    } else {
      devLogPrefixed("ENGINE_API", "GameplayMap is not defined");
    }
    if (terrainBuilder) {
      logEngineObjectApi("TerrainBuilder", terrainBuilder);
    } else {
      devLogPrefixed("ENGINE_API", "TerrainBuilder is not defined");
    }
    if (fractalBuilder) {
      logEngineObjectApi("FractalBuilder", fractalBuilder);
    } else {
      devLogPrefixed("ENGINE_API", "FractalBuilder is not defined");
    }
    if (areaBuilder) {
      logEngineObjectApi("AreaBuilder", areaBuilder);
    } else {
      devLogPrefixed("ENGINE_API", "AreaBuilder is not defined");
    }
  } catch (err) {
    devLogPrefixed("ENGINE_API", "Failed to introspect engine APIs", err);
  }
}
var ASCII_CHARS = {
  /** Base terrain characters */
  base: {
    water: "~",
    land: ".",
    coast: ","
  },
  /** Plate boundary overlays */
  boundary: {
    convergent: "^",
    divergent: "_",
    transform: "#",
    unknown: "+"
  },
  /** Terrain relief overlays */
  relief: {
    mountain: "M",
    hill: "h",
    volcano: "V",
    flat: "."
  },
  /** Biome overlays */
  biome: {
    desert: "D",
    grassland: "G",
    plains: "P",
    tundra: "T",
    tropical: "J",
    unknown: "?"
  },
  /** Story corridor overlays */
  corridor: {
    seaLane: "S",
    islandHop: "I",
    riverChain: "R",
    landOpen: "L"
  }
};
function computeSampleStep(width, height, requested) {
  if (requested !== void 0 && Number.isFinite(requested)) {
    return Math.max(1, Math.floor(requested));
  }
  const targetCols = 72;
  const targetRows = 48;
  const stepX = width > targetCols ? Math.floor(width / targetCols) : 1;
  const stepY = height > targetRows ? Math.floor(height / targetRows) : 1;
  return Math.max(1, Math.min(stepX, stepY));
}
function renderAsciiGrid(config) {
  const { width, height, cellFn } = config;
  const step = computeSampleStep(width, height, config.sampleStep);
  const rows = [];
  for (let y = 0; y < height; y += step) {
    let row = "";
    for (let x = 0; x < width; x += step) {
      const cell = cellFn(x, y);
      row += cell.overlay ?? cell.base;
    }
    rows.push(row);
  }
  return rows;
}
function logAsciiGrid(flag, label, config, legend) {
  if (!isDevEnabled(flag)) return;
  const step = computeSampleStep(config.width, config.height, config.sampleStep);
  devLog(`${label} (step=${step})${legend ? `: ${legend}` : ""}`);
  const rows = renderAsciiGrid(config);
  devLogLines(rows);
}
function logFoundationAscii(adapter, width, height, foundation, options = {}) {
  if (!isDevEnabled("LOG_FOUNDATION_ASCII")) return;
  const { boundaryCloseness, boundaryType } = foundation;
  if (!boundaryCloseness || !boundaryType) {
    devLog("[foundation] ascii: Missing boundary data");
    return;
  }
  const threshold = Math.round((options.threshold ?? 0.65) * 255);
  const chars = ASCII_CHARS;
  logAsciiGrid(
    "LOG_FOUNDATION_ASCII",
    "[foundation] plates",
    {
      width,
      height,
      sampleStep: options.sampleStep,
      cellFn: (x, y) => {
        const idx22 = y * width + x;
        const isWater = adapter.isWater(x, y);
        const base = isWater ? chars.base.water : chars.base.land;
        const closeness = boundaryCloseness[idx22] ?? 0;
        if (closeness < threshold) {
          return { base };
        }
        const bType = boundaryType[idx22] ?? 0;
        const overlay = bType === 1 ? chars.boundary.convergent : bType === 2 ? chars.boundary.divergent : bType === 3 ? chars.boundary.transform : chars.boundary.unknown;
        return { base, overlay };
      }
    },
    `${chars.base.water}=water ${chars.base.land}=land ${chars.boundary.convergent}=conv ${chars.boundary.divergent}=div ${chars.boundary.transform}=trans`
  );
}
function logLandmassAscii(adapter, width, height, options = {}) {
  if (!isDevEnabled("LOG_LANDMASS_ASCII")) return;
  const chars = ASCII_CHARS;
  logAsciiGrid(
    "LOG_LANDMASS_ASCII",
    "[landmass] continents",
    {
      width,
      height,
      sampleStep: options.sampleStep,
      cellFn: (x, y) => {
        const isWater = adapter.isWater(x, y);
        const base = isWater ? chars.base.water : chars.base.land;
        return { base };
      }
    },
    `${chars.base.water}=water ${chars.base.land}=land`
  );
}
function logReliefAscii(adapter, width, height, options = {}) {
  if (!isDevEnabled("LOG_RELIEF_ASCII")) return;
  const chars = ASCII_CHARS;
  logAsciiGrid(
    "LOG_RELIEF_ASCII",
    "[relief] terrain",
    {
      width,
      height,
      sampleStep: options.sampleStep,
      cellFn: (x, y) => {
        const isWater = adapter.isWater(x, y);
        if (isWater) {
          return { base: chars.base.water };
        }
        const isMountain = adapter.isMountain(x, y);
        const terrainType = adapter.getTerrainType(x, y);
        const isHills = terrainType === HILL_TERRAIN;
        if (isMountain) {
          return { base: chars.base.land, overlay: chars.relief.mountain };
        }
        if (isHills) {
          return { base: chars.base.land, overlay: chars.relief.hill };
        }
        return { base: chars.base.land };
      }
    },
    `${chars.base.water}=water ${chars.relief.mountain}=mountain ${chars.relief.hill}=hill ${chars.base.land}=flat`
  );
}
function buildHistogram(values, bins = 10, range) {
  const n = values.length;
  if (n === 0) {
    return { counts: new Array(bins).fill(0), total: 0, min: 0, max: 0, binWidth: 0 };
  }
  let min, max;
  if (range) {
    [min, max] = range;
  } else {
    min = values[0];
    max = values[0];
    for (let i = 1; i < n; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
  }
  const binWidth = max > min ? (max - min) / bins : 1;
  const counts = new Array(bins).fill(0);
  for (let i = 0; i < n; i++) {
    const v = values[i];
    const binIdx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / binWidth)));
    counts[binIdx]++;
  }
  return { counts, total: n, min, max, binWidth };
}
function formatHistogramPercent(counts, total) {
  if (total === 0) return counts.map(() => "0.0%");
  return counts.map((c) => `${(c / total * 100).toFixed(1)}%`);
}
function logRainfallStats(adapter, width, height, label = "rainfall") {
  if (!isDevEnabled("LOG_RAINFALL_SUMMARY")) return;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let landTiles = 0;
  const buckets = { arid: 0, semiArid: 0, temperate: 0, wet: 0, lush: 0 };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      const value = adapter.getRainfall(x, y);
      landTiles++;
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
      if (value < 25) buckets.arid++;
      else if (value < 60) buckets.semiArid++;
      else if (value < 95) buckets.temperate++;
      else if (value < 130) buckets.wet++;
      else buckets.lush++;
    }
  }
  if (landTiles === 0) {
    devLog(`[${label}] stats: No land tiles`);
    return;
  }
  devLogJson(`${label} stats`, {
    landTiles,
    min,
    max,
    avg: Number((sum / landTiles).toFixed(2)),
    buckets
  });
}
function logFoundationHistograms(width, height, foundation, options = {}) {
  if (!isDevEnabled("FOUNDATION_HISTOGRAMS")) return;
  const { upliftPotential, riftPotential } = foundation;
  if (!upliftPotential || !riftPotential) {
    devLog("[foundation] histograms: Missing uplift/rift data");
    return;
  }
  const bins = Math.max(5, Math.min(20, options.bins ?? 10));
  const size = Math.min(width * height, upliftPotential.length, riftPotential.length);
  const upliftValues = Array.from(upliftPotential.slice(0, size));
  const riftValues = Array.from(riftPotential.slice(0, size));
  const upliftHist = buildHistogram(upliftValues, bins, [0, 255]);
  const riftHist = buildHistogram(riftValues, bins, [0, 255]);
  devLogJson("foundation uplift histogram", {
    samples: upliftHist.total,
    distribution: formatHistogramPercent(upliftHist.counts, upliftHist.total)
  });
  devLogJson("foundation rift histogram", {
    samples: riftHist.total,
    distribution: formatHistogramPercent(riftHist.counts, riftHist.total)
  });
}
function logFoundationSummary(adapter, width, height, foundation) {
  if (!isDevEnabled("LOG_FOUNDATION_SUMMARY")) return;
  const { plateId, boundaryType, boundaryCloseness, upliftPotential, riftPotential } = foundation;
  if (!plateId || !boundaryType || !boundaryCloseness) {
    devLog("[foundation] summary: Missing core fields");
    return;
  }
  const size = width * height;
  const n = Math.min(size, plateId.length, boundaryType.length, boundaryCloseness.length);
  const plates = /* @__PURE__ */ new Set();
  for (let i = 0; i < n; i++) {
    plates.add(plateId[i]);
  }
  const btCounts = [0, 0, 0, 0];
  let boundaryTiles = 0;
  for (let i = 0; i < n; i++) {
    const bt = boundaryType[i];
    if (bt >= 0 && bt < 4) btCounts[bt]++;
    if (boundaryCloseness[i] > 32) boundaryTiles++;
  }
  const avgByte = (arr) => {
    if (!arr || arr.length === 0) return null;
    const m = Math.min(arr.length, size);
    let sum = 0;
    for (let i = 0; i < m; i++) sum += arr[i];
    return Math.round(sum / m);
  };
  const rowSamples = [];
  const sampleRows = [
    0,
    Math.floor(height * 0.25),
    Math.floor(height * 0.5),
    Math.floor(height * 0.75),
    height - 1
  ].filter((y, i, arr) => y >= 0 && y < height && arr.indexOf(y) === i);
  for (const y of sampleRows) {
    let closSum = 0;
    let upliftSum = 0;
    let landCount = 0;
    for (let x = 0; x < width; x++) {
      const idx22 = y * width + x;
      closSum += boundaryCloseness[idx22] ?? 0;
      upliftSum += upliftPotential?.[idx22] ?? 0;
      if (!adapter.isWater(x, y)) landCount++;
    }
    rowSamples.push({
      row: y,
      closAvg: Math.round(closSum / Math.max(1, width)),
      upliftAvg: upliftPotential ? Math.round(upliftSum / Math.max(1, width)) : null,
      landCount
    });
  }
  devLogJson("foundation summary", {
    dimensions: { width, height },
    plates: plates.size,
    boundaryTiles,
    boundaryTypes: {
      none: btCounts[0],
      convergent: btCounts[1],
      divergent: btCounts[2],
      transform: btCounts[3]
    },
    upliftAvg: avgByte(upliftPotential),
    riftAvg: avgByte(riftPotential),
    rowSamples
  });
}
function logBiomeSummary(adapter, width, height, biomeNames) {
  if (!isDevEnabled("LOG_BIOME_SUMMARY")) return;
  const counts = /* @__PURE__ */ new Map();
  let landTiles = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      landTiles++;
      const biomeId = adapter.getBiomeType(x, y);
      counts.set(biomeId, (counts.get(biomeId) ?? 0) + 1);
    }
  }
  if (landTiles === 0) {
    devLog("[biome] summary: No land tiles");
    return;
  }
  const summary = Array.from(counts.entries()).map(([id, count]) => ({
    id,
    name: biomeNames?.get(id) ?? null,
    count,
    share: Number((count / landTiles * 100).toFixed(2))
  })).sort((a, b) => b.count - a.count);
  devLogJson("biome summary", {
    landTiles,
    biomes: summary
  });
}
function logMountainSummary(adapter, width, height) {
  if (!isDevEnabled("LOG_MOUNTAINS")) return;
  let mountains = 0;
  let onLand = 0;
  let coastal = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!adapter.isMountain(x, y)) continue;
      mountains++;
      if (!adapter.isWater(x, y)) onLand++;
      let hasWaterNeighbor = false;
      for (let dy = -1; dy <= 1 && !hasWaterNeighbor; dy++) {
        for (let dx = -1; dx <= 1 && !hasWaterNeighbor; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (adapter.isWater(nx, ny)) hasWaterNeighbor = true;
          }
        }
      }
      if (hasWaterNeighbor) coastal++;
    }
  }
  devLogJson("mountains summary", {
    total: mountains,
    onLand,
    coastal,
    share: width * height > 0 ? `${(mountains / (width * height) * 100).toFixed(2)}%` : "0%"
  });
}
function logVolcanoSummary(adapter, width, height, volcanoFeatureId) {
  if (!isDevEnabled("LOG_VOLCANOES")) return;
  if (volcanoFeatureId === void 0 || volcanoFeatureId < 0) {
    devLog("[volcanoes] summary: Volcano feature ID not available");
    return;
  }
  let volcanoes = 0;
  let onMountain = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const featureType = adapter.getFeatureType(x, y);
      if (featureType === volcanoFeatureId) {
        volcanoes++;
        if (adapter.isMountain(x, y)) onMountain++;
      }
    }
  }
  devLogJson("volcanoes summary", {
    total: volcanoes,
    onMountain
  });
}
globalThis.VoronoiUtils = globalThis.VoronoiUtils || CivVoronoiUtils;
var Civ7Adapter = class {
  width;
  height;
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  // === TERRAIN READS ===
  isWater(x, y) {
    return GameplayMap.isWater(x, y);
  }
  isMountain(x, y) {
    if (typeof GameplayMap.isMountain === "function") {
      return GameplayMap.isMountain(x, y);
    }
    return GameplayMap.getElevation(x, y) >= 500;
  }
  isAdjacentToRivers(x, y, radius = 1) {
    return GameplayMap.isAdjacentToRivers(x, y, radius);
  }
  getElevation(x, y) {
    return GameplayMap.getElevation(x, y);
  }
  getTerrainType(x, y) {
    return GameplayMap.getTerrainType(x, y);
  }
  getRainfall(x, y) {
    return GameplayMap.getRainfall(x, y);
  }
  getTemperature(x, y) {
    return GameplayMap.getTemperature(x, y);
  }
  getLatitude(x, y) {
    return GameplayMap.getPlotLatitude(x, y);
  }
  // === TERRAIN WRITES ===
  setTerrainType(x, y, terrainType) {
    TerrainBuilder.setTerrainType(x, y, terrainType);
  }
  setRainfall(x, y, rainfall) {
    TerrainBuilder.setRainfall(x, y, rainfall);
  }
  setLandmassRegionId(x, y, regionId) {
    TerrainBuilder.setLandmassRegionId(x, y, regionId);
  }
  addPlotTag(x, y, plotTag) {
    TerrainBuilder.addPlotTag(x, y, plotTag);
  }
  setPlotTag(x, y, plotTag) {
    TerrainBuilder.setPlotTag(x, y, plotTag);
  }
  // === FEATURE READS/WRITES ===
  getFeatureType(x, y) {
    return GameplayMap.getFeatureType(x, y);
  }
  setFeatureType(x, y, featureData) {
    TerrainBuilder.setFeatureType(x, y, featureData);
  }
  canHaveFeature(x, y, featureType) {
    return TerrainBuilder.canHaveFeature(x, y, featureType);
  }
  // === RANDOM NUMBER GENERATION ===
  getRandomNumber(max, label) {
    return TerrainBuilder.getRandomNumber(max, label);
  }
  // === UTILITIES ===
  validateAndFixTerrain() {
    TerrainBuilder.validateAndFixTerrain();
  }
  recalculateAreas() {
    AreaBuilder.recalculateAreas();
  }
  createFractal(fractalId, width, height, grain, flags) {
    FractalBuilder.create(fractalId, width, height, grain, flags);
  }
  getFractalHeight(fractalId, x, y) {
    return FractalBuilder.getHeight(fractalId, x, y);
  }
  stampContinents() {
    TerrainBuilder.stampContinents();
  }
  buildElevation() {
    TerrainBuilder.buildElevation();
  }
  modelRivers(minLength, maxLength, navigableTerrain) {
    TerrainBuilder.modelRivers(minLength, maxLength, navigableTerrain);
  }
  defineNamedRivers() {
    TerrainBuilder.defineNamedRivers();
  }
  storeWaterData() {
    TerrainBuilder.storeWaterData();
  }
  // === BIOMES ===
  designateBiomes(width, height) {
    civ7DesignateBiomes(width, height);
  }
  getBiomeGlobal(name) {
    const globalName = `g_${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}Biome`;
    const value = globalThis[globalName];
    return typeof value === "number" ? value : -1;
  }
  setBiomeType(x, y, biomeId) {
    TerrainBuilder.setBiomeType(x, y, biomeId);
  }
  getBiomeType(x, y) {
    return GameplayMap.getBiomeType(x, y);
  }
  // === FEATURES (extended) ===
  addFeatures(width, height) {
    civ7AddFeatures(width, height);
  }
  getFeatureTypeIndex(name) {
    const features = GameInfo?.Features;
    if (!features) return -1;
    const feature = features.find((f) => f.FeatureType === name);
    return feature?.Index ?? -1;
  }
  get NO_FEATURE() {
    return typeof FeatureTypes !== "undefined" && "NO_FEATURE" in FeatureTypes ? FeatureTypes.NO_FEATURE : -1;
  }
  // === PLACEMENT ===
  addNaturalWonders(width, height, numWonders) {
    civ7AddNaturalWonders(width, height, numWonders);
  }
  generateSnow(width, height) {
    civ7GenerateSnow(width, height);
  }
  generateResources(width, height) {
    civ7GenerateResources(width, height);
  }
  assignStartPositions(playersLandmass1, playersLandmass2, westContinent, eastContinent, startSectorRows, startSectorCols, startSectors) {
    const result = civ7AssignStartPositions(
      playersLandmass1,
      playersLandmass2,
      westContinent,
      eastContinent,
      startSectorRows,
      startSectorCols,
      startSectors
    );
    return Array.isArray(result) ? result : [];
  }
  chooseStartSectors(players1, players2, rows, cols, humanNearEquator) {
    const result = civ7ChooseStartSectors(players1, players2, rows, cols, humanNearEquator);
    return Array.isArray(result) ? result : [];
  }
  needHumanNearEquator() {
    return civ7NeedHumanNearEquator();
  }
  generateDiscoveries(width, height, startPositions) {
    civ7GenerateDiscoveries(width, height, startPositions);
  }
  assignAdvancedStartRegions() {
    civ7AssignAdvancedStartRegions();
  }
  addFloodplains(minLength, maxLength) {
    const tb = TerrainBuilder;
    if (typeof tb.addFloodplains === "function") {
      tb.addFloodplains(minLength, maxLength);
    }
  }
  recalculateFertility() {
    const fb = globalThis.FertilityBuilder;
    if (fb && typeof fb.recalculate === "function") {
      fb.recalculate();
    } else {
      console.log("[Civ7Adapter] FertilityBuilder not available - fertility will be calculated by engine defaults");
    }
  }
};
function createCiv7Adapter() {
  const width = GameplayMap.getGridWidth();
  const height = GameplayMap.getGridHeight();
  return new Civ7Adapter(width, height);
}
function assertFoundationContext2(ctx, stageName) {
  if (!ctx) {
    throw new Error(`Stage "${stageName}" requires ExtendedMapContext but ctx is null`);
  }
  if (!ctx.foundation) {
    throw new Error(
      `Stage "${stageName}" requires FoundationContext but ctx.foundation is null. Ensure the "foundation" stage is enabled and runs before "${stageName}".`
    );
  }
}
function stageTimeStart(label) {
  console.log(`[SWOOPER_MOD] Starting: ${label}`);
  return { label, start: Date.now() };
}
function stageTimeEnd(timer) {
  const elapsed = Date.now() - timer.start;
  console.log(`[SWOOPER_MOD] Completed: ${timer.label} (${elapsed}ms)`);
  return elapsed;
}
function resolveOrchestratorAdapter() {
  return {
    getGridWidth: () => typeof GameplayMap !== "undefined" ? GameplayMap.getGridWidth() : 0,
    getGridHeight: () => typeof GameplayMap !== "undefined" ? GameplayMap.getGridHeight() : 0,
    getMapSize: () => typeof GameplayMap !== "undefined" ? GameplayMap.getMapSize() : 0,
    lookupMapInfo: (mapSize) => typeof GameInfo !== "undefined" && GameInfo?.Maps?.lookup ? GameInfo.Maps.lookup(mapSize) : null,
    setMapInitData: (params) => {
      if (typeof engine !== "undefined" && engine?.call) {
        engine.call("SetMapInitData", params);
      }
    },
    isWater: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.isWater(x, y) : true,
    validateAndFixTerrain: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.validateAndFixTerrain) {
        TerrainBuilder.validateAndFixTerrain();
      }
    },
    recalculateAreas: () => {
      if (typeof AreaBuilder !== "undefined" && AreaBuilder?.recalculateAreas) {
        AreaBuilder.recalculateAreas();
      }
    },
    stampContinents: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.stampContinents) {
        TerrainBuilder.stampContinents();
      }
    },
    buildElevation: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.buildElevation) {
        TerrainBuilder.buildElevation();
      }
    },
    modelRivers: (minLength, maxLength, navigableTerrain) => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.modelRivers) {
        TerrainBuilder.modelRivers(minLength, maxLength, navigableTerrain);
      }
    },
    defineNamedRivers: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.defineNamedRivers) {
        TerrainBuilder.defineNamedRivers();
      }
    },
    storeWaterData: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.storeWaterData) {
        TerrainBuilder.storeWaterData();
      }
    },
    generateLakes: (width, height, tilesPerLake) => {
      try {
        const mod = __require2("/base-standard/maps/elevation-terrain-generator.js");
        if (mod?.generateLakes) {
          mod.generateLakes(width, height, tilesPerLake);
        }
      } catch {
        console.log("[MapOrchestrator] generateLakes not available");
      }
    },
    expandCoasts: (width, height) => {
      try {
        const mod = __require2("/base-standard/maps/elevation-terrain-generator.js");
        if (mod?.expandCoasts) {
          mod.expandCoasts(width, height);
        }
      } catch {
        console.log("[MapOrchestrator] expandCoasts not available");
      }
    },
    chooseStartSectors: (players1, players2, rows, cols, humanNearEquator) => {
      try {
        const civ7 = createCiv7Adapter();
        if (typeof civ7.chooseStartSectors === "function") {
          return civ7.chooseStartSectors(players1, players2, rows, cols, humanNearEquator);
        }
      } catch (err) {
        console.log("[MapOrchestrator] chooseStartSectors not available:", err);
      }
      return [];
    },
    needHumanNearEquator: () => {
      try {
        const civ7 = createCiv7Adapter();
        if (typeof civ7.needHumanNearEquator === "function") {
          return civ7.needHumanNearEquator();
        }
      } catch (err) {
        console.log("[MapOrchestrator] needHumanNearEquator not available:", err);
      }
      return false;
    }
  };
}
var MapOrchestrator = class {
  /** Validated map generation config (injected via constructor) */
  mapGenConfig;
  /** Orchestrator options (adapter, logging, etc.) */
  options;
  /**
   * Orchestrator-specific adapter for Civ7 map-init operations.
   * Handles: map size, MapInitData, GameplayMap/GameInfo globals,
   * lake/coast stamping, continent operations.
   * Always resolved from engine globals - NOT configurable via options.
   */
  orchestratorAdapter;
  stageResults = [];
  worldModelConfigBound = false;
  /**
   * Create a new MapOrchestrator with validated config.
   *
   * @param config - Validated MapGenConfig from bootstrap()
   * @param options - Orchestrator options (adapter, logPrefix, etc.)
   * @throws Error if config is not provided or invalid
   */
  constructor(config, options = {}) {
    if (!config || typeof config !== "object") {
      throw new Error(
        "MapOrchestrator requires validated MapGenConfig. Call bootstrap() first and pass the returned config."
      );
    }
    this.mapGenConfig = config;
    this.options = options;
    this.orchestratorAdapter = resolveOrchestratorAdapter();
  }
  /**
   * Get the validated MapGenConfig.
   * Exposed for downstream stages that need direct config access.
   */
  getMapGenConfig() {
    return this.mapGenConfig;
  }
  /**
   * Handle RequestMapInitData event.
   * Sets map dimensions and latitude parameters from game settings.
   *
   * Flow: GameplayMap.getMapSize() → GameInfo.Maps.lookup() → extract dimensions
   * This replaces the previous hard-coded 84×54 approach (CIV-22).
   *
   * For testing, use `config.mapSizeDefaults` to bypass game settings.
   */
  requestMapData(initParams) {
    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === RequestMapInitData ===`);
    let mapSizeId;
    let mapInfo;
    if (this.options.mapSizeDefaults) {
      mapSizeId = this.options.mapSizeDefaults.mapSizeId ?? 0;
      mapInfo = this.options.mapSizeDefaults.mapInfo ?? null;
      console.log(`${prefix} Using test mapSizeDefaults`);
    } else {
      mapSizeId = this.orchestratorAdapter.getMapSize();
      mapInfo = this.orchestratorAdapter.lookupMapInfo(mapSizeId);
    }
    const gameWidth = mapInfo?.GridWidth ?? 84;
    const gameHeight = mapInfo?.GridHeight ?? 54;
    const gameMaxLat = mapInfo?.MaxLatitude ?? 80;
    const gameMinLat = mapInfo?.MinLatitude ?? -80;
    console.log(`${prefix} Map size ID: ${mapSizeId}`);
    console.log(
      `${prefix} MapInfo: GridWidth=${gameWidth}, GridHeight=${gameHeight}, Lat=[${gameMinLat}, ${gameMaxLat}]`
    );
    const params = {
      width: initParams?.width ?? gameWidth,
      height: initParams?.height ?? gameHeight,
      topLatitude: initParams?.topLatitude ?? gameMaxLat,
      bottomLatitude: initParams?.bottomLatitude ?? gameMinLat,
      wrapX: initParams?.wrapX ?? true,
      wrapY: initParams?.wrapY ?? false
    };
    console.log(`${prefix} Final dimensions: ${params.width} x ${params.height}`);
    console.log(
      `${prefix} Final latitude range: ${params.bottomLatitude} to ${params.topLatitude}`
    );
    this.orchestratorAdapter.setMapInitData(params);
  }
  /**
   * Handle GenerateMap event.
   * Runs the full generation pipeline.
   */
  generateMap() {
    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === GenerateMap ===`);
    this.stageResults = [];
    const startPositions = [];
    const devTunables = getTunables();
    const devFoundationCfg = devTunables.FOUNDATION_CFG || {};
    const diagnostics = devFoundationCfg.diagnostics || {};
    initDevFlags({ ...diagnostics, enabled: true });
    resetTunables();
    const tunables = getTunables();
    console.log(`${prefix} Tunables rebound successfully`);
    WorldModel.reset();
    const iWidth = this.orchestratorAdapter.getGridWidth();
    const iHeight = this.orchestratorAdapter.getGridHeight();
    const uiMapSize = this.orchestratorAdapter.getMapSize();
    const mapInfo = this.orchestratorAdapter.lookupMapInfo(uiMapSize);
    if (!mapInfo) {
      console.error(`${prefix} Failed to lookup map info`);
      return { success: false, stageResults: this.stageResults, startPositions };
    }
    console.log(`${prefix} Map size: ${iWidth}x${iHeight}`);
    console.log(
      `${prefix} MapInfo summary: NumNaturalWonders=${mapInfo.NumNaturalWonders}, LakeGenerationFrequency=${mapInfo.LakeGenerationFrequency}, PlayersLandmass1=${mapInfo.PlayersLandmass1}, PlayersLandmass2=${mapInfo.PlayersLandmass2}`
    );
    logEngineSurfaceApisOnce();
    const stageFlags = this.resolveStageFlags();
    const enabledStages = Object.entries(stageFlags).filter(([, enabled]) => enabled).map(([name]) => name).join(", ");
    console.log(`${prefix} Enabled stages: ${enabledStages || "(none)"}`);
    const foundationCfg = tunables.FOUNDATION_CFG || {};
    const landmassCfg = tunables.LANDMASS_CFG || {};
    const mountainsCfg = foundationCfg.mountains || {};
    const volcanosCfg = foundationCfg.volcanoes || {};
    const mountainOptions = this.buildMountainOptions(mountainsCfg);
    const volcanoOptions = this.buildVolcanoOptions(volcanosCfg);
    let ctx = null;
    try {
      const layerAdapter = this.createLayerAdapter(iWidth, iHeight);
      ctx = createExtendedMapContext({ width: iWidth, height: iHeight }, layerAdapter, {
        toggles: {
          STORY_ENABLE_HOTSPOTS: stageFlags.storyHotspots,
          STORY_ENABLE_RIFTS: stageFlags.storyRifts,
          STORY_ENABLE_OROGENY: stageFlags.storyOrogeny,
          STORY_ENABLE_SWATCHES: stageFlags.storySwatches,
          STORY_ENABLE_PALEO: false,
          STORY_ENABLE_CORRIDORS: stageFlags.storyCorridorsPre || stageFlags.storyCorridorsPost
        }
      });
      console.log(`${prefix} MapContext created successfully`);
    } catch (err) {
      console.error(`${prefix} Failed to create context:`, err);
      return { success: false, stageResults: this.stageResults, startPositions };
    }
    if (stageFlags.foundation && ctx) {
      this.initializeFoundation(ctx, tunables);
    }
    const iNumPlayers1 = mapInfo.PlayersLandmass1 ?? 4;
    const iNumPlayers2 = mapInfo.PlayersLandmass2 ?? 4;
    const iStartSectorRows = mapInfo.StartSectorRows ?? 4;
    const iStartSectorCols = mapInfo.StartSectorCols ?? 4;
    const bHumanNearEquator = this.orchestratorAdapter.needHumanNearEquator();
    const startSectors = this.orchestratorAdapter.chooseStartSectors(
      iNumPlayers1,
      iNumPlayers2,
      iStartSectorRows,
      iStartSectorCols,
      bHumanNearEquator
    );
    console.log(`${prefix} Start sectors chosen successfully`);
    let westContinent = this.createDefaultContinentBounds(iWidth, iHeight, "west");
    let eastContinent = this.createDefaultContinentBounds(iWidth, iHeight, "east");
    if (stageFlags.landmassPlates && ctx) {
      const stageResult = this.runStage("landmassPlates", () => {
        assertFoundationContext2(ctx, "landmassPlates");
        const plateResult = createPlateDrivenLandmasses(iWidth, iHeight, ctx, {
          landmassCfg,
          geometry: landmassCfg.geometry
        });
        if (!plateResult?.windows?.length) {
          throw new Error("Plate-driven landmass generation failed (no windows)");
        }
        let windows = plateResult.windows.slice();
        const separationResult = applyPlateAwareOceanSeparation({
          width: iWidth,
          height: iHeight,
          windows,
          landMask: plateResult.landMask,
          context: ctx,
          adapter: ctx.adapter,
          crustMode: landmassCfg.crustMode
        });
        windows = separationResult.windows;
        windows = applyLandmassPostAdjustments(windows, landmassCfg.geometry, iWidth, iHeight);
        if (windows.length >= 2) {
          const first = windows[0];
          const last = windows[windows.length - 1];
          if (first && last) {
            westContinent = this.windowToContinentBounds(first, 0);
            eastContinent = this.windowToContinentBounds(last, 1);
          }
        }
        const westMarked = markLandmassRegionId(westContinent, LANDMASS_REGION.WEST, ctx.adapter);
        const eastMarked = markLandmassRegionId(eastContinent, LANDMASS_REGION.EAST, ctx.adapter);
        console.log(
          `[landmass-plate] LandmassRegionId marked: ${westMarked} west (ID=${LANDMASS_REGION.WEST}), ${eastMarked} east (ID=${LANDMASS_REGION.EAST})`
        );
        this.orchestratorAdapter.validateAndFixTerrain();
        this.orchestratorAdapter.recalculateAreas();
        this.orchestratorAdapter.stampContinents();
        const terrainBuilder = {
          setPlotTag: (x, y, tag) => {
            if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setPlotTag) {
              TerrainBuilder.setPlotTag(x, y, tag);
            }
          },
          addPlotTag: (x, y, tag) => {
            if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.addPlotTag) {
              TerrainBuilder.addPlotTag(x, y, tag);
            }
          }
        };
        addPlotTagsSimple(iHeight, iWidth, eastContinent.west, ctx.adapter, terrainBuilder);
      });
      this.stageResults.push(stageResult);
      if (DEV.ENABLED && ctx?.adapter) {
        logLandmassAscii(ctx.adapter, iWidth, iHeight);
      }
    }
    if (stageFlags.coastlines && ctx) {
      const stageResult = this.runStage("coastlines", () => {
        this.orchestratorAdapter.expandCoasts(iWidth, iHeight);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.storySeed && ctx) {
      const stageResult = this.runStage("storySeed", () => {
        resetStoryTags();
        console.log(`${prefix} Imprinting continental margins (active/passive)...`);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.coastlines && ctx) {
      const stageResult = this.runStage("ruggedCoasts", () => {
        addRuggedCoasts(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.islands && ctx) {
      const stageResult = this.runStage("islands", () => {
        addIslandChains(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.mountains && ctx) {
      const stageResult = this.runStage("mountains", () => {
        assertFoundationContext2(ctx, "mountains");
        console.log(
          `${prefix} [Mountains] thresholds mountain=${mountainOptions.mountainThreshold}, hill=${mountainOptions.hillThreshold}, tectonicIntensity=${mountainOptions.tectonicIntensity}, boundaryWeight=${mountainOptions.boundaryWeight}, boundaryExponent=${mountainOptions.boundaryExponent}, interiorPenaltyWeight=${mountainOptions.interiorPenaltyWeight}`
        );
        layerAddMountainsPhysics(ctx, mountainOptions);
      });
      this.stageResults.push(stageResult);
      if (DEV.ENABLED && ctx?.adapter) {
        logMountainSummary(ctx.adapter, iWidth, iHeight);
        logReliefAscii(ctx.adapter, iWidth, iHeight);
      }
    }
    if (stageFlags.volcanoes && ctx) {
      const stageResult = this.runStage("volcanoes", () => {
        assertFoundationContext2(ctx, "volcanoes");
        layerAddVolcanoesPlateAware(ctx, volcanoOptions);
      });
      this.stageResults.push(stageResult);
      if (DEV.ENABLED && ctx?.adapter) {
        const volcanoId = ctx.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
        logVolcanoSummary(ctx.adapter, iWidth, iHeight, volcanoId);
      }
    }
    if (stageFlags.lakes && ctx) {
      const iTilesPerLake = Math.max(10, (mapInfo.LakeGenerationFrequency ?? 5) * 2);
      const stageResult = this.runStage("lakes", () => {
        this.orchestratorAdapter.generateLakes(iWidth, iHeight, iTilesPerLake);
        syncHeightfield(ctx);
      });
      this.stageResults.push(stageResult);
    }
    this.orchestratorAdapter.recalculateAreas();
    this.orchestratorAdapter.buildElevation();
    const westRestamped = markLandmassRegionId(westContinent, LANDMASS_REGION.WEST, ctx.adapter);
    const eastRestamped = markLandmassRegionId(eastContinent, LANDMASS_REGION.EAST, ctx.adapter);
    ctx.adapter.recalculateAreas();
    ctx.adapter.stampContinents();
    console.log(
      `[landmass-plate] LandmassRegionId refreshed post-terrain: ${westRestamped} west (ID=${LANDMASS_REGION.WEST}), ${eastRestamped} east (ID=${LANDMASS_REGION.EAST})`
    );
    if (stageFlags.climateBaseline && ctx) {
      const stageResult = this.runStage("climateBaseline", () => {
        assertFoundationContext2(ctx, "climateBaseline");
        applyClimateBaseline(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.rivers && ctx) {
      const navigableRiverTerrain = NAVIGABLE_RIVER_TERRAIN;
      const logStats = (label) => {
        const w = iWidth;
        const h = iHeight;
        let flat = 0, hill = 0, mtn = 0, water = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (ctx.adapter.isWater(x, y)) {
              water++;
              continue;
            }
            const t = ctx.adapter.getTerrainType(x, y);
            if (t === MOUNTAIN_TERRAIN) mtn++;
            else if (t === HILL_TERRAIN) hill++;
            else flat++;
          }
        }
        const total = w * h;
        const land = Math.max(1, flat + hill + mtn);
        console.log(
          `[Rivers] ${label}: Land=${land} (${(land / total * 100).toFixed(1)}%) Mtn=${(mtn / land * 100).toFixed(1)}% Hill=${(hill / land * 100).toFixed(1)}% Flat=${(flat / land * 100).toFixed(1)}%`
        );
      };
      const stageResult = this.runStage("rivers", () => {
        logStats("PRE-RIVERS");
        this.orchestratorAdapter.modelRivers(5, 15, navigableRiverTerrain);
        logStats("POST-MODELRIVERS");
        this.orchestratorAdapter.validateAndFixTerrain();
        logStats("POST-VALIDATE");
        syncHeightfield(ctx);
        syncClimateField(ctx);
        this.orchestratorAdapter.defineNamedRivers();
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.climateRefine && ctx) {
      const stageResult = this.runStage("climateRefine", () => {
        assertFoundationContext2(ctx, "climateRefine");
        refineClimateEarthlike(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
      if (DEV.ENABLED && ctx?.adapter) {
        logRainfallStats(ctx.adapter, iWidth, iHeight, "post-climate");
      }
    }
    if (stageFlags.biomes && ctx) {
      const stageResult = this.runStage("biomes", () => {
        designateEnhancedBiomes(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
      if (DEV.ENABLED && ctx?.adapter) {
        logBiomeSummary(ctx.adapter, iWidth, iHeight);
      }
    }
    if (stageFlags.features && ctx) {
      const stageResult = this.runStage("features", () => {
        addDiverseFeatures(iWidth, iHeight, ctx);
        this.orchestratorAdapter.validateAndFixTerrain();
        syncHeightfield(ctx);
        this.orchestratorAdapter.recalculateAreas();
      });
      this.stageResults.push(stageResult);
    }
    this.orchestratorAdapter.storeWaterData();
    if (stageFlags.placement && ctx) {
      const stageResult = this.runStage("placement", () => {
        const positions = runPlacement(ctx.adapter, iWidth, iHeight, {
          mapInfo,
          wondersPlusOne: true,
          floodplains: { minLength: 4, maxLength: 10 },
          starts: {
            playersLandmass1: iNumPlayers1,
            playersLandmass2: iNumPlayers2,
            westContinent,
            eastContinent,
            startSectorRows: iStartSectorRows,
            startSectorCols: iStartSectorCols,
            startSectors
          }
        });
        startPositions.push(...positions);
      });
      this.stageResults.push(stageResult);
    }
    console.log(`${prefix} === GenerateMap COMPLETE ===`);
    const success = this.stageResults.every((r) => r.success);
    return { success, stageResults: this.stageResults, startPositions };
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  resolveStageFlags() {
    const flags = {
      foundation: stageEnabled("foundation"),
      landmassPlates: stageEnabled("landmassPlates"),
      coastlines: stageEnabled("coastlines"),
      storySeed: stageEnabled("storySeed"),
      storyHotspots: stageEnabled("storyHotspots"),
      storyRifts: stageEnabled("storyRifts"),
      storyOrogeny: stageEnabled("storyOrogeny"),
      storyCorridorsPre: stageEnabled("storyCorridorsPre"),
      islands: stageEnabled("islands"),
      mountains: stageEnabled("mountains"),
      volcanoes: stageEnabled("volcanoes"),
      lakes: stageEnabled("lakes"),
      climateBaseline: stageEnabled("climateBaseline"),
      storySwatches: stageEnabled("storySwatches"),
      rivers: stageEnabled("rivers"),
      storyCorridorsPost: stageEnabled("storyCorridorsPost"),
      climateRefine: stageEnabled("climateRefine"),
      biomes: stageEnabled("biomes"),
      features: stageEnabled("features"),
      placement: stageEnabled("placement")
    };
    validateStageDrift(Object.keys(flags));
    return flags;
  }
  runStage(name, fn) {
    const timer = stageTimeStart(name);
    try {
      fn();
      const durationMs = stageTimeEnd(timer);
      return { stage: name, success: true, durationMs };
    } catch (err) {
      const durationMs = stageTimeEnd(timer);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[MapOrchestrator] Stage "${name}" failed:`, err);
      return { stage: name, success: false, durationMs, error: errorMessage };
    }
  }
  bindWorldModelConfigProvider() {
    if (this.worldModelConfigBound) return;
    setConfigProvider(() => {
      const tunables = getTunables();
      return {
        plates: tunables.FOUNDATION_PLATES,
        dynamics: tunables.FOUNDATION_DYNAMICS,
        directionality: tunables.FOUNDATION_DIRECTIONALITY
      };
    });
    this.worldModelConfigBound = true;
  }
  initializeFoundation(ctx, tunables) {
    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} Initializing foundation...`);
    this.bindWorldModelConfigProvider();
    try {
      console.log(`${prefix} WorldModel.init() starting`);
      if (!WorldModel.init()) {
        throw new Error("WorldModel initialization failed");
      }
      console.log(`${prefix} WorldModel.init() succeeded`);
      ctx.worldModel = WorldModel;
      const foundationCfg = tunables.FOUNDATION_CFG || {};
      console.log(`${prefix} createFoundationContext() starting`);
      const foundationContext = createFoundationContext(WorldModel, {
        dimensions: ctx.dimensions,
        config: {
          seed: foundationCfg.seed || {},
          plates: tunables.FOUNDATION_PLATES,
          dynamics: tunables.FOUNDATION_DYNAMICS,
          surface: foundationCfg.surface || {},
          policy: foundationCfg.policy || {},
          diagnostics: foundationCfg.diagnostics || {}
        }
      });
      console.log(`${prefix} createFoundationContext() succeeded`);
      ctx.foundation = foundationContext;
      console.log(`${prefix} Foundation context initialized`);
      if (DEV.ENABLED && ctx.adapter) {
        const plates = {
          plateId: foundationContext.plates.id,
          boundaryType: foundationContext.plates.boundaryType,
          boundaryCloseness: foundationContext.plates.boundaryCloseness,
          upliftPotential: foundationContext.plates.upliftPotential,
          riftPotential: foundationContext.plates.riftPotential
        };
        logFoundationSummary(ctx.adapter, ctx.dimensions.width, ctx.dimensions.height, plates);
        logFoundationAscii(ctx.adapter, ctx.dimensions.width, ctx.dimensions.height, plates);
        logFoundationHistograms(ctx.dimensions.width, ctx.dimensions.height, plates);
      }
      return foundationContext;
    } catch (err) {
      console.error(`${prefix} Failed to initialize foundation:`, err);
      return null;
    }
  }
  createLayerAdapter(width, height) {
    if (this.options.adapter) {
      return this.options.adapter;
    }
    if (this.options.createAdapter) {
      return this.options.createAdapter(width, height);
    }
    return new Civ7Adapter(width, height);
  }
  createDefaultContinentBounds(width, height, side) {
    const avoidSeamOffset = 4;
    const polarWaterRows = 2;
    if (side === "west") {
      return {
        west: avoidSeamOffset,
        east: Math.floor(width / 2) - avoidSeamOffset,
        south: polarWaterRows,
        north: height - polarWaterRows,
        continent: 0
      };
    }
    return {
      west: Math.floor(width / 2) + avoidSeamOffset,
      east: width - avoidSeamOffset,
      south: polarWaterRows,
      north: height - polarWaterRows,
      continent: 1
    };
  }
  windowToContinentBounds(window, continent) {
    return {
      west: window.west,
      east: window.east,
      south: window.south,
      north: window.north,
      continent: window.continent ?? continent
    };
  }
  buildMountainOptions(config) {
    return {
      tectonicIntensity: config.tectonicIntensity ?? 1,
      // Defaults are aligned with the crust-first collision-only formulation in
      // layers/mountains.ts. If callers supply overrides, those values will be
      // used instead.
      mountainThreshold: config.mountainThreshold ?? 0.58,
      hillThreshold: config.hillThreshold ?? 0.32,
      upliftWeight: config.upliftWeight ?? 0.35,
      fractalWeight: config.fractalWeight ?? 0.15,
      riftDepth: config.riftDepth ?? 0.2,
      boundaryWeight: config.boundaryWeight ?? 1,
      boundaryExponent: config.boundaryExponent ?? 1.6,
      interiorPenaltyWeight: config.interiorPenaltyWeight ?? 0,
      convergenceBonus: config.convergenceBonus ?? 1,
      transformPenalty: config.transformPenalty ?? 0.6,
      riftPenalty: config.riftPenalty ?? 1,
      hillBoundaryWeight: config.hillBoundaryWeight ?? 0.35,
      hillRiftBonus: config.hillRiftBonus ?? 0.25,
      hillConvergentFoothill: config.hillConvergentFoothill ?? 0.35,
      hillInteriorFalloff: config.hillInteriorFalloff ?? 0.1,
      hillUpliftWeight: config.hillUpliftWeight ?? 0.2
    };
  }
  buildVolcanoOptions(config) {
    return {
      enabled: config.enabled ?? true,
      baseDensity: config.baseDensity ?? 1 / 170,
      minSpacing: config.minSpacing ?? 3,
      boundaryThreshold: config.boundaryThreshold ?? 0.35,
      boundaryWeight: config.boundaryWeight ?? 1.2,
      convergentMultiplier: config.convergentMultiplier ?? 2.4,
      transformMultiplier: config.transformMultiplier ?? 1.1,
      divergentMultiplier: config.divergentMultiplier ?? 0.35,
      hotspotWeight: config.hotspotWeight ?? 0.12,
      shieldPenalty: config.shieldPenalty ?? 0.6,
      randomJitter: config.randomJitter ?? 0.08,
      minVolcanoes: config.minVolcanoes ?? 5,
      maxVolcanoes: config.maxVolcanoes ?? 40
    };
  }
};
var VERSION = "0.1.0";

export {
  bootstrap,
  MapOrchestrator,
  VERSION
};
