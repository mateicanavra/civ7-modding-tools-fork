import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanReefEmbellishmentsContract;

export type PlanReefEmbellishmentsTypes = OpTypeBag<Contract>;
