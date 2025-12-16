export function freezeClone(obj: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    out[key] = (obj as Record<string, unknown>)[key];
  }
  return Object.freeze(out);
}

