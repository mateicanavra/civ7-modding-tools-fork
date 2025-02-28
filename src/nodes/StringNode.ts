import { BaseNode } from "./BaseNode";

export type TStringNode = Pick<StringNode, "context" | "value">;

export class StringNode extends BaseNode<TStringNode> {
    _name = 'String';

    context: string = '';
    value?: string | number = '';

    constructor(payload: Partial<TStringNode> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: this._name,
            _attrs: {
                context: this.context,
            },
            _content: this.value
        }
    }
}
