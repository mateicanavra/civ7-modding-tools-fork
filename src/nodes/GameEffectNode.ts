import { BaseNode } from "./BaseNode";
import { ModifierNode } from "./ModifierNode";

export type TGameEffectNode = Pick<GameEffectNode,
    "modifiers"
>;

export class GameEffectNode extends BaseNode<TGameEffectNode> {
    _name = 'GameEffects';
    modifiers: ModifierNode[] = [];

    constructor(payload: Partial<TGameEffectNode> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        if (this.modifiers.length === 0) {
            return null
        }

        return {
            _name: this._name,
            _attrs: {
                xmlns: "GameEffects",
            },
            _content: this.modifiers.map(item => item.toXmlElement())
        }
    }
}
