import { TObjectValues } from "../types";
import { RESOURCE } from "../constants"

import { BaseNode } from "./BaseNode";

export type TConstructibleValidResourceNode = Pick<ConstructibleValidResourceNode,
    "constructibleType" |
    "rate" |
    "resourceType"
>;

export class ConstructibleValidResourceNode extends BaseNode<TConstructibleValidResourceNode> {
    constructibleType = 'BUILDING_';
    resourceType: TObjectValues<typeof RESOURCE> = RESOURCE.GOLD;
    rate: number | null = null;

    constructor(payload: Partial<TConstructibleValidResourceNode> = {}) {
        super();
        this.fill(payload);
    }
}
