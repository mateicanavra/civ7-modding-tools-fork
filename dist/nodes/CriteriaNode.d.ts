import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { AGE } from "../constants";
export type TCriteriaNode = Pick<CriteriaNode, "id" | "any" | "ages">;
export declare class CriteriaNode extends BaseNode<TCriteriaNode> {
    _name: string;
    id: string | null;
    ages: TObjectValues<typeof AGE>[];
    any: boolean | null;
    constructor(payload?: Partial<TCriteriaNode>);
    toXmlElement(): {
        _name: string;
        _attrs: {
            any?: string | undefined;
            id: string | null;
        };
        _content: {
            AgeInUse: TObjectValues<{
                readonly ANTIQUITY: "AGE_ANTIQUITY";
                readonly EXPLORATION: "AGE_EXPLORATION";
                readonly MODERN: "AGE_MODERN";
            }>;
        }[] | {
            AlwaysMet: string;
        };
    };
}
