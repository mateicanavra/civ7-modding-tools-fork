import type { OpTypeBagOf } from "@swooper/mapgen-core/authoring";

export type AggregatePedologyTypes = OpTypeBagOf<typeof import("./contract.js").default>;
