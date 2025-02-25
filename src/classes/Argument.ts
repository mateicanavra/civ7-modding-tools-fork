import { TClassProperties } from "../types";

import { Base } from "./Base";

type TArgument = TClassProperties<Argument>;

export class Argument extends Base<TArgument> implements TArgument {
    name: string | number = `Amount`;
    value: string | number = `Amount`;

    constructor(payload: Partial<TArgument> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: 'Argument',
            _attrs: {
                name: this.name
            },
            _content: this.value
        }
    }
}