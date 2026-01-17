import type { OpTypeBagOf } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").default;

export type ProjectRiverNetworkTypes = OpTypeBagOf<Contract>;

