import { TObjectValues } from "../types";
import { REQUIREMENT } from "../constants";

import { BaseNode } from "./BaseNode";
import { ArgumentNode, TArgumentNode } from "./ArgumentNode";
import { TModifierNode } from "./ModifierNode";

export type TRequirementNode = Pick<RequirementNode,
    "type" |
    "arguments"
>;

export class RequirementNode extends BaseNode<TRequirementNode> {
    type: TObjectValues<typeof REQUIREMENT> = REQUIREMENT.PLAYER_HAS_CIVILIZATION_OR_LEADER_TRAIT;
    arguments: TArgumentNode[] = [];

    constructor(payload: Partial<TRequirementNode> = {}) {
        super();
        this.fill(payload);
    }

    fill = (payload: Partial<TModifierNode> = {}) => {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
        return this;
    }

    toXmlElement() {
        return {
            _name: 'Requirement',
            _attrs: {
                type: this.type,
            },
            _content: this.arguments.map(item => new ArgumentNode(item).toXmlElement())
        }
    }
}
