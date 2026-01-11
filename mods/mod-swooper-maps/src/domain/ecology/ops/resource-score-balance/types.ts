import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

export type ResourceScoreBalanceTypes = OpTypeBag<
  typeof import("./contract.js").default
>;
