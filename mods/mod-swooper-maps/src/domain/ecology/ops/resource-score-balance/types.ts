import type { OpTypeBagOf } from "@swooper/mapgen-core/authoring";

export type ResourceScoreBalanceTypes = OpTypeBagOf<
  typeof import("./contract.js").default
>;
