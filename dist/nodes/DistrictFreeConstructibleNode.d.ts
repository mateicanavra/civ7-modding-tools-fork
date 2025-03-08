import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { FEATURE, RESOURCE, TERRAIN } from "../constants";
export type TDistrictFreeConstructibleNode = Pick<DistrictFreeConstructibleNode, "biomeType" | "constructibleType" | "districtType" | "featureType" | "priority" | "resourceType" | "riverType" | "terrainType" | "tier">;
export declare class DistrictFreeConstructibleNode extends BaseNode<TDistrictFreeConstructibleNode> {
    constructibleType: string | null;
    districtType: `DISTRICT_${string}` | null;
    featureType: TObjectValues<typeof FEATURE> | null;
    resourceType: TObjectValues<typeof RESOURCE> | null;
    terrainType: TObjectValues<typeof TERRAIN> | null;
    biomeType: string | null;
    riverType: string | null;
    priority: number | null;
    tier: number | null;
    constructor(payload?: Partial<TDistrictFreeConstructibleNode>);
}
