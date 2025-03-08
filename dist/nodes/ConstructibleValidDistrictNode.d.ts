import { TObjectValues } from "../types";
import { DISTRICT } from "../constants";
import { BaseNode } from "./BaseNode";
export type TConstructibleValidDistrictNode = Pick<ConstructibleValidDistrictNode, "constructibleType" | "districtType">;
export declare class ConstructibleValidDistrictNode extends BaseNode<TConstructibleValidDistrictNode> {
    constructibleType: string | null;
    districtType: TObjectValues<typeof DISTRICT> | null;
    constructor(payload?: Partial<TConstructibleValidDistrictNode>);
}
