import { BaseNode } from "./BaseNode";
export type TCivilizationTagNode = Pick<CivilizationTagNode, "civilizationDomain" | "civilizationType" | 'tagType'>;
export declare class CivilizationTagNode extends BaseNode<TCivilizationTagNode> {
    civilizationDomain: string | null;
    civilizationType: string | null;
    tagType: string | null;
    constructor(payload?: Partial<TCivilizationTagNode>);
}
