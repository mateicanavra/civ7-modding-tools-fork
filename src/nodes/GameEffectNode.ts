import { BaseNode } from "./BaseNode";
import { ModifierNode } from "./ModifierNode";

export type TGameEffectNode = Pick<GameEffectNode, "modifiers">;

export class GameEffectNode extends BaseNode<TGameEffectNode> {
    modifiers: ModifierNode[] = [];

    constructor(payload: Partial<TGameEffectNode> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: 'GameEffects',
            _attrs: {
                xmlns: "GameEffects",
            },
            _content: this.modifiers.map(item => item.toXmlElement())
        }
    }
}
