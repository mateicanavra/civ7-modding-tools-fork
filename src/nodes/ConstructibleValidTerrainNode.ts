import { TObjectValues } from "../types";
import { TERRAIN } from "../constants"

import { BaseNode } from "./BaseNode";

export type TConstructibleValidTerrainNode = Pick<ConstructibleValidTerrainNode,
    "constructibleType" |
    "terrainType"
>;

export class ConstructibleValidTerrainNode extends BaseNode<TConstructibleValidTerrainNode> {
    constructibleType = 'BUILDING_';
    terrainType: TObjectValues<typeof TERRAIN> = TERRAIN.FLAT;

    constructor(payload: Partial<TConstructibleValidTerrainNode> = {}) {
        super();
        this.fill(payload);
    }
}
