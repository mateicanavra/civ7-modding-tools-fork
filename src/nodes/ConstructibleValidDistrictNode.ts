import { BaseNode } from "./BaseNode";

export type TConstructibleValidDistrictNode = Pick<ConstructibleValidDistrictNode,
    "constructibleType" |
    "districtType"
>;

export class ConstructibleValidDistrictNode extends BaseNode<TConstructibleValidDistrictNode> {
    constructibleType = 'BUILDING_';
    districtType = 'DISTRICT_';

    constructor(payload: Partial<TConstructibleValidDistrictNode> = {}) {
        super();
        this.fill(payload);
    }
}
