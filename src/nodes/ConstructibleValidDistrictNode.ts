import { TObjectValues } from "../types";
import { DISTRICT } from "../constants";

import { BaseNode } from "./BaseNode";

export type TConstructibleValidDistrictNode = Pick<ConstructibleValidDistrictNode,
    "constructibleType" |
    "districtType"
>;

export class ConstructibleValidDistrictNode extends BaseNode<TConstructibleValidDistrictNode> {
    constructibleType: string | null = 'BUILDING_';
    districtType: TObjectValues<typeof DISTRICT> | null = DISTRICT.RURAL;

    constructor(payload: Partial<TConstructibleValidDistrictNode> = {}) {
        super();
        this.fill(payload);
    }
}
