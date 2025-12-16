export type CrustMode = "legacy" | "area";

export function normalizeCrustMode(mode: unknown): CrustMode {
  return mode === "area" ? "area" : "legacy";
}

