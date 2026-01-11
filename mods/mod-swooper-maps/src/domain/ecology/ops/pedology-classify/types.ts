import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

export type PedologyClassifyTypes = OpTypeBag<typeof import("./contract.js").default>;
export type PedologyClassifyInput = PedologyClassifyTypes["input"];
export type PedologyClassifyOutput = PedologyClassifyTypes["output"];
