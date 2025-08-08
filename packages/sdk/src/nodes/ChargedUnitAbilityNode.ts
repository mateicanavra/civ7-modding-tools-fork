import { BaseNode } from './BaseNode';

export type TChargedUnitAbilityNode = {
    unitAbilityType: string;
    rechargeTurns: number;
}

export class ChargedUnitAbilityNode extends BaseNode<TChargedUnitAbilityNode> {
    unitAbilityType: string;
    rechargeTurns: number;

    constructor(options: Partial<TChargedUnitAbilityNode> = {}) {
        super(options);
        this.unitAbilityType = options.unitAbilityType || '';
        this.rechargeTurns = options.rechargeTurns || 5;
    }
    
    toXmlElement() {
        return super.toXmlElement();
    }
} 