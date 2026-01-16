import type { OpTypeBagOf } from "@swooper/mapgen-core/authoring";

export type PlanIceTypes = OpTypeBagOf<typeof import("./contract.js").default>;
