type RecordLike = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null;
}

export function requireEnvDimensions(
  ctx: Readonly<{ env: unknown }>,
  scope: string
): Readonly<{ width: number; height: number }> {
  if (!isRecord(ctx.env)) {
    throw new Error(`[Foundation] Missing env for ${scope}.`);
  }

  const dims = ctx.env["dimensions"];
  if (!isRecord(dims)) {
    throw new Error(`[Foundation] Missing env.dimensions for ${scope}.`);
  }

  const width = dims["width"];
  const height = dims["height"];
  if (typeof width !== "number" || typeof height !== "number" || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`[Foundation] Invalid env.dimensions for ${scope}.`);
  }

  const widthInt = width | 0;
  const heightInt = height | 0;
  if (widthInt <= 0 || heightInt <= 0) {
    throw new Error(`[Foundation] Invalid env.dimensions for ${scope}.`);
  }

  return { width: widthInt, height: heightInt };
}
