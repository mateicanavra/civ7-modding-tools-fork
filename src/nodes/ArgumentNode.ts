import { BaseNode } from "./BaseNode";

export type TArgumentNode = Pick<ArgumentNode, "name" | "value">;

export class ArgumentNode extends BaseNode<TArgumentNode> {
    _name = 'Argument';

    name: string = '';
    value: string | number = '';

    constructor(payload: Partial<TArgumentNode> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: this.name,
            _attrs: {
                name: this.name,
            },
            _content: this.value
        }
    }
}
