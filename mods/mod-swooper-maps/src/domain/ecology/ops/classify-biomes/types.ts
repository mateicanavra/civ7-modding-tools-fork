import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").BiomeClassificationContract;

export type BiomeClassificationTypes = OpTypeBag<Contract>;
