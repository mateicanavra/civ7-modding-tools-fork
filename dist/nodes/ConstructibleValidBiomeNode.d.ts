import { TObjectValues } from "../types";
import { BIOME } from "../constants";
import { BaseNode } from "./BaseNode";
export type TConstructibleValidBiomeNode = Pick<ConstructibleValidBiomeNode, "constructibleType" | "biomeType">;
export declare class ConstructibleValidBiomeNode extends BaseNode<TConstructibleValidBiomeNode> {
    constructibleType: string | null;
    biomeType: TObjectValues<typeof BIOME> | null;
    constructor(payload?: Partial<TConstructibleValidBiomeNode>);
}
