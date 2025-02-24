import { v4 as uuid } from 'uuid';

import { Base } from "./Base";
import { AGES } from "../constants";

type TCriteria = {
    id: string;
    isAny?: boolean
    ages: (typeof AGES[keyof typeof AGES])[]
}

export class Criteria extends Base<TCriteria> implements TCriteria {
    id: string = `action-criteria-${uuid()}`;
    isAny?: boolean = true
    ages: (typeof AGES[keyof typeof AGES])[] = [];

    constructor(payload?: Partial<TCriteria>) {
        super();
        this.fill(payload);
    }

    toXMLElement() {
        return {
            _name: 'Criteria',
            _attrs: {
                id: this.id,
                ...(this.isAny ? {any: "true"} : {}),
            },
            _content: this.ages.length
                ? this.ages.map(AgeInUse => ({ AgeInUse }))
                : { AlwaysMet: '' }
        };
    }
}