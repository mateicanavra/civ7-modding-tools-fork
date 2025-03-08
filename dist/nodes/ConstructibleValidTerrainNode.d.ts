import { TObjectValues } from "../types";
import { TERRAIN } from "../constants";
import { BaseNode } from "./BaseNode";
export type TConstructibleValidTerrainNode = Pick<ConstructibleValidTerrainNode, "constructibleType" | "terrainType">;
export declare class ConstructibleValidTerrainNode extends BaseNode<TConstructibleValidTerrainNode> {
    constructibleType: string | null;
    terrainType: TObjectValues<typeof TERRAIN> | null;
    constructor(payload?: Partial<TConstructibleValidTerrainNode>);
}
