import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").BiomeClassificationContract;

export type BiomeClassificationTypes = OpTypeBag<Contract>;

export type { BiomeSymbol } from "@mapgen/domain/ecology/types.js";
export type TempZone = "polar" | "cold" | "temperate" | "tropical";
export type MoistureZone = "arid" | "semiArid" | "subhumid" | "humid" | "perhumid";
