import { REQUIREMENT } from "../constants";
import { TClassProperties, TObjectValues } from "../types";

import { Base } from "./Base";
import { Argument } from "./Argument";

type TRequirement = TClassProperties<Requirement>;

export class Requirement extends Base<TRequirement> implements TRequirement {
    type: TObjectValues<typeof REQUIREMENT> = REQUIREMENT.GAME_IS_STARTED;
    arguments: Argument[] = [];
    constructor(payload: Partial<TRequirement> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: 'Requirement',
            _attrs: {
                type: this.type
            },
            _content: this.arguments.map(argument => argument.toXmlElement())
        }
    }
}