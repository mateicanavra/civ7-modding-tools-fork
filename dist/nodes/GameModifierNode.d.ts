import { BaseNode } from "./BaseNode";
export type TGameModifierNode = Pick<GameModifierNode, "modifierId">;
export declare class GameModifierNode extends BaseNode<TGameModifierNode> {
    modifierId: string | null;
    constructor(payload?: Partial<TGameModifierNode>);
}
