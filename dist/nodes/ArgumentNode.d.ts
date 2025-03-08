import { BaseNode } from "./BaseNode";
export type TArgumentNode = Pick<ArgumentNode, "name" | "value">;
export declare class ArgumentNode extends BaseNode<TArgumentNode> {
    _name: string;
    name: string | null;
    value: string | number | null;
    constructor(payload?: Partial<TArgumentNode>);
    toXmlElement(): {
        _name: string;
        _attrs: {
            name: string | null;
        };
        _content: string | number | null;
    };
}
