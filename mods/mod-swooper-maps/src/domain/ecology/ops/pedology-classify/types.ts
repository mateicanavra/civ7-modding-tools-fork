import type { OpTypeBagOf } from "@swooper/mapgen-core/authoring";

export type PedologyClassifyTypes = OpTypeBagOf<typeof import("./contract.js").default>;
export type PedologyClassifyInput = PedologyClassifyTypes["input"];
export type PedologyClassifyOutput = PedologyClassifyTypes["output"];
