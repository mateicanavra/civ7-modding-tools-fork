import type { OpTypeBagOf } from "@swooper/mapgen-core/authoring";

export type PlanVegetationTypes = OpTypeBagOf<typeof import("./contract.js").default>;
