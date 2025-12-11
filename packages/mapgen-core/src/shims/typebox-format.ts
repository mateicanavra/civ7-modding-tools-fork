// Civ7’s embedded V8 rejects TypeBox’s built-in Unicode-heavy format regexes (e.g., idn-email).
// This shim replaces the TypeBox format registry with a minimal, regex-free implementation.
// Consequence: format validation is effectively disabled unless callers register their own safe checks.

type FormatCheck = (value: unknown) => boolean;

const formats = new Map<string, FormatCheck>();

export function Set(name: string, fn: FormatCheck) {
  formats.set(name, fn);
}

export function Get(name: string) {
  return formats.get(name);
}

export function Has(name: string) {
  return formats.has(name);
}

export function Test(name: string, value: unknown) {
  const fn = formats.get(name);
  // Match TypeBox default behavior: if a format isn’t registered, treat it as passing.
  return fn ? fn(value) : true;
}

export function Clear() {
  formats.clear();
}

export function Entries() {
  return [...formats.entries()];
}

export function Reset() {
  // Intentionally do not register any defaults; avoids Unicode-property regex usage.
  Clear();
}

export const Format = { Set, Get, Has, Test, Clear, Entries, Reset };

export default Format;
