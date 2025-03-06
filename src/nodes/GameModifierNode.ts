import { BaseNode } from "./BaseNode";

export type TGameModifierNode = Pick<GameModifierNode,
    "modifierId"
>;

export class GameModifierNode extends BaseNode<TGameModifierNode> {
    modifierId = '';

    constructor(payload: Partial<TGameModifierNode> = {}) {
        super();
        this.fill(payload);
    }
}
